import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ========================================================
// GET /notificaciones - Obtener notificaciones del usuario
// CAMBIOS: user_id → no filtrar por user (traer todas activas)
//          leida → enviada (mapeo)
// ========================================================
router.get('/', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`[Notificaciones] Obteniendo notificaciones para usuario: ${userId}`);

    const result = await pool.query(
      `SELECT 
        id,
        created_by,
        titulo,
        mensaje,
        tipo,
        enviada as leida,
        related_type as "relatedType",
        related_id as "relatedId",
        created_at,
        created_at as updated_at
      FROM notificaciones
      WHERE activa = true
      ORDER BY created_at DESC
      LIMIT 100`
    );

    console.log(`[Notificaciones] ✅ ${result.rows.length} notificaciones encontradas`);

    // Mapear created_by a user_id para compatibilidad con frontend
    const notificaciones = result.rows.map(n => ({
      ...n,
      user_id: n.created_by
    }));

    // Responder como array directamente
    res.json(notificaciones);

  } catch (error) {
    console.error('❌ Error en GET /notificaciones:', error.message);
    res.status(500).json({ 
      error: 'Error al obtener notificaciones',
      details: error.message 
    });
  }
});

// ========================================================
// GET /notificaciones/:id - Obtener notificación específica
// CAMBIOS: user_id → created_by
//          leida → enviada
// ========================================================
router.get('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[Notificaciones] Obteniendo notificación: ${id}`);

    const result = await pool.query(
      `SELECT 
        id,
        created_by as user_id,
        titulo,
        mensaje,
        tipo,
        enviada as leida,
        related_type,
        related_id,
        created_at,
        created_at as updated_at
      FROM notificaciones
      WHERE id = $1 AND activa = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    console.log(`[Notificaciones] ✅ Notificación encontrada: ${id}`);
    res.json(result.rows[0]);

  } catch (error) {
    console.error('❌ Error obteniendo notificación:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================================
// PUT /notificaciones/:id - Actualizar notificación (marcar como leída)
// CAMBIOS: leida → enviada
//          updated_at no existe, se omite
// ========================================================
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { leida } = req.body;

    console.log(`[Notificaciones] Actualizando notificación: ${id}`);

    // Verificar que la notificación existe
    const check = await pool.query(
      'SELECT id FROM notificaciones WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    const result = await pool.query(
      `UPDATE notificaciones SET
        enviada = COALESCE($1, enviada)
      WHERE id = $2
      RETURNING 
        id,
        titulo,
        mensaje,
        enviada as leida
      `,
      [leida, id]
    );

    console.log(`[Notificaciones] ✅ Notificación actualizada: ${id}`);

    res.json({
      ok: true,
      notificacion: result.rows[0],
      message: 'Notificación actualizada'
    });

  } catch (err) {
    console.error("❌ Error actualizando notificación:", err);
    res.status(500).json({ 
      error: "Error actualizando notificación",
      details: err.message 
    });
  }
});

// ========================================================
// DELETE /notificaciones/:id - Eliminar notificación
// CAMBIO: Usar soft delete con activa = false
// ========================================================
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Eliminando notificación:', id);

    // Verificar que la notificación existe
    const check = await pool.query(
      'SELECT id FROM notificaciones WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    // Usar soft delete con activa = false
    await pool.query(
      'UPDATE notificaciones SET activa = false WHERE id = $1',
      [id]
    );

    console.log('✅ Notificación eliminada:', id);

    res.json({
      ok: true,
      message: 'Notificación eliminada exitosamente'
    });

  } catch (err) {
    console.error("❌ Error eliminando notificación:", err);
    res.status(500).json({ 
      error: "Error eliminando notificación",
      details: err.message 
    });
  }
});

// ========================================================
// POST /notificaciones - Crear notificación
// CAMBIO: user_id → created_by en tabla
// ========================================================
router.post('/', authRequired, async (req, res) => {
  try {
    const {
      user_id,
      titulo,
      mensaje,
      tipo,
      related_type,
      related_id
    } = req.body;

    console.log('📝 Creando notificación:', titulo);

    if (!user_id || !titulo || !mensaje) {
      return res.status(400).json({ 
        error: 'Campos requeridos: user_id, titulo, mensaje' 
      });
    }

    const result = await pool.query(
      `INSERT INTO notificaciones 
      (
        id,
        created_by,
        titulo,
        mensaje,
        tipo,
        enviada,
        related_type,
        related_id,
        activa,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, false, $5, $6, true, NOW()
      )
      RETURNING 
        id,
        titulo,
        mensaje,
        tipo,
        enviada as leida
      `,
      [
        user_id,
        titulo,
        mensaje,
        tipo || 'info',
        related_type || null,
        related_id || null
      ]
    );

    console.log('✅ Notificación creada:', result.rows[0].id);

    res.status(201).json({
      ok: true,
      notificacion: result.rows[0],
      message: 'Notificación creada exitosamente'
    });

  } catch (err) {
    console.error("❌ Error creando notificación:", err);
    res.status(500).json({ 
      error: "Error creando notificación",
      details: err.message 
    });
  }
});

// ========================================================
// POST /notificaciones/broadcast - Enviar a múltiples usuarios
// CAMBIO: user_id → tipo_usuario array
// ========================================================
router.post('/broadcast', authRequired, async (req, res) => {
  try {
    const { usuarios, titulo, mensaje, tipo } = req.body;

    console.log('📢 Enviando notificación broadcast a', usuarios.length, 'usuarios');

    if (!usuarios || usuarios.length === 0 || !titulo || !mensaje) {
      return res.status(400).json({ 
        error: 'Campos requeridos: usuarios[], titulo, mensaje' 
      });
    }

    // Convertir array a formato PostgreSQL para tipo_usuario
    const usuariosArray = usuarios;

    const result = await pool.query(
      `INSERT INTO notificaciones 
      (
        id,
        titulo,
        mensaje,
        tipo,
        enviada,
        tipo_usuario,
        created_by,
        activa,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        $1, $2, $3, true, $4, $5, true, NOW()
      )
      RETURNING id`,
      [
        titulo,
        mensaje,
        tipo || 'info',
        usuariosArray,
        req.user.id
      ]
    );

    console.log('✅ Notificaciones broadcast enviadas:', usuarios.length, 'usuarios');

    res.status(201).json({
      ok: true,
      count: usuarios.length,
      message: `Notificación enviada a ${usuarios.length} usuarios`
    });

  } catch (err) {
    console.error("❌ Error en broadcast:", err);
    res.status(500).json({ 
      error: "Error enviando notificaciones",
      details: err.message 
    });
  }
});

export default router;