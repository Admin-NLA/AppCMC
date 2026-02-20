import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/mi-sesion
 * Obtener sesión del speaker actual
 */
router.get('/', authRequired, async (req, res) => {
  try {
    const { speaker_id, sede, edicion } = req.query;

    // ✅ Seguridad: Solo el speaker o admin/super_admin puede ver
    if (req.user.rol !== 'super_admin' && req.user.rol !== 'admin' && req.user.id !== parseInt(speaker_id)) {
      return res.status(403).json({ 
        ok: false,
        error: 'No autorizado' 
      });
    }

    let query = `
      SELECT 
        id, 
        title as titulo, 
        description as descripcion, 
        dia,
        start_at as "horaInicio", 
        end_at as "horaFin", 
        duracion,
        sala, 
        room,
        tipo, 
        categoria, 
        sede, 
        edicion, 
        speakers as speaker_id, 
        created_at
      FROM agenda
      WHERE speakers && ARRAY[$1]::uuid[]
    `;
    const params = [speaker_id];
    let paramIndex = 2;

    if (sede) {
      query += ` AND sede = $${paramIndex}`;
      params.push(sede);
      paramIndex++;
    }

    if (edicion) {
      query += ` AND edicion = $${paramIndex}`;
      params.push(edicion);
      paramIndex++;
    }

    query += ' AND activo = true LIMIT 1';

    const result = await pool.query(query, params);

    res.json({
      ok: true,
      sesion: result.rows[0] || null
    });

  } catch (err) {
    console.error('❌ Error en GET /mi-sesion:', err.message);
    res.status(500).json({ 
      ok: false,
      error: 'Error interno del servidor' 
    });
  }
});

/**
 * GET /api/mi-sesion/asistentes/:sesion_id
 * Obtener asistentes de la sesión del speaker
 */
router.get('/asistentes/:sesion_id', authRequired, async (req, res) => {
  try {
    const { sesion_id } = req.params;

    // Obtener asistentes de la sesión
    const result = await pool.query(
      `SELECT 
        u.id, 
        u.nombre, 
        u.email, 
        u.empresa, 
        u.cargo
      FROM usuarios u
      WHERE u.sesion_id = $1
      ORDER BY u.nombre ASC`,
      [sesion_id]
    );

    const asistentes = result.rows;

    // Calcular estadísticas (placeholder, ajusta según tu BD)
    const stats = {
      totalAsistentes: asistentes.length,
      confirmados: 0,
      checkIns: 0
    };

    res.json({
      ok: true,
      asistentes,
      stats
    });

  } catch (err) {
    console.error('❌ Error en GET /mi-sesion/asistentes:', err.message);
    res.status(500).json({ 
      ok: false,
      error: 'Error interno del servidor' 
    });
  }
});

export default router;