import express from "express";
import pool from "../db.js";
import { authRequired } from "../utils/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/qr/:usuario_id
 * Obtener datos para generar QR del usuario
 */
router.get("/:usuario_id", authRequired, async (req, res) => {
  try {
    const { usuario_id } = req.params;

    // ✅ Seguridad: Solo el usuario o admin puede ver su QR
    if (req.user.id !== parseInt(usuario_id) && req.user.rol !== "super_admin") {
      return res.status(403).json({ error: "No autorizado" });
    }

    // Obtener datos del usuario
    const result = await pool.query(
      "SELECT id, email, nombre, rol, tipo_pase FROM usuarios WHERE id = $1",
      [usuario_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      pase: user.tipo_pase,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("❌ Error en GET /qr/:usuario_id:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;