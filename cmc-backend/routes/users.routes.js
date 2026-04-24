import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Roles válidos del sistema (8 perfiles)
// 8 roles oficiales CMC
const ROLES_VALIDOS = [
  'super_admin',
  'staff',
  'expositor',
  'speaker',
  'asistente_general',
  'asistente_curso',
  'asistente_sesiones',
  'asistente_combo',
];

// ========================================================
// GET /users — lista de usuarios (super_admin o staff)
// ========================================================
router.get('/', authRequired, async (req, res) => {
  try {
    const { rol } = req.user;

    if (rol !== 'super_admin' && rol !== 'staff') {
      return res.status(403).json({ error: 'Sin permisos para listar usuarios' });
    }

    const result = await pool.query(
      `SELECT
        id, nombre, email, rol, tipo_pase, sede, empresa, activo, created_at
       FROM users
       WHERE activo = true
       ORDER BY nombre ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error en GET /users:', error.message);
    res.status(500).json({ error: 'Error al obtener usuarios', details: error.message });
  }
});

// ========================================================
// GET /users/:id — obtener usuario específico
// ========================================================
router.get('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id !== id && req.user.rol !== 'super_admin' && req.user.rol !== 'staff') {
      return res.status(403).json({ error: 'No tienes permiso para ver este usuario' });
    }

    const result = await pool.query(
      `SELECT
        id, nombre, email, rol, tipo_pase, sede, multi_sedes, edicion,
        empresa, movil, avatar_url,
        activo, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error en GET /users/:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ========================================================
// POST /users — crear usuario (solo super_admin)
// ========================================================
router.post('/', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'super_admin') {
      return res.status(403).json({ error: 'Solo super_admin puede crear usuarios' });
    }

    const {
      email,
      password,
      nombre,
      rol = 'asistente_general',
      tipo_pase = 'general',
      sede = 'colombia',
      empresa = '',
      telefono = '',   // se guarda en columna 'movil'
    } = req.body;

    // Validaciones básicas
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({
        error: `Rol inválido. Opciones: ${ROLES_VALIDOS.join(', ')}`,
      });
    }

    // Verificar email duplicado
    const emailExists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (emailExists.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }

    // FIX: usar bcrypt.hash y guardar en password_hash (no en 'password')
    const password_hash = await bcrypt.hash(password, 10);

    // FIX: INSERT usa password_hash y movil (columnas reales de la tabla)
    const result = await pool.query(
      `INSERT INTO users
        (email, password_hash, nombre, rol, tipo_pase, sede, empresa, movil, activo, edicion, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, NOW(), NOW())
       RETURNING id, nombre, email, rol, tipo_pase, sede, empresa, activo, edicion, created_at`,
      [email.toLowerCase().trim(), password_hash, nombre, rol, tipo_pase, sedePrincipal,
        empresa, telefono, parseInt(edicion) || 2026]
    );

    console.log(`[Users] ✅ Usuario creado: ${email} (${rol})`);

    res.status(201).json({
      ok: true,
      message: 'Usuario creado correctamente',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Error en POST /users:', error.message);
    res.status(500).json({ error: 'Error al crear usuario', details: error.message });
  }
});

// ========================================================
// PUT /users/:id — editar usuario (super_admin)
// ========================================================
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    const esSuPerfil = req.user.id === id;
    const esAdmin = req.user.rol === 'super_admin';

    if (!esSuPerfil && !esAdmin) {
      return res.status(403).json({ error: 'No autorizado para editar este perfil' });
    }

    const {
      nombre, email, rol, tipo_pase, sede,
      sedes, edicion,
      empresa, telefono,
      foto_url, avatar_url,
      permisos_extra,
    } = req.body;
    // multi-sede: calcular sede principal
    const sedesParsed = Array.isArray(sedes) && sedes.length ? sedes : null;
    const sedePrincipal = sedesParsed ? sedesParsed[0] : sede;

    const userExists = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Validar rol si viene en el body
    if (rol && !ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({
        error: `Rol inválido. Opciones: ${ROLES_VALIDOS.join(', ')}`,
      });
    }

    const updates = [];
    const values = [];
    let p = 1;

    // Si el usuario no es admin, no puede cambiar su rol, tipo_pase ni sede
    const fields = {
      nombre,
      email,
      ...(esAdmin ? {
        rol, tipo_pase,
        sede: sedePrincipal || sede,
        edicion: edicion ? parseInt(edicion) : undefined,
        permisos_extra: permisos_extra !== undefined ? JSON.stringify(permisos_extra) : undefined,
      } : {}),  // solo admin cambia estos
      empresa,
      movil: telefono,
      avatar_url: avatar_url || foto_url,
    };

    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined && val !== null) {
        updates.push(`${key} = $${p}`);
        values.push(val);
        p++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    // updated_at no existe en users
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${p}
       RETURNING id, nombre, email, rol, tipo_pase, sede, empresa, activo, edicion`,
      values
    );

    console.log(`[Users] ✅ Usuario actualizado: ${id}`);

    res.json({ ok: true, message: 'Usuario actualizado', user: result.rows[0] });
  } catch (error) {
    console.error('❌ Error en PUT /users/:id:', error.message);
    res.status(500).json({ error: 'Error al actualizar usuario', details: error.message });
  }
});

// ========================================================
// DELETE /users/:id — soft delete (super_admin)
// ========================================================
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.rol !== 'super_admin') {
      return res.status(403).json({ error: 'Solo super_admin puede eliminar usuarios' });
    }

    if (req.user.id === id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    const userExists = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [id]
    );
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const result = await pool.query(
      `UPDATE users SET activo = false
       WHERE id = $1
       RETURNING id, email, nombre`,
      [id]
    );

    console.log(`[Users] 🗑️ Usuario desactivado: ${result.rows[0].email}`);

    res.json({ ok: true, message: 'Usuario eliminado', user: result.rows[0] });
  } catch (error) {
    console.error('❌ Error en DELETE /users/:id:', error.message);
    res.status(500).json({ error: 'Error al eliminar usuario', details: error.message });
  }
});

export default router;