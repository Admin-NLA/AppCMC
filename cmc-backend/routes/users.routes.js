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

// ========================================================
// PUT /users/:id - Editar usuario (admin solo)
// ========================================================
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      email,
      rol,
      tipo_pase,
      sede,
      empresa,
      telefono,
      ciudad,
      bio,
      linkedin_url,
      twitter_url
    } = req.body;

    // Verificar permisos
    if (req.user.rol !== 'super_admin' && req.user.rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo administradores pueden editar usuarios'
      });
    }

    console.log(`[Users] Editando usuario: ${id}`);

    // Verificar que el usuario existe
    const userExists = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Construir query dinámicamente (solo actualizar campos proporcionados)
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (nombre !== undefined) {
      updates.push(`nombre = $${paramCount}`);
      values.push(nombre);
      paramCount++;
    }

    if (email !== undefined) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }

    if (rol !== undefined) {
      updates.push(`rol = $${paramCount}`);
      values.push(rol);
      paramCount++;
    }

    if (tipo_pase !== undefined) {
      updates.push(`tipo_pase = $${paramCount}`);
      values.push(tipo_pase);
      paramCount++;
    }

    if (sede !== undefined) {
      updates.push(`sede = $${paramCount}`);
      values.push(sede);
      paramCount++;
    }

    if (empresa !== undefined) {
      updates.push(`empresa = $${paramCount}`);
      values.push(empresa);
      paramCount++;
    }

    if (telefono !== undefined) {
      updates.push(`telefono = $${paramCount}`);
      values.push(telefono);
      paramCount++;
    }

    if (ciudad !== undefined) {
      updates.push(`ciudad = $${paramCount}`);
      values.push(ciudad);
      paramCount++;
    }

    if (bio !== undefined) {
      updates.push(`bio = $${paramCount}`);
      values.push(bio);
      paramCount++;
    }

    if (linkedin_url !== undefined) {
      updates.push(`linkedin_url = $${paramCount}`);
      values.push(linkedin_url);
      paramCount++;
    }

    if (twitter_url !== undefined) {
      updates.push(`twitter_url = $${paramCount}`);
      values.push(twitter_url);
      paramCount++;
    }

    // Si no hay campos para actualizar
    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No hay campos para actualizar'
      });
    }

    // Agregar updated_at y id al final
    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id,
        nombre,
        email,
        rol,
        tipo_pase,
        sede,
        empresa,
        telefono,
        ciudad,
        bio,
        linkedin_url,
        twitter_url,
        activo,
        updated_at
    `;

    const result = await pool.query(query, values);

    console.log(`[Users] ✅ Usuario actualizado: ${id}`);

    res.json({
      ok: true,
      message: 'Usuario actualizado correctamente',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error en PUT /users/:id:', error.message);
    res.status(500).json({
      error: 'Error al actualizar usuario',
      details: error.message
    });
  }
});

// ========================================================
// DELETE /users/:id - Eliminar usuario (soft delete)
// ========================================================
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar permisos
    if (req.user.rol !== 'super_admin' && req.user.rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo administradores pueden eliminar usuarios'
      });
    }

    // No permitir que un admin se elimine a sí mismo
    if (req.user.id === id) {
      return res.status(400).json({
        error: 'No puedes eliminar tu propia cuenta'
      });
    }

    console.log(`[Users] Eliminando usuario: ${id}`);

    // Verificar que el usuario existe
    const userExists = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [id]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Soft delete: cambiar activo = false
    const result = await pool.query(
      `UPDATE users 
       SET activo = false, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, nombre`,
      [id]
    );

    console.log(`[Users] ✅ Usuario eliminado: ${id}`);

    res.json({
      ok: true,
      message: 'Usuario eliminado correctamente',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error en DELETE /users/:id:', error.message);
    res.status(500).json({
      error: 'Error al eliminar usuario',
      details: error.message
    });
  }
});

export default router;