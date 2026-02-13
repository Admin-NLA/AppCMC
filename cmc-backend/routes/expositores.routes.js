import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ========================================================
// GET /expositores - Obtener todos los expositores
// SOLO columnas que EXISTEN: nombre, logo_url, website_url, categoria, stand, descripcion, sede
// ========================================================
router.get('/', async (req, res) => {
  try {
    const { sede, categoria } = req.query;

    console.log(`[Expositores] Solicitando: sede=${sede}, categoria=${categoria}`);

    // Construir query base - SOLO COLUMNAS QUE EXISTEN
    let query = `
      SELECT 
        id,
        nombre,
        logo_url,
        website_url,
        categoria,
        stand,
        descripcion,
        sede,
        edicion,
        activo,
        created_at
      FROM expositores
      WHERE activo = true
      ORDER BY nombre ASC
    `;

    const params = [];

    // Si hay filtros, ajustar query
    if (sede || categoria) {
      let whereConditions = ['activo = true'];
      
      if (sede) {
        whereConditions.push(`LOWER(sede) = LOWER($${params.length + 1})`);
        params.push(sede);
      }
      
      if (categoria) {
        whereConditions.push(`LOWER(categoria) = LOWER($${params.length + 1})`);
        params.push(categoria);
      }

      query = `
        SELECT 
          id,
          nombre,
          logo_url,
          website_url,
          categoria,
          stand,
          descripcion,
          sede,
          edicion,
          activo,
          created_at
        FROM expositores
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY nombre ASC
      `;
    }

    console.log('[Expositores] Query:', query);
    console.log('[Expositores] Params:', params);

    const result = await pool.query(query, params);

    console.log(`[Expositores] ✅ ${result.rows.length} expositores encontrados`);

    // Responder como array directamente
    res.json(result.rows);

  } catch (error) {
    console.error('❌ Error en GET /expositores:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Error al obtener expositores',
      details: error.message 
    });
  }
});

// ========================================================
// GET /expositores/:id - Obtener expositor específico
// ========================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[Expositores] Obteniendo expositor: ${id}`);

    const result = await pool.query(
      `SELECT 
        id,
        nombre,
        logo_url,
        website_url,
        categoria,
        stand,
        descripcion,
        sede,
        edicion,
        activo,
        usuario_id,
        coordenadas_x,
        coordenadas_y,
        contact,
        created_at
      FROM expositores
      WHERE id = $1 AND activo = true`,
      [id]
    );

    if (result.rows.length === 0) {
      console.log(`[Expositores] Expositor no encontrado: ${id}`);
      return res.status(404).json({ error: 'Expositor no encontrado' });
    }

    console.log(`[Expositores] ✅ Expositor encontrado: ${id}`);
    res.json(result.rows[0]);

  } catch (error) {
    console.error('❌ Error obteniendo expositor:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================================
// POST /expositores - Crear expositor (solo autenticados)
// SOLO parámetros que EXISTEN
// ========================================================
router.post('/', authRequired, async (req, res) => {
  try {
    const {
      nombre,
      logo_url,
      website,
      categoria,
      stand,
      descripcion,
      sede
    } = req.body;

    console.log('📝 Creando expositor:', nombre);

    if (!nombre || !categoria) {
      return res.status(400).json({ 
        error: 'Campos requeridos: nombre, categoria' 
      });
    }

    const result = await pool.query(
      `INSERT INTO expositores 
      (
        nombre, 
        logo_url,
        website_url,
        categoria,
        stand,
        descripcion,
        sede,
        edicion,
        activo,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, 2025, true, NOW()
      )
      RETURNING 
        id,
        nombre,
        categoria,
        stand,
        descripcion
      `,
      [
        nombre,
        logo_url || null,
        website || '',
        categoria,
        stand || '',
        descripcion || '',
        sede || 'chile'
      ]
    );

    console.log('✅ Expositor creado:', result.rows[0].id);

    res.status(201).json({
      ok: true,
      expositor: result.rows[0],
      message: 'Expositor creado exitosamente'
    });

  } catch (err) {
    console.error("❌ Error creando expositor:", err);
    res.status(500).json({ 
      error: "Error creando expositor",
      details: err.message 
    });
  }
});

// ========================================================
// PUT /expositores/:id - Actualizar expositor
// SOLO parámetros que EXISTEN
// ========================================================
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      logo_url,
      website,
      categoria,
      stand,
      descripcion,
      sede
    } = req.body;

    console.log('✏️ Actualizando expositor:', id);

    // Verificar que existe
    const check = await pool.query(
      'SELECT id FROM expositores WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Expositor no encontrado' });
    }

    const result = await pool.query(
      `UPDATE expositores SET
        nombre = COALESCE($1, nombre),
        logo_url = COALESCE($2, logo_url),
        website_url = COALESCE($3, website_url),
        categoria = COALESCE($4, categoria),
        stand = COALESCE($5, stand),
        descripcion = COALESCE($6, descripcion),
        sede = COALESCE($7, sede)
      WHERE id = $8
      RETURNING 
        id,
        nombre,
        categoria,
        stand,
        descripcion
      `,
      [
        nombre,
        logo_url,
        website,
        categoria,
        stand,
        descripcion,
        sede,
        id
      ]
    );

    console.log('✅ Expositor actualizado:', id);

    res.json({
      ok: true,
      expositor: result.rows[0],
      message: 'Expositor actualizado exitosamente'
    });

  } catch (err) {
    console.error("❌ Error actualizando expositor:", err);
    res.status(500).json({ 
      error: "Error actualizando expositor",
      details: err.message 
    });
  }
});

// ========================================================
// DELETE /expositores/:id - Eliminar expositor (soft delete)
// ========================================================
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Eliminando expositor:', id);

    const check = await pool.query(
      'SELECT id FROM expositores WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Expositor no encontrado' });
    }

    await pool.query(
      'UPDATE expositores SET activo = false WHERE id = $1',
      [id]
    );

    console.log('✅ Expositor eliminado:', id);

    res.json({
      ok: true,
      message: 'Expositor eliminado exitosamente'
    });

  } catch (err) {
    console.error("❌ Error eliminando expositor:", err);
    res.status(500).json({ 
      error: "Error eliminando expositor",
      details: err.message 
    });
  }
});

export default router;