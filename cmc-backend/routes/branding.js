// cmc-backend/routes/branding.js
// Módulo de personalización visual por sede/evento
//
// Guarda el branding en la columna 'tipos_activos' (jsonb) de configuracion_evento
// bajo la clave "__branding" para no requerir migración de DB.
//
// Estructura guardada:
// tipos_activos = {
//   ...<tipos originales como array convertido a objeto>,
//   "__branding": {
//     "mexico": { colorPrimario, colorSecundario, logoUrl, tagline, ... },
//     "chile":  { ... },
//     "colombia": { ... },
//     "_global": { ... }
//   }
// }
//
// ENDPOINTS:
//   GET  /api/branding          — config pública (sin auth) para Login y Layout
//   GET  /api/branding/:sede    — branding de una sede específica
//   PUT  /api/branding/:sede    — guardar branding (super_admin)
//   POST /api/branding/reset/:sede — resetear a defaults (super_admin)

import express from 'express';
import pool    from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ── Defaults por sede ────────────────────────────────────
const DEFAULTS = {
  _global: {
    colorPrimario:    '#1a3a5c',
    colorSecundario:  '#e8a020',
    colorFondo:       '#0a1628',
    colorTexto:       '#ffffff',
    colorMenu:        '#0d2240',   // sidebar background
    colorTextoMenu:   '#ffffff',   // sidebar text
    colorHeader:      '#ffffff',   // top header background (null = blanco)
    colorFondoApp:    '#f8fafc',   // app pages background
    colorBoton:       '#2563eb',   // primary button color
    logoUrl:          'https://cmc-latam.com/wp-content/uploads/2022/01/Logo-CMC-Recurso-31.png',
    logoAlt:          'CMC Latam',
    tagline:          'Congreso de Mantenimiento y Confiabilidad',
    appNombre:        'CMC App',
    nombreEvento:     'CMC Latam',
    footerTexto:      '© CMC Latam · Todos los derechos reservados',
    imagenFondo:      '',
    fuente:           'Inter',
    borderRadius:     'xl',
  },
  mexico: {
    tagline: 'CMC México · Congreso de Mantenimiento y Confiabilidad',
    appNombre: 'CMC App · México',
  },
  chile: {
    tagline: 'CMC Chile · Congreso de Mantenimiento y Confiabilidad',
    appNombre: 'CMC App · Chile',
  },
  colombia: {
    tagline: 'CMC Colombia · Congreso de Mantenimiento y Confiabilidad',
    appNombre: 'CMC App · Colombia',
  },
};

// ── Helper: leer branding del jsonb ─────────────────────
async function readBranding() {
  try {
    const r = await pool.query(
      `SELECT tipos_activos FROM configuracion_evento ORDER BY id DESC LIMIT 1`
    );
    if (r.rows.length === 0) return {};
    const raw = r.rows[0].tipos_activos;
    if (!raw || Array.isArray(raw)) return {};
    return raw.__branding || {};
  } catch { return {}; }
}

// ── Helper: escribir branding en el jsonb ───────────────
async function writeBranding(branding, userId) {
  // Leer tipos_activos actual para no perder los tipos de evento
  let r = await pool.query(
    `SELECT id, tipos_activos FROM configuracion_evento ORDER BY id DESC LIMIT 1`
  );
  if (r.rows.length === 0) {
    // Crear fila inicial si no existe
    r = await pool.query(
      `INSERT INTO configuracion_evento (sede_activa, edicion_activa, tipos_activos, updated_at, updated_by)
       VALUES ('mexico', 2026, $1, NOW(), $2) RETURNING id, tipos_activos`,
      [JSON.stringify({ __branding: branding }), userId]
    );
    return; // ya guardamos el branding, salir
  }
  const row = r.rows[0];
  let existing = row.tipos_activos;

  // Normalizar: si es array, convertir a objeto preservando los valores
  if (Array.isArray(existing)) {
    const obj = {};
    existing.forEach(t => { obj[t] = true; });
    existing = obj;
  }
  if (!existing || typeof existing !== 'object') existing = {};

  existing.__branding = branding;

  await pool.query(
    `UPDATE configuracion_evento SET tipos_activos = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3`,
    [JSON.stringify(existing), userId, row.id]
  );
}

// ============================================================
// GET /api/branding  — completo (sin auth — para Login/Layout)
// ============================================================
router.get('/', async (req, res) => {
  try {
    const saved = await readBranding();
    // Fusionar defaults + guardado por sede
    const sedes = ['_global', 'mexico', 'chile', 'colombia'];
    const resultado = {};
    for (const sede of sedes) {
      resultado[sede] = {
        ...DEFAULTS._global,
        ...(DEFAULTS[sede] || {}),
        ...(saved._global || {}),
        ...(saved[sede] || {}),
      };
    }
    res.json({ ok: true, branding: resultado });
  } catch (err) {
    console.error('❌ GET /branding:', err.message);
    // En caso de error, devolver defaults para no romper la app
    res.json({ ok: true, branding: { _global: DEFAULTS._global }, error: err.message });
  }
});

// ============================================================
// GET /api/branding/:sede
// ============================================================
router.get('/:sede', async (req, res) => {
  try {
    const { sede } = req.params;
    const saved    = await readBranding();
    const merged   = {
      ...DEFAULTS._global,
      ...(DEFAULTS[sede] || {}),
      ...(saved._global || {}),
      ...(saved[sede] || {}),
    };
    res.json({ ok: true, branding: merged, sede });
  } catch (err) {
    console.error('❌ GET /branding/:sede:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// PUT /api/branding/:sede  — guardar (super_admin)
// ============================================================
router.put('/:sede', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'super_admin') {
      return res.status(403).json({ ok: false, error: 'Solo super_admin puede editar el branding' });
    }
    const { sede }     = req.params;
    const brandingData = req.body; // { colorPrimario, logoUrl, ... }

    const saved = await readBranding();
    saved[sede] = { ...(saved[sede] || {}), ...brandingData };
    await writeBranding(saved, req.user.id);

    console.log(`✅ [Branding] Guardado para sede="${sede}"`);
    res.json({ ok: true, message: `Branding de ${sede} guardado`, branding: saved[sede] });
  } catch (err) {
    console.error('❌ PUT /branding/:sede:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// POST /api/branding/reset/:sede  — resetear a defaults
// ============================================================
router.post('/reset/:sede', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'super_admin') {
      return res.status(403).json({ ok: false, error: 'Solo super_admin' });
    }
    const { sede } = req.params;
    const saved    = await readBranding();
    delete saved[sede];
    await writeBranding(saved, req.user.id);
    res.json({ ok: true, message: `Branding de ${sede} reseteado a defaults` });
  } catch (err) {
    console.error('❌ POST /branding/reset/:sede:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;