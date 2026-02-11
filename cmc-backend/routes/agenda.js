import express from 'express';
import { wordpressAPI } from '../config/wordpress.js';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();
// ✅ Helper para convertir hora (HH:MM) a timestamp ISO válido
function convertirHoraATimestamp(hora) {
  if (!hora) return null;
  
  try {
    // Si ya es un timestamp ISO válido, devolverlo
    if (hora.includes('T') && hora.includes('Z')) {
      return hora;
    }
    
    // Si es solo la hora (HH:MM o HH:MM:SS)
    const [h, m, s] = hora.split(':').map(Number);
    
    if (isNaN(h) || isNaN(m)) {
      console.warn('⚠️ Hora inválida:', hora);
      return null;
    }
    
    // Crear timestamp para HOY con la hora especificada
    const now = new Date();
    now.setHours(h, m, s || 0, 0);
    
    return now.toISOString();
  } catch (err) {
    console.error('❌ Error convirtiendo hora:', err, 'hora:', hora);
    return null;
  }
}

// ✅ Helper para convertir wp_id a UUID del speaker
async function getUUIDFromWpId(wpSpeakerId) {
  if (!wpSpeakerId) return null;
  
  try {
    const result = await pool.query(
      'SELECT id FROM speakers WHERE wp_id = $1 LIMIT 1',
      [wpSpeakerId]
    );
    
    if (result.rows.length === 0) {
      console.warn('⚠️ Speaker con wp_id no encontrado:', wpSpeakerId);
      return null;
    }
    
    return result.rows[0].id; // Devuelve el UUID
  } catch (err) {
    console.error('❌ Error buscando speaker:', err);
    return null;
  }
}

// Función helper para extraer info del class_list
function parseSessionClassList(classList = []) {
  let sede = null;
  let tipo = null;
  let edicion = null;
  let categoria = 'sesion';
  
  classList.forEach(cls => {
    if (cls === 'events_category-chile') sede = 'chile';
    if (cls === 'events_category-mexico') sede = 'mexico';
    if (cls === 'events_category-colombia') sede = 'colombia';
    
    if (cls.startsWith('events_category-') && /\d{4}/.test(cls)) {
      const tipoMatch = cls.match(/events_category-(brujula|toolbox|spark|orion|tracker|cursos)-/i);
      if (tipoMatch) {
        tipo = tipoMatch[1].toLowerCase();
        if (tipo === 'cursos') categoria = 'curso';
      }
      
      const paisMatch = cls.match(/-(cl|mx|co)-/i);
      if (paisMatch) {
        const pais = paisMatch[1].toLowerCase();
        sede = pais === 'cl' ? 'chile' : pais === 'mx' ? 'mexico' : 'colombia';
      }
      
      const yearMatch = cls.match(/(\d{4})/);
      if (yearMatch) {
        edicion = parseInt(yearMatch[1]);
      }
    }
  });
  
  return { sede, tipo, edicion, categoria };
}

