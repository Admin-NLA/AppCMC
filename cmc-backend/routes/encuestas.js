// cmc-backend/routes/encuestas.js
// Sistema híbrido de encuestas CMC
//
// TIPOS DE ENCUESTA:
//   • "externa"  → iframe embebido (Zoho Forms, Microsoft Forms, Google Forms, Zoho Survey)
//                  El admin pega la URL del form, el usuario la ve embebida en la app.
//   • "nativa"   → preguntas creadas directamente en la app (tipo_fuente=interna)
//   • Ambas coexisten — el admin elige al crear.
//
// TABLAS USADAS:
//   encuestas_config  → configuración de encuestas externas (iframe)
//   encuestas         → encuestas nativas con preguntas en JSONB
//   respuestas_encuesta → respuestas de encuestas nativas (user_id, respuestas JSONB)
//
// ENDPOINTS:
//   GET  /api/encuestas/disponibles      → encuestas visibles para el usuario (externas + nativas)
//   GET  /api/encuestas/admin            → listado admin (todas)
//   POST /api/encuestas                  → crear encuesta (externa o nativa)
//   PUT  /api/encuestas/:id              → editar
//   DELETE /api/encuestas/:id            → eliminar
//   POST /api/encuestas/:id/responder    → guardar respuesta nativa
//   POST /api/encuestas/:id/completada   → marcar externa como completada
//   GET  /api/encuestas/:id/stats        → estadísticas (staff/admin)

import express from 'express';
import pool    from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

const ROLES_ADMIN = ['super_admin', 'staff'];

// ── Helper: detectar plataforma por URL ──────────────────────
function detectarPlataforma(url) {
  if (!url) return 'desconocida';
  if (url.includes('zoho.com/forms') || url.includes('forms.zoho') || url.includes('zohopublic'))
    return 'Zoho Forms';
  if (url.includes('survey.zoho') || url.includes('zohosurvey'))
    return 'Zoho Survey';
  if (url.includes('forms.office.com') || url.includes('microsoft.com/forms'))
    return 'Microsoft Forms';
  if (url.includes('docs.google.com/forms') || url.includes('forms.gle'))
    return 'Google Forms';
  if (url.includes('typeform.com'))
    return 'Typeform';
  return 'Formulario externo';
}

