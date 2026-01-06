import express from 'express';
import { wordpressAPI } from '../config/wordpress.js';

const router = express.Router();

// GET /api/expositores?sede=mexico
router.get('/', async (req, res) => {
  try {
    const { sede } = req.query;

    const wpResponse = await wordpressAPI.get('/expositores', {
      params: {
        sede: sede,
        per_page: 100,
        _fields: 'id,title,acf,featured_media'
      }
    });

    const expositores = wpResponse.data.map(post => ({
      id: post.id,
      nombre: post.title.rendered,
      descripcion: post.acf?.descripcion || '',
      stand: post.acf?.numero_stand || '',
      logo: post.featured_media || '',
      website: post.acf?.website || '',
      categoria: post.acf?.categoria || '',
      sede: post.acf?.sede || sede
    }));

    res.json(expositores);
  } catch (error) {
    console.error('Error en GET /expositores:', error.message);
    res.status(500).json({ error: 'Error al obtener expositores' });
  }
});

export default router;