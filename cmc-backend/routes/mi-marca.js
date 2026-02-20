import express from "express";
import pool from "../db.js";
import { authRequired } from "../utils/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/mi-marca
 * Obtener visitantes registrados por el expositor
 */
router.get("/:usuario_id", authRequired, async (req, res) => {
  try {
    const { expositor_id, sede, edicion } = req.query;

    // ✅ Seguridad: Solo el expositor o admin puede ver
    if (req.user.rol !== "super_admin" && req.user.id !== parseInt(expositor_id)) {
      return res.status(403).json({ error: "No autorizado" });
    }

    let query = `
      SELECT id, nombre, email, empresa, cargo, telefono, expositor_id, 
             fecha, dia, sede, edicion, created_at
      FROM visitantes
      WHERE expositor_id = $1
    `;
    const params = [expositor_id];
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
    const visitantes = result.rows;

    // Calcular estadísticas
    const hoy = new Date().toDateString();
    const stats = {
      total: visitantes.length,
      hoy: visitantes.filter(v => new Date(v.fecha).toDateString() === hoy).length,
      por_dia: {}
    };

    res.json({
      visitantes,
      stats
    });

  } catch (err) {
    console.error("❌ Error en GET /mi-marca:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * POST /api/mi-marca/visitante
 * Registrar nuevo visitante
 */
router.post("/visitante", authRequired, async (req, res) => {
  try {
    const { nombre, email, empresa, cargo, telefono, expositor_id } = req.body;

    // ✅ Seguridad: Solo el expositor o admin puede registrar
    if (req.user.rol !== "super_admin" && req.user.id !== parseInt(expositor_id)) {
      return res.status(403).json({ error: "No autorizado" });
    }

    // Validar datos requeridos
    if (!nombre || !expositor_id) {
      return res.status(400).json({ error: "Nombre y expositor_id requeridos" });
    }

    const fecha = new Date();
    const dia = fecha.getDay(); // 0-6 (domingo-sábado)

    const result = await pool.query(
      `INSERT INTO visitantes (nombre, email, empresa, cargo, telefono, expositor_id, fecha, dia, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [nombre, email || null, empresa || null, cargo || null, telefono || null, expositor_id, fecha, dia, fecha]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("❌ Error en POST /mi-marca/visitante:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;