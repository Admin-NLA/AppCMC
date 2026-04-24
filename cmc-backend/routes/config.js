// Last updated: 2026-03-20 18:32 — config routes
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
import pool from '../db.js';
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

router.get('/', authRequired, handleGet);
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

router.put('/', authRequired, handlePut);
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


// ============================================================
// GET /config/wp-config — leer configuración de WordPress
// ============================================================
router.get('/wp-config', authRequired, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT tipos_activos FROM configuracion_evento ORDER BY id DESC LIMIT 1`
    );
    let wpConfig = {};
    if (r.rows.length > 0 && r.rows[0].tipos_activos) {
      const ta = r.rows[0].tipos_activos;
      wpConfig = (Array.isArray(ta) ? {} : ta).__wp_config || {};
    }
    // Defaults (lo que está en el .env del servidor actualmente)
    const defaults = {
      wp_api_url: process.env.WP_API_URL || 'https://cmc-latam.com/wp-json/wp/v2',
      wp_username: process.env.WP_USERNAME || '',
      wp_app_password: process.env.WP_APP_PASSWORD ? '***' : '',
      ultima_sync_wp: null,
    };
    // Obtener ultima sync
    const syncRes = await pool.query(
      `SELECT ultima_sync_wp FROM configuracion_evento ORDER BY id DESC LIMIT 1`
    ).catch(() => ({ rows: [] }));

    res.json({
      ok: true,
      wp_config: { ...defaults, ...wpConfig },
      ultima_sync_wp: syncRes.rows[0]?.ultima_sync_wp || null,
      nota: 'Las credenciales se guardan en la DB de forma segura. El servidor las usa en tiempo real.',
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// PUT /config/wp-config — guardar nueva URL/credenciales de WP
// Solo super_admin. Las nuevas credenciales se aplican de inmediato.
// ============================================================
router.put('/wp-config', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'super_admin') {
      return res.status(403).json({ error: 'Solo super_admin puede cambiar la configuración de WordPress' });
    }
    const { wp_api_url, wp_username, wp_app_password } = req.body;
    if (!wp_api_url) return res.status(400).json({ error: 'wp_api_url es requerido' });

    const wpConfig = { wp_api_url };
    if (wp_username) wpConfig.wp_username = wp_username;
    if (wp_app_password && wp_app_password !== '***') wpConfig.wp_app_password = wp_app_password;

    // Leer tipos_activos actual para no perder datos
    const r = await pool.query(
      `SELECT id, tipos_activos FROM configuracion_evento ORDER BY id DESC LIMIT 1`
    );

    if (r.rows.length === 0) {
      // Crear fila si no existe
      await pool.query(
        `INSERT INTO configuracion_evento (sede_activa, edicion_activa, tipos_activos, updated_at, updated_by)
         VALUES ('mexico', 2026, $1, NOW(), $2)`,
        [JSON.stringify({ __wp_config: wpConfig }), req.user.id]
      );
    } else {
      const row = r.rows[0];
      let existing = row.tipos_activos || {};
      if (Array.isArray(existing)) existing = {};
      existing.__wp_config = wpConfig;
      await pool.query(
        `UPDATE configuracion_evento SET tipos_activos = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3`,
        [JSON.stringify(existing), req.user.id, row.id]
      );
    }

    // Actualizar las variables de entorno en memoria para que el próximo request use las nuevas creds
    // NOTA: Esto funciona para el proceso actual. Render reinicia automáticamente con env vars en el .env,
    //       pero para cambios en caliente necesitamos actualizar el módulo de wordpress.js
    if (wp_api_url) process.env.WP_API_URL = wp_api_url;
    if (wp_username) process.env.WP_USERNAME = wp_username;
    if (wp_app_password && wp_app_password !== '***') process.env.WP_APP_PASSWORD = wp_app_password;

    res.json({ ok: true, message: 'Configuración de WordPress actualizada. Activa hasta el próximo reinicio del servidor.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// POST /config/test-wp — probar conexión con WordPress
// ============================================================
router.post('/test-wp', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'super_admin' && req.user.rol !== 'staff') {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const axios = (await import('axios')).default;
    const baseUrl = req.body.wp_api_url || process.env.WP_API_URL || 'https://cmc-latam.com/wp-json/wp/v2';
    const auth = req.body.wp_username && req.body.wp_app_password
      ? { username: req.body.wp_username, password: req.body.wp_app_password }
      : undefined;

    const r = await axios.get(`${baseUrl}/session`, {
      params: { per_page: 1, _fields: 'id,title' },
      auth,
      timeout: 8000,
    });
    res.json({
      ok: true,
      mensaje: `Conexión exitosa. WordPress respondió con ${r.data?.length ?? 0} sesiones de prueba.`,
      url: baseUrl,
    });
  } catch (err) {
    res.json({
      ok: false,
      mensaje: `Error al conectar: ${err.message}`,
      sugerencia: 'Verifica que la URL sea correcta y que el sitio sea accesible.',
    });
  }
});


// ══════════════════════════════════════════════════════════
// PUT /api/config/tipos-activos — guardar funciones activas
// No requiere sede/edicion — solo actualiza tipos_activos en
// configuracion_evento sin tocar otros campos
// ══════════════════════════════════════════════════════════
router.put('/tipos-activos', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'super_admin') {
      return res.status(403).json({ error: 'Solo super_admin puede modificar esto' });
    }

    const { tipos_activos } = req.body;
    if (tipos_activos === undefined || tipos_activos === null) {
      return res.status(400).json({ error: 'tipos_activos es requerido' });
    }

    // Leer fila actual
    const r = await pool.query(
      `SELECT id, tipos_activos FROM configuracion_evento ORDER BY id DESC LIMIT 1`
    );

    if (r.rows.length === 0) {
      // Crear si no existe (con defaults)
      await pool.query(
        `INSERT INTO configuracion_evento
           (sede_activa, edicion_activa, tipos_activos, updated_at, updated_by)
         VALUES ('colombia', 2026, $1, NOW(), $2)`,
        [JSON.stringify(tipos_activos), req.user.id]
      );
    } else {
      // Merge: preservar valores existentes, solo sobreescribir __funciones
      const row = r.rows[0];
      const existing = (row.tipos_activos && !Array.isArray(row.tipos_activos))
        ? row.tipos_activos
        : {};
      const merged = { ...existing, ...tipos_activos };
      await pool.query(
        `UPDATE configuracion_evento
         SET tipos_activos = $1, updated_at = NOW(), updated_by = $2
         WHERE id = $3`,
        [JSON.stringify(merged), req.user.id, row.id]
      );
    }

    console.log('[Config] tipos_activos actualizado por', req.user.id);
    res.json({ ok: true, message: 'Configuración de funciones guardada' });
  } catch (err) {
    console.error('[Config] Error PUT /tipos-activos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/config/tipos-activos — leer funciones activas
router.get('/tipos-activos', authRequired, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT tipos_activos FROM configuracion_evento ORDER BY id DESC LIMIT 1`
    );
    const ta = r.rows[0]?.tipos_activos || {};
    res.json({ ok: true, tipos_activos: Array.isArray(ta) ? {} : ta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;