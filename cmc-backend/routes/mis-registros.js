import express from "express";
import pool from "../db.js";
import { authMiddleware } from "../utils/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/mis-registros
 * Obtener check-ins/registros del usuario actual
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { sede, edicion } = req.query;

    // ✅ Seguridad: Solo ve sus propios registros (a menos que sea admin)
    const usuarioId = req.user.rol === "super_admin" 
      ? req.query.usuario_id || req.user.id 
      : req.user.id;

    let query = `
      SELECT id, usuario_id, titulo, evento, tipo, lugar, sede, edicion, fecha, dia
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

    query += " ORDER BY fecha DESC";

    const result = await pool.query(query, params);

    res.json(result.rows);

  } catch (err) {
    console.error("❌ Error en GET /mis-registros:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;