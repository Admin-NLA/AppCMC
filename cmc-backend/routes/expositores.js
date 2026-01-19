import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../utils/authMiddleware.js";

const router = Router();

/* ========================================================
   VER TODOS LOS EXPOSITORES
   - Permitido para TODOS excepto Asistente Curso
======================================================== */
router.get("/", authRequired, async (req, res) => {
  try {
    const rolApp = req.user.tipo_pase; // Curso, Sesiones, Combo, General, Expositor, Speaker, Staff

    if (rolApp === "Curso") {
      return res.status(403).json({
        error: "Tu pase no permite ver la zona de expositores.",
      });
    }

    const result = await pool.query(
      "SELECT * FROM expositores ORDER BY nombre ASC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Expositores error:", err);
    res.status(500).json({ error: "Error al obtener expositores" });
  }
});

/* ========================================================
   VER UN EXPOSITOR POR ID
======================================================== */
router.get("/:id", authRequired, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM expositores WHERE id=$1",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Expositor no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Expositor ID error:", err);
    res.status(500).json({ error: "Error al obtener expositor" });
  }
});

/* ========================================================
   CREAR EXPOSITOR
   - Solo Admin + Staff
======================================================== */
router.post("/", authRequired, async (req, res) => {
  try {
    if (req.user.rol !== "super_admin" && req.user.tipo_pase !== "Staff") {
      return res.status(403).json({
        error: "No tienes permisos para crear expositores",
      });
    }

    const { nombre, descripcion, logo_url, stand, categoria } = req.body;

    const result = await pool.query(
      `INSERT INTO expositores (nombre, descripcion, logo_url, stand, categoria)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nombre, descripcion, logo_url, stand, categoria]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("Crear expositor error:", err);
    res.status(500).json({ error: "Error al crear expositor" });
  }
});

/* ========================================================
   EDITAR EXPOSITOR
   - Admin & Staff → pueden editar todos
   - Expositor → solo su propio stand
======================================================== */
router.put("/:id", authRequired, async (req, res) => {
  try {
    const expositorId = req.params.id;
    const { nombre, descripcion, logo_url, stand, categoria } = req.body;

    // ADMIN + STAFF → todo permitido
    if (req.user.rol === "super_admin" || req.user.tipo_pase === "Staff") {
      const result = await pool.query(
        `UPDATE expositores
         SET nombre=$1, descripcion=$2, logo_url=$3, stand=$4, categoria=$5
         WHERE id=$6 RETURNING *`,
        [nombre, descripcion, logo_url, stand, categoria, expositorId]
      );

      return res.json(result.rows[0]);
    }

    // EXPOSITOR → solo su stand
    if (req.user.tipo_pase === "Expositor") {
      const result = await pool.query(
        `UPDATE expositores
         SET descripcion=$1, logo_url=$2
         WHERE id=$3 RETURNING *`,
        [descripcion, logo_url, expositorId]
      );

      return res.json(result.rows[0]);
    }

    return res.status(403).json({
      error: "No tienes permisos para editar expositores.",
    });

  } catch (err) {
    console.error("Editar expositor error:", err);
    res.status(500).json({ error: "Error al actualizar expositor" });
  }
});

/* ========================================================
   ELIMINAR EXPOSITOR
   - Solo Admin & Staff
======================================================== */
router.delete("/:id", authRequired, async (req, res) => {
  try {
    if (req.user.rol !== "super_admin" && req.user.tipo_pase !== "Staff") {
      return res.status(403).json({
        error: "No tienes permisos para eliminar expositores",
      });
    }

    await pool.query("DELETE FROM expositores WHERE id=$1", [
      req.params.id,
    ]);

    res.json({ message: "Expositor eliminado" });
  } catch (err) {
    console.error("Eliminar expositor error:", err);
    res.status(500).json({ error: "Error al eliminar expositor" });
  }
});

export default router;