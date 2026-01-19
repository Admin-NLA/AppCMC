import express from 'express';
import pool from '../db.js';
import { authRequired, requireRole } from '../utils/authMiddleware.js';

const router = express.Router();

// GET /api/config/evento-activo
// Obtener la configuración del evento activo
router.get('/evento-activo', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        sede_activa, 
        edicion_activa, 
        fecha_inicio, 
        fecha_fin,
        tipos_activos
       FROM configuracion_evento 
       ORDER BY id DESC 
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      // Si no hay configuración, retornar default
      return res.json({
        success: true,
        data: {
          sede_activa: 'MX',
          edicion_activa: 2025,
          fecha_inicio: '2025-09-01',
          fecha_fin: '2025-09-04',
          tipos_activos: ['brujula', 'toolbox', 'spark', 'orion', 'tracker', 'curso']
        }
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error obteniendo config:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener configuración'
    });
  }
});

// PUT /api/config/evento-activo
// Actualizar configuración (Solo super_admin)
router.put('/evento-activo', authRequired, requireRole('super_admin'), async (req, res) => {
  try {
    const { sede_activa, edicion_activa, fecha_inicio, fecha_fin, tipos_activos } = req.body;

    const result = await pool.query(
      `UPDATE configuracion_evento 
       SET sede_activa = $1,
           edicion_activa = $2,
           fecha_inicio = $3,
           fecha_fin = $4,
           tipos_activos = $5,
           updated_at = NOW(),
           updated_by = $6
       WHERE id = (SELECT id FROM configuracion_evento ORDER BY id DESC LIMIT 1)
       RETURNING *`,
      [
        sede_activa,
        edicion_activa,
        fecha_inicio,
        fecha_fin,
        JSON.stringify(tipos_activos),
        req.user.id
      ]
    );

    console.log(`✅ Config actualizada: ${sede_activa} ${edicion_activa}`);

    res.json({
      success: true,
      message: 'Configuración actualizada',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error actualizando config:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar configuración'
    });
  }
});

// GET /api/config/calendario
// Obtener calendario de todas las sedes
router.get('/calendario', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM calendario_sedes 
       WHERE activo = true 
       ORDER BY fecha_inicio ASC`
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ Error obteniendo calendario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener calendario'
    });
  }
});

export default router;