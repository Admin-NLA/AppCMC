import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ========================================================
// GET /notificaciones - Obtener notificaciones del usuario
// CAMBIOS: user_id→created_by, leida→enviada, removed updated_at
// ========================================================
router.get('/', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`[Notificaciones] Obteniendo notificaciones para usuario: ${userId}`);

    const result = await pool.query(
      `SELECT 
        id,
        titulo,
        mensaje,
        tipo,
        enviada,
        created_at,
        created_by,
        activa
      FROM notificaciones
      WHERE activa = true
      ORDER BY created_at DESC
      LIMIT 100`
    );

    console.log(`[Notificaciones] ✅ ${result.rows.length} notificaciones encontradas`);

    // Mapear campos para compatibilidad con frontend
    const notificaciones = result.rows.map(n => ({
      id: n.id,
      user_id: n.created_by,
      titulo: n.titulo,
      mensaje: n.mensaje,
      tipo: n.tipo,
      leida: n.enviada,
      relatedType: null,
      relatedId: null,
      created_at: n.created_at
    }));

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
// ========================================================
router.get('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[Notificaciones] Obteniendo notificación: ${id}`);

    const result = await pool.query(
      `SELECT 
        id,
        created_by,
        titulo,
        mensaje,
        tipo,
        enviada,
        created_at,
        activa
      FROM notificaciones
      WHERE id = $1 AND activa = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    const n = result.rows[0];
    console.log(`[Notificaciones] ✅ Notificación encontrada: ${id}`);
    res.json({
      id: n.id,
      user_id: n.created_by,
      titulo: n.titulo,
      mensaje: n.mensaje,
      tipo: n.tipo,
      leida: n.enviada,
      relatedType: null,
      relatedId: null,
      created_at: n.created_at
    });

  } catch (error) {
    console.error('❌ Error obteniendo notificación:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================================
// PUT /notificaciones/:id - Actualizar notificación (marcar como leída)
// CAMBIO: leida→enviada, removed updated_at
// ========================================================
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { leida } = req.body;

    console.log(`[Notificaciones] Actualizando notificación: ${id}`);

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
// CAMBIO: Usar soft delete con activa=false
// ========================================================
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Eliminando notificación:', id);

    const check = await pool.query(
      'SELECT id FROM notificaciones WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

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
// POST /notificaciones - Crear notificación (admin solo)
// CAMBIO: user_id→created_by, leida→enviada
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
        titulo,
        mensaje,
        tipo,
        enviada,
        created_by,
        activa,
        created_at
      )
      VALUES (
        $1, $2, $3, false, $4, true, NOW()
      )
      RETURNING 
        id,
        titulo,
        mensaje,
        tipo,
        enviada as leida
      `,
      [
        titulo,
        mensaje,
        tipo || 'info',
        user_id
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
// CAMBIO: Usar tipo_usuario array en lugar de múltiples inserts
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

    // Convertir array a formato PostgreSQL
    const usuariosArray = usuarios;

    const result = await pool.query(
      `INSERT INTO notificaciones 
      (
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
        $1, $2, $3, true, $4, $5, true, NOW()
      )
      RETURNING id
      `,
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