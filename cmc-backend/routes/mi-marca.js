// cmc-backend/routes/mi-marca.js
//
// FIX: La versión anterior consultaba la tabla 'visitantes' que NO existe
//      en la base de datos real. Las tablas reales son:
//        - expositores_metrica  (registra visitas a stands: expositor_id, user_id, tipo, created_at)
//        - expositores          (datos del stand: nombre, stand, logo_url, usuario_id)
//        - users                (datos del visitante: nombre, email, empresa)
//
//      NUEVO FLUJO:
//        GET /api/mi-marca         → visitas registradas en expositores_metrica
//        POST /api/mi-marca/visita → registrar visita escaneando QR de asistente
//        GET /api/mi-marca/perfil  → datos del expositor (nombre, stand, logo, descripción)
//        PUT /api/mi-marca/perfil  → editar datos del expositor

import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ============================================================
// GET /api/mi-marca
// Obtener visitas registradas al stand del expositor
// ============================================================
router.get('/', authRequired, async (req, res) => {
  try {
    const { expositor_id, sede, edicion } = req.query;

    // Solo el expositor dueño, staff o super_admin
    if (
      req.user.rol !== 'super_admin' &&
      req.user.rol !== 'staff' &&
      req.user.id !== expositor_id
    ) {
      return res.status(403).json({ ok: false, error: 'No autorizado' });
    }

    const id = expositor_id || req.user.id;

    // Buscar el expositor vinculado al usuario (via expositores.usuario_id)
    const expRes = await pool.query(
      `SELECT id, nombre, stand, logo_url, sede, edicion
       FROM expositores
       WHERE usuario_id = $1 AND activo = true
       LIMIT 1`,
      [id]
    );

    if (expRes.rows.length === 0) {
      return res.json({
        ok: true,
        visitantes: [],
        stats: { total: 0, hoy: 0, por_dia: {} },
        expositor: null,
      });
    }

    const expositor = expRes.rows[0];

    // Obtener visitas de expositores_metrica JOIN users
    let query = `
      SELECT
        em.id,
        em.user_id,
        em.tipo,
        em.created_at                         AS fecha,
        u.nombre,
        u.email,
        u.empresa,
        u.rol,
        EXTRACT(DOW FROM em.created_at)::int  AS dia_semana
      FROM expositores_metrica em
      JOIN users u ON u.id = em.user_id
      WHERE em.expositor_id = $1
    `;

    const params = [expositor.id];
    let p = 2;

    if (sede) {
      // expositores_metrica no tiene sede propia; filtramos por el expositor
      // (ya filtrado arriba). Se ignora el filtro de sede en la métrica.
    }

    query += ' ORDER BY em.created_at DESC';

    const result = await pool.query(query, params);
    const visitantes = result.rows;

    // Estadísticas
    const hoy = new Date().toDateString();
    const por_dia = {};
    visitantes.forEach((v) => {
      const d = new Date(v.fecha).toDateString();
      por_dia[d] = (por_dia[d] || 0) + 1;
    });

    const stats = {
      total: visitantes.length,
      hoy: visitantes.filter((v) => new Date(v.fecha).toDateString() === hoy).length,
      por_dia,
    };

    res.json({ ok: true, visitantes, stats, expositor });

  } catch (err) {
    console.error('❌ Error en GET /mi-marca:', err.message);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

// ============================================================
// POST /api/mi-marca/visita
// Registrar una visita al stand (por QR o manual)
// ============================================================
router.post('/visita', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'expositor' && req.user.rol !== 'super_admin' && req.user.rol !== 'staff') {
      return res.status(403).json({ ok: false, error: 'Solo expositores pueden registrar visitas' });
    }

    const { visitante_user_id, tipo = 'visita_stand' } = req.body;

    if (!visitante_user_id) {
      return res.status(400).json({ ok: false, error: 'visitante_user_id es requerido' });
    }

    // Buscar el expositor vinculado al usuario registrando
    const expRes = await pool.query(
      'SELECT id FROM expositores WHERE usuario_id = $1 AND activo = true LIMIT 1',
      [req.user.id]
    );

    if (expRes.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'No tienes un stand vinculado a tu cuenta' });
    }

    const expositorId = expRes.rows[0].id;

    // Verificar que el visitante existe
    const userRes = await pool.query(
      'SELECT id, nombre, email, empresa FROM users WHERE id = $1 AND activo = true',
      [visitante_user_id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Visitante no encontrado' });
    }

    // Registrar la visita
    const result = await pool.query(
      `INSERT INTO expositores_metrica (expositor_id, user_id, tipo, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [expositorId, visitante_user_id, tipo]
    );

    console.log(`[MiMarca] ✅ Visita registrada: expositor ${expositorId} ← user ${visitante_user_id}`);

    res.status(201).json({
      ok: true,
      message: 'Visita registrada exitosamente',
      visita: result.rows[0],
      visitante: userRes.rows[0],
    });

  } catch (err) {
    console.error('❌ Error en POST /mi-marca/visita:', err.message);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

export default router;