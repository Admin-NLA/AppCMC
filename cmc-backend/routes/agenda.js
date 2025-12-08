import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../utils/authMiddleware.js";

const router = Router();

// Obtener TODA la agenda
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM agenda ORDER BY start_at ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Agenda error:", err);
    res.status(500).json({ error: "Error al obtener agenda" });
  }
});

// Obtener una sesión por ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM agenda WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Sesión no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Agenda ID error:", err);
    res.status(500).json({ error: "Error al obtener sesión" });
  }
});

// Crear sesión (solo admins)
router.post("/", authRequired, async (req, res) => {
  try {
    if (req.user.rol !== "admin") {
      return res.status(403).json({ error: "Solo admin puede crear sesiones" });
    }

    const { title, description, start_at, end_at, room, speakers } = req.body;

    const result = await pool.query(
      `INSERT INTO agenda (title, description, start_at, end_at, room, speakers)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description, start_at, end_at, room, speakers || []]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Agenda create error:", err);
    res.status(500).json({ error: "Error al crear sesión" });
  }
});

// Marcar como “asistiré” / favorito
router.post("/:id/favorito", authRequired, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Inserta si no existe
    await pool.query(
      `INSERT INTO favoritos (user_id, session_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, id]
    );

    res.json({ message: "Añadido a favoritos" });
  } catch (err) {
    console.error("Favorito error:", err);
    res.status(500).json({ error: "Error al marcar favorito" });
  }
});

// Quitar favorito
router.delete("/:id/favorito", authRequired, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    await pool.query(
      "DELETE FROM favoritos WHERE user_id = $1 AND session_id = $2",
      [userId, id]
    );

    res.json({ message: "Favorito eliminado" });
  } catch (err) {
    console.error("Eliminar favorito error:", err);
    res.status(500).json({ error: "Error al eliminar favorito" });
  }
});

// Obtener favoritos del usuario
router.get("/mis/favoritos", authRequired, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT session_id FROM favoritos WHERE user_id = $1`,
      [req.user.id]
    );

    res.json(result.rows.map((r) => r.session_id));
  } catch (err) {
    console.error("Mis favoritos error:", err);
    res.status(500).json({ error: "Error al obtener favoritos" });
  }
});

export default router;
