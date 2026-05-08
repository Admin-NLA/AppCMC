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
      sedes,
      edicion = 2026,
      empresa = '',
      telefono = '',
    } = req.body;

    // Calcular sede principal y array de sedes
    const sedesParsed = Array.isArray(sedes) && sedes.length ? sedes : [sede];
    const sedePrincipal = sedesParsed[0] || 'colombia';

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

    const password_hash = await bcrypt.hash(password, 10);

    // multi_sedes es ARRAY en PostgreSQL — pasar como texto[] no como JSON
    const result = await pool.query(
      `INSERT INTO users
        (email, password_hash, nombre, rol, tipo_pase, sede, empresa, movil, activo, edicion, multi_sedes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, NOW())
       RETURNING id, nombre, email, rol, tipo_pase, sede, empresa, activo, edicion, created_at`,
      [email.toLowerCase().trim(), password_hash, nombre, rol, tipo_pase, sedePrincipal,
        empresa, telefono, parseInt(edicion) || 2026, sedesParsed]
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
        multi_sedes: sedesParsed ? JSON.stringify(sedesParsed) : undefined,
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
      `UPDATE users SET activo = false, fecha_eliminado = NOW()
       WHERE id = $1
       RETURNING id, email, nombre`,
      [id]
    ).catch(async () => {
      // Si fecha_eliminado no existe aún, solo marcar activo=false
      return pool.query(
        `UPDATE users SET activo = false WHERE id = $1 RETURNING id, email, nombre`,
        [id]
      );
    });

    console.log(`[Users] 🗑️ Usuario enviado a papelera: ${result.rows[0].email}`);
    res.json({ ok: true, message: 'Usuario enviado a papelera', user: result.rows[0] });
  } catch (error) {
    console.error('❌ Error en DELETE /users/:id:', error.message);
    res.status(500).json({ error: 'Error al eliminar usuario', details: error.message });
  }
});


// ════════════════════════════════════════════════════════════
// PAPELERA DE USUARIOS
// ════════════════════════════════════════════════════════════

