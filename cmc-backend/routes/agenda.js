import express from 'express';
import { wordpressAPI } from '../config/wordpress.js';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ============================================================
// HELPERS
// ============================================================

/** Convierte hora "HH:MM" a timestamp ISO para la DB */
function convertirHoraATimestamp(hora) {
  if (!hora) return null;
  try {
    // Caso 1: ISO completo con Z → devolver tal cual
    if (hora.includes('T') && hora.includes('Z')) return hora;
    // Caso 2: datetime-local "2026-03-25T07:00" → guardar sin offset UTC
    if (hora.includes('T') && hora.length >= 16) {
      return hora.slice(0, 19); // "2026-03-25T07:00:00" — PostgreSQL lo guarda como hora local
    }
    // Caso 3: solo hora "07:00" o "07:00:00"
    const partes = hora.split(':').map(Number);
    const h = partes[0], m = partes[1], s = partes[2] || 0;
    if (isNaN(h) || isNaN(m)) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `2000-01-01T${pad(h)}:${pad(m)}:${pad(s)}`;
  } catch {
    return null;
  }
}

/** Resuelve speakerId → UUID de la tabla speakers
 *  Acepta: wp_id numérico, UUID directo, o string numérico */
async function getUUIDFromWpId(speakerId) {
  if (!speakerId) return null;
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(speakerId));
    if (isUUID) {
      // Si es UUID: devolver directamente (existe o no en la tabla, el UUID es válido)
      // La agenda.speakers[] acepta cualquier UUID — no necesita estar en la tabla speakers
      return speakerId;
    }
    // Si es número: buscar el UUID correspondiente en la tabla por wp_id
    const r = await pool.query('SELECT id FROM speakers WHERE wp_id = $1 LIMIT 1', [parseInt(speakerId)]);
    return r.rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

/** Normaliza el campo día a entero (1=lunes … 5=viernes) */
function normalizarDia(dia) {
  if (dia === null || dia === undefined) return null;
  if (typeof dia === 'number') return dia;
  const map = { lunes: 1, martes: 2, miercoles: 3, miércoles: 3, jueves: 4, viernes: 5 };
  return map[dia.toString().toLowerCase().trim()] ?? null;
}

/** Normaliza abreviaturas de sede a nombre completo */
function normalizarSede(sede) {
  if (!sede) return sede;
  const map = { cl: 'chile', mx: 'mexico', co: 'colombia', pe: 'peru', ar: 'argentina' };
  return map[sede.toLowerCase()] || sede.toLowerCase();
}

/** Extrae sede(s), tipo, edición y categoría desde el class_list de WordPress
 *
 * FIX: una sesión puede estar etiquetada con varias sedes a la vez
 * (ej. un curso que se imparte en México Y Chile). La versión anterior
 * sobrescribía `sede` en cada vuelta del forEach y se quedaba solo con
 * la última encontrada, perdiendo las demás silenciosamente — por eso
 * sesiones multi-sede solo aparecían en una de las sedes.
 * Ahora se acumulan todas en `sedes` (array); `sede` se conserva como
 * la primera encontrada, por compatibilidad con código existente que
 * espera un valor único. */
function parseSessionClassList(classList = []) {
  let sedes = [], tipo = null, edicion = null, categoria = 'sesion';

  classList.forEach((cls) => {
    if (cls === 'events_category-chile' && !sedes.includes('chile')) sedes.push('chile');
    if (cls === 'events_category-mexico' && !sedes.includes('mexico')) sedes.push('mexico');
    if (cls === 'events_category-colombia' && !sedes.includes('colombia')) sedes.push('colombia');

    if (cls.startsWith('events_category-') && /\d{4}/.test(cls)) {
      const tipoMatch = cls.match(/events_category-(brujula|toolbox|spark|orion|tracker|cursos)-/i);
      if (tipoMatch) {
        tipo = tipoMatch[1].toLowerCase();
        if (tipo === 'cursos') categoria = 'curso';
      }
      const paisMatch = cls.match(/-(cl|mx|co)-/i);
      if (paisMatch) {
        const p = normalizarSede(paisMatch[1].toLowerCase());
        if (!sedes.includes(p)) sedes.push(p);
      }
      const yearMatch = cls.match(/(\d{4})/);
      if (yearMatch) edicion = parseInt(yearMatch[1]);
    }
  });

  return { sede: sedes[0] || null, sedes, tipo, edicion, categoria };
}

