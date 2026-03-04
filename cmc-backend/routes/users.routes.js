import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// ========================================================
// GET /users - Obtener lista de usuarios (super_admin o staff)
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
// GET /users/:id - Obtener usuario específico
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
        empresa, telefono, ciudad, foto_url, bio, linkedin_url, twitter_url,
        activo, created_at, updated_at
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
// POST /users - Crear usuario (solo super_admin)
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
      rol = 'asistente',
      tipo_pase = 'general',
      sede = 'chile',
      empresa = '',
      telefono = '',
    } = req.body;

    // Validaciones básicas
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    // Roles válidos del sistema
    const rolesValidos = [
      'asistente_general', 'asistente_curso', 'asistente_sesiones',
      'asistente_combo', 'expositor', 'speaker', 'staff', 'super_admin'
    ];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ error: `Rol inválido. Opciones: ${rolesValidos.join(', ')}` });
    }

    // Verificar email duplicado
    const emailExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailExists.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password, nombre, rol, tipo_pase, sede, empresa, telefono, activo, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
       RETURNING id, nombre, email, rol, tipo_pase, sede, empresa, activo, created_at`,
      [email, hashedPassword, nombre, rol, tipo_pase, sede, empresa, telefono]
    );

    console.log(`[Users] ✅ Usuario creado: ${email} (${rol})`);

    res.status(201).json({
      ok: true,
      message: 'Usuario creado correctamente',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error en POST /users:', error.message);
    res.status(500).json({ error: 'Error al crear usuario', details: error.message });
  }
});

// ========================================================
// PUT /users/:id - Editar usuario (super_admin)
// ========================================================
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.rol !== 'super_admin') {
      return res.status(403).json({ error: 'Solo super_admin puede editar usuarios' });
    }

    const {
      nombre, email, rol, tipo_pase, sede,
      empresa, telefono, ciudad, bio, linkedin_url, twitter_url
    } = req.body;

    const userExists = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const updates = [];
    const values = [];
    let p = 1;

    const fields = { nombre, email, rol, tipo_pase, sede, empresa, telefono, ciudad, bio, linkedin_url, twitter_url };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        updates.push(`${key} = $${p}`);
        values.push(val);
        p++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${p}
       RETURNING id, nombre, email, rol, tipo_pase, sede, empresa, activo, updated_at`,
      values
    );

    res.json({ ok: true, message: 'Usuario actualizado', user: result.rows[0] });
  } catch (error) {
    console.error('❌ Error en PUT /users/:id:', error.message);
    res.status(500).json({ error: 'Error al actualizar usuario', details: error.message });
  }
});

// ========================================================
// DELETE /users/:id - Soft delete (super_admin)
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

    const userExists = await pool.query('SELECT id, email FROM users WHERE id = $1', [id]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const result = await pool.query(
      `UPDATE users SET activo = false, updated_at = NOW() WHERE id = $1 RETURNING id, email, nombre`,
      [id]
    );

    res.json({ ok: true, message: 'Usuario eliminado', user: result.rows[0] });
  } catch (error) {
    console.error('❌ Error en DELETE /users/:id:', error.message);
    res.status(500).json({ error: 'Error al eliminar usuario', details: error.message });
  }
});

export default router;