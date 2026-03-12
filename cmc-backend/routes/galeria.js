// cmc-backend/routes/galeria.js
//
// Módulo de Galería fotográfica CMC
//
// ENDPOINTS:
//   GET    /api/galeria               — lista de fotos (con filtros sede/edicion/sesion)
//   GET    /api/galeria/:id           — foto individual
//   POST   /api/galeria               — subir foto (staff/admin) — base64 o URL
//   PUT    /api/galeria/:id           — editar metadatos (staff/admin)
//   DELETE /api/galeria/:id           — soft delete: visible=false (staff/admin)
//   PUT    /api/galeria/:id/destacar  — marcar como destacada (staff/admin)
//   GET    /api/galeria/mis-fotos     — fotos donde aparece el usuario (por uploader_id)
//
// VISIBILIDAD:
//   • Todos los autenticados pueden VER fotos (visible=true)
//   • Staff/Admin pueden SUBIR, EDITAR, ELIMINAR, DESTACAR
//   • Un usuario ve sus propias fotos en "Mis fotos" aunque no sea admin

import express from 'express';
import pool    from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

const ROLES_ADMIN = ['staff', 'super_admin'];
const MAX_BASE64  = 5 * 1024 * 1024; // 5 MB

// ── Helper: validar y preparar la URL/base64 ─────────────
function prepareMediaUrl(input) {
  if (!input) throw new Error('Se requiere url o data (base64)');
  if (typeof input === 'string') {
    if (input.startsWith('http'))       return input;        // URL externa
    if (input.startsWith('data:image')) {
      const bytes = input.length * 0.75;
      if (bytes > MAX_BASE64) throw new Error(`Imagen muy grande (máx 5MB). Tamaño: ${Math.round(bytes/1024)}KB`);
      return input;
    }
  }
  throw new Error('url debe ser una URL https:// o base64 data:image/...');
}