// ── Helper: construir URL con params del usuario ─────────────
function buildUrlConParams(baseUrl, user) {
  if (!baseUrl) return baseUrl;
  try {
    const url = new URL(baseUrl);
    // Pre-llenar campos estándar que los forms aceptan como query params
    if (user?.email)  url.searchParams.set('email', user.email);
    if (user?.nombre) url.searchParams.set('nombre', user.nombre);
    if (user?.sede)   url.searchParams.set('sede', user.sede);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/encuestas/admin  — admin: listar todas
// ─────────────────────────────────────────────────────────────
router.get('/admin', authRequired, async (req, res) => {
  try {
    if (!ROLES_ADMIN.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const { sede, edicion } = req.query;

    // Encuestas externas (encuestas_config)
    let q1 = `
      SELECT e.id, e.nombre, e.descripcion, 'externa' AS fuente,
             e.zoho_form_link_name AS form_url,
             e.tipo, e.rol_permitido, e.sede, e.edicion,
             e.activa, e.obligatoria, e.fecha_inicio, e.fecha_fin,
             e.entidad_id,
             (SELECT COUNT(*) FROM respuestas_encuesta r WHERE r.encuesta_id = e.id) AS total_respuestas,
             a.title AS sesion_titulo
      FROM encuestas_config e
      LEFT JOIN agenda a ON a.id = e.entidad_id
      WHERE 1=1
    `;
    const p1 = [];
    if (sede)    { q1 += ` AND sede = $${p1.length+1}`;    p1.push(sede); }
    if (edicion) { q1 += ` AND edicion = $${p1.length+1}`; p1.push(parseInt(edicion)); }
    q1 += ' ORDER BY e.created_at DESC';

    // Encuestas nativas (encuestas)
    let q2 = `
      SELECT id, titulo AS nombre, descripcion, 'nativa' AS fuente,
             NULL AS form_url,
             tipo_pase AS tipo, tipo_pase AS rol_permitido,
             NULL AS sede, NULL AS edicion,
             (estado = 'activa') AS activa, false AS obligatoria,
             NULL AS fecha_inicio, NULL AS fecha_fin,
             (SELECT COUNT(*) FROM respuestas_encuesta r WHERE r.encuesta_id = e.id) AS total_respuestas
      FROM encuestas e WHERE 1=1
    `;
    const p2 = [];
    q2 += ' ORDER BY e.created_at DESC';

    const [r1, r2] = await Promise.all([
      pool.query(q1, p1),
      pool.query(q2, p2),
    ]);

    res.json({ encuestas: [...r1.rows, ...r2.rows] });
  } catch (err) {
    console.error('❌ GET /encuestas/admin:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/encuestas/disponibles  — usuario: sus encuestas
// ─────────────────────────────────────────────────────────────
router.get('/disponibles', authRequired, async (req, res) => {
  try {
    const user = req.user;

    // Obtener datos del usuario
    const uRes = await pool.query(
      'SELECT sede, edicion, rol, tipo_pase FROM users WHERE id = $1',
      [user.id]
    );
    const ud = uRes.rows[0] || {};
    const sede    = ud.sede    || user.sede;
    const edicion = ud.edicion || null;
    const rol     = ud.rol     || user.rol;

    // ── Externas (encuestas_config) ───────────────────────────
    const r1 = await pool.query(`
      SELECT e.*,
             'externa' AS fuente,
             e.zoho_form_link_name AS form_url,
             EXISTS(
               SELECT 1 FROM respuestas_encuesta r
               WHERE r.encuesta_id = e.id AND r.user_id = $1
             ) AS ya_respondio,
             -- Datos de la sesión/curso ligado (entidad_id referencia agenda.id)
             a.title AS sesion_titulo,
             a.dia   AS sesion_dia,
             a.sala  AS sesion_sala
      FROM encuestas_config e
      LEFT JOIN agenda a ON a.id = e.entidad_id
      WHERE e.activa = true
        AND (e.sede IS NULL OR e.sede = $2)
        AND (e.edicion IS NULL OR e.edicion = $3)
        AND (e.rol_permitido = 'todos' OR e.rol_permitido = $4 OR e.rol_permitido LIKE '%' || $4 || '%')
        AND (e.fecha_inicio IS NULL OR e.fecha_inicio <= NOW())
        AND (e.fecha_fin    IS NULL OR e.fecha_fin    >= NOW())
      ORDER BY e.obligatoria DESC, e.created_at DESC
    `, [user.id, sede, edicion, rol]);

    // ── Nativas (encuestas) ───────────────────────────────────
    const r2 = await pool.query(`
      SELECT e.id, e.titulo AS nombre, e.descripcion,
             'nativa' AS fuente, NULL AS form_url,
             e.preguntas, e.tipo_pase AS rol_permitido,
             e.sesion_id, e.estado,
             false AS obligatoria,
             EXISTS(
               SELECT 1 FROM respuestas_encuesta r
               WHERE r.encuesta_id = e.id AND r.user_id = $1
             ) AS ya_respondio
      FROM encuestas e
      WHERE e.estado = 'activa'
        AND (e.tipo_pase = 'todos' OR e.tipo_pase = $2 OR e.tipo_pase = $3)
      ORDER BY e.created_at DESC
    `, [user.id, rol, ud.tipo_pase]);

    const todas = [...r1.rows, ...r2.rows];
    res.json({ encuestas: todas, total: todas.length });
  } catch (err) {
    console.error('❌ GET /encuestas/disponibles:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/encuestas  — admin: igual que /admin (alias)
// ─────────────────────────────────────────────────────────────
router.get('/', authRequired, async (req, res) => {
  if (ROLES_ADMIN.includes(req.user.rol)) {
    return res.redirect(307, '/api/encuestas/admin?' + new URLSearchParams(req.query).toString());
  }
  return res.redirect(307, '/api/encuestas/disponibles?' + new URLSearchParams(req.query).toString());
});

// ─────────────────────────────────────────────────────────────
// POST /api/encuestas  — crear (externa o nativa)
// ─────────────────────────────────────────────────────────────
router.post('/', authRequired, async (req, res) => {
  try {
    if (!ROLES_ADMIN.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }

    const {
      fuente = 'externa',  // 'externa' | 'nativa'
      nombre, descripcion,
      // Campos externos
      form_url, tipo, rol_permitido = 'todos',
      sede, edicion, activa = true, obligatoria = false,
      fecha_inicio, fecha_fin, entidad_id,
      // Campos nativos
      preguntas = [], tipo_pase = 'todos', sesion_id,
    } = req.body;

    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });

    if (fuente === 'externa') {
      if (!form_url) return res.status(400).json({ error: 'form_url es requerido para encuestas externas' });

      const r = await pool.query(`
        INSERT INTO encuestas_config
          (nombre, descripcion, zoho_form_link_name, tipo, rol_permitido,
           sede, edicion, activa, obligatoria, fecha_inicio, fecha_fin,
           entidad_id, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *
      `, [nombre, descripcion, form_url, tipo || 'general', rol_permitido,
          sede || null, edicion ? parseInt(edicion) : null,
          activa, obligatoria,
          fecha_inicio || null, fecha_fin || null,
          entidad_id || null, req.user.id]);

      return res.status(201).json({ ok: true, encuesta: { ...r.rows[0], fuente: 'externa' } });
    }

    if (fuente === 'nativa') {
      const r = await pool.query(`
        INSERT INTO encuestas
          (titulo, descripcion, tipo_fuente, preguntas, tipo_pase,
           sesion_id, estado, created_by, created_at, updated_at)
        VALUES ($1,$2,'interna',$3,$4,$5,'activa',$6,NOW(),NOW())
        RETURNING *
      `, [nombre, descripcion,
          JSON.stringify(preguntas), tipo_pase,
          sesion_id || null, req.user.id]);

      return res.status(201).json({ ok: true, encuesta: { ...r.rows[0], fuente: 'nativa' } });
    }

    return res.status(400).json({ error: "fuente debe ser 'externa' o 'nativa'" });
  } catch (err) {
    console.error('❌ POST /encuestas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/encuestas/:id  — editar
// ─────────────────────────────────────────────────────────────
router.put('/:id', authRequired, async (req, res) => {
  try {
    if (!ROLES_ADMIN.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const { id } = req.params;
    const { fuente, nombre, descripcion, form_url, tipo, rol_permitido,
            sede, edicion, activa, obligatoria, fecha_inicio, fecha_fin,
            preguntas, tipo_pase, estado } = req.body;

    // Intentar en ambas tablas
    if (fuente === 'nativa' || (!fuente && preguntas !== undefined)) {
      const r = await pool.query(`
        UPDATE encuestas SET
          titulo      = COALESCE($1, titulo),
          descripcion = COALESCE($2, descripcion),
          preguntas   = COALESCE($3, preguntas),
          tipo_pase   = COALESCE($4, tipo_pase),
          estado      = COALESCE($5, estado),
          updated_at  = NOW()
        WHERE id = $6 RETURNING *
      `, [nombre, descripcion, preguntas ? JSON.stringify(preguntas) : null,
          tipo_pase, estado, id]);
      if (r.rows.length > 0) return res.json({ ok: true, encuesta: r.rows[0] });
    }

    // Externa (encuestas_config)
    const r = await pool.query(`
      UPDATE encuestas_config SET
        nombre               = COALESCE($1, nombre),
        descripcion          = COALESCE($2, descripcion),
        zoho_form_link_name  = COALESCE($3, zoho_form_link_name),
        tipo                 = COALESCE($4, tipo),
        rol_permitido        = COALESCE($5, rol_permitido),
        sede                 = COALESCE($6, sede),
        edicion              = COALESCE($7, edicion),
        activa               = COALESCE($8, activa),
        obligatoria          = COALESCE($9, obligatoria),
        fecha_inicio         = COALESCE($10, fecha_inicio),
        fecha_fin            = COALESCE($11, fecha_fin),
        updated_at           = NOW()
      WHERE id = $12 RETURNING *
    `, [nombre, descripcion, form_url, tipo, rol_permitido,
        sede, edicion ? parseInt(edicion) : null,
        activa, obligatoria, fecha_inicio, fecha_fin, id]);

    if (r.rows.length === 0) return res.status(404).json({ error: 'Encuesta no encontrada' });
    res.json({ ok: true, encuesta: r.rows[0] });
  } catch (err) {
    console.error('❌ PUT /encuestas/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/encuestas/:id
// ─────────────────────────────────────────────────────────────
router.delete('/:id', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'super_admin') return res.status(403).json({ error: 'Solo super_admin' });
    const { id } = req.params;
    // Intentar en ambas tablas
    const r1 = await pool.query('DELETE FROM encuestas_config WHERE id=$1 RETURNING id', [id]);
    if (r1.rows.length > 0) return res.json({ ok: true });
    const r2 = await pool.query(
      "UPDATE encuestas SET estado='eliminada', updated_at=NOW() WHERE id=$1 RETURNING id", [id]
    );
    if (r2.rows.length > 0) return res.json({ ok: true });
    res.status(404).json({ error: 'Encuesta no encontrada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/encuestas/:id/responder  — respuesta nativa
// ─────────────────────────────────────────────────────────────
router.post('/:id/responder', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { respuestas } = req.body;

    // Verificar duplicado
    const dup = await pool.query(
      'SELECT 1 FROM respuestas_encuesta WHERE encuesta_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ ok: false, error: 'Ya respondiste esta encuesta' });
    }

    await pool.query(
      'INSERT INTO respuestas_encuesta (encuesta_id, user_id, respuestas, created_at) VALUES ($1,$2,$3,NOW())',
      [id, req.user.id, JSON.stringify(respuestas || {})]
    );
    res.json({ ok: true, message: '¡Gracias por tu respuesta!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/encuestas/:id/completada  — marcar externa como vista
// ─────────────────────────────────────────────────────────────
router.post('/:id/completada', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    // Usar encuesta_id + user_id como PK lógica
    await pool.query(`
      INSERT INTO respuestas_encuesta (encuesta_id, user_id, respuestas, created_at)
      VALUES ($1, $2, '{}', NOW())
      ON CONFLICT DO NOTHING
    `, [id, req.user.id]);
    res.json({ ok: true, message: 'Marcada como completada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Alias antiguo: POST /api/encuestas/:id/marcar-completada
// ─────────────────────────────────────────────────────────────
router.post('/:id/marcar-completada', authRequired, async (req, res) => {
  return res.redirect(307, `/api/encuestas/${req.params.id}/completada`);
});

// ─────────────────────────────────────────────────────────────
// GET /api/encuestas/:id/stats
// ─────────────────────────────────────────────────────────────
router.get('/:id/stats', authRequired, async (req, res) => {
  try {
    if (!ROLES_ADMIN.includes(req.user.rol) && req.user.rol !== 'speaker') {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const r = await pool.query(
      'SELECT COUNT(*) AS total FROM respuestas_encuesta WHERE encuesta_id=$1',
      [req.params.id]
    );
    res.json({ ok: true, total_respuestas: parseInt(r.rows[0].total) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/encuestas/:id  — detalle (antes del catch-all)
// ─────────────────────────────────────────────────────────────
router.get('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const r1 = await pool.query('SELECT * FROM encuestas_config WHERE id=$1', [id]);
    if (r1.rows.length > 0) {
      return res.json({ ...r1.rows[0], fuente: 'externa', form_url: r1.rows[0].zoho_form_link_name });
    }
    const r2 = await pool.query('SELECT * FROM encuestas WHERE id=$1', [id]);
    if (r2.rows.length > 0) {
      return res.json({ ...r2.rows[0], fuente: 'nativa', nombre: r2.rows[0].titulo });
    }
    res.status(404).json({ error: 'Encuesta no encontrada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;