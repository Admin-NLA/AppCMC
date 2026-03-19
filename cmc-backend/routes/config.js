// IMPORTANTE -------------------------------------------------------------------------------
// Configuración global del evento (sede activa, edición activa)
// TABLAS USADAS: `config` (id, sede_activa, edicion_activa, created_at, updated_at)
// ENDPOINTS:
//   GET  /api/config              
//   PUT  /api/config               → Solo super_admin
//   GET  /api/config/evento-activo → alias para EventContext y ConfiguracionPanel
//   PUT  /api/config/evento-activo → alias PUT para ConfiguracionPanel
//   GET  /api/config/sedes         → sedes únicas de users
//   GET  /api/config/ediciones     → ediciones únicas de users
// ------------------------------------------------------------------------------------------

import express from 'express';
import pool    from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ── Helper: obtener o crear config ───────────────────────
async function getOrCreateConfig() {
  let r = await pool.query('SELECT * FROM config WHERE id = 1');
  if (r.rows.length === 0) {
    r = await pool.query(`
      INSERT INTO config (id, sede_activa, edicion_activa)
      VALUES (1, 'colombia', 2026)
      ON CONFLICT (id) DO UPDATE SET id = 1
      RETURNING *
    `);
  }
  return r.rows[0];
}

// ── Helper: actualizar config ─────────────────────────────
async function updateConfig(sede_activa, edicion_activa) {
  // Intentar UPDATE primero
  let r = await pool.query(`
    UPDATE config SET sede_activa = $1, edicion_activa = $2, updated_at = NOW()
    WHERE id = 1 RETURNING *
  `, [sede_activa, parseInt(edicion_activa)]);

  // Si no existe, INSERT
  if (r.rows.length === 0) {
    r = await pool.query(`
      INSERT INTO config (id, sede_activa, edicion_activa)
      VALUES (1, $1, $2)
      ON CONFLICT (id) DO UPDATE
        SET sede_activa = $1, edicion_activa = $2, updated_at = NOW()
      RETURNING *
    `, [sede_activa, parseInt(edicion_activa)]);
  }
  return r.rows[0];
}

// ============================================================
// GET /api/config  y  GET /api/config/evento-activo
// ============================================================
const handleGet = async (req, res) => {
  try {
    const cfg = await getOrCreateConfig();
    // Responder en formato compatible con EventContext y ConfiguracionPanel
    res.json({
      success: true,
      ...cfg,
      data: cfg, // EventContext espera res.data?.data || res.data
    });
  } catch (err) {
    console.error('❌ GET /config:', err.message);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

router.get('/',              authRequired, handleGet);
router.get('/evento-activo', authRequired, handleGet);

// ============================================================
// PUT /api/config  y  PUT /api/config/evento-activo
// ============================================================
const handlePut = async (req, res) => {
  try {
    if (req.user.rol !== 'super_admin') {
      return res.status(403).json({ error: 'Solo super_admin puede modificar la configuración global' });
    }

    const { sede_activa, edicion_activa } = req.body;
    if (!sede_activa || !edicion_activa) {
      return res.status(400).json({ error: 'sede_activa y edicion_activa son requeridos' });
    }

    const cfg = await updateConfig(sede_activa, edicion_activa);
    console.log(`✅ Config actualizada: sede=${sede_activa}, edicion=${edicion_activa}`);

    res.json({ success: true, ...cfg, data: cfg });
  } catch (err) {
    console.error('❌ PUT /config:', err.message);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

router.put('/',              authRequired, handlePut);
router.put('/evento-activo', authRequired, handlePut);

// ============================================================
// GET /api/config/sedes
// ============================================================
router.get('/sedes', authRequired, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT DISTINCT sede FROM users
      WHERE sede IS NOT NULL AND sede != ''
      ORDER BY sede
    `);
    const sedes = r.rows.map(row => row.sede);
    // Asegurar las sedes del CMC siempre disponibles
    const base = ['mexico', 'colombia', 'chile', 'peru'];
    const todas = [...new Set([...base, ...sedes])].sort();
    res.json({ sedes: todas });
  } catch (err) {
    res.json({ sedes: ['mexico', 'colombia', 'chile', 'peru'] });
  }
});

// ============================================================
// GET /api/config/ediciones
// ============================================================
router.get('/ediciones', authRequired, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT DISTINCT edicion FROM users
      WHERE edicion IS NOT NULL
      ORDER BY edicion DESC
    `);
    let ediciones = r.rows.map(row => row.edicion);
    if (ediciones.length === 0) {
      const y = new Date().getFullYear();
      ediciones = [y + 1, y, y - 1];
    }
    res.json({ ediciones });
  } catch (err) {
    const y = new Date().getFullYear();
    res.json({ ediciones: [y + 1, y, y - 1] });
  }
});

// ============================================================
// GET /api/config/calendario (compatibilidad con versión anterior)
// ============================================================
router.get('/calendario', authRequired, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM calendario_sedes WHERE activo = true ORDER BY fecha_inicio ASC`
    ).catch(() => ({ rows: [] }));
    res.json({ success: true, count: r.rows.length, data: r.rows });
  } catch (err) {
    res.json({ success: true, count: 0, data: [] });
  }
});

export default router;