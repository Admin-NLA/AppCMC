// cmc-backend/controllers/authController.js

import pool from "../db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    // Validar password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // Obtener las compras del usuario
    const comprasResult = await pool.query(
      "SELECT sede FROM compras WHERE user_id = $1",
      [user.id]
    );

    const compras = comprasResult.rows; // [{ sede: "MX" }, { sede: "CO" }]

    // Crear token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        rol: user.rol,
        compras: compras // ← IMPORTANTE
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error en servidor" });
  }
};