// ============================================================
// GET /api/galeria/mis-fotos  — fotos subidas por el usuario
// (debe ir ANTES de /:id para no colisionar)
// ============================================================
router.get('/mis-fotos', authRequired, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, url, thumbnail, titulo, descripcion, sede, edicion,
              tipo, destacada, created_at
       FROM galeria_fotos
       WHERE uploader_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ ok: true, fotos: r.rows, total: r.rows.length });
  } catch (err) {
    console.error('❌ GET /galeria/mis-fotos:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// GET /api/galeria  — lista paginada con filtros
// ============================================================
router.get('/', authRequired, async (req, res) => {
  try {
    const { sede, edicion, sesion_id, tipo, destacadas, page = 1, limit = 50 } = req.query;

    const conditions = ['g.visible = true'];
    const values     = [];
    let   p          = 1;

    if (sede)      { conditions.push(`g.sede = $${p++}`);      values.push(sede); }
    if (edicion)   { conditions.push(`g.edicion = $${p++}`);   values.push(parseInt(edicion)); }
    if (sesion_id) { conditions.push(`g.sesion_id = $${p++}`); values.push(sesion_id); }
    if (tipo)      { conditions.push(`g.tipo = $${p++}`);      values.push(tipo); }
    if (destacadas === 'true') { conditions.push('g.destacada = true'); }

    const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const r = await pool.query(
      `SELECT
         g.id, g.url, g.thumbnail, g.titulo, g.descripcion,
         g.sede, g.edicion, g.tipo, g.destacada, g.tags,
         g.orden, g.created_at,
         u.nombre AS uploader_nombre
       FROM galeria_fotos g
       LEFT JOIN users u ON u.id = g.uploader_id
       ${where}
       ORDER BY g.destacada DESC, g.orden ASC, g.created_at DESC
       LIMIT $${p} OFFSET $${p+1}`,
      [...values, parseInt(limit), offset]
    );

    const countR = await pool.query(
      `SELECT COUNT(*) FROM galeria_fotos g ${where}`, values
    );

    res.json({
      ok: true,
      fotos: r.rows,
      total: parseInt(countR.rows[0].count),
      page:  parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('❌ GET /galeria:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// GET /api/galeria/:id
// ============================================================
router.get('/:id', authRequired, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT g.*, u.nombre AS uploader_nombre, ag.title AS sesion_titulo
       FROM galeria_fotos g
       LEFT JOIN users u  ON u.id  = g.uploader_id
       LEFT JOIN agenda ag ON ag.id = g.sesion_id
       WHERE g.id = $1 AND g.visible = true`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Foto no encontrada' });
    res.json({ ok: true, foto: r.rows[0] });
  } catch (err) {
    console.error('❌ GET /galeria/:id:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// POST /api/galeria  — subir foto (staff/admin)
// Body: { url | data, titulo, descripcion, sede, edicion, sesion_id, tipo, tags }
// ============================================================
router.post('/', authRequired, async (req, res) => {
  try {
    if (!ROLES_ADMIN.includes(req.user.rol)) {
      return res.status(403).json({ ok: false, error: 'Solo staff/admin puede subir fotos' });
    }

    const {
      url: inputUrl, data: inputData,
      titulo = '', descripcion = '',
      sede, edicion, sesion_id = null,
      tipo = 'foto', tags = [], orden = 0,
    } = req.body;

    const url = prepareMediaUrl(inputUrl || inputData);

    const r = await pool.query(
      `INSERT INTO galeria_fotos
         (url, titulo, descripcion, sede, edicion, sesion_id,
          uploader_id, tipo, tags, orden, visible, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,NOW())
       RETURNING *`,
      [url, titulo, descripcion, sede || null, edicion ? parseInt(edicion) : null,
       sesion_id || null, req.user.id, tipo,
       Array.isArray(tags) ? tags : [], orden]
    );

    console.log(`✅ [Galería] Foto subida: ${r.rows[0].id}`);
    res.status(201).json({ ok: true, foto: r.rows[0] });
  } catch (err) {
    console.error('❌ POST /galeria:', err.message);
    res.status(err.message.includes('grande') ? 413 : 500)
       .json({ ok: false, error: err.message });
  }
});

// ============================================================
// PUT /api/galeria/:id  — editar metadatos
// ============================================================
router.put('/:id', authRequired, async (req, res) => {
  try {
    if (!ROLES_ADMIN.includes(req.user.rol)) {
      return res.status(403).json({ ok: false, error: 'Solo staff/admin' });
    }
    const { titulo, descripcion, sede, edicion, sesion_id, tipo, tags, orden } = req.body;
    const r = await pool.query(
      `UPDATE galeria_fotos SET
         titulo      = COALESCE($1, titulo),
         descripcion = COALESCE($2, descripcion),
         sede        = COALESCE($3, sede),
         edicion     = COALESCE($4, edicion),
         sesion_id   = COALESCE($5, sesion_id),
         tipo        = COALESCE($6, tipo),
         tags        = COALESCE($7, tags),
         orden       = COALESCE($8, orden)
       WHERE id = $9
       RETURNING *`,
      [titulo, descripcion, sede, edicion ? parseInt(edicion) : null,
       sesion_id || null, tipo,
       Array.isArray(tags) ? tags : null,
       orden !== undefined ? parseInt(orden) : null,
       req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Foto no encontrada' });
    res.json({ ok: true, foto: r.rows[0] });
  } catch (err) {
    console.error('❌ PUT /galeria/:id:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// DELETE /api/galeria/:id  — soft delete
// ============================================================
router.delete('/:id', authRequired, async (req, res) => {
  try {
    if (!ROLES_ADMIN.includes(req.user.rol)) {
      return res.status(403).json({ ok: false, error: 'Solo staff/admin' });
    }
    await pool.query(
      'UPDATE galeria_fotos SET visible = false WHERE id = $1',
      [req.params.id]
    );
    res.json({ ok: true, message: 'Foto eliminada' });
  } catch (err) {
    console.error('❌ DELETE /galeria/:id:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// PUT /api/galeria/:id/destacar  — toggle destacada
// ============================================================
router.put('/:id/destacar', authRequired, async (req, res) => {
  try {
    if (!ROLES_ADMIN.includes(req.user.rol)) {
      return res.status(403).json({ ok: false, error: 'Solo staff/admin' });
    }
    const r = await pool.query(
      `UPDATE galeria_fotos SET destacada = NOT destacada
       WHERE id = $1 RETURNING id, destacada`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Foto no encontrada' });
    res.json({ ok: true, destacada: r.rows[0].destacada });
  } catch (err) {
    console.error('❌ PUT /galeria/:id/destacar:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;