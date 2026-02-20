import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/mis-registros
 * Obtener check-ins/registros del usuario actual
 */
router.get('/', authRequired, async (req, res) => {
  try {
    const { sede, edicion } = req.query;

    // ✅ Seguridad: Solo ve sus propios registros (a menos que sea admin/super_admin)
    const usuarioId = req.user.rol === 'super_admin' || req.user.rol === 'admin'
      ? req.query.usuario_id || req.user.id 
      : req.user.id;

    let query = `
      SELECT 
        id, 
        usuario_id, 
        titulo, 
        evento, 
        tipo, 
        lugar, 
        sede, 
        edicion, 
        fecha, 
        dia
      FROM registros
      WHERE usuario_id = $1
    `;
    const params = [usuarioId];

    // Filtros opcionales
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

    query += ' ORDER BY fecha DESC';

    const result = await pool.query(query, params);

    res.json({
      ok: true,
      registros: result.rows,
      total: result.rows.length
    });

  } catch (err) {
    console.error('❌ Error en GET /mis-registros:', err.message);
    res.status(500).json({ 
      ok: false,
      error: 'Error interno del servidor' 
    });
  }
});

export default router;