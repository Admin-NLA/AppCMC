import express from "express";
import pool from "../db.js";
import { authMiddleware } from "../utils/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/networking
 * Obtener lista de asistentes para networking
 * 
 * CASO ESPECIAL: Si rol=asistente y tipo_pase=general,
 * solo ve a otros asistentes generales
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { sede, edicion, tipo_pase } = req.query;

    let query = `
      SELECT id, nombre, email, empresa, cargo, rol, tipo_pase, sede, edicion, 
             foto, telefono, bio, created_at
      FROM usuarios
      WHERE rol = 'asistente'
    `;
    const params = [];
    let paramIndex = 1;

    // 🔴 CASO ESPECIAL: Asistente General solo ve otros Generales
    if (tipo_pase === "general") {
      query += ` AND tipo_pase = $${paramIndex}`;
      params.push("general");
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

    query += " ORDER BY nombre ASC";

    const result = await pool.query(query, params);

    res.json(result.rows);

  } catch (err) {
    console.error("❌ Error en GET /networking:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;