// GET /users/papelera — usuarios inactivos (papelera)
router.get('/papelera', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'super_admin')
      return res.status(403).json({ error: 'Solo super_admin' });

    const r = await pool.query(`
      SELECT id, nombre, email, rol, tipo_pase, sede, empresa, activo,
             created_at,
             COALESCE(fecha_eliminado, created_at) as fecha_eliminado
      FROM users
      WHERE activo = false
      ORDER BY COALESCE(fecha_eliminado, created_at) DESC
    `);
    res.json({ ok: true, usuarios: r.rows, total: r.rows.length });
  } catch (err) {
    // Si fecha_eliminado no existe como columna, consulta sin ella
    try {
      const r = await pool.query(`
        SELECT id, nombre, email, rol, tipo_pase, sede, empresa, activo, created_at
        FROM users WHERE activo = false ORDER BY created_at DESC
      `);
      res.json({ ok: true, usuarios: r.rows, total: r.rows.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
});

// POST /users/:id/restaurar — recuperar usuario de la papelera
router.post('/:id/restaurar', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'super_admin')
      return res.status(403).json({ error: 'Solo super_admin' });

    const { id } = req.params;
    const r = await pool.query(
      `UPDATE users
       SET activo = true, fecha_eliminado = NULL
       WHERE id = $1 AND activo = false
       RETURNING id, nombre, email, rol`,
      [id]
    ).catch(() =>
      pool.query(
        `UPDATE users SET activo = true WHERE id = $1 AND activo = false RETURNING id, nombre, email, rol`,
        [id]
      )
    );

    if (!r.rows.length)
      return res.status(404).json({ error: 'Usuario no encontrado en papelera' });

    console.log(`[Users] ♻️ Usuario restaurado: ${r.rows[0].email}`);
    res.json({ ok: true, message: 'Usuario restaurado', user: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /users/:id/permanente — eliminar definitivamente (hard delete)
router.delete('/:id/permanente', authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    if (req.user.rol !== 'super_admin')
      return res.status(403).json({ error: 'Solo super_admin' });

    const { id } = req.params;
    if (req.user.id === id)
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });

    const check = await client.query(
      'SELECT email, nombre FROM users WHERE id=$1', [id]
    );
    if (!check.rows.length)
      return res.status(404).json({ error: 'Usuario no encontrado' });

    await client.query('BEGIN');

    // Limpiar todas las tablas relacionadas
    const tablas = [
      'user_sedes',
      'favoritos',
      'asistencias_sesion',
      'asistencias_curso',
      'notificaciones_vistas',
      'stand_visitas',
      'respuestas_encuesta',
      'entradas',
    ];
    for (const tabla of tablas) {
      await client.query(
        `DELETE FROM ${tabla} WHERE user_id = $1`, [id]
      ).catch(() => { }); // ignorar si la tabla no tiene esa columna
    }

    // Networking: usa solicitante_id
    await client.query(
      `DELETE FROM networking WHERE solicitante_id = $1`, [id]
    ).catch(() => { });

    // Eliminar el usuario
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    await client.query('COMMIT');

    console.log(`[Users] 💀 Usuario eliminado permanentemente: ${check.rows[0].email}`);
    res.json({ ok: true, message: `${check.rows[0].nombre} eliminado permanentemente` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Users] Error hard delete:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// NUEVAS FUNCIONES PARA UNION  ------------------- SYNC DESDE PROYECTO CMC
// ════════════════════════════════════════════════════════════════════════════════

// Mapa de tipo_pase del Excel → rol y tipo_pase de la web app
const TIPO_PASE_MAP = {
  'combo': { rol: 'asistente_combo', tipo_pase: 'combo' },
  'general': { rol: 'asistente_general', tipo_pase: 'general' },
  'sesiones': { rol: 'asistente_sesiones', tipo_pase: 'sesiones' },
  'sesion': { rol: 'asistente_sesiones', tipo_pase: 'sesiones' },
  'cursos': { rol: 'asistente_curso', tipo_pase: 'curso' },
  'curso': { rol: 'asistente_curso', tipo_pase: 'curso' },
  'expositor': { rol: 'expositor', tipo_pase: null },
  'speaker': { rol: 'speaker', tipo_pase: null },
  'ponente': { rol: 'speaker', tipo_pase: null },
  'staff': { rol: 'staff', tipo_pase: null },
};

// ── Helper: normalizar tipo_pase que viene del Excel ────────
function normalizarTipoPase(raw) {
  if (!raw) return 'general';
  const val = raw.toLowerCase().trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // quita acentos
  for (const key of Object.keys(TIPO_PASE_MAP)) {
    if (val.includes(key)) return key;
  }
  return 'general';
}

// ============================================================
// POST /api/users/sync-from-excel
// Recibe lista de usuarios desde Proyecto CMC y hace upsert
// Body: { usuarios: [ {nombre, apellido, email, empresa,
//                      telefono, tipo_pase, sede, edicion} ] }
// Auth: X-Service-Token (no requiere login de usuario)
// ============================================================
router.post('/sync-from-excel', async (req, res) => {
  try {
    // Verificar service token
    const token = req.headers['x-service-token'];
    if (!token || token !== process.env.DESKTOP_SERVICE_TOKEN) {
      return res.status(401).json({ ok: false, error: 'Token inválido o ausente' });
    }

    const { usuarios } = req.body;

    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      return res.status(400).json({ ok: false, error: 'Lista de usuarios vacía o inválida' });
    }

    const creados = [];
    const actualizados = [];
    const errores = [];

    for (const u of usuarios) {
      try {
        // Validar que tenga email
        if (!u.email || !u.email.includes('@')) {
          errores.push({ email: u.email || 'sin email', error: 'Email inválido' });
          continue;
        }

        const email = u.email.toLowerCase().trim();
        const nombre = `${u.nombre || ''} ${u.apellido || ''}`.trim();
        const empresa = u.empresa || '';
        const movil = u.telefono || '';
        const sede = u.sede || 'colombia';
        const edicion = parseInt(u.edicion) || 2026;

        // Determinar rol y tipo_pase
        const tipoKey = normalizarTipoPase(u.tipo_pase);
        const mapping = TIPO_PASE_MAP[tipoKey] || TIPO_PASE_MAP['general'];
        const rol = mapping.rol;
        const tipo_pase = mapping.tipo_pase || tipoKey;

        // Password temporal: CMC2026! + primeras 4 letras del email
        const prefijo = email.split('@')[0].slice(0, 4);
        const passwordTemp = `CMC2026!${prefijo}`;
        const password_hash = await bcrypt.hash(passwordTemp, 10);

        // Upsert: crear si no existe, actualizar si ya existe
        const result = await pool.query(
          `INSERT INTO users
             (email, password_hash, nombre, rol, tipo_pase,
              sede, empresa, movil, activo, edicion, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, NOW())
           ON CONFLICT (email)
           DO UPDATE SET
             nombre    = EXCLUDED.nombre,
             rol       = EXCLUDED.rol,
             tipo_pase = EXCLUDED.tipo_pase,
             empresa   = EXCLUDED.empresa,
             movil     = EXCLUDED.movil,
             sede      = EXCLUDED.sede,
             activo    = true
           RETURNING id, email, nombre, rol, tipo_pase, xmax`,
          [email, password_hash, nombre, rol, tipo_pase,
            sede, empresa, movil, edicion]
        );

        const row = result.rows[0];
        // xmax = 0 significa que fue INSERT, > 0 fue UPDATE
        if (row.xmax === '0') {
          creados.push({ id: row.id, email: row.email, nombre: row.nombre, rol: row.rol });
        } else {
          actualizados.push({ id: row.id, email: row.email, nombre: row.nombre, rol: row.rol });
        }

      } catch (e) {
        errores.push({ email: u.email || 'desconocido', error: e.message });
      }
    }

    console.log(`[Sync] ✅ Sync desde Excel: ${creados.length} creados, ${actualizados.length} actualizados, ${errores.length} errores`);

    res.json({
      ok: true,
      resumen: {
        total: usuarios.length,
        creados: creados.length,
        actualizados: actualizados.length,
        errores: errores.length,
      },
      creados,
      actualizados,
      errores,
    });

  } catch (err) {
    console.error('❌ POST /users/sync-from-excel:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// GET /api/users/export-ids
// Devuelve mapa email → UUID para que Proyecto CMC
// pueda identificar usuarios al enviar escaneos
// Auth: X-Service-Token
// ============================================================
router.get('/export-ids', async (req, res) => {
  try {
    const token = req.headers['x-service-token'];
    if (!token || token !== process.env.DESKTOP_SERVICE_TOKEN) {
      return res.status(401).json({ ok: false, error: 'Token inválido o ausente' });
    }

    const { sede, edicion } = req.query;

    const conditions = ['activo = true'];
    const values = [];
    let p = 1;

    if (sede) { conditions.push(`sede = $${p++}`); values.push(sede); }
    if (edicion) { conditions.push(`edicion = $${p++}`); values.push(parseInt(edicion)); }

    const result = await pool.query(
      `SELECT id, email, nombre, rol, tipo_pase
       FROM users
       WHERE ${conditions.join(' AND ')}
       ORDER BY nombre ASC`,
      values
    );

    // Devolver como array y como mapa email→id para facilitar búsqueda
    const mapa = {};
    result.rows.forEach(u => { mapa[u.email] = u.id; });

    res.json({
      ok: true,
      total: result.rows.length,
      usuarios: result.rows,
      mapa,     // { 'juan@empresa.com': 'uuid-aqui', ... }
    });

  } catch (err) {
    console.error('❌ GET /users/export-ids:', err.message);
    res.status(500).json({ ok: false, error: err.message });
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

export default router;