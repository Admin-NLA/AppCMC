import express from "express";
import { getSessions } from "../controllers/agendaController.js";

const router = express.Router();

// 🔓 Ruta pública TEMPORAL (sin auth)
router.get("/sessions", async (req, res) => {
  try {
    const sede = req.query.sede || "MX";
    const result = await getSessions(sede);
    res.json({ sessions: result });
  } catch (error) {
    console.error("Agenda error:", error);
    res.status(500).json({ error: "Error cargando agenda" });
  }
});

export default router;