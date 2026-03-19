// cmc-backend/routes/mapa.js
// Mapa de exposición — imagen del plano del salón
//
// La tabla 'mapa' guarda una URL pública de la imagen del mapa.
// El admin sube la URL (desde CDN, Drive, etc.) y todos la ven.
//
// ENDPOINTS:
//   GET /api/mapa          — obtener mapa activo (sin auth, público)
//   PUT /api/mapa          — actualizar URL del mapa (super_admin)

import express from 'express';
import pool    from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// GET /api/mapa — mapa activo
router.get('/', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, url_publica, uploaded_at FROM mapa ORDER BY uploaded_at DESC LIMIT 1'
    );
    res.json({ ok: true, mapa: r.rows[0] || null });
  } catch (err) {
    console.error('❌ GET /mapa:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/mapa — actualizar (super_admin)
router.put('/', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'super_admin') {
      return res.status(403).json({ ok: false, error: 'Solo super_admin puede actualizar el mapa' });
    }
    const { url_publica } = req.body;
    if (!url_publica) return res.status(400).json({ ok: false, error: 'url_publica requerida' });

    // Verificar si ya existe un registro
    const existing = await pool.query('SELECT id FROM mapa ORDER BY uploaded_at DESC LIMIT 1');
    let r;
    if (existing.rows.length > 0) {
      r = await pool.query(
        'UPDATE mapa SET url_publica = $1, uploaded_by = $2, uploaded_at = NOW() WHERE id = $3 RETURNING *',
        [url_publica, req.user.id, existing.rows[0].id]
      );
    } else {
      r = await pool.query(
        'INSERT INTO mapa (url_publica, uploaded_by, uploaded_at) VALUES ($1, $2, NOW()) RETURNING *',
        [url_publica, req.user.id]
      );
    }
    res.json({ ok: true, mapa: r.rows[0] });
  } catch (err) {
    console.error('❌ PUT /mapa:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;