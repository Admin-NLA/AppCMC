import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ========================================================
// GET /notificaciones - Obtener notificaciones del usuario
// ========================================================
router.get('/', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`[Notificaciones] Obteniendo notificaciones para usuario: ${userId}`);

    const result = await pool.query(
      `SELECT 
        id,
        user_id,
        titulo,
        mensaje,
        tipo,
        leida,
        related_type as "relatedType",
        related_id as "relatedId",
        created_at,
        updated_at
      FROM notificaciones
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100`,
      [userId]
    );

    console.log(`[Notificaciones] ✅ ${result.rows.length} notificaciones encontradas`);

    // Responder como array directamente
    res.json(result.rows);

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
    const userId = req.user.id;

    console.log(`[Notificaciones] Obteniendo notificación: ${id}`);

    const result = await pool.query(
      `SELECT 
        id,
        user_id,
        titulo,
        mensaje,
        tipo,
        leida,
        related_type,
        related_id,
        created_at,
        updated_at
      FROM notificaciones
      WHERE id = $1 AND user_id = $2`,
      [id, userId]
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
// ========================================================
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { leida } = req.body;

    console.log(`[Notificaciones] Actualizando notificación: ${id}`);

    // Verificar que la notificación pertenece al usuario
    const check = await pool.query(
      'SELECT id FROM notificaciones WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    const result = await pool.query(
      `UPDATE notificaciones SET
        leida = COALESCE($1, leida),
        updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING 
        id,
        titulo,
        mensaje,
        leida
      `,
      [leida, id, userId]
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
// ========================================================
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log('🗑️ Eliminando notificación:', id);

    // Verificar que la notificación pertenece al usuario
    const check = await pool.query(
      'SELECT id FROM notificaciones WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    await pool.query(
      'DELETE FROM notificaciones WHERE id = $1 AND user_id = $2',
      [id, userId]
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
// NOTA: Esta ruta es llamada internamente desde admin panel
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
        user_id,
        titulo,
        mensaje,
        tipo,
        leida,
        related_type,
        related_id,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, false, $5, $6, NOW()
      )
      RETURNING 
        id,
        titulo,
        mensaje,
        tipo,
        leida
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
// (Admin solo - para eventos, anuncios, etc)
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

    const notificaciones = usuarios.map(userId => [
      titulo,
      mensaje,
      tipo || 'info',
      userId
    ]);

    // Insertar todas de una vez
    const placeholders = notificaciones
      .map((_, i) => `(gen_random_uuid(), $${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, false, NOW())`)
      .join(',');

    const values = notificaciones.flat();

    const result = await pool.query(
      `INSERT INTO notificaciones (id, titulo, mensaje, tipo, user_id, leida, created_at)
       VALUES ${placeholders}
       RETURNING id`,
      values
    );

    console.log('✅ Notificaciones broadcast enviadas:', result.rows.length);

    res.status(201).json({
      ok: true,
      count: result.rows.length,
      message: `Notificación enviada a ${result.rows.length} usuarios`
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