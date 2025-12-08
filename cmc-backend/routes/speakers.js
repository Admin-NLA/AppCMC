import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../utils/authMiddleware.js";

const router = Router();

// Obtener todos los speakers
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM speakers ORDER BY nombre ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Speakers GET error:", err);
    res.status(500).json({ error: "Error al obtener speakers" });
  }
});

// Obtener un speaker por ID
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM speakers WHERE id = $1",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Speaker no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Speakers GET ID error:", err);
    res.status(500).json({ error: "Error al obtener speaker" });
  }
});

// Crear speaker (solo admin)
router.post("/", authRequired, async (req, res) => {
  try {
    if (req.user.rol !== "admin") {
      return res.status(403).json({ error: "Solo admin puede crear speakers" });
    }

    const { nombre, bio, company, photo_url } = req.body;

    const result = await pool.query(
      `INSERT INTO speakers (nombre, bio, company, photo_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nombre, bio, company, photo_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Speakers POST error:", err);
    res.status(500).json({ error: "Error al crear speaker" });
  }
});

// Editar speaker (solo admin)
router.put("/:id", authRequired, async (req, res) => {
  try {
    if (req.user.rol !== "admin") {
      return res.status(403).json({ error: "Solo admin puede editar speakers" });
    }

    const { nombre, bio, company, photo_url } = req.body;

    const result = await pool.query(
      `UPDATE speakers
       SET nombre = $1, bio = $2, company = $3, photo_url = $4
       WHERE id = $5
       RETURNING *`,
      [nombre, bio, company, photo_url, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Speakers PUT error:", err);
    res.status(500).json({ error: "Error al editar speaker" });
  }
});

// Eliminar speaker (solo admin)
router.delete("/:id", authRequired, async (req, res) => {
  try {
    if (req.user.rol !== "admin") {
      return res.status(403).json({ error: "Solo admin puede eliminar speakers" });
    }

    await pool.query("DELETE FROM speakers WHERE id = $1", [req.params.id]);

    res.json({ message: "Speaker eliminado" });
  } catch (err) {
    console.error("Speakers DELETE error:", err);
    res.status(500).json({ error: "Error al eliminar speaker" });
  }
});

export default router;
