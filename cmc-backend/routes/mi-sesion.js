import express from "express";
import pool from "../db.js";
import { authMiddleware } from "../utils/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/mi-sesion
 * Obtener sesión del speaker actual
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { speaker_id, sede, edicion } = req.query;

    // ✅ Seguridad: Solo el speaker o admin puede ver
    if (req.user.rol !== "super_admin" && req.user.id !== parseInt(speaker_id)) {
      return res.status(403).json({ error: "No autorizado" });
    }

    let query = `
      SELECT id, titulo, descripcion, horaInicio, horaFin, duracion, 
             lugar, dia, sede, edicion, speaker_id, created_at
      FROM sesiones
      WHERE speaker_id = $1
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

    query += " LIMIT 1";

    const result = await pool.query(query, params);

    res.json({
      sesion: result.rows[0] || null
    });

  } catch (err) {
    console.error("❌ Error en GET /mi-sesion:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * GET /api/mi-sesion/asistentes/:sesion_id
 * Obtener asistentes de la sesión del speaker
 */
router.get("/asistentes/:sesion_id", authMiddleware, async (req, res) => {
  try {
    const { sesion_id } = req.params;

    // Obtener asistentes de la sesión
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.empresa, u.cargo, 
              r.checkin_at, r.confirmado
       FROM usuarios u
       LEFT JOIN registros r ON u.id = r.usuario_id AND r.sesion_id = $1
       WHERE u.sesion_id = $1
       ORDER BY u.nombre ASC`,
      [sesion_id]
    );

    const asistentes = result.rows;

    // Calcular estadísticas
    const stats = {
      totalAsistentes: asistentes.length,
      confirmados: asistentes.filter(a => a.confirmado).length,
      checkIns: asistentes.filter(a => a.checkin_at).length
    };

    res.json({
      asistentes,
      stats
    });

  } catch (err) {
    console.error("❌ Error en GET /mi-sesion/asistentes:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;