import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "./db.js";

// ⚡ Crear usuario admin solo si no existe
async function seedAdmin() {
  try {
    const email = "admin@cmc.local";
    const password = "Admin123!";
    const nombre = "Administrador General";

    // Verificar si ya existe
    const check = await pool.query(
      "SELECT * FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    if (check.rows.length > 0) {
      console.log("⚠️ El admin ya existe:", check.rows[0]);
      return;
    }

    // Hash de contraseña
    const hashed = await bcrypt.hash(password, 10);

    // Insertar admin CORRECTAMENTE usando password_hash
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, rol, nombre)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, rol, nombre`,
      [email, hashed, "admin", nombre]
    );

    console.log("✅ Admin creado correctamente:");
    console.log(result.rows[0]);

  } catch (err) {
    console.error("❌ ERROR seed:", err);
  } finally {
    pool.end();
  }
}

seedAdmin();