/** ¿La sesión pertenece a la sede buscada? Compatible con sesiones
 *  de una sola sede (campo `sede`) y multi-sede (campo `sedes`). */
function coincideSede(s, sedeBuscada) {
  if (!sedeBuscada) return true;
  const objetivo = sedeBuscada.toLowerCase();
  if (Array.isArray(s.sedes) && s.sedes.length > 0) return s.sedes.includes(objetivo);
  return s.sede === objetivo;
}

// ============================================================
// Carga sesiones locales desde la DB (usada sola o como fallback)
// ============================================================
async function cargarSesionesLocales(sede, edicion) {
  // Overrides de sesiones de WordPress
  const overridesResult = await pool.query(`
    SELECT
      wp_id,
      title           AS titulo,
      description     AS descripcion,
      dia,
      start_at        AS "horaInicio",
      end_at          AS "horaFin",
      sala, room, tipo, categoria,
      sede,
      COALESCE(sede_override, sede)       AS sede_final,
      edicion,
      COALESCE(year_override, year, edicion) AS edicion_final,
      speakers,
      qr_sala         AS "qrSala",
      wp_slug         AS slug,
      activo, destacado, override
    FROM agenda
    WHERE wp_id IS NOT NULL AND override = true AND activo = true
  `);

  const overridesMap = {};
  overridesResult.rows.forEach((o) => {
    overridesMap[o.wp_id] = {
      id: o.wp_id,
      wp_id: o.wp_id,
      titulo: o.titulo,
      descripcion: o.descripcion,
      dia: o.dia,
      horaInicio: o.horaInicio,
      horaFin: o.horaFin,
      sala: o.sala || o.room,
      tipo: o.tipo,
      categoria: o.categoria,
      sede: o.sede_final || o.sede,
      edicion: o.edicion_final || o.edicion,
      speakerId: o.speakers?.[0] ?? null,
      speakerNombre: '',
      qrSala: o.qrSala,
      slug: o.slug,
      source: 'wordpress-edited',
      canEdit: true,
      destacado: o.destacado,
      isOverride: true,
    };
  });

  // Sesiones 100% locales (creadas en el panel)
  const localResult = await pool.query(`
    SELECT
      id,
      title           AS titulo,
      description     AS descripcion,
      dia,
      start_at        AS "horaInicio",
      end_at          AS "horaFin",
      sala, room, tipo, categoria,
      sede,
      COALESCE(sede_override, sede)          AS sede_final,
      edicion,
      COALESCE(year_override, year, edicion) AS edicion_final,
      speakers,
      qr_sala         AS "qrSala",
      wp_slug         AS slug,
      activo, destacado
    FROM agenda
    WHERE wp_id IS NULL AND activo = true
    ORDER BY start_at ASC NULLS LAST
  `);

  const localSessions = localResult.rows.map((s) => ({
    id: s.id,
    titulo: s.titulo,
    descripcion: s.descripcion,
    dia: s.dia,
    horaInicio: s.horaInicio,
    horaFin: s.horaFin,
    sala: s.sala || s.room,
    tipo: s.tipo,
    categoria: s.categoria,
    sede: s.sede_final || s.sede,
    edicion: s.edicion_final || s.edicion,
    speakerId: s.speakers?.[0] ?? null,
    speakerNombre: '',
    qrSala: s.qrSala,
    slug: s.slug,
    source: 'local',
    canEdit: true,
    destacado: s.destacado,
    isOverride: false,
  }));

  // Combinar overrides + locales y aplicar filtros
  let sessions = [...Object.values(overridesMap), ...localSessions];

  if (sede) {
    sessions = sessions.filter((s) => coincideSede(s, sede));
  }
  if (edicion) {
    sessions = sessions.filter((s) => s.edicion === parseInt(edicion));
  }

  return { sessions, overridesMap };
}

