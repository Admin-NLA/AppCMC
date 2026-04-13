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
        id, nombre, logo_url, website_url, categoria,
        stand, descripcion, sede, edicion, activo, created_at,
        contact, posicion_x, posicion_y,
        estado_stand, grid_col, grid_fila, ancho_celdas, alto_celdas
      FROM expositores
      WHERE activo = true
      ORDER BY COALESCE(grid_fila,999) ASC, COALESCE(grid_col,999) ASC, nombre ASC
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
          id, nombre, logo_url, website_url, categoria,
          stand, descripcion, sede, edicion, activo, created_at,
          contact, posicion_x, posicion_y,
          estado_stand, grid_col, grid_fila, ancho_celdas, alto_celdas
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
      nombre, logo_url, categoria, stand, descripcion,
      sede, contact, usuario_id, edicion,
      website_url, website,
      posicion_x, posicion_y,
    } = req.body;

    const websiteFinal = website_url || website || '';
    const contactJson = (contact && typeof contact === 'object') ? JSON.stringify(contact) : (contact || null);
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
        contact,
        usuario_id,
        activo,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW()
      )
      RETURNING *`,
      [
        nombre,
        logo_url || null,
        websiteFinal,
        categoria,
        stand || '',
        descripcion || '',
        sede || null,
        edicion ? parseInt(edicion) : 2026,
        contactJson,
        usuario_id || null
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
      nombre, logo_url, categoria, stand, descripcion,
      sede, contact, usuario_id, edicion,
      website_url, website,          // aceptar ambos nombres
      posicion_x, posicion_y,        // coordenadas para el mapa interactivo
    } = req.body;

    const websiteFinal = website_url || website || undefined;
    console.log('✏️ Actualizando expositor:', id);

    // Verificar que existe
    const check = await pool.query(
      'SELECT id FROM expositores WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Expositor no encontrado' });
    }

    // Serializar contact — guardar incluso si tiene solo algunos campos
    const contactJson = (contact && typeof contact === 'object')
      ? JSON.stringify(contact)
      : (contact || null);

    const result = await pool.query(
      `UPDATE expositores SET
        nombre      = CASE WHEN $1::text IS NOT NULL AND $1 != '' THEN $1 ELSE nombre END,
        logo_url    = CASE WHEN $2::text IS NOT NULL AND $2 != '' THEN $2 ELSE logo_url END,
        website_url = CASE WHEN $3::text IS NOT NULL AND $3 != '' THEN $3 ELSE website_url END,
        categoria   = CASE WHEN $4::text IS NOT NULL AND $4 != '' THEN $4 ELSE categoria END,
        stand       = CASE WHEN $5::text IS NOT NULL AND $5 != '' THEN $5 ELSE stand END,
        descripcion = CASE WHEN $6::text IS NOT NULL THEN $6 ELSE descripcion END,
        sede        = CASE WHEN $7::text IS NOT NULL AND $7 != '' THEN $7 ELSE sede END,
        contact     = CASE WHEN $8::jsonb IS NOT NULL THEN $8 ELSE contact END,
        usuario_id  = COALESCE($9,  usuario_id),
        edicion     = COALESCE($10, edicion),
        posicion_x  = CASE WHEN $11::float IS NOT NULL THEN $11 ELSE posicion_x END,
        posicion_y  = CASE WHEN $12::float IS NOT NULL THEN $12 ELSE posicion_y END
      WHERE id = $13
      RETURNING *`,
      [
        nombre       || null,
        logo_url     || null,
        websiteFinal || null,
        categoria    || null,
        stand        || null,
        descripcion  ?? null,
        sede         || null,
        contactJson,
        usuario_id   || null,
        edicion ? parseInt(edicion) : null,
        posicion_x != null ? parseFloat(posicion_x) : null,
        posicion_y != null ? parseFloat(posicion_y) : null,
        id,
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


// ============================================================
// PATCH /expositores/:id/estado — cambiar estado del stand
// (libre | solicitado | ocupado | no_disponible)
// ============================================================
router.patch('/:id/estado', authRequired, async (req, res) => {
  try {
    if (!['super_admin','staff'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const { id } = req.params;
    const { estado_stand } = req.body;
    const estados = ['libre','solicitado','ocupado','no_disponible'];
    if (!estados.includes(estado_stand)) {
      return res.status(400).json({ error: `Estado inválido. Opciones: ${estados.join(', ')}` });
    }
    const r = await pool.query(
      `UPDATE expositores SET estado_stand=$1 WHERE id=$2
       RETURNING id, nombre, estado_stand`,
      [estado_stand, id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true, expositor: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PATCH /expositores/:id/posicion — guardar posición en grid
// ============================================================
router.patch('/:id/posicion', authRequired, async (req, res) => {
  try {
    if (!['super_admin','staff'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const { id } = req.params;
    const { grid_col, grid_fila, ancho_celdas, alto_celdas, posicion_x, posicion_y } = req.body;
    const r = await pool.query(
      `UPDATE expositores SET
        grid_col     = COALESCE($1, grid_col),
        grid_fila    = COALESCE($2, grid_fila),
        ancho_celdas = COALESCE($3, ancho_celdas),
        alto_celdas  = COALESCE($4, alto_celdas),
        posicion_x   = COALESCE($5, posicion_x),
        posicion_y   = COALESCE($6, posicion_y)
       WHERE id = $7
       RETURNING id, nombre, grid_col, grid_fila, ancho_celdas, alto_celdas, posicion_x, posicion_y`,
      [grid_col, grid_fila, ancho_celdas||1, alto_celdas||1, posicion_x, posicion_y, id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true, expositor: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /expositores/:id/visita — registrar visita/interés a stand
// ============================================================
router.post('/:id/visita', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo = 'visita' } = req.body; // visita | interes | cita
    await pool.query(
      `INSERT INTO stand_visitas (expositor_id, user_id, tipo)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [id, req.user.id, tipo]
    );
    // Actualizar contador en expositores_metrica si existe
    await pool.query(
      `INSERT INTO expositores_metrica (expositor_id, user_id, tipo)
       VALUES ($1, $2, $3)`,
      [id, req.user.id, tipo]
    ).catch(() => {});
    res.json({ ok: true, message: `${tipo} registrado` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /expositores/mapa-config/:sede — config del grid por sede
// ============================================================
router.get('/mapa-config/:sede', async (req, res) => {
  try {
    const { sede } = req.params;
    const { edicion = 2026 } = req.query;
    const r = await pool.query(
      `SELECT * FROM mapa_config WHERE LOWER(sede)=LOWER($1) AND edicion=$2`,
      [sede, parseInt(edicion)]
    );
    res.json({ ok: true, config: r.rows[0] || { grid_cols: 20, grid_filas: 15, nombre_area: 'Área de Exposición' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /expositores/mapa-config/:sede — guardar config del grid
router.put('/mapa-config/:sede', authRequired, async (req, res) => {
  try {
    if (!['super_admin','staff'].includes(req.user.rol)) return res.status(403).json({ error: 'Sin permisos' });
    const { sede } = req.params;
    const { edicion = 2026, grid_cols = 20, grid_filas = 15, nombre_area } = req.body;
    await pool.query(
      `INSERT INTO mapa_config (sede, edicion, grid_cols, grid_filas, nombre_area, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (sede,edicion) DO UPDATE SET
         grid_cols=$3, grid_filas=$4, nombre_area=$5, updated_at=NOW()`,
      [sede.toLowerCase(), parseInt(edicion), parseInt(grid_cols), parseInt(grid_filas), nombre_area||'Área de Exposición']
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;