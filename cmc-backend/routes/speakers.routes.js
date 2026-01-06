import express from 'express';
import { wordpressAPI } from '../config/wordpress.js';

const router = express.Router();

// GET /api/speakers?sede=mexico
router.get('/', async (req, res) => {
  try {
    const { sede } = req.query;

    const wpResponse = await wordpressAPI.get('/speakers', {
      params: {
        sede: sede,
        per_page: 100,
        _fields: 'id,title,acf,featured_media'
      }
    });

    const speakers = wpResponse.data.map(post => ({
      id: post.id,
      nombre: post.title.rendered,
      biografia: post.acf?.biografia || '',
      empresa: post.acf?.empresa || '',
      cargo: post.acf?.cargo || '',
      foto: post.featured_media || '',
      linkedin: post.acf?.linkedin || '',
      sede: post.acf?.sede || sede
    }));

    res.json(speakers);
  } catch (error) {
    console.error('Error en GET /speakers:', error.message);
    res.status(500).json({ error: 'Error al obtener speakers' });
  }
});

export default router;