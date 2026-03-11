// cmc-backend/routes/mis-registros.js
//
// FIX: La versión anterior consultaba la tabla 'registros' que NO existe.
//      Las tablas reales son:
//        • asistencias_sesion  — check-ins en sesiones
//        • asistencias_curso   — check-ins en cursos
//        • entradas            — entrada general al evento

import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ============================================================
// Helper: construye la UNION sin índices duplicados entre subqueries
// ============================================================
function buildUnionQuery(usuarioId, sede, edicion) {
  const params = [usuarioId];
  let p = 2;

  let s1 = '', s2 = '', s3 = '';
  if (sede) {
    s1 = ` AND a.sede = $${p}`;
    s2 = ` AND ac.sede = $${p}`;
    s3 = ` AND e.sede = $${p}`;
    params.push(sede);
    p++;
  }

  let e1 = '', e2 = '';
  if (edicion) {
    e1 = ` AND ag.edicion = $${p}`;
    e2 = ` AND ag2.edicion = $${p}`;
    params.push(Number(edicion));
    p++;
  }

  const sql = `
    SELECT
      a.id,
      a.user_id             AS usuario_id,
      ag.title              AS titulo,
      ag.title              AS evento,
      'sesion'              AS tipo,
      ag.room               AS lugar,
      a.sede,
      ag.edicion,
      a.fecha::date         AS fecha,
      ag.day_number         AS dia
    FROM asistencias_sesion a
    JOIN agenda ag ON ag.id = a.session_id
    WHERE a.user_id = $1 ${s1} ${e1}

    UNION ALL

    SELECT
      ac.id,
      ac.user_id            AS usuario_id,
      ag2.title             AS titulo,
      ag2.title             AS evento,
      'curso'               AS tipo,
      ag2.room              AS lugar,
      ac.sede,
      ag2.edicion,
      ac.fecha::date        AS fecha,
      ag2.day_number        AS dia
    FROM asistencias_curso ac
    JOIN agenda ag2 ON ag2.id = ac.curso_id
    WHERE ac.user_id = $1 ${s2} ${e2}

    UNION ALL

    SELECT
      e.id,
      e.user_id             AS usuario_id,
      'Entrada al evento'   AS titulo,
      'Entrada al evento'   AS evento,
      'entrada'             AS tipo,
      e.sede                AS lugar,
      e.sede,
      NULL::int             AS edicion,
      e.fecha               AS fecha,
      e.dia
    FROM entradas e
    WHERE e.user_id = $1 ${s3}

    ORDER BY fecha DESC
  `;

  return { sql, params };
}

// ============================================================
// GET /api/mis-registros
// Todos los registros del usuario (sesiones + cursos + entradas)
// super_admin puede pasar ?usuario_id=uuid para ver otro usuario
// ============================================================
router.get('/', authRequired, async (req, res) => {
  try {
    const { sede, edicion } = req.query;
    const usuarioId =
      req.user.rol === 'super_admin'
        ? req.query.usuario_id || req.user.id
        : req.user.id;

    const { sql, params } = buildUnionQuery(usuarioId, sede, edicion);
    const result = await pool.query(sql, params);

    res.json({ ok: true, registros: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('❌ Error en GET /mis-registros:', err.message);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

// ============================================================
// GET /api/mis-registros/sesiones
// Solo check-ins de sesiones del usuario actual
// ============================================================
router.get('/sesiones', authRequired, async (req, res) => {
  try {
    const { sede, edicion } = req.query;
    const params = [req.user.id];
    let p = 2, extra = '';

    if (sede)    { extra += ` AND a.sede = $${p}`;    params.push(sede);          p++; }
    if (edicion) { extra += ` AND ag.edicion = $${p}`; params.push(Number(edicion)); p++; }

    const result = await pool.query(`
      SELECT
        a.id, ag.title AS titulo, ag.room AS lugar,
        a.sede, ag.edicion, a.fecha::date AS fecha,
        ag.day_number AS dia, ag.start_at AS hora_inicio,
        ag.end_at AS hora_fin, ag.sala, 'sesion' AS tipo
      FROM asistencias_sesion a
      JOIN agenda ag ON ag.id = a.session_id
      WHERE a.user_id = $1 ${extra}
      ORDER BY a.fecha DESC
    `, params);

    res.json({ ok: true, sesiones: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('❌ Error en GET /mis-registros/sesiones:', err.message);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

// ============================================================
// GET /api/mis-registros/cursos
// Solo check-ins de cursos del usuario actual
// ============================================================
router.get('/cursos', authRequired, async (req, res) => {
  try {
    const { sede, edicion } = req.query;
    const params = [req.user.id];
    let p = 2, extra = '';

    if (sede)    { extra += ` AND ac.sede = $${p}`;    params.push(sede);           p++; }
    if (edicion) { extra += ` AND ag.edicion = $${p}`; params.push(Number(edicion)); p++; }

    const result = await pool.query(`
      SELECT
        ac.id, ag.title AS titulo, ag.room AS lugar,
        ac.sede, ag.edicion, ac.fecha::date AS fecha,
        ag.day_number AS dia, ag.start_at AS hora_inicio,
        ag.end_at AS hora_fin, ag.sala, 'curso' AS tipo
      FROM asistencias_curso ac
      JOIN agenda ag ON ag.id = ac.curso_id
      WHERE ac.user_id = $1 ${extra}
      ORDER BY ac.fecha DESC
    `, params);

    res.json({ ok: true, cursos: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('❌ Error en GET /mis-registros/cursos:', err.message);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

// ============================================================
// GET /api/mis-registros/usuario/:id
// Solo staff/super_admin — ver registros de cualquier usuario
// ============================================================
router.get('/usuario/:id', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'staff' && req.user.rol !== 'super_admin') {
      return res.status(403).json({ ok: false, error: 'No autorizado' });
    }
    const { sql, params } = buildUnionQuery(req.params.id, null, null);
    const result = await pool.query(sql, params);
    res.json({ ok: true, registros: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('❌ Error en GET /mis-registros/usuario/:id:', err.message);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

export default router;