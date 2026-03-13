// ============================================================
// BACKEND: routes/encuestas.js
// Sistema híbrido de encuestas con Zoho Forms
// ============================================================

import express from "express";
const router = express.Router();
import pool from "../db.js";
import { authRequired } from '../utils/authMiddleware.js';

// ============================================================
// CONFIGURACIÓN ZOHO FORMS (OPCIONAL)
// ============================================================
// Si quieres usar la API de Zoho Forms, agrega estas variables a tu .env:
// ZOHO_CLIENT_ID=tu_client_id
// ZOHO_CLIENT_SECRET=tu_client_secret
// ZOHO_REFRESH_TOKEN=tu_refresh_token
// ZOHO_API_DOMAIN=https://forms.zoho.com

// Función para obtener access token de Zoho (OPCIONAL - solo si usas API)
async function getZohoAccessToken() {
  try {
    const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token'
      })
    });
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error obteniendo Zoho access token:', error);
    throw error;
  }
}

// ============================================================
// GET /encuestas - Listar configuraciones de encuestas (Admin)
// ============================================================
router.get('/', authRequired, async (req, res) => {
  try {
    // Solo admin y staff pueden ver todas
    if (!['super_admin', 'staff'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos' });
    }

    const { tipo, sede, edicion, activa } = req.query;
    
    let query = 'SELECT * FROM encuestas_config WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (tipo) {
      query += ` AND tipo = $${paramCount}`;
      params.push(tipo);
      paramCount++;
    }
    
    if (sede) {
      query += ` AND sede = $${paramCount}`;
      params.push(sede);
      paramCount++;
    }
    
    if (edicion) {
      query += ` AND edicion = $${paramCount}`;
      params.push(edicion);
      paramCount++;
    }
    
    if (activa !== undefined) {
      query += ` AND activa = $${paramCount}`;
      params.push(activa === 'true');
      paramCount++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json({ encuestas: result.rows });
  } catch (error) {
    console.error('Error fetching encuestas:', error);
    res.status(500).json({ error: 'Error al obtener encuestas' });
  }
});

// ============================================================
// GET /encuestas/disponibles - Encuestas disponibles para el usuario
// Devuelve SOLO las encuestas que aplican al usuario según:
// - Su rol
// - Su sede/edición
// - Que no haya completado
// - Que estén activas y en fechas válidas
// ============================================================
router.get('/disponibles', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRol = req.user.rol;
    
    // Obtener información del usuario (sede, edicion)
    const userQuery = await pool.query(
      'SELECT sede, edicion FROM users WHERE id = $1',
      [userId]
    );
    const userData = userQuery.rows[0];

    const query = `
      SELECT e.* 
      FROM encuestas_config e
      WHERE e.activa = true
        AND (e.sede = $1 OR e.sede IS NULL)
        AND (e.edicion = $2 OR e.edicion IS NULL)
        AND (e.rol_permitido = $3 OR e.rol_permitido = 'todos')
        AND e.id NOT IN (
          SELECT encuesta_id 
          FROM respuestas_encuesta 
          WHERE usuario_id = $4 AND completada = true
        )
        AND (
          e.fecha_inicio IS NULL 
          OR e.fecha_inicio <= NOW()
        )
        AND (
          e.fecha_fin IS NULL 
          OR e.fecha_fin >= NOW()
        )
      ORDER BY e.obligatoria DESC, e.created_at DESC
    `;
    
    const result = await pool.query(query, [
      userData.sede,
      userData.edicion,
      userRol,
      userId
    ]);
    
    res.json({ encuestas: result.rows });
  } catch (error) {
    console.error('Error fetching disponibles:', error);
    res.status(500).json({ error: 'Error al obtener encuestas disponibles' });
  }
});

// ============================================================
// GET /encuestas/:id - Obtener configuración de encuesta específica
// ============================================================
router.get('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM encuestas_config WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Encuesta no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching encuesta:', error);
    res.status(500).json({ error: 'Error al obtener encuesta' });
  }
});

