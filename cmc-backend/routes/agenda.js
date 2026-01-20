import express from 'express';
import { wordpressAPI } from '../config/wordpress.js';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

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
// GET /sessions - Obtener sesiones desde WordPress
// ========================================================
router.get('/sessions', authRequired, async (req, res) => {
  try {
    const { sede, edicion } = req.query;

    console.log(`[Agenda] Solicitando: sede=${sede}, edicion=${edicion}`);

    // Obtener sesiones de WordPress
    const wpResponse = await wordpressAPI.get('/session', {
      params: {
        per_page: 100,
        _fields: 'id,title,content,slug,class_list,acf'
      }
    });

    console.log(`[Agenda /sessions] Total de WP: ${wpResponse.data.length}`);

    // Procesar cada sesión
    let sessions = wpResponse.data.map(post => {
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
        edicion: parsed.edicion,
        speakerNombre: post.acf?.speaker || '',
        speakerId: post.acf?.speaker_id || null,
        source: 'wordpress'
      };
    });

    // Filtrar por sede
    if (sede) {
      const sedeLower = sede.toLowerCase();
      const before = sessions.length;
      sessions = sessions.filter(s => s.sede === sedeLower);
      console.log(`[Agenda] Filtro sede "${sede}": ${before} → ${sessions.length}`);
    }

    // Filtrar por edición
    if (edicion) {
      const before = sessions.length;
      const edicionNum = parseInt(edicion);
      sessions = sessions.filter(s => s.edicion === edicionNum);
      console.log(`[Agenda] Filtro edicion "${edicion}": ${before} → ${sessions.length}`);
    }

    // ✅ Responder con formato que espera el frontend
    res.json({
      sessions: sessions
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
// POST /unfavorite/:id - Quitar de favoritos
// ========================================================
router.post('/unfavorite/:id', authRequired, async (req, res) => {
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

    // Buscar sesión por QR en WordPress
    const wpResponse = await wordpressAPI.get('/session', {
      params: {
        per_page: 100,
        _fields: 'id,title,acf'
      }
    });

    const session = wpResponse.data.find(post => 
      post.acf?.qr === qr || post.acf?.qr_code === qr
    );

    if (!session) {
      return res.status(404).json({ error: 'Código QR inválido' });
    }

    // Verificar si ya hizo check-in
    const exists = await pool.query(
      `SELECT 1 FROM asistencias_sesion 
       WHERE session_id = $1 AND user_id = $2`,
      [session.id, userId]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Ya registraste asistencia' });
    }

    // Registrar asistencia
    await pool.query(
      `INSERT INTO asistencias_sesion (id, session_id, user_id, fecha)
       VALUES (gen_random_uuid(), $1, $2, NOW())`,
      [session.id, userId]
    );

    res.json({
      ok: true,
      session: {
        id: session.id,
        titulo: session.title?.rendered || ''
      }
    });
  } catch (err) {
    console.error('❌ Error en check-in:', err);
    res.status(500).json({ error: 'Error al registrar asistencia' });
  }
});

export default router;