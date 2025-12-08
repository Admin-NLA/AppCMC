import { Router } from "express";
import pool from "../db.js";

const router = Router();

/* ============================================================
   🟣 1. Obtener todos los expositores
   ============================================================ */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, descripcion, logo_url, stand, contact, created_at 
       FROM expositores
       ORDER BY nombre ASC`
    );

    res.json({
      ok: true,
      expositores: result.rows
    });

  } catch (err) {
    console.error("Error obteniendo expositores:", err);
    res.status(500).json({ ok: false, error: "Error interno al obtener expositores" });
  }
});

/* ============================================================
   🟣 2. Crear nuevo expositor
   ============================================================ */
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion, logo_url, stand, contact } = req.body;

    const result = await pool.query(
      `INSERT INTO expositores (nombre, descripcion, logo_url, stand, contact)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nombre, descripcion, logo_url, stand, contact]
    );

    res.json({
      ok: true,
      expositor: result.rows[0]
    });

  } catch (err) {
    console.error("Error creando expositor:", err);
    res.status(500).json({ ok: false, error: "Error interno al crear expositor" });
  }
});

/* ============================================================
   🟣 3. Actualizar expositor
   ============================================================ */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, logo_url, stand, contact } = req.body;

    const result = await pool.query(
      `UPDATE expositores
       SET nombre=$1, descripcion=$2, logo_url=$3, stand=$4, contact=$5
       WHERE id=$6
       RETURNING *`,
      [nombre, descripcion, logo_url, stand, contact, id]
    );

    res.json({
      ok: true,
      expositor: result.rows[0]
    });

  } catch (err) {
    console.error("Error actualizando expositor:", err);
    res.status(500).json({ ok: false, error: "Error interno al actualizar expositor" });
  }
});

/* ============================================================
   🟣 4. Eliminar expositor
   ============================================================ */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(`DELETE FROM expositores WHERE id=$1`, [id]);

    res.json({ ok: true, message: "Expositor eliminado" });

  } catch (err) {
    console.error("Error eliminando expositor:", err);
    res.status(500).json({ ok: false, error: "Error interno al eliminar expositor" });
  }
});

export default router;
