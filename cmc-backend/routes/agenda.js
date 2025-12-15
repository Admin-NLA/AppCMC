import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../utils/authMiddleware.js";
import {
  sedesPermitidasFromPases,
  sedeActivaPorFecha
} from "../utils/sedeHelper.js";

const router = Router();

/* ========================================================================
   GET — AGENDA POR SEDE (PROTEGIDA, USERS + STAFF + ADMIN)
========================================================================= */
router.get("/", authRequired, async (req, res) => {
  try {
    const usuario = req.user;

    // 👀 El backend espera req.user.pases
    const pases = usuario?.pases || [];

    const sedesPermitidas = sedesPermitidasFromPases(pases);

    if (!sedesPermitidas || sedesPermitidas.length === 0) {
      return res.status(403).json({ error: "No tienes acceso a ninguna sede." });
    }

    let { sede } = req.query;

    if (sedesPermitidas.length === 1) {
      // Solo una sede → fija automáticamente
      sede = sedesPermitidas[0];
    } else {
      // Varias sedes → puede elegir
      if (!sede) {
        const auto = sedeActivaPorFecha();
        sede = auto || sedesPermitidas[0];
      }

      // La sede elegida debe estar permitida
      if (!sedesPermitidas.includes(sede)) {
        return res.status(403).json({
          error: `No tienes acceso a la sede solicitada: ${sede}`,
        });
      }
    }

    const result = await pool.query(
      "SELECT * FROM agenda WHERE sede = $1 ORDER BY start_at ASC",
      [sede]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Agenda error:", err);
    res.status(500).json({ error: "Error al obtener agenda" });
  }
});

/* ========================================================================
   GET — SESIÓN POR ID (STAFF/USER/ADMIN)
========================================================================= */
router.get("/:id", authRequired, async (req, res) => {
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

/* ========================================================================
   CRUD ADMIN — SOLO ADMIN
========================================================================= */

// Crear sesión
router.post("/", authRequired, async (req, res) => {
  try {
    if (req.user.rol !== "admin")
      return res.status(403).json({ error: "Solo admin puede crear sesiones" });

    const { title, description, start_at, end_at, room, speakers, sede } = req.body;

    const result = await pool.query(
      `INSERT INTO agenda (title, description, start_at, end_at, room, speakers, sede)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, start_at, end_at, room, speakers || [], sede]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Agenda create error:", err);
    res.status(500).json({ error: "Error al crear sesión" });
  }
});

// Editar sesión
router.put("/:id", authRequired, async (req, res) => {
  try {
    if (req.user.rol !== "admin")
      return res.status(403).json({ error: "Solo admin puede editar" });

    const { id } = req.params;
    const { title, description, start_at, end_at, room, speakers, sede } = req.body;

    const result = await pool.query(
      `UPDATE agenda
       SET title=$1, description=$2, start_at=$3, end_at=$4, room=$5, speakers=$6, sede=$7
       WHERE id=$8
       RETURNING *`,
      [title, description, start_at, end_at, room, speakers, sede, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Agenda update error:", err);
    res.status(500).json({ error: "Error al actualizar sesión" });
  }
});

// Eliminar sesión
router.delete("/:id", authRequired, async (req, res) => {
  try {
    if (req.user.rol !== "admin")
      return res.status(403).json({ error: "Solo admin puede eliminar" });

    const { id } = req.params;

    await pool.query("DELETE FROM agenda WHERE id = $1", [id]);

    res.json({ message: "Sesión eliminada" });
  } catch (err) {
    console.error("Agenda delete error:", err);
    res.status(500).json({ error: "Error al eliminar sesión" });
  }
});

export default router;