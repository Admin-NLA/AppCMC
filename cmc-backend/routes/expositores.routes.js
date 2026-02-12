import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ========================================================
// GET /expositores - Obtener todos los expositores
// ========================================================
router.get('/', async (req, res) => {
  try {
    const { sede, categoria } = req.query;

    console.log(`[Expositores] Solicitando: sede=${sede}, categoria=${categoria}`);

    // Construir query base
    let query = `
      SELECT 
        id,
        nombre,
        logo_url,
        website,
        telefono,
        email,
        categoria,
        stand,
        descripcion,
        sede,
        industria,
        empleados,
        año_fundacion as "año_fundacion",
        activo,
        destacado,
        source,
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
          website,
          telefono,
          email,
          categoria,
          stand,
          descripcion,
          sede,
          industria,
          empleados,
          año_fundacion as "año_fundacion",
          activo,
          destacado,
          source,
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
        website,
        telefono,
        email,
        categoria,
        stand,
        descripcion,
        sede,
        industria,
        empleados,
        año_fundacion,
        activo,
        destacado,
        source
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
// ========================================================
router.post('/', authRequired, async (req, res) => {
  try {
    const {
      nombre,
      logo_url,
      website,
      telefono,
      email,
      categoria,
      stand,
      descripcion,
      sede,
      industria,
      empleados,
      año_fundacion
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
        id,
        nombre, 
        logo_url,
        website,
        telefono,
        email,
        categoria,
        stand,
        descripcion,
        sede,
        industria,
        empleados,
        año_fundacion,
        activo,
        source,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, 'local', NOW()
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
        telefono || '',
        email || '',
        categoria,
        stand || '',
        descripcion || '',
        sede || 'chile',
        industria || '',
        empleados || '',
        año_fundacion || null
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
// ========================================================
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      logo_url,
      website,
      telefono,
      email,
      categoria,
      stand,
      descripcion,
      sede,
      industria,
      empleados,
      año_fundacion,
      destacado
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
        website = COALESCE($3, website),
        telefono = COALESCE($4, telefono),
        email = COALESCE($5, email),
        categoria = COALESCE($6, categoria),
        stand = COALESCE($7, stand),
        descripcion = COALESCE($8, descripcion),
        sede = COALESCE($9, sede),
        industria = COALESCE($10, industria),
        empleados = COALESCE($11, empleados),
        año_fundacion = COALESCE($12, año_fundacion),
        destacado = COALESCE($13, destacado)
      WHERE id = $14
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
        telefono,
        email,
        categoria,
        stand,
        descripcion,
        sede,
        industria,
        empleados,
        año_fundacion,
        destacado,
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