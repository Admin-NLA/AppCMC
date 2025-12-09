import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const router = Router();

// --------------------------------------
// LOGIN
// --------------------------------------
router.post("/login", async (req, res) => {
  try {
    console.log("HEADERS:", req.headers);
    console.log("RAW BODY:", req.rawBody);
    console.log("REQ BODY:", req.body);
    console.log("LOGIN BODY:", req.body);

    const { email, password } = req.body;

    // Buscar usuario en la tabla correcta
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    // Comparar contraseña
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // Crear token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        rol: user.rol,
        nombre: user.nombre,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        rol: user.rol,
        nombre: user.nombre,
        avatar: user.avatar_url,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// --------------------------------------
// PERFIL (validar token)
// --------------------------------------
router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization;

    if (!auth) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = auth.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      "SELECT id, email, rol, nombre, avatar_url FROM users WHERE id = $1",
      [decoded.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Auth me error:", err);
    res.status(401).json({ error: "Token inválido" });
  }
});

export default router;
