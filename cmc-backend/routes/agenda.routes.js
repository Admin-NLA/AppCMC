import express from 'express';
import { wordpressAPI } from '../config/wordpress.js';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/agenda?sede=mexico
router.get('/', async (req, res) => {
  try {
    const { sede } = req.query;

    // 🔥 Obtener agenda desde WordPress
    // Asumiendo que tienes un Custom Post Type "agenda"
    const wpResponse = await wordpressAPI.get('/agenda/sessions', {
      params: {
        sede: sede,
        per_page: 100,
        _fields: 'id,title,acf' // ACF = Advanced Custom Fields
      }
    });

    // Transformar datos de WordPress a formato de tu app
    const sessions = wpResponse.data.map(post => ({
      id: post.id,
      titulo: post.title.rendered,
      descripcion: post.acf?.descripcion || '',
      dia: post.acf?.dia || 'lunes',
      horaInicio: post.acf?.hora_inicio || '',
      horaFin: post.acf?.hora_fin || '',
      sala: post.acf?.sala || '',
      tipo: post.acf?.tipo || 'conferencia',
      speakerNombre: post.acf?.speaker_nombre || '',
      speakerId: post.acf?.speaker_id || null,
      sede: post.acf?.sede || sede,
      qrCode: post.acf?.qr_code || `SESSION_${post.id}`
    }));

    res.json(sessions);
  } catch (error) {
    console.error('Error en GET /agenda:', error.message);
    
    // Fallback: retornar datos de respaldo si falla WordPress
    res.json([
      {
        id: 1,
        titulo: "Apertura del Congreso CMC",
        descripcion: "Ceremonia inaugural",
        dia: "lunes",
        horaInicio: "09:00",
        horaFin: "10:00",
        sala: "Auditorio Principal",
        tipo: "conferencia",
        speakerNombre: "Dr. Carlos Pérez",
        sede: req.query.sede || "mexico"
      }
    ]);
  }
});

// POST /api/agenda/favorite/:sessionId
router.post('/favorite/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.body;

    await pool.query(
      `INSERT INTO agenda_guardada (user_id, session_id, created_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (user_id, session_id) DO NOTHING`,
      [userId, sessionId]
    );

    res.json({ success: true, message: 'Sesión agregada a favoritos' });
  } catch (error) {
    console.error('Error al guardar favorito:', error);
    res.status(500).json({ error: 'Error al guardar favorito' });
  }
});

// POST /api/agenda/checkin
router.post('/checkin', async (req, res) => {
  try {
    const { qr, userId } = req.body;

    // Buscar sesión en WordPress por QR
    const wpResponse = await wordpressAPI.get('/agenda/sessions', {
      params: {
        'meta_key': 'qr_code',
        'meta_value': qr,
        per_page: 1
      }
    });

    if (wpResponse.data.length === 0) {
      return res.status(404).json({ message: 'Código QR inválido' });
    }

    const session = wpResponse.data[0];

    // Registrar asistencia en PostgreSQL
    await pool.query(
      `INSERT INTO asistencias (user_id, session_id, timestamp, tipo) 
       VALUES ($1, $2, NOW(), 'entrada') 
       ON CONFLICT (user_id, session_id) DO NOTHING`,
      [userId, session.id]
    );

    res.json({ 
      success: true, 
      message: 'Asistencia registrada',
      session: {
        id: session.id,
        titulo: session.title.rendered
      }
    });
  } catch (error) {
    console.error('Error en check-in:', error);
    res.status(500).json({ error: 'Error al registrar asistencia' });
  }
  sessions
});

export default router;