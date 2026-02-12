import { Router } from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { authRequired } from "../utils/authMiddleware.js";

const router = Router();

/* ========================================================
   POST /api/auth/login
======================================================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      return res.status(400).json({ 
        ok: false,
        error: "Email y contraseña son requeridos" 
      });
    }

    // Buscar usuario
    const result = await pool.query(
      `SELECT 
        id, email, password_hash, nombre, rol, 
        tipo_pase, sede, multi_sedes, edicion, 
        empresa, movil, avatar_url, activo
       FROM users 
       WHERE email = $1 
       LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        ok: false,
        error: "Usuario no encontrado" 
      });
    }

    const user = result.rows[0];

    // Verificar si el usuario está activo
    if (!user.activo) {
      return res.status(403).json({ 
        ok: false,
        error: "Usuario desactivado. Contacta al administrador" 
      });
    }

    // Verificar contraseña
    if (!user.password_hash) {
      return res.status(500).json({ 
        ok: false,
        error: "Usuario sin contraseña válida" 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ 
        ok: false,
        error: "Contraseña incorrecta" 
      });
    }

    // Crear payload del token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      tipo_pase: user.tipo_pase,
      sede: user.sede,
      multi_sedes: user.multi_sedes,
      edicion: user.edicion || 2025
    };

    // Generar token
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || "7d"
    });

    console.log(`✅ Login exitoso: ${user.email} (${user.rol})`);

    // Respuesta exitosa
    res.json({
      ok: true,
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        tipo_pase: user.tipo_pase,
        sede: user.sede,
        multi_sedes: user.multi_sedes,
        empresa: user.empresa,
        avatar_url: user.avatar_url
      }
    });

  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ 
      ok: false,
      error: "Error en el servidor" 
    });
  }
});

/* ========================================================
   POST /api/auth/register
   (Solo para super_admin crear usuarios)
======================================================== */
router.post("/register", authRequired, async (req, res) => {
  try {
    // Solo super_admin puede crear usuarios
    if (req.user.rol !== 'super_admin') {
      return res.status(403).json({
        ok: false,
        error: "Solo el super administrador puede crear usuarios"
      });
    }

    const { 
      email, 
      password, 
      nombre, 
      rol, 
      tipo_pase, 
      sede, 
      empresa,
      movil
    } = req.body;

    // Validar campos requeridos
    if (!email || !password || !nombre) {
      return res.status(400).json({
        ok: false,
        error: "Email, contraseña y nombre son requeridos"
      });
    }

    // Verificar si el email ya existe
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        ok: false,
        error: "El email ya está registrado"
      });
    }

    // Hash de la contraseña
    const hashed = await bcrypt.hash(password, 10);

    // Insertar usuario
    const result = await pool.query(
      `INSERT INTO users 
        (email, password_hash, nombre, rol, tipo_pase, sede, empresa, movil, activo, edicion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 2025)
       RETURNING id, email, nombre, rol, tipo_pase, sede`,
      [
        email.toLowerCase().trim(),
        hashed,
        nombre,
        rol || 'usuario',
        tipo_pase || null,
        sede || null,
        empresa || null,
        movil || null
      ]
    );

    console.log(`✅ Usuario creado: ${email} (${rol})`);

    res.status(201).json({
      ok: true,
      message: "Usuario creado exitosamente",
      user: result.rows[0]
    });

  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ 
      ok: false,
      error: "Error al registrar usuario" 
    });
  }
});

/* ========================================================
   GET /api/auth/me
   Obtener datos del usuario autenticado
======================================================== */
router.get("/me", authRequired, async (req, res) => {
  try {
    // Obtener datos frescos de la BD
    const result = await pool.query(
      `SELECT 
        id, email, nombre, rol, tipo_pase, 
        sede, multi_sedes, edicion, empresa, 
        movil, avatar_url, activo
       FROM users 
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Usuario no encontrado"
      });
    }

    const user = result.rows[0];

    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        tipo_pase: user.tipo_pase,
        sede: user.sede,
        multi_sedes: user.multi_sedes,
        edicion: user.edicion,
        empresa: user.empresa,
        movil: user.movil,
        avatar_url: user.avatar_url,
        activo: user.activo
      }
    });

  } catch (err) {
    console.error("❌ Auth /me error:", err);
    res.status(500).json({ 
      ok: false,
      error: "Error al obtener datos del usuario" 
    });
  }
});

/* ========================================================
   PUT /api/auth/me - Actualizar perfil del usuario
======================================================== */
router.put('/me', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      nombre,
      email,
      telefono,
      empresa,
      cargo,
      ciudad,
      foto_url,
      bio,
      linkedin,
      twitter
    } = req.body;

    console.log('✏️ Actualizando perfil de usuario:', userId);

    // Verificar que el usuario existe
    const check = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualizar datos
    const result = await pool.query(
      `UPDATE users SET
        nombre = COALESCE($1, nombre),
        email = COALESCE($2, email),
        telefono = COALESCE($3, telefono),
        empresa = COALESCE($4, empresa),
        cargo = COALESCE($5, cargo),
        ciudad = COALESCE($6, ciudad),
        foto_url = COALESCE($7, foto_url),
        bio = COALESCE($8, bio),
        linkedin_url = COALESCE($9, linkedin_url),
        twitter_url = COALESCE($10, twitter_url),
        updated_at = NOW()
      WHERE id = $11
      RETURNING 
        id,
        nombre,
        email,
        telefono,
        empresa,
        cargo,
        ciudad,
        foto_url,
        bio,
        linkedin_url as linkedin,
        twitter_url as twitter,
        created_at,
        updated_at
      `,
      [
        nombre,
        email,
        telefono,
        empresa,
        cargo,
        ciudad,
        foto_url,
        bio,
        linkedin,
        twitter,
        userId
      ]
    );

    console.log('✅ Perfil actualizado:', userId);

    res.json({
      ok: true,
      user: result.rows[0],
      message: 'Perfil actualizado exitosamente'
    });

  } catch (err) {
    console.error("❌ Error actualizando perfil:", err);
    res.status(500).json({ 
      error: "Error actualizando perfil",
      details: err.message 
    });
  }
});

export default router;