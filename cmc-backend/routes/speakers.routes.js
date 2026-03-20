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
    // Deduplicar: si un speaker de WP ya está en tabla local (mismo wp_id),
    // usar el local (tiene UUID real) y descartar el duplicado de WP
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
// Resuelve el problema del selector de speakers en sesiones
// ============================================================
router.post('/sync-from-wp', authRequired, async (req, res) => {
  try {
    if (!['super_admin','staff'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }

    // Traer todos los speakers de WP
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
      const cargo   = post.acf?.cargo || post.acf?.position || '';
      const empresa = post.acf?.empresa || post.acf?.company || '';
      const bio     = post.content?.rendered?.replace(/<[^>]+>/g,'').substring(0,1000) || '';
      const foto    = post.acf?.photo_url || '';
      const linkedin= post.acf?.linkedin_url || '';
      const twitter = post.acf?.twitter_url  || '';
      const website = post.acf?.website_url  || '';
      const email   = post.acf?.email || '';

      // Upsert: actualizar si ya existe por wp_id, insertar si no
      const existing = await pool.query(
        'SELECT id FROM speakers WHERE wp_id = $1', [post.id]
      );
      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE speakers SET
            nombre=$1, bio=$2, cargo=$3, company=$4, photo_url=$5,
            linkedin_url=$6, twitter_url=$7, website_url=$8, email=$9,
            sede=$10, edicion=$11, wp_slug=$12, wp_synced_at=NOW(),
            source='wordpress', activo=true
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
      telefono
    } = req.body;

    console.log('✏️ Actualizando speaker:', id);

    // Verificar que existe y es local
    const check = await pool.query(
      'SELECT id, source FROM speakers WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Speaker no encontrado' });
    }

    if (check.rows[0].source === 'wordpress') {
      return res.status(403).json({
        error: 'No se pueden editar speakers sincronizados de WordPress'
      });
    }

    const result = await pool.query(
      `UPDATE speakers SET
        nombre = COALESCE($1, nombre),
        bio = COALESCE($2, bio),
        cargo = COALESCE($3, cargo),
        company = COALESCE($4, company),
        photo_url = COALESCE($5, photo_url),
        linkedin_url = COALESCE($6, linkedin_url),
        twitter_url = COALESCE($7, twitter_url),
        website_url = COALESCE($8, website_url),
        email = COALESCE($9, email),
        telefono = COALESCE($10, telefono)
      WHERE id = $11
      RETURNING 
        id,
        nombre,
        bio,
        cargo,
        company as empresa,
        photo_url as foto
      `,
      [
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
        id
      ]
    );

    console.log('✅ Speaker actualizado:', id);

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