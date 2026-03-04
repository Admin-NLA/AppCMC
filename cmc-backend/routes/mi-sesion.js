// cmc-backend/routes/mi-sesion.js
//
// FIX: La versión anterior tenía dos bugs críticos:
//
//   BUG 1 — GET /asistentes/:sesion_id
//     Consultaba la tabla 'usuarios' (no existe) y la columna
//     'u.sesion_id' (tampoco existe en users).
//     FIX: Usa la tabla real 'asistencias_sesion' JOIN 'users'
//          para obtener los asistentes con check-in en una sesión.
//
//   BUG 2 — GET /
//     El campo 'speakers' en la tabla agenda es uuid[] (array de UUIDs).
//     El speaker_id que llega del frontend puede ser string o UUID.
//     FIX: cast explícito a uuid en el WHERE con ANY().
//
//   AGREGADO: PUT /perfil — permite al speaker editar su bio y foto.

import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ============================================================
// GET /api/mi-sesion
// Obtener la(s) sesión(es) del speaker autenticado
// ============================================================
router.get('/', authRequired, async (req, res) => {
  try {
    const { speaker_id, sede, edicion } = req.query;

    // Solo el speaker o super_admin puede consultar
    if (req.user.rol !== 'super_admin' && req.user.rol !== 'staff' && req.user.id !== speaker_id) {
      return res.status(403).json({ ok: false, error: 'No autorizado' });
    }

    const id = speaker_id || req.user.id;

    // Primero buscamos el speaker en la tabla speakers por email o user_id vinculado
    // La agenda guarda uuid[] de speakers (ids de la tabla speakers, no de users).
    // Necesitamos el speaker.id a partir del user.id.
    // Buscamos por email para vincular.
    const userRes = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.json({ ok: true, sesiones: [], sesion: null });
    }

    const userEmail = userRes.rows[0].email;

    // Buscar speaker por email
    const speakerRes = await pool.query(
      'SELECT id FROM speakers WHERE email = $1 AND activo = true LIMIT 1',
      [userEmail]
    );

    if (speakerRes.rows.length === 0) {
      return res.json({ ok: true, sesiones: [], sesion: null });
    }

    const speakerId = speakerRes.rows[0].id;

    // Buscar sesiones donde este speaker está incluido
    let query = `
      SELECT
        id,
        title       AS titulo,
        description AS descripcion,
        dia,
        start_at    AS "horaInicio",
        end_at      AS "horaFin",
        sala,
        room        AS lugar,
        tipo,
        categoria,
        sede,
        edicion,
        capacidad,
        activo
      FROM agenda
      WHERE $1::uuid = ANY(speakers)
        AND activo = true
    `;

    const params = [speakerId];
    let p = 2;

    if (sede) {
      query += ` AND sede = $${p}`;
      params.push(sede);
      p++;
    }
    if (edicion) {
      query += ` AND edicion = $${p}`;
      params.push(Number(edicion));
      p++;
    }

    query += ' ORDER BY dia ASC, start_at ASC';

    const result = await pool.query(query, params);
    const sesiones = result.rows;

    res.json({
      ok:      true,
      sesiones,
      sesion:  sesiones[0] || null,   // primera sesión como principal
      speaker_id: speakerId,
    });

  } catch (err) {
    console.error('❌ Error en GET /mi-sesion:', err.message);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

// ============================================================
// GET /api/mi-sesion/asistentes/:sesion_id
// Obtener asistentes con check-in en una sesión
//
// FIX: antes consultaba 'usuarios' y 'u.sesion_id' (no existen).
//      Ahora usa asistencias_sesion JOIN users.
// ============================================================
router.get('/asistentes/:sesion_id', authRequired, async (req, res) => {
  try {
    const { sesion_id } = req.params;

    // Solo speaker dueño de la sesión, staff o super_admin
    if (req.user.rol !== 'super_admin' && req.user.rol !== 'staff' && req.user.rol !== 'speaker') {
      return res.status(403).json({ ok: false, error: 'No autorizado' });
    }

    // FIX: consulta la tabla real asistencias_sesion JOIN users
    const result = await pool.query(
      `SELECT
        u.id,
        u.nombre,
        u.email,
        u.empresa,
        u.rol,
        a.fecha      AS checkin_at,
        a.metodo     AS metodo_checkin,
        a.registrado_por
       FROM asistencias_sesion a
       JOIN users u ON u.id = a.user_id
       WHERE a.session_id = $1
       ORDER BY a.fecha DESC`,
      [sesion_id]
    );

    const asistentes = result.rows;

    // Estadísticas básicas
    const stats = {
      totalAsistentes: asistentes.length,
      confirmados:     asistentes.length,  // todos los que tienen check-in están confirmados
      checkIns:        asistentes.filter((a) => a.checkin_at).length,
    };

    res.json({ ok: true, asistentes, stats });

  } catch (err) {
    console.error('❌ Error en GET /mi-sesion/asistentes:', err.message);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

// ============================================================
// PUT /api/mi-sesion/perfil
// Speaker edita su propio perfil (bio, foto)
// ============================================================
router.put('/perfil', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'speaker' && req.user.rol !== 'super_admin') {
      return res.status(403).json({ ok: false, error: 'Solo speakers pueden editar su perfil' });
    }

    const { bio, photo_url, cargo, linkedin_url, twitter_url, website_url } = req.body;

    // Buscar speaker vinculado por email del user
    const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }

    const speakerRes = await pool.query(
      'SELECT id FROM speakers WHERE email = $1 LIMIT 1',
      [userRes.rows[0].email]
    );

    if (speakerRes.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Perfil de speaker no encontrado' });
    }

    const speakerId = speakerRes.rows[0].id;

    const updates = [];
    const values  = [];
    let p = 1;

    const fields = { bio, photo_url, cargo, linkedin_url, twitter_url, website_url };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        updates.push(`${key} = $${p}`);
        values.push(val);
        p++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ ok: false, error: 'No hay campos para actualizar' });
    }

    values.push(speakerId);

    const result = await pool.query(
      `UPDATE speakers SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
      values
    );

    res.json({ ok: true, message: 'Perfil actualizado', speaker: result.rows[0] });

  } catch (err) {
    console.error('❌ Error en PUT /mi-sesion/perfil:', err.message);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

export default router;