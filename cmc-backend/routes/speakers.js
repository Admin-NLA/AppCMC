// cmc-backend/routes/speakers.js
import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../utils/authMiddleware.js";

const router = Router();

/* ========================================================
   GET — LISTA COMPLETA DE SPEAKERS (PÚBLICA)
======================================================== */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM speakers ORDER BY nombre ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Speakers error:", err);
    res.status(500).json({ error: "Error al obtener speakers" });
  }
});

/* ========================================================
   GET — DETALLE DE SPEAKER POR ID (PÚBLICO)
======================================================== */
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
    console.error("Speaker ID error:", err);
    res.status(500).json({ error: "Error al obtener speaker" });
  }
});

/* ========================================================
   POST — CREAR SPEAKER (ADMIN + STAFF)
======================================================== */
router.post("/", authRequired, async (req, res) => {
  try {
    if (req.user.rol !== "admin" && req.user.rol !== "staff") {
      return res.status(403).json({ error: "No autorizado para crear speakers" });
    }

    const { nombre, bio, foto_url, sede, empresa } = req.body;

    const result = await pool.query(
      `INSERT INTO speakers (nombre, bio, foto_url, sede, empresa)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nombre, bio, foto_url, sede, empresa]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("Speaker create error:", err);
    res.status(500).json({ error: "Error al crear speaker" });
  }
});

/* ========================================================
   PUT — EDITAR SPEAKER
   - ADMIN + STAFF pueden editar cualquier speaker
   - SPEAKER solo puede editar su propio perfil
======================================================== */
router.put("/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    // SPEAKER solo puede editar su propio perfil
    if (req.user.rol === "speaker" && req.user.speaker_id !== id) {
      return res.status(403).json({ error: "Solo puedes editar tu propio perfil" });
    }

    // ADMIN + STAFF pueden editar cualquier perfil
    if (req.user.rol !== "admin" && req.user.rol !== "staff" && req.user.rol !== "speaker") {
      return res.status(403).json({ error: "No autorizado para editar speakers" });
    }

    const { nombre, bio, foto_url, sede, empresa } = req.body;

    const result = await pool.query(
      `UPDATE speakers
       SET nombre=$1, bio=$2, foto_url=$3, sede=$4, empresa=$5
       WHERE id=$6
       RETURNING *`,
      [nombre, bio, foto_url, sede, empresa, id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Speaker update error:", err);
    res.status(500).json({ error: "Error al actualizar speaker" });
  }
});

/* ========================================================
   DELETE — ELIMINAR SPEAKER (SOLO ADMIN)
======================================================== */
router.delete("/:id", authRequired, async (req, res) => {
  try {
    if (req.user.rol !== "admin") {
      return res.status(403).json({ error: "Solo admin puede eliminar speakers" });
    }

    await pool.query("DELETE FROM speakers WHERE id = $1", [req.params.id]);

    res.json({ message: "Speaker eliminado" });

  } catch (err) {
    console.error("Speaker delete error:", err);
    res.status(500).json({ error: "Error al eliminar speaker" });
  }
});

export default router;