import { Router } from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const router = Router();

/* ========================================================
   POST — LOGIN
======================================================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(500).json({ error: "Usuario sin contraseña válida" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // 🔥 IMPORTANTE:
    // user.pases viene de la BD como text[] o json, aquí siempre lo convertimos a array JS
    const pases = Array.isArray(user.pases)
      ? user.pases
      : user.pases ? JSON.parse(user.pases) : [];

    const tokenPayload = {
      id: user.id,
      email: user.email,
      rol: user.rol,
      pases: pases,        // ← MUY IMPORTANTE para agenda.js ♥
      sedes: user.sedes || null,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login exitoso",
      token,
      user: tokenPayload,
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error en login" });
  }
});

/* ========================================================
   POST — REGISTRO (opcional)
======================================================== */
router.post("/register", async (req, res) => {
  try {
    const { email, password, rol } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password, rol, pases)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, rol, pases`,
      [email, hashed, rol || "user", JSON.stringify([])]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

/* ========================================================
   GET — AUTH / ME
   Devuelve el usuario autenticado desde el JWT
======================================================== */
router.get("/me", authRequired, async (req, res) => {
  try {
    // req.user viene del authMiddleware
    return res.json({
      ok: true,
      user: req.user,
    });
  } catch (err) {
    console.error("Auth /me error:", err);
    res.status(500).json({ ok: false });
  }
});

export default router;