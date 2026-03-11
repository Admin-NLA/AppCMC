import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/networking
 * Obtener lista de asistentes para networking
 *
 * FIX: Consultaba tabla 'usuarios' (no existe). La tabla real es 'users'.
 *      También se corrigió la columna 'foto' → 'avatar_url' y se
 *      actualizaron los roles a los 4 subtipos reales del sistema
 *      (asistente_general, asistente_curso, asistente_sesiones, asistente_combo).
 *
 * CASO ESPECIAL: Si rol=asistente_general, solo ve a otros asistentes_general.
 */
router.get('/', authRequired, async (req, res) => {
  try {
    const { sede, edicion } = req.query;
    const rolSolicitante = req.user.rol;

    // FIX: tabla real 'users', columna 'avatar_url' (antes 'foto')
    let query = `
      SELECT
        id,
        nombre,
        email,
        empresa,
        cargo,
        rol,
        tipo_pase,
        sede,
        edicion,
        avatar_url,
        movil      AS telefono,
        created_at
      FROM users
      WHERE activo = true
        AND rol IN (
          'asistente_general',
          'asistente_curso',
          'asistente_sesiones',
          'asistente_combo'
        )
    `;
    const params = [];
    let paramIndex = 1;

    // CASO ESPECIAL: Asistente General solo ve otros asistente_general
    if (rolSolicitante === 'asistente_general') {
      query += ` AND rol = $${paramIndex}`;
      params.push('asistente_general');
      paramIndex++;
    }

    // Filtros opcionales
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

    query += ' ORDER BY nombre ASC';

    const result = await pool.query(query, params);

    res.json({
      ok: true,
      asistentes: result.rows,
      total: result.rows.length
    });

  } catch (err) {
    console.error('❌ Error en GET /networking:', err.message);
    res.status(500).json({
      ok: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router;