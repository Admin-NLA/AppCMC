import { Router } from "express";
import pool from "../db.js";

const router = Router();

// ------------------------
// 🟣 1. Estadísticas globales
// ------------------------
router.get("/stats", async (req, res) => {
  try {
    const sesiones = await pool.query("SELECT COUNT(*) FROM agenda");
    const speakers = await pool.query("SELECT COUNT(*) FROM speakers");
    const expositores = await pool.query("SELECT COUNT(*) FROM expositores");

    res.json({
      ok: true,
      totalSesiones: parseInt(sesiones.rows[0].count),
      totalSpeakers: parseInt(speakers.rows[0].count),
      totalExpositores: parseInt(expositores.rows[0].count)
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ ok: false, error: "Error interno stats" });
  }
});

// ------------------------
// 🟣 2. Últimas sesiones (para dashboard)
// ------------------------
router.get("/sessions", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          id,
          title,
          description,
          room,
          start_at,
          end_at,
          speakers
       FROM agenda
       ORDER BY start_at ASC
       LIMIT 10`
    );

    res.json({
      ok: true,
      sessions: result.rows
    });
  } catch (err) {
    console.error("Dashboard sessions error:", err);
    res.status(500).json({ ok: false, error: "Error interno sesiones" });
  }
});

export default router;