// ============================================================
// POST /encuestas - Crear nueva configuración de encuesta (Admin)
// ============================================================
router.post('/', authRequired, async (req, res) => {
  try {
    // Verificar permisos
    if (req.user.rol !== 'super_admin' && req.user.rol !== 'staff') {
      return res.status(403).json({ error: 'No tienes permisos' });
    }
    
    const {
      nombre,
      descripcion,
      zoho_form_link_name,
      zoho_form_id,
      tipo,
      entidad_id,
      rol_permitido = 'todos',
      sede,
      edicion,
      activa = true,
      obligatoria = false,
      fecha_inicio,
      fecha_fin
    } = req.body;
    
    // Validaciones
    if (!nombre || !zoho_form_link_name || !tipo) {
      return res.status(400).json({ error: 'Datos incompletos: nombre, zoho_form_link_name y tipo son requeridos' });
    }
    
    const query = `
      INSERT INTO encuestas_config (
        nombre, descripcion, zoho_form_link_name, zoho_form_id, tipo, 
        entidad_id, rol_permitido, sede, edicion, activa, 
        obligatoria, fecha_inicio, fecha_fin, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      nombre, descripcion, zoho_form_link_name, zoho_form_id, tipo,
      entidad_id, rol_permitido, sede, edicion, activa,
      obligatoria, fecha_inicio, fecha_fin, req.user.id
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating encuesta:', error);
    res.status(500).json({ error: 'Error al crear encuesta' });
  }
});

// ============================================================
// PUT /encuestas/:id - Actualizar configuración de encuesta
// ============================================================
router.put('/:id', authRequired, async (req, res) => {
  try {
    // Verificar permisos
    if (req.user.rol !== 'super_admin' && req.user.rol !== 'staff') {
      return res.status(403).json({ error: 'No tienes permisos' });
    }
    
    const { id } = req.params;
    const {
      nombre,
      descripcion,
      zoho_form_link_name,
      zoho_form_id,
      activa,
      obligatoria,
      fecha_inicio,
      fecha_fin
    } = req.body;
    
    const query = `
      UPDATE encuestas_config 
      SET 
        nombre = COALESCE($1, nombre),
        descripcion = COALESCE($2, descripcion),
        zoho_form_link_name = COALESCE($3, zoho_form_link_name),
        zoho_form_id = COALESCE($4, zoho_form_id),
        activa = COALESCE($5, activa),
        obligatoria = COALESCE($6, obligatoria),
        fecha_inicio = COALESCE($7, fecha_inicio),
        fecha_fin = COALESCE($8, fecha_fin),
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      nombre,
      descripcion,
      zoho_form_link_name,
      zoho_form_id,
      activa,
      obligatoria,
      fecha_inicio,
      fecha_fin,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Encuesta no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating encuesta:', error);
    res.status(500).json({ error: 'Error al actualizar encuesta' });
  }
});

// ============================================================
// DELETE /encuestas/:id - Eliminar configuración de encuesta
// ============================================================
router.delete('/:id', authRequired, async (req, res) => {
  try {
    // Verificar permisos
    if (req.user.rol !== 'super_admin') {
      return res.status(403).json({ error: 'No tienes permisos' });
    }
    
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM encuestas_config WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Encuesta no encontrada' });
    }
    
    res.json({ message: 'Encuesta eliminada', encuesta: result.rows[0] });
  } catch (error) {
    console.error('Error deleting encuesta:', error);
    res.status(500).json({ error: 'Error al eliminar encuesta' });
  }
});

// ============================================================
// POST /encuestas/:id/marcar-completada
// Marca que el usuario completó la encuesta en Zoho
// ============================================================
router.post('/:id/marcar-completada', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { zoho_response_id } = req.body;
    const userId = req.user.id;
    
    // Verificar que la encuesta existe
    const encuestaResult = await pool.query(
      'SELECT * FROM encuestas_config WHERE id = $1 AND activa = true',
      [id]
    );
    
    if (encuestaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Encuesta no encontrada o inactiva' });
    }
    
    // Insertar o actualizar registro de completado
    const query = `
      INSERT INTO respuestas_encuesta (encuesta_id, usuario_id, zoho_response_id, completada)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (encuesta_id, usuario_id) 
      DO UPDATE SET 
        zoho_response_id = $3,
        completada = true,
        created_at = NOW()
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, userId, zoho_response_id || null]);
    res.json({ message: 'Encuesta marcada como completada', respuesta: result.rows[0] });
  } catch (error) {
    console.error('Error marcando encuesta completada:', error);
    res.status(500).json({ error: 'Error al marcar encuesta como completada' });
  }
});

// ============================================================
// GET /encuestas/:id/estadisticas - Ver estadísticas
// ============================================================
router.get('/:id/estadisticas', authRequired, async (req, res) => {
  try {
    // Verificar permisos
    if (!['super_admin', 'staff', 'speaker'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos' });
    }
    
    const { id } = req.params;
    
    // Obtener configuración de la encuesta
    const encuestaResult = await pool.query(
      'SELECT * FROM encuestas_config WHERE id = $1',
      [id]
    );
    
    if (encuestaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Encuesta no encontrada' });
    }
    
    const encuesta = encuestaResult.rows[0];
    
    // Total de respuestas registradas en nuestra BD
    const totalQuery = `
      SELECT COUNT(*) as total_respuestas
      FROM respuestas_encuesta
      WHERE encuesta_id = $1 AND completada = true
    `;
    const totalResult = await pool.query(totalQuery, [id]);
    
    res.json({
      encuesta: encuesta.nombre,
      total_respuestas: parseInt(totalResult.rows[0].total_respuestas),
      zoho_form_link: `https://forms.zoho.com/form/${encuesta.zoho_form_link_name}`
    });
  } catch (error) {
    console.error('Error fetching estadisticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

export default router;