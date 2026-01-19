import express from 'express';
import { wordpressAPI } from '../config/wordpress.js';
import pool from '../db.js';
import { authRequired, requireTipoPase, requireDias } from '../utils/authMiddleware.js'; // ← AGREGAR

const router = express.Router();

// Función helper para extraer info del class_list de sesiones
function parseSessionClassList(classList = []) {
  let sede = null;
  let tipo = null;
  let edicion = null;
  let categoria = 'sesion';
  
  classList.forEach(cls => {
    // Detectar sede directa: events_category-chile, events_category-mexico
    if (cls === 'events_category-chile') sede = 'chile';
    if (cls === 'events_category-mexico') sede = 'mexico';
    if (cls === 'events_category-colombia') sede = 'colombia';
    
    // Detectar patrón: events_category-tipo-pais-año
    // Ejemplos: events_category-toolbox-cl-2025, events_category-spark-mx-2025
    if (cls.startsWith('events_category-') && /\d{4}/.test(cls)) {
      const parts = cls.replace('events_category-', '').split('-');
      
      // Extraer tipo (brújula, spark, toolbox, etc.)
      const tipoMatch = cls.match(/events_category-(brujula|toolbox|spark|orion|tracker|cursos)-/i);
      if (tipoMatch) {
        tipo = tipoMatch[1].toLowerCase();
        if (tipo === 'cursos') categoria = 'curso';
      }
      
      // Extraer país (cl, mx, co)
      const paisMatch = cls.match(/-(cl|mx|co)-/i);
      if (paisMatch) {
        const pais = paisMatch[1].toLowerCase();
        sede = pais === 'cl' ? 'chile' : pais === 'mx' ? 'mexico' : 'colombia';
      }
      
      // Extraer año
      const yearMatch = cls.match(/(\d{4})/);
      if (yearMatch) {
        edicion = parseInt(yearMatch[1]);
      }
    }
  });
  
  return { sede, tipo, edicion, categoria };
}

// GET /api/agenda?sede=chile&edicion=2025
router.get('/', async (req, res) => {
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

    console.log(`[Agenda] Total obtenidas de WP: ${wpResponse.data.length}`);

    // Procesar cada sesión
    let sessions = wpResponse.data.map(post => {
      const parsed = parseSessionClassList(post.class_list || []);
      
      return {
        id: post.id,
        wp_id: post.id,
        titulo: post.title?.rendered || '',
        descripcion: post.content?.rendered?.replace(/<[^>]+>/g, '') || '',
        slug: post.slug,
        dia: post.acf?.dia || null,
        horaInicio: post.acf?.hora_inicio || post.acf?.start_time || '',
        horaFin: post.acf?.hora_fin || post.acf?.end_time || '',
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

    // Filtrar por sede si se proporciona
    if (sede) {
      const sedeLower = sede.toLowerCase();
      const before = sessions.length;
      sessions = sessions.filter(s => s.sede === sedeLower);
      console.log(`[Agenda] Filtro sede "${sede}": ${before} → ${sessions.length}`);
    }

    // Filtrar por edición si se proporciona
    if (edicion) {
      const before = sessions.length;
      const edicionNum = parseInt(edicion);
      sessions = sessions.filter(s => s.edicion === edicionNum);
      console.log(`[Agenda] Filtro edicion "${edicion}": ${before} → ${sessions.length}`);
    }

    res.json({
      success: true,
      count: sessions.length,
      data: sessions
    });

  } catch (error) {
    console.error('❌ Error en GET /agenda:', error.message);
    res.status(200).json({
      success: false,
      count: 0,
      data: [],
      error: error.message
    });
  }
});

// POST /api/agenda/favorite/:sessionId (PROTEGIDO)
router.post('/favorite/:sessionId', authRequired, requireTipoPase('sesiones', 'combo', 'staff'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.body;

    await pool.query(
      `INSERT INTO favoritos (user_id, session_id, created_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (user_id, session_id) DO NOTHING`,
      [userId, sessionId]
    );

    res.json({ 
      success: true, 
      message: 'Sesión agregada a favoritos' 
    });
  } catch (error) {
    console.error('❌ Error al guardar favorito:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al guardar favorito' 
    });
  }
});

// POST /api/agenda/checkin (Solo STAFF puede registrar asistencia)
router.post('/checkin', authRequired, requireTipoPase('staff'), async (req, res) => {
  try {
    const { qr, userId } = req.body;

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
      return res.status(404).json({ 
        success: false,
        message: 'Código QR inválido' 
      });
    }

    await pool.query(
      `INSERT INTO asistencias_sesion (user_id, session_id, fecha) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT DO NOTHING`,
      [userId, session.id]
    );

    res.json({ 
      success: true, 
      message: 'Asistencia registrada',
      session: {
        id: session.id,
        titulo: session.title?.rendered || ''
      }
    });
  } catch (error) {
    console.error('❌ Error en check-in:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al registrar asistencia' 
    });
  }
});

export default router;