// ============================================================
// GET /sessions ------------------------------------------------------------- AJUSTE WEB APP CMC
// ============================================================
router.get('/sessions', authRequired, async (req, res) => {
  const { sede, edicion } = req.query;
  console.log(`[Agenda] GET /sessions — sede=${sede}, edicion=${edicion}`);

  let wpSessions = [];
  let wpTotal = 0;
  let wpError = null;

  try {
    let allWpData = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const wpResponse = await wordpressAPI.get('/session', {
        params: { page, per_page: 100, _fields: 'id,title,content,slug,class_list,acf' },
        timeout: 5000,
      });
      const data = wpResponse.data || [];
      if (data.length === 0) {
        hasMore = false;
      } else {
        allWpData = allWpData.concat(data);
        console.log(`[Agenda] WP página ${page}: +${data.length} (total: ${allWpData.length})`);
        if (data.length < 100) hasMore = false;
        page++;
      }
    }

    wpTotal = allWpData.length;
    console.log(`[Agenda] WordPress: ${wpTotal} sesiones`);

    const { overridesMap } = await cargarSesionesLocales(null, null);

    wpSessions = allWpData.map((post) => {
      if (overridesMap[post.id]) return overridesMap[post.id];
      const parsed = parseSessionClassList(post.class_list || []);
      return {
        id: post.id,
        wp_id: post.id,
        titulo: post.title?.rendered || '',
        descripcion: post.content?.rendered?.replace(/<[^>]+>/g, '').substring(0, 200) || '',
        slug: post.slug,
        dia: post.acf?.dia ?? 0,
        horaInicio: post.acf?.hora_inicio || post.acf?.start_time || null,
        horaFin: post.acf?.hora_fin || post.acf?.end_time || null,
        sala: post.acf?.sala || post.acf?.room || '',
        qrSala: post.acf?.qr_sala || post.acf?.qr || '',
        tipo: parsed.tipo || 'general',
        categoria: parsed.categoria,
        sede: parsed.sede,
        sedes: parsed.sedes,
        edicion: parsed.edicion,
        speakerNombre: post.acf?.speaker || '',
        speakerId: post.acf?.speaker_id || null,
        source: 'wordpress',
        canEdit: true,
        isOverride: false,
      };
    });

    if (sede) wpSessions = wpSessions.filter((s) => coincideSede(s, sede));
    if (edicion) wpSessions = wpSessions.filter((s) => s.edicion === parseInt(edicion));

  } catch (err) {
    wpError = err.message;
    console.warn(`[Agenda] ⚠️ WordPress no disponible: ${wpError}`);
    console.warn('[Agenda] Usando solo sesiones locales como fallback');
  }

  const { sessions: localSessions } = await cargarSesionesLocales(sede, edicion);

  let localOnly = localSessions;
  if (!wpError) {
    localOnly = localSessions.filter((s) => s.source === 'local');
  }

  const allSessions = [...wpSessions, ...localOnly];

  console.log(`[Agenda] Total final: ${allSessions.length} sesiones (WP: ${wpSessions.length}, local: ${localOnly.length})`);

  res.json({
    sessions: allSessions,
    total: allSessions.length,
    sources: {
      wordpress: wpSessions.length,
      local: localOnly.length,
      overrides: wpSessions.filter((s) => s.isOverride).length,
    },
    ...(wpError && {
      warning: 'WordPress no disponible. Mostrando solo sesiones locales.',
      wpError,
    }),
  });
});

// ============================================================
// POST /sessions — Crear sesión local
// ============================================================
router.post('/sessions', authRequired, async (req, res) => {
  try {
    const { titulo, descripcion, dia, horaInicio, horaFin, sala, tipo, sede, edicion, speakerId } = req.body;

    if (!titulo || !tipo || !sede || !edicion) {
      return res.status(400).json({ error: 'Campos requeridos: titulo, tipo, sede, edicion' });
    }

    let speakersArray = null;
    if (speakerId && speakerId !== '' && speakerId !== 'null') {
      const uuid = await getUUIDFromWpId(String(speakerId));
      speakersArray = uuid ? [uuid] : null;
    }

    const result = await pool.query(
      `INSERT INTO agenda
        (id, title, description, dia, start_at, end_at, sala, tipo, sede, edicion, year,
         speakers, categoria, activo, source, override, created_at)
       VALUES
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11, true, 'local', false, NOW())
       RETURNING
        id,
        title       AS titulo,
        description AS descripcion,
        dia,
        start_at    AS "horaInicio",
        end_at      AS "horaFin",
        sala, tipo, sede, edicion, speakers, categoria`,
      [titulo, descripcion || '', dia || null, horaInicio || null, horaFin || null,
        sala || '', tipo, sede, edicion, speakersArray, tipo === 'curso' ? 'curso' : 'sesion']
    );

    console.log('[Agenda] ✅ Sesión creada:', result.rows[0].id);
    res.status(201).json({ ok: true, session: result.rows[0], message: 'Sesión creada exitosamente' });

  } catch (err) {
    console.error('❌ Error creando sesión:', err);
    res.status(500).json({ ok: false, error: 'Error creando sesión', details: err.message });
  }
});

// ============================================================
// PUT /sessions/:id — Actualizar sesión (WP override o local)
// ============================================================
router.put('/sessions/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, horaInicio, horaFin, sala, tipo, sede, edicion, speakerId } = req.body;

    const diaFinal = (() => {
      const d = normalizarDia(req.body.dia);
      if (typeof d === 'number') return d;
      if (req.body.dia) console.warn('[Agenda] ⚠️ Día inválido recibido:', req.body.dia);
      return null;
    })();

    // speakerId = ""    → limpiar (speakersArray=[])
    // speakerId = UUID   → guardar ese UUID (speakersArray=[uuid])
    // speakerId ausente  → no tocar (speakersArray=undefined)
    // uuid no encontrado → no tocar (speakersArray=undefined, mejor que borrar)
    let speakersArray;
    const speakerIdEnviado = 'speakerId' in req.body;
    if (speakerIdEnviado) {
      if (!speakerId || speakerId === '' || speakerId === 'null') {
        speakersArray = [];  // el usuario quitó el speaker explícitamente
      } else {
        const uuid = await getUUIDFromWpId(String(speakerId));
        if (uuid) {
          speakersArray = [uuid];  // ✓ speaker encontrado
        }
        // uuid===null → speaker no existe en tabla local → speakersArray queda undefined
        // → la DB no lo modifica (evita borrar el valor existente)
        console.log(`[Agenda PUT] speakerId=${speakerId} → uuid=${uuid} → speakersArray=${JSON.stringify(speakersArray)}`);
      }
    }

    // CASO 1: Sesión de WordPress (ID numérico grande)
    if (!isNaN(id) && parseInt(id) > 1000) {
      const startTs = convertirHoraATimestamp(horaInicio);
      const endTs = convertirHoraATimestamp(horaFin);
      const wpId = parseInt(id);

      const existing = await pool.query(
        'SELECT id FROM agenda WHERE wp_id = $1 AND override = true', [wpId]
      );

      if (existing.rows.length > 0) {
        // Actualizar override existente
        const result = await pool.query(
          `UPDATE agenda SET
            title         = CASE WHEN $1::text IS NOT NULL AND $1::text != '' THEN $1 ELSE title END,
            description   = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE description END,
            dia           = COALESCE($3,  dia),
            start_at      = COALESCE($4,  start_at),
            end_at        = COALESCE($5,  end_at),
            sala          = COALESCE($6,  sala),
            tipo          = CASE WHEN $7::text IS NOT NULL AND $7::text != '' THEN $7 ELSE tipo END,
            sede_override = CASE WHEN $8::text IS NOT NULL AND $8::text != '' THEN $8 ELSE sede_override END,
            year_override = COALESCE($9,  year_override),
            speakers      = CASE WHEN $10::uuid[] IS NOT NULL THEN $10 ELSE speakers END,
            override      = true
           WHERE wp_id = $11 AND override = true
           RETURNING wp_id AS id, title AS titulo, description AS descripcion,
                     dia, start_at AS "horaInicio", end_at AS "horaFin", sala, tipo, sede, edicion`,
          [titulo, descripcion, diaFinal, startTs, endTs, sala, tipo, sede, edicion, speakersArray ?? null, wpId]
        );
        return res.json({ ok: true, session: result.rows[0], message: 'Sesión actualizada (override)' });

      } else {
        // Crear nuevo override
        await pool.query(
          `INSERT INTO agenda
            (id, wp_id, title, description, dia, start_at, end_at, sala, tipo,
             sede, sede_override, edicion, year, year_override, speakers,
             categoria, activo, source, override, created_at)
           VALUES
            (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $10, $10,
             $11, $12, true, 'wordpress', true, NOW())`,
          [wpId, titulo, descripcion || '', diaFinal,
            convertirHoraATimestamp(horaInicio), convertirHoraATimestamp(horaFin),
            sala || '', tipo, sede, edicion, speakersArray, tipo === 'curso' ? 'curso' : 'sesion']
        );
        return res.json({ ok: true, session: { id: wpId, titulo }, message: 'Override creado para sesión de WordPress' });
      }
    }

    // CASO 2: Sesión local (UUID)
    const check = await pool.query('SELECT id FROM agenda WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Sesión no encontrada' });
    }

    const result = await pool.query(
      `UPDATE agenda SET
        title       = CASE WHEN $1::text IS NOT NULL AND $1::text != '' THEN $1 ELSE title END,
        description = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE description END,
        dia         = COALESCE($3,  dia),
        start_at    = COALESCE($4,  start_at),
        end_at      = COALESCE($5,  end_at),
        sala        = CASE WHEN $6::text IS NOT NULL AND $6::text != '' THEN $6 ELSE sala END,
        tipo        = CASE WHEN $7::text IS NOT NULL AND $7::text != '' THEN $7 ELSE tipo END,
        sede        = CASE WHEN $8::text IS NOT NULL AND $8::text != '' THEN $8 ELSE sede END,
        edicion     = COALESCE($9,  edicion),
        year        = COALESCE($9,  year),
        speakers    = CASE WHEN $10::uuid[] IS NOT NULL THEN $10 ELSE speakers END
       WHERE id = $11
       RETURNING id, title AS titulo, description AS descripcion,
                 dia, start_at AS "horaInicio", end_at AS "horaFin",
                 sala, tipo, sede, edicion`,
      [titulo, descripcion, diaFinal,
        convertirHoraATimestamp(horaInicio), convertirHoraATimestamp(horaFin),
        sala, tipo, sede, edicion, speakersArray ?? null, id]
    );

    console.log('[Agenda] ✅ Sesión local actualizada:', id);
    res.json({ ok: true, session: result.rows[0], message: 'Sesión actualizada exitosamente' });

  } catch (err) {
    console.error('❌ Error actualizando sesión:', err);
    res.status(500).json({ ok: false, error: 'Error actualizando sesión', details: err.message });
  }
});

// ============================================================
// DELETE /sessions/:id — Eliminar sesión
// ============================================================

// ============================================================
// GET /favorites — Lista de session_id favoritos del usuario
//
// FIX: Agenda.jsx intentaba leer los favoritos desde GET /users/:id
// (res.data.favoritos), pero esa tabla/columna nunca existió ahí —
// los favoritos viven en su propia tabla `favoritos` (user_id,
// session_id). Por eso siempre caía al fallback de localStorage,
// que no persiste entre dispositivos. Este endpoint lee la fuente
// real para que el fallback deje de ser necesario.
// ============================================================
router.get('/favorites', authRequired, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT session_id FROM favoritos WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ ok: true, favoritos: result.rows.map(r => r.session_id) });
  } catch (err) {
    console.error('❌ Error obteniendo favoritos:', err);
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
});

router.post('/favorite/:id', authRequired, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO favoritos (user_id, session_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.user.id, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Error guardando favorito:', err);
    res.status(500).json({ error: 'Error al guardar favorito' });
  }
});

// ============================================================
// DELETE /favorite/:id — Quitar de favoritos
// ============================================================
router.delete('/favorite/:id', authRequired, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM favoritos WHERE user_id = $1 AND session_id = $2`,
      [req.user.id, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Error quitando favorito:', err);
    res.status(500).json({ error: 'Error al quitar favorito' });
  }
});


// ============================================================
// POST /sessions/sync-wp — Forzar re-sincronización con WP
// Borra overrides corruptos (sin título) y los re-importa de WP
// ============================================================
router.post('/sessions/sync-wp', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'super_admin' && req.user.rol !== 'staff') {
      return res.status(403).json({ error: 'Sin permisos' });
    }

    const { sede, forzar_limpiar } = req.body;

    // 1. Traer sesiones de WordPress ---------------- AJUSTE WEB APP CMC
    let wpSessions = [];
    try {
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const params = {
          page,
          per_page: 100,
          _fields: 'id,title,content,slug,class_list,acf'
        };
        const wpResp = await wordpressAPI.get('/session', { params, timeout: 15000 });
        const data = wpResp.data || [];
        if (data.length === 0) {
          hasMore = false;
        } else {
          wpSessions = wpSessions.concat(data);
          console.log(`[Sync WP] Página ${page}: +${data.length} sesiones (total: ${wpSessions.length})`);
          if (data.length < 100) hasMore = false;
          page++;
        }
      }
    } catch (wpErr) {
      return res.status(502).json({ ok: false, error: 'No se pudo conectar con WordPress: ' + wpErr.message });
    }
    //----------------------------------------------------------------------------------------------- AJUSTE WEB APP CMC

    let reparadas = 0, limpias = 0;

    for (const post of wpSessions) {
      if (!post.id) continue;
      const titulo = post.title?.rendered?.trim() || '';
      if (!titulo) continue; // si WP tampoco tiene título, saltar

      // Buscar override corrupto (sin título) para este wp_id
      const corrupt = await pool.query(
        `SELECT id FROM agenda
         WHERE wp_id = $1 AND override = true
           AND (title IS NULL OR title = '' OR title = 'Sin título')`,
        [post.id]
      );

      if (corrupt.rows.length > 0) {
        // Reparar: actualizar el título desde WP
        const parsed = parseSessionClassList(post.class_list || []);
        await pool.query(
          `UPDATE agenda SET
            title       = $1,
            description = $2,
            dia         = COALESCE($3, dia),
            wp_synced_at = NOW()
           WHERE wp_id = $4 AND override = true`,
          [titulo, post.content?.rendered?.replace(/<[^>]+>/g, '').substring(0, 500) || '',
            post.acf?.dia || null, post.id]
        );
        reparadas++;
      }

      // Si forzar_limpiar=true, actualizar TODOS los overrides desde WP (útil para resync completo)
      if (forzar_limpiar && sede) {
        const parsed = parseSessionClassList(post.class_list || []);
        if (parsed.sedes.includes(sede.toLowerCase()) || !sede) {
          await pool.query(`UPDATE agenda SET wp_synced_at = NOW() WHERE wp_id = $1`, [post.id]);
          limpias++;
        }
      }
    }

    // Actualizar última sync en configuracion_evento
    await pool.query(
      `UPDATE configuracion_evento SET ultima_sync_wp = NOW() WHERE id IN (SELECT id FROM configuracion_evento LIMIT 1)`
    ).catch(() => { }); // silencioso si no hay fila

    res.json({
      ok: true,
      message: `Sincronización completada`,
      reparadas,
      total_wp: wpSessions.length,
      ...(forzar_limpiar ? { actualizadas: limpias } : {}),
    });
  } catch (err) {
    console.error('❌ POST /sessions/sync-wp:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// GET /sessions/sin-titulo — sesiones con título vacío
// Para diagnóstico y recuperación
// ============================================================
router.get('/sessions/sin-titulo', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'super_admin' && req.user.rol !== 'staff') {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const r = await pool.query(`
      SELECT id, wp_id, title, description, dia, sede, edicion, override, source, wp_synced_at
      FROM agenda
      WHERE (title IS NULL OR title = '' OR title = 'Sin título')
        AND activo = true
      ORDER BY created_at DESC
    `);
    res.json({ ok: true, sesiones: r.rows, total: r.rows.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// DELETE /sessions/:id — soft delete (marca inactiva, recuperable)
// Si la sesión viene de WP, solo borra el override local.
// La sesión original en WP NO se toca.
// ============================================================
router.delete('/sessions/:id', authRequired, async (req, res) => {
  try {
    if (req.user.rol !== 'super_admin' && req.user.rol !== 'staff') {
      return res.status(403).json({ error: 'Solo admin puede eliminar sesiones' });
    }
    const { id } = req.params;

    // Detectar si es ID de WP (numérico) o UUID
    const esWpId = !isNaN(id) && parseInt(id) > 1000;

    if (esWpId) {
      // Sesión de WP: borrar solo el override local (si existe)
      // La sesión original en WP se mantiene intacta
      const r = await pool.query(
        'DELETE FROM agenda WHERE wp_id = $1 AND override = true RETURNING id, title',
        [parseInt(id)]
      );
      if (r.rows.length === 0) {
        // No hay override — la sesión solo existe en WP, no se puede "borrar" desde la app
        return res.json({
          ok: true,
          message: 'Esta sesión viene de WordPress y no tiene modificaciones locales. Se seguirá mostrando desde WP.',
          wp_only: true,
        });
      }
      return res.json({ ok: true, message: 'Override local eliminado. La sesión original de WP sigue disponible.', deleted: r.rows[0] });
    }

    // Sesión local (UUID) — soft delete
    const r = await pool.query(
      'UPDATE agenda SET activo = false WHERE id = $1 RETURNING id, title',
      [id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Sesión no encontrada' });

    res.json({ ok: true, message: 'Sesión desactivada correctamente', deleted: r.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;