import express from 'express';
import { wordpressAPI } from '../config/wordpress.js';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ========================================================
// HELPER: Parsear class_list de WordPress para speakers
// ========================================================
function parseSpeakerClassList(classList = []) {
  let sede = null;
  let eventos = [];
  let edicion = null;
  
  classList.forEach(cls => {
    // Detectar sede
    if (cls === 'team-category-chile') sede = 'chile';
    if (cls === 'team-category-mexico') sede = 'mexico';
    if (cls === 'team-category-colombia') sede = 'colombia';
    
    // Detectar eventos con año
    if (cls.startsWith('team-category-') && /\d{4}/.test(cls)) {
      eventos.push(cls.replace('team-category-', ''));
      
      // Extraer año
      const yearMatch = cls.match(/(\d{4})/);
      if (yearMatch && !edicion) {
        edicion = parseInt(yearMatch[1]);
      }
    }
  });
  
  return { sede, eventos, edicion };
}

// ========================================================
// GET /speakers - Obtener speakers (WordPress + BD local)
// FIX: Try-catch en paginación de WordPress
// ========================================================
router.get('/', async (req, res) => {
  try {
    const { sede, edicion } = req.query;

    console.log(`[Speakers] Solicitando: sede=${sede}, edicion=${edicion}`);

    // ✅ OBTENER TODAS LAS PÁGINAS (no solo 100)
    let allSpeakers = [];
    let page = 1;
    let hasMore = true;
    let totalPages = 0;

    console.log('[Speakers] Iniciando paginación desde WordPress...');

    while (hasMore) {
      try {
        console.log(`[Speakers] Obteniendo página ${page}...`);
        
        const wpResponse = await wordpressAPI.get('/team-member', {
          params: {
            page,
            per_page: 100,
            _fields: 'id,title,content,slug,featured_media,class_list,acf'
          }
        });

        if (!wpResponse.data || wpResponse.data.length === 0) {
          hasMore = false;
          console.log(`[Speakers] Fin de la paginación en página ${page}`);
        } else {
          allSpeakers = allSpeakers.concat(wpResponse.data);
          console.log(`[Speakers] Página ${page}: +${wpResponse.data.length} speakers (total: ${allSpeakers.length})`);
          page++;
        }
      } catch (wpError) {
        // Si hay error en WordPress, detener paginación pero continuar con locales
        console.warn(`[Speakers] ⚠️ Error en página ${page} de WordPress:`, wpError.message);
        console.log('[Speakers] Continuando con speakers locales...');
        hasMore = false;
      }
    }

    console.log(`[Speakers] ✅ Total de speakers desde WP: ${allSpeakers.length}`);

    // ========================================================
    // PROCESAR SPEAKERS DE WORDPRESS
    // ========================================================
    let wpSpeakers = allSpeakers.map(post => {
      const { sede: detectedSede, eventos, edicion: detectedEdicion } = parseSpeakerClassList(post.class_list || []);
      
      return {
        id: post.id,
        wp_id: post.id,
        nombre: post.title?.rendered || '',
        bio: post.content?.rendered?.replace(/<[^>]+>/g, '').substring(0, 300) || '',
        cargo: post.acf?.cargo || post.acf?.position || '',
        empresa: post.acf?.empresa || post.acf?.company || '',
        slug: post.slug,
        foto: post.acf?.photo_url || post.featured_media || null,
        linkedin: post.acf?.linkedin_url || post.acf?.linkedin || '',
        twitter: post.acf?.twitter_url || post.acf?.twitter || '',
        website: post.acf?.website_url || post.acf?.website || '',
        email: post.acf?.email || '',
        telefono: post.acf?.telefono || post.acf?.phone || '',
        sede: detectedSede,
        edicion: detectedEdicion,
        eventos: eventos,
        source: 'wordpress',
        canEdit: false
      };
    });

    console.log(`[Speakers] Speakers de WP procesados: ${wpSpeakers.length}`);

    // ========================================================
    // OBTENER SPEAKERS DE LA BD LOCAL
    // ========================================================
    let localSpeakers = [];
    
    try {
      const localResult = await pool.query(`
        SELECT 
          id,
          nombre,
          bio,
          cargo,
          company as empresa,
          photo_url as foto,
          linkedin_url as linkedin,
          twitter_url as twitter,
          website_url as website,
          email,
          telefono,
          sede,
          edicion,
          activo,
          es_destacado as destacado,
          source,
          wp_id,
          wp_slug as slug
        FROM speakers
        WHERE activo = true
        ORDER BY nombre ASC
      `);

      // Obtener sesiones de TODOS los speakers locales en UNA sola query
      const speakersIds = localResult.rows.map(r => r.id);
      let sesionesMap = {};
      if (speakersIds.length > 0) {
        // Una sola query con unnest para mapear speaker → sesiones
        const sesRes = await pool.query(`
          SELECT
            unnested_speaker AS speaker_id,
            a.id, a.title AS titulo, a.dia, a.sala,
            a.start_at AS "horaInicio", a.tipo, a.sede, a.edicion
          FROM agenda a, unnest(a.speakers) AS unnested_speaker
          WHERE a.activo = true
            AND unnested_speaker = ANY($1::uuid[])
          ORDER BY a.dia ASC, a.start_at ASC
        `, [speakersIds]).catch(() => ({ rows: [] }));

        // Agrupar por speaker_id
        for (const row of sesRes.rows) {
          if (!sesionesMap[row.speaker_id]) sesionesMap[row.speaker_id] = [];
          const { speaker_id, ...sesion } = row;
          sesionesMap[row.speaker_id].push(sesion);
        }
      }

      localSpeakers = localResult.rows.map(s => ({
        ...s,
        canEdit: true,
        source: s.source || 'local',
        eventos: [],
        sesiones: sesionesMap[s.id] || [],
      }));

      console.log(`[Speakers] Speakers locales: ${localSpeakers.length}`);
    } catch (dbError) {
      console.warn(`[Speakers] ⚠️ Error al obtener speakers locales:`, dbError.message);
      localSpeakers = [];
    }

    // ========================================================
    // COMBINAR AMBAS FUENTES
    // ========================================================
    // Deduplicar: priorizar speakers locales (UUID) sobre duplicados de WP
    const localWpIds = new Set(localSpeakers.map(s => s.wp_id).filter(Boolean));
    const wpSpeakersUnicos = wpSpeakers.filter(s => !localWpIds.has(s.wp_id));
    let allSpeakersData = [...localSpeakers, ...wpSpeakersUnicos];

    console.log(`[Speakers] Local: ${localSpeakers.length}, WP únicos: ${wpSpeakersUnicos.length}, Total: ${allSpeakersData.length}`);

    // ========================================================
    // APLICAR FILTROS
    // ========================================================
    if (sede) {
      const sedeLower = sede.toLowerCase();
      const before = allSpeakersData.length;
      allSpeakersData = allSpeakersData.filter(s => s.sede === sedeLower);
      console.log(`[Speakers] Filtro sede "${sede}": ${before} → ${allSpeakersData.length}`);
    }

    if (edicion) {
      const before = allSpeakersData.length;
      const edicionNum = parseInt(edicion);
      allSpeakersData = allSpeakersData.filter(s => 
        s.edicion === edicionNum || 
        (s.eventos && s.eventos.some(e => e.includes(edicion)))
      );
      console.log(`[Speakers] Filtro edicion "${edicion}": ${before} → ${allSpeakersData.length}`);
    }

    // ========================================================
    // RESPONDER
    // ========================================================
    console.log(`[Speakers] Respuesta final: ${allSpeakersData.length} speakers`);
    
    res.json(allSpeakersData);

  } catch (error) {
    console.error('❌ Error en GET /speakers:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Error al obtener speakers',
      details: error.message 
    });
  }
});

// ========================================================
// GET /speakers/:id - Obtener speaker específico
// ========================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[Speakers] Obteniendo speaker: ${id}`);

    // Buscar en BD local primero
    const local = await pool.query(
      `SELECT 
        id,
        nombre,
        bio,
        cargo,
        company as empresa,
        photo_url as foto,
        linkedin_url as linkedin,
        twitter_url as twitter,
        website_url as website,
        email,
        telefono,
        sede,
        edicion
      FROM speakers
      WHERE id = $1 AND activo = true`,
      [id]
    );

    if (local.rows.length > 0) {
      const speaker = local.rows[0];
      // Obtener sesiones donde este speaker participa
      const sesionesRes = await pool.query(
        `SELECT id, title AS titulo, description AS descripcion,
                dia, start_at AS "horaInicio", end_at AS "horaFin",
                sala, tipo, sede, edicion, activo
         FROM agenda
         WHERE $1::uuid = ANY(speakers) AND activo = true
         ORDER BY dia ASC, start_at ASC`,
        [id]
      );
      speaker.sesiones = sesionesRes.rows;
      console.log(`[Speakers] Encontrado en BD local: ${id}, sesiones: ${sesionesRes.rows.length}`);
      return res.json(speaker);
    }

    // Si no está en local, buscar en WordPress por wp_id
    console.log(`[Speakers] No está en local, buscando en WordPress: ${id}`);
    
    try {
      const wpResponse = await wordpressAPI.get(`/team-member/${id}`);
      
      if (wpResponse.data) {
        const post = wpResponse.data;
        const { sede, edicion } = parseSpeakerClassList(post.class_list || []);
        
        console.log(`[Speakers] Encontrado en WordPress: ${id}`);
        
        return res.json({
          id: post.id,
          wp_id: post.id,
          nombre: post.title?.rendered || '',
          bio: post.content?.rendered || '',
          cargo: post.acf?.cargo || '',
          empresa: post.acf?.empresa || '',
          foto: post.acf?.photo_url || '',
          linkedin: post.acf?.linkedin_url || '',
          sede,
          edicion,
          source: 'wordpress'
        });
      }
    } catch (wpError) {
      console.warn(`[Speakers] ⚠️ Error al buscar en WordPress:`, wpError.message);
    }

    console.log(`[Speakers] Speaker no encontrado: ${id}`);
    res.status(404).json({ error: 'Speaker no encontrado' });

  } catch (error) {
    console.error('❌ Error obteniendo speaker:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================================
// POST /speakers - Crear speaker (solo autenticados)
// ========================================================

// ============================================================
// POST /speakers/sync-from-wp
// Sincroniza speakers de WordPress a la tabla local
// ============================================================
router.post('/sync-from-wp', authRequired, async (req, res) => {
  try {
    if (!['super_admin','staff'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }

    let wpSpeakers = [];
    let page = 1, hasMore = true;
    while (hasMore) {
      const r = await wordpressAPI.get('/team-member', {
        params: { page, per_page: 100, _fields: 'id,title,content,slug,acf,class_list' }
      }).catch(() => null);
      if (!r?.data?.length) { hasMore = false; break; }
      wpSpeakers = wpSpeakers.concat(r.data);
      if (r.data.length < 100) hasMore = false;
      page++;
    }

    let insertados = 0, actualizados = 0;
    for (const post of wpSpeakers) {
      const nombre = post.title?.rendered?.trim() || '';
      if (!nombre) continue;
      const { sede, edicion } = parseSpeakerClassList(post.class_list || []);
      const cargo    = post.acf?.cargo    || post.acf?.position || '';
      const empresa  = post.acf?.empresa  || post.acf?.company  || '';
      const bio      = post.content?.rendered?.replace(/<[^>]+>/g,'').substring(0,1000) || '';
      const foto     = post.acf?.photo_url || '';
      const linkedin = post.acf?.linkedin_url || '';
      const twitter  = post.acf?.twitter_url  || '';
      const website  = post.acf?.website_url  || '';
      const email    = post.acf?.email || '';

      const existing = await pool.query(
        'SELECT id FROM speakers WHERE wp_id = $1', [post.id]
      );
      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE speakers SET
            nombre=$1, bio=$2, cargo=$3, company=$4, photo_url=$5,
            linkedin_url=$6, twitter_url=$7, website_url=$8, email=$9,
            sede=$10, edicion=$11, wp_slug=$12, wp_synced_at=NOW()
           WHERE wp_id=$13`,
          [nombre,bio,cargo,empresa,foto,linkedin,twitter,website,email,
           sede,edicion,post.slug,post.id]
        );
        actualizados++;
      } else {
        await pool.query(
          `INSERT INTO speakers
            (id,nombre,bio,cargo,company,photo_url,linkedin_url,twitter_url,
             website_url,email,sede,edicion,wp_id,wp_slug,wp_synced_at,source,activo,es_destacado)
           VALUES
            (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),'wordpress',true,false)`,
          [nombre,bio,cargo,empresa,foto,linkedin,twitter,website,email,
           sede,edicion,post.id,post.slug]
        );
        insertados++;
      }
    }

    res.json({
      ok: true,
      message: `Sync completado: ${insertados} nuevos, ${actualizados} actualizados`,
      total_wp: wpSpeakers.length, insertados, actualizados
    });
  } catch (err) {
    console.error('❌ sync-from-wp:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});


router.post('/', authRequired, async (req, res) => {
  try {
    const {
      nombre,
      bio,
      cargo,
      empresa,
      foto,
      linkedin,
      twitter,
      website,
      email,
      telefono,
      sede,
      edicion
    } = req.body;

    console.log('📝 Creando speaker:', nombre);

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const result = await pool.query(
      `INSERT INTO speakers 
      (
        id,
        nombre, 
        bio, 
        cargo, 
        company, 
        photo_url,
        linkedin_url,
        twitter_url,
        website_url,
        email,
        telefono,
        sede,
        edicion,
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
        bio,
        cargo,
        company as empresa,
        photo_url as foto,
        linkedin_url as linkedin,
        sede,
        edicion
      `,
      [
        nombre,
        bio || '',
        cargo || '',
        empresa || '',
        foto || null,
        linkedin || '',
        twitter || '',
        website || '',
        email || '',
        telefono || '',
        sede || 'chile',
        edicion || 2025
      ]
    );

    console.log('✅ Speaker creado:', result.rows[0].id);

    res.status(201).json({
      ok: true,
      speaker: result.rows[0],
      message: 'Speaker creado exitosamente'
    });

  } catch (err) {
    console.error("❌ Error creando speaker:", err);
    res.status(500).json({ 
      error: "Error creando speaker",
      details: err.message 
    });
  }
});

// ========================================================
// PUT /speakers/:id - Actualizar speaker (solo locales)
// ========================================================
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    // Aceptar todos los nombres de campos que usa el AdminPanel
    const nombre   = req.body.nombre;
    const bio      = req.body.bio;
    const cargo    = req.body.cargo;
    const empresa  = req.body.empresa    || req.body.company      || null;
    const foto     = req.body.foto       || req.body.photo_url    || null;
    const linkedin = req.body.linkedin   || req.body.linkedin_url || null;
    const twitter  = req.body.twitter    || req.body.twitter_url  || null;
    const website  = req.body.website    || req.body.website_url  || null;
    const email    = req.body.email;
    const telefono = req.body.telefono;
    const sede     = req.body.sede;
    const edicion  = req.body.edicion ? parseInt(req.body.edicion) : null;

    console.log('✏️ Actualizando speaker:', id);

    // Si el id es numérico (wp_id), resolver a UUID real
    let realId = id;
    const isNumeric = /^\d+$/.test(id);
    if (isNumeric) {
      const byWpId = await pool.query(
        'SELECT id FROM speakers WHERE wp_id = $1 LIMIT 1', [parseInt(id)]
      );
      if (byWpId.rows.length === 0) {
        return res.status(404).json({ error: `Speaker con wp_id ${id} no encontrado. Ejecuta "Sync desde WP" primero.` });
      }
      realId = byWpId.rows[0].id;
      console.log(`[Speakers] wp_id ${id} → UUID ${realId}`);
    }

    const check = await pool.query(
      'SELECT id FROM speakers WHERE id = $1', [realId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Speaker no encontrado' });
    }

    const result = await pool.query(
      `UPDATE speakers SET
        source       = CASE WHEN source = 'wordpress' THEN 'wordpress_local' ELSE source END,
        nombre       = CASE WHEN $1::text  IS NOT NULL AND $1 != '' THEN $1 ELSE nombre       END,
        bio          = CASE WHEN $2::text  IS NOT NULL             THEN $2 ELSE bio            END,
        cargo        = CASE WHEN $3::text  IS NOT NULL AND $3 != '' THEN $3 ELSE cargo         END,
        company      = CASE WHEN $4::text  IS NOT NULL AND $4 != '' THEN $4 ELSE company       END,
        photo_url    = CASE WHEN $5::text  IS NOT NULL AND $5 != '' THEN $5 ELSE photo_url     END,
        linkedin_url = CASE WHEN $6::text  IS NOT NULL AND $6 != '' THEN $6 ELSE linkedin_url  END,
        twitter_url  = CASE WHEN $7::text  IS NOT NULL AND $7 != '' THEN $7 ELSE twitter_url   END,
        website_url  = CASE WHEN $8::text  IS NOT NULL AND $8 != '' THEN $8 ELSE website_url   END,
        email        = CASE WHEN $9::text  IS NOT NULL AND $9 != '' THEN $9 ELSE email         END,
        telefono     = CASE WHEN $10::text IS NOT NULL AND $10 != '' THEN $10 ELSE telefono    END,
        sede         = CASE WHEN $11::text IS NOT NULL AND $11 != '' THEN $11 ELSE sede        END,
        edicion      = CASE WHEN $12::integer IS NOT NULL THEN $12 ELSE edicion END
       WHERE id = $13
       RETURNING id, nombre, bio, cargo,
                 company as empresa, photo_url as foto,
                 linkedin_url, twitter_url, website_url, email, telefono, sede, edicion`,
      [
        nombre   || null,
        bio      ?? null,
        cargo    || null,
        empresa  || null,
        foto     || null,
        linkedin || null,
        twitter  || null,
        website  || null,
        email    || null,
        telefono || null,
        sede     || null,
        edicion,
        realId,          // ← realId, no id original
      ]
    );

    console.log('✅ Speaker actualizado:', realId);

    res.json({
      ok: true,
      speaker: result.rows[0],
      message: 'Speaker actualizado exitosamente'
    });

  } catch (err) {
    console.error("❌ Error actualizando speaker:", err);
    res.status(500).json({ 
      error: "Error actualizando speaker",
      details: err.message 
    });
  }
});

// ========================================================
// DELETE /speakers/:id - Eliminar speaker (soft delete)
// ========================================================
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Eliminando speaker:', id);

    const check = await pool.query(
      'SELECT id, source FROM speakers WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Speaker no encontrado' });
    }

    if (check.rows[0].source === 'wordpress') {
      return res.status(403).json({
        error: 'No se pueden eliminar speakers de WordPress'
      });
    }

    await pool.query(
      'UPDATE speakers SET activo = false WHERE id = $1',
      [id]
    );

    console.log('✅ Speaker eliminado:', id);

    res.json({
      ok: true,
      message: 'Speaker eliminado exitosamente'
    });

  } catch (err) {
    console.error("❌ Error eliminando speaker:", err);
    res.status(500).json({ 
      error: "Error eliminando speaker",
      details: err.message 
    });
  }
});

export default router;