// ========================================================
// GET /sessions - Obtener sesiones (WordPress + overrides locales)
// ========================================================
router.get('/sessions', authRequired, async (req, res) => {
  try {
    const { sede, edicion } = req.query;

    console.log(`[Agenda] Solicitando: sede=${sede}, edicion=${edicion}`);

    // 1. Obtener sesiones de WordPress
    const wpResponse = await wordpressAPI.get('/session', {
      params: {
        per_page: 100,
        _fields: 'id,title,content,slug,class_list,acf'
      }
    });

    console.log(`[Agenda /sessions] Total de WP: ${wpResponse.data.length}`);

    // 2. Obtener overrides locales (sesiones editadas de WordPress)
    const overridesResult = await pool.query(`
      SELECT 
        wp_id,
        title as titulo,
        description as descripcion,
        dia,
        start_at as "horaInicio",
        end_at as "horaFin",
        sala,
        room,
        tipo,
        categoria,
        sede,
        COALESCE(sede_override, sede) as sede_final,
        edicion,
        COALESCE(year_override, year, edicion) as edicion_final,
        speakers,
        qr_sala as "qrSala",
        wp_slug as slug,
        activo,
        destacado,
        override
      FROM agenda
      WHERE wp_id IS NOT NULL 
        AND override = true 
        AND activo = true
    `);

    // Crear mapa de overrides por wp_id
    const overridesMap = {};
    overridesResult.rows.forEach(o => {
      const firstSpeaker = o.speakers && o.speakers.length > 0 ? o.speakers[0] : null;
      overridesMap[o.wp_id] = {
        id: o.wp_id, // Mantener el ID de WordPress para consistencia
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
        speakerId: firstSpeaker,
        speakerNombre: '',
        qrSala: o.qrSala,
        slug: o.slug,
        source: 'wordpress-edited', // Marca que es de WP pero editado
        canEdit: true,
        destacado: o.destacado,
        isOverride: true
      };
    });

    // 3. Procesar sesiones de WordPress
    let wpSessions = wpResponse.data.map(post => {
      const parsed = parseSessionClassList(post.class_list || []);
      
      // Si existe override local, usar ese en lugar de los datos de WP
      if (overridesMap[post.id]) {
        return overridesMap[post.id];
      }
      
      // Si no hay override, devolver datos originales de WP
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
        edicion: parsed.edicion,
        speakerNombre: post.acf?.speaker || '',
        speakerId: post.acf?.speaker_id || null,
        source: 'wordpress',
        canEdit: true, // ✅ AHORA SÍ SE PUEDEN EDITAR
        isOverride: false
      };
    });

    // 4. Obtener sesiones 100% locales (creadas en el panel, no de WP)
    const localResult = await pool.query(`
      SELECT 
        id,
        title as titulo,
        description as descripcion,
        dia,
        start_at as "horaInicio",
        end_at as "horaFin",
        sala,
        room,
        tipo,
        categoria,
        sede,
        COALESCE(sede_override, sede) as sede_final,
        edicion,
        COALESCE(year_override, year, edicion) as edicion_final,
        speakers,
        qr_sala as "qrSala",
        wp_slug as slug,
        activo,
        destacado
      FROM agenda
      WHERE wp_id IS NULL 
        AND activo = true
      ORDER BY start_at ASC NULLS LAST
    `);

    const localSessions = localResult.rows.map(s => {
      const firstSpeaker = s.speakers && s.speakers.length > 0 ? s.speakers[0] : null;
      
      return {
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
        speakerId: firstSpeaker,
        speakerNombre: '',
        qrSala: s.qrSala,
        slug: s.slug,
        source: 'local',
        canEdit: true,
        destacado: s.destacado,
        isOverride: false
      };
    });

    // 5. Combinar: WP (con overrides ya aplicados) + Locales
    let allSessions = [...wpSessions, ...localSessions];

    // 6. Aplicar filtros
    if (sede) {
      const sedeLower = sede.toLowerCase();
      const before = allSessions.length;
      allSessions = allSessions.filter(s => s.sede === sedeLower);
      console.log(`[Agenda] Filtro sede "${sede}": ${before} → ${allSessions.length}`);
    }

    if (edicion) {
      const before = allSessions.length;
      const edicionNum = parseInt(edicion);
      allSessions = allSessions.filter(s => s.edicion === edicionNum);
      console.log(`[Agenda] Filtro edicion "${edicion}": ${before} → ${allSessions.length}`);
    }

    // 7. Responder
    res.json({
      sessions: allSessions,
      total: allSessions.length,
      sources: {
        wordpress: wpSessions.length,
        local: localSessions.length,
        overrides: Object.keys(overridesMap).length
      }
    });

  } catch (error) {
    console.error('❌ Error en GET /agenda/sessions:', error.message);
    res.status(500).json({
      sessions: [],
      error: error.message
    });
  }
});

// ========================================================
// POST /sessions - Crear nueva sesión
// ========================================================
router.post('/sessions', authRequired, async (req, res) => {
  try {
    const {
      titulo,
      descripcion,
      dia,
      horaInicio,
      horaFin,
      sala,
      tipo,
      sede,
      edicion,
      speakerId,
      speakerNombre
    } = req.body;

    console.log('📝 Creando sesión:', { titulo, tipo, sede, edicion });

    if (!titulo || !tipo || !sede || !edicion) {
      return res.status(400).json({
        error: 'Campos requeridos: titulo, tipo, sede, edicion'
      });
    }

    // ✅ Convertir wp_id a UUID
    let speakersArray = null;
    if (speakerId) {
      const speakerUUID = await getUUIDFromWpId(speakerId);
      speakersArray = speakerUUID ? [speakerUUID] : null;
    }

    const result = await pool.query(
      `INSERT INTO agenda 
      (
        id,
        title, 
        description, 
        dia, 
        start_at, 
        end_at, 
        sala, 
        tipo, 
        sede, 
        edicion,
        year,
        speakers, 
        categoria, 
        activo,
        source,
        override,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11, true, 'local', false, NOW()
      )
      RETURNING 
        id,
        title as titulo,
        description as descripcion,
        dia,
        start_at as "horaInicio",
        end_at as "horaFin",
        sala,
        tipo,
        sede,
        edicion,
        speakers,
        categoria
      `,
      [
        titulo,
        descripcion || '',
        dia || null,
        horaInicio || null,
        horaFin || null,
        sala || '',
        tipo,
        sede,
        edicion,
        speakersArray,
        tipo === 'curso' ? 'curso' : 'sesion'
      ]
    );

    console.log('✅ Sesión creada:', result.rows[0].id);

    res.status(201).json({
      ok: true,
      session: result.rows[0],
      message: 'Sesión creada exitosamente'
    });

  } catch (err) {
    console.error("❌ Error creando sesión:", err);
    res.status(500).json({ 
      ok: false,
      error: "Error creando sesión",
      details: err.message 
    });
  }
});

// ========================================================
// PUT /sessions/:id - Actualizar sesión (WP o local)
// ========================================================
router.put('/sessions/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      descripcion,
      horaInicio,
      horaFin,
      sala,
      tipo,
      sede,
      edicion,
      speakerId
    } = req.body;

  // ARREGL DÍA ------------------------------------------------
    function normalizarDia(dia) {
      if (dia === null || dia === undefined) return null;

      // Si ya es número, devolverlo
      if (typeof dia === 'number') return dia;

      // Si viene como string
      const dias = {
        lunes: 1,
        martes: 2,
        miercoles: 3,
        miércoles: 3,
        jueves: 4,
        viernes: 5,
      };

      const key = dia.toString().toLowerCase().trim();
      return dias[key] ?? null;
    }
    
    const diaNormalizado = normalizarDia(req.body.dia);

    console.log('🧪 Dia recibido:', req.body.dia);
    console.log('🧪 Dia normalizado:', diaNormalizado);

    // 🔒 Blindaje total: jamás enviar string a la DB
    let diaFinal = null;

    if (typeof diaNormalizado === 'number') {
      diaFinal = diaNormalizado;
    }

    if (req.body.dia && diaFinal === null) {
      console.warn('⚠️ Día inválido recibido:', req.body.dia);
    }
  // ARREGL DÍA ----------------------------------------------
    
    console.log('✏️ Actualizando sesión:', id);

    let speakersArray = null;
    if (speakerId) {
      const speakerUUID = await getUUIDFromWpId(speakerId);
      speakersArray = speakerUUID ? [speakerUUID] : null;
    }

    // CASO 1: Es una sesión de WordPress (ID numérico)
    if (!isNaN(id) && parseInt(id) > 1000) {
      console.log('📝 Creando override para sesión de WordPress:', id);

      // Verificar si ya existe un override
      const existing = await pool.query(
        'SELECT id FROM agenda WHERE wp_id = $1 AND override = true',
        [parseInt(id)]
      );

      if (existing.rows.length > 0) {
        // Ya existe override, actualizar
        // ✅ Convertir horas a timestamps válidos
        const startTimestamp = convertirHoraATimestamp(horaInicio);
        const endTimestamp = convertirHoraATimestamp(horaFin);
        
        const result = await pool.query(
          `UPDATE agenda SET
            title = COALESCE($1, title),
            description = COALESCE($2, description),
            dia = COALESCE($3, dia),
            start_at = COALESCE($4, start_at),
            end_at = COALESCE($5, end_at),
            sala = COALESCE($6, sala),
            tipo = COALESCE($7, tipo),
            sede_override = COALESCE($8, sede_override),
            year_override = COALESCE($9, year_override),
            speakers = COALESCE($10, speakers)
          WHERE wp_id = $11 AND override = true
          RETURNING 
            wp_id as id,
            title as titulo,
            description as descripcion,
            dia,
            start_at as "horaInicio",
            end_at as "horaFin",
            sala,
            tipo
          `,
          [
            titulo,
            descripcion,
            diaFinal,
            startTimestamp,
            endTimestamp,
            sala,
            tipo,
            sede,
            edicion,
            speakersArray,
            parseInt(id)
          ]
        );

        return res.json({
          ok: true,
          session: result.rows[0],
          message: 'Sesión actualizada (override)'
        });

      } else {
        // No existe override, crear uno nuevo
        // ✅ Convertir horas a timestamps válidos
        const startTimestamp = convertirHoraATimestamp(horaInicio);
        const endTimestamp = convertirHoraATimestamp(horaFin);
        
        await pool.query(
          `INSERT INTO agenda 
          (
            id,
            wp_id,
            title, 
            description, 
            dia, 
            start_at, 
            end_at, 
            sala, 
            tipo, 
            sede,
            sede_override,
            edicion,
            year,
            year_override,
            speakers, 
            categoria, 
            activo,
            source,
            override,
            created_at
          )
          VALUES (
            gen_random_uuid(),
            $1,
            $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $10, $10, $11, $12, true, 'wordpress', true, NOW()
          )`,
          [
            parseInt(id),
            titulo,
            descripcion || '',
            diaFinal,
            startTimestamp,
            endTimestamp,
            sala || '',
            tipo,
            sede,
            edicion,
            speakersArray,
            tipo === 'curso' ? 'curso' : 'sesion'
          ]
        );

        return res.json({
          ok: true,
          session: { id: parseInt(id), titulo },
          message: 'Override creado para sesión de WordPress'
        });
      }
    }

    // CASO 2: Es una sesión local (UUID)
    const check = await pool.query(
      'SELECT id FROM agenda WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'Sesión no encontrada'
      });
    }

    // ✅ Convertir horas a timestamps válidos
    const startTimestamp = convertirHoraATimestamp(horaInicio);
    const endTimestamp = convertirHoraATimestamp(horaFin);
    
    const result = await pool.query(
      `UPDATE agenda SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        dia = COALESCE($3, dia),
        start_at = COALESCE($4, start_at),
        end_at = COALESCE($5, end_at),
        sala = COALESCE($6, sala),
        tipo = COALESCE($7, tipo),
        sede = COALESCE($8, sede),
        edicion = COALESCE($9, edicion),
        year = COALESCE($9, year),
        speakers = COALESCE($10, speakers)
      WHERE id = $11
      RETURNING 
        id,
        title as titulo,
        description as descripcion,
        dia,
        start_at as "horaInicio",
        end_at as "horaFin",
        sala,
        tipo,
        sede,
        edicion
      `,
      [
        titulo,
        descripcion,
        diaFinal,
        startTimestamp,
        endTimestamp,
        sala,
        tipo,
        sede,
        edicion,
        speakersArray,
        id
      ]
    );

    console.log('✅ Sesión local actualizada:', id);

    res.json({
      ok: true,
      session: result.rows[0],
      message: 'Sesión actualizada exitosamente'
    });

  } catch (err) {
    console.error("❌ Error actualizando sesión:", err);
    res.status(500).json({ 
      ok: false,
      error: "Error actualizando sesión",
      details: err.message 
    });
  }
});

// ========================================================
// DELETE /sessions/:id - Eliminar sesión
// ========================================================
router.delete('/sessions/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Eliminando sesión:', id);

    // Si es de WordPress (ID numérico), eliminar el override si existe
    if (!isNaN(id) && parseInt(id) > 1000) {
      await pool.query(
        'UPDATE agenda SET activo = false WHERE wp_id = $1 AND override = true',
        [parseInt(id)]
      );

      return res.json({
        ok: true,
        message: 'Override eliminado. La sesión volverá a mostrar datos de WordPress'
      });
    }

    // Si es local, soft delete
    const check = await pool.query(
      'SELECT id FROM agenda WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'Sesión no encontrada'
      });
    }

    await pool.query(
      'UPDATE agenda SET activo = false WHERE id = $1',
      [id]
    );

    console.log('✅ Sesión local eliminada:', id);

    res.json({
      ok: true,
      message: 'Sesión eliminada exitosamente'
    });

  } catch (err) {
    console.error("❌ Error eliminando sesión:", err);
    res.status(500).json({ 
      ok: false,
      error: "Error eliminando sesión",
      details: err.message 
    });
  }
});

// ========================================================
// POST /favorite/:id - Agregar a favoritos
// ========================================================
router.post('/favorite/:id', authRequired, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    await pool.query(
      `INSERT INTO favoritos (user_id, session_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, sessionId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Error guardando favorito:', err);
    res.status(500).json({ error: 'Error al guardar favorito' });
  }
});

// ========================================================
// DELETE /favorite/:id - Quitar de favoritos
// ========================================================
router.delete('/favorite/:id', authRequired, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    await pool.query(
      `DELETE FROM favoritos WHERE user_id = $1 AND session_id = $2`,
      [userId, sessionId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Error quitando favorito:', err);
    res.status(500).json({ error: 'Error al quitar favorito' });
  }
});

// ========================================================
// POST /checkin - Registrar asistencia
// ========================================================
router.post('/checkin', authRequired, async (req, res) => {
  try {
    const { qr, userId } = req.body;

    if (!qr || !userId) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const sessionResult = await pool.query(
      `SELECT id, title as titulo FROM agenda WHERE qr_sala = $1`,
      [qr]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Código QR inválido' });
    }

    const session = sessionResult.rows[0];

    const exists = await pool.query(
      `SELECT 1 FROM asistencias_sesion 
       WHERE session_id = $1 AND user_id = $2`,
      [session.id, userId]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Ya registraste asistencia' });
    }

    await pool.query(
      `INSERT INTO asistencias_sesion (id, session_id, user_id, fecha)
       VALUES (gen_random_uuid(), $1, $2, NOW())`,
      [session.id, userId]
    );

    res.json({
      ok: true,
      session: {
        id: session.id,
        titulo: session.titulo
      }
    });
  } catch (err) {
    console.error('❌ Error en check-in:', err);
    res.status(500).json({ error: 'Error al registrar asistencia' });
  }
});

export default router;