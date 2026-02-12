import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ========================================================
// GET /users - Obtener lista de usuarios (admin solo)
// ========================================================
router.get('/', authRequired, async (req, res) => {
  try {
    // Verificar que el usuario es admin
    if (req.user.rol !== 'super_admin' && req.user.rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo administradores pueden acceder a esta ruta'
      });
    }

    console.log('[Users] Obteniendo lista de usuarios');

    const result = await pool.query(
      `SELECT 
        id,
        nombre,
        email,
        rol,
        tipo_pase,
        sede,
        empresa,
        activo,
        created_at
      FROM users
      WHERE activo = true
      ORDER BY nombre ASC`
    );

    console.log(`[Users] ✅ ${result.rows.length} usuarios encontrados`);

    // Responder como array directamente
    res.json(result.rows);

  } catch (error) {
    console.error('❌ Error en GET /users:', error.message);
    res.status(500).json({
      error: 'Error al obtener usuarios',
      details: error.message
    });
  }
});

// ========================================================
// GET /users/:id - Obtener usuario específico
// ========================================================
router.get('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    // Un usuario puede ver su propio perfil
    // Un admin puede ver cualquier perfil
    if (req.user.id !== id && req.user.rol !== 'super_admin' && req.user.rol !== 'admin') {
      return res.status(403).json({
        error: 'No tienes permiso para ver este usuario'
      });
    }

    console.log(`[Users] Obteniendo usuario: ${id}`);

    const result = await pool.query(
      `SELECT 
        id,
        nombre,
        email,
        rol,
        tipo_pase,
        sede,
        multi_sedes,
        edicion,
        empresa,
        telefono,
        ciudad,
        foto_url,
        bio,
        linkedin_url,
        twitter_url,
        activo,
        created_at,
        updated_at
      FROM users
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log(`[Users] ✅ Usuario encontrado: ${id}`);
    res.json(result.rows[0]);

  } catch (error) {
    console.error('❌ Error obteniendo usuario:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;