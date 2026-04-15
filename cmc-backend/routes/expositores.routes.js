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
        id, nombre, logo_url, website_url, categoria, stand,
        descripcion, sede, edicion, activo, created_at, contact,
        posicion_x, posicion_y,
        COALESCE(estado_stand, 'libre') as estado_stand,
        grid_col, grid_fila,
        COALESCE(ancho_celdas, 1) as ancho_celdas,
        COALESCE(alto_celdas, 1)  as alto_celdas
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
          id, nombre, logo_url, website_url, categoria, stand,
          descripcion, sede, edicion, activo, created_at, contact,
          posicion_x, posicion_y,
          COALESCE(estado_stand, 'libre') as estado_stand,
          grid_col, grid_fila,
          COALESCE(ancho_celdas, 1) as ancho_celdas,
          COALESCE(alto_celdas, 1)  as alto_celdas
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
      sede,
      contact,
      usuario_id,
      edicion
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
        website || '',
        categoria,
        stand || '',
        descripcion || '',
        sede || null,
        edicion ? parseInt(edicion) : 2026,
        contact ? JSON.stringify(contact) : null,
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
      nombre,
      logo_url,
      website,
      categoria,
      stand,
      descripcion,
      sede,
      contact,
      usuario_id,
      edicion
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
        nombre      = COALESCE($1,  nombre),
        logo_url    = COALESCE($2,  logo_url),
        website_url = COALESCE($3,  website_url),
        categoria   = COALESCE($4,  categoria),
        stand       = COALESCE($5,  stand),
        descripcion = COALESCE($6,  descripcion),
        sede        = COALESCE($7,  sede),
        contact     = COALESCE($8,  contact),
        usuario_id  = COALESCE($9,  usuario_id),
        edicion     = COALESCE($10, edicion)
      WHERE id = $11
      RETURNING *`,
      [
        nombre,
        logo_url,
        website,
        categoria,
        stand,
        descripcion,
        sede,
        contact ? JSON.stringify(contact) : null,
        usuario_id || null,
        edicion ? parseInt(edicion) : null,
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


// ── PATCH /expositores/:id/estado ────────────────────────────
router.patch('/:id/estado', authRequired, async (req, res) => {
  try {
    if (!['super_admin','staff'].includes(req.user.rol))
      return res.status(403).json({ error: 'Sin permisos' });
    const { id } = req.params;
    const { estado_stand } = req.body;
    const valid = ['libre','solicitado','ocupado','no_disponible'];
    if (!valid.includes(estado_stand))
      return res.status(400).json({ error: `Estado inválido. Opciones: ${valid.join(', ')}` });
    const r = await pool.query(
      `UPDATE expositores SET estado_stand=$1 WHERE id=$2 RETURNING id, nombre, estado_stand`,
      [estado_stand, id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true, expositor: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /expositores/:id/posicion ──────────────────────────
router.patch('/:id/posicion', authRequired, async (req, res) => {
  try {
    if (!['super_admin','staff'].includes(req.user.rol))
      return res.status(403).json({ error: 'Sin permisos' });
    const { id } = req.params;
    const { grid_col, grid_fila, ancho_celdas, alto_celdas, posicion_x, posicion_y } = req.body;
    const r = await pool.query(
      `UPDATE expositores SET
        grid_col     = $1,
        grid_fila    = $2,
        ancho_celdas = COALESCE($3, 1),
        alto_celdas  = COALESCE($4, 1),
        posicion_x   = COALESCE($5, posicion_x),
        posicion_y   = COALESCE($6, posicion_y)
       WHERE id = $7
       RETURNING id, nombre, grid_col, grid_fila, ancho_celdas, alto_celdas`,
      [
        grid_col  != null ? parseInt(grid_col)  : null,
        grid_fila != null ? parseInt(grid_fila) : null,
        ancho_celdas ? parseInt(ancho_celdas) : null,
        alto_celdas  ? parseInt(alto_celdas)  : null,
        posicion_x != null ? parseFloat(posicion_x) : null,
        posicion_y != null ? parseFloat(posicion_y) : null,
        id,
      ]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true, expositor: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /expositores/:id/visita ─────────────────────────────
router.post('/:id/visita', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo = 'visita' } = req.body;
    await pool.query(
      `INSERT INTO expositores_metrica (expositor_id, user_id, tipo) VALUES ($1,$2,$3)`,
      [id, req.user.id, tipo]
    ).catch(() => {});
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /expositores/mapa-config/:sede ───────────────────────
router.get('/mapa-config/:sede', async (req, res) => {
  try {
    const { sede } = req.params;
    const { edicion = 2026 } = req.query;
    const r = await pool.query(
      `SELECT * FROM mapa_config WHERE LOWER(sede)=LOWER($1) AND edicion=$2`,
      [sede, parseInt(edicion)]
    ).catch(() => ({ rows: [] }));
    res.json({ ok: true, config: r.rows[0] || { grid_cols: 46, grid_filas: 22 } });
  } catch { res.json({ ok: true, config: { grid_cols: 46, grid_filas: 22 } }); }
});

export default router;