import express from 'express';
import { wordpressAPI } from '../config/wordpress.js';

const router = express.Router();

// GET /api/speakers?sede=mexico
router.get('/', async (req, res) => {
  try {
    const { sede } = req.query;

    // ✅ CORRECTO: usar 'team-member' en vez de 'speakers'
    const wpResponse = await wordpressAPI.get('/team-member', {
      params: {
        per_page: 100,
        _fields: 'id,title,acf,featured_media,class_list'
      }
    });

    const speakers = wpResponse.data
      .filter(post => {
        // Filtrar por sede si se proporciona
        if (!sede) return true;
        
        // Verificar si el class_list contiene la sede
        const classList = post.class_list || [];
        const sedeMap = { mexico: 'mx', chile: 'cl', colombia: 'co' };
        const sedeCode = sedeMap[sede.toLowerCase()];
        
        return classList.some(cls => 
          cls.includes(`events_category-`) && cls.includes(`-${sedeCode}-`)
        );
      })
      .map(post => ({
        id: post.id,
        nombre: post.title.rendered,
        biografia: post.acf?.biografia || post.acf?.bio || '',
        empresa: post.acf?.empresa || post.acf?.company || '',
        cargo: post.acf?.cargo || post.acf?.position || '',
        foto: post.featured_media || post.acf?.foto || '',
        linkedin: post.acf?.linkedin || '',
        sede: sede || 'general'
      }));

    res.json(speakers);
  } catch (error) {
    console.error('Error en GET /speakers:', error.message);
    res.status(500).json({ 
      error: 'Error al obtener speakers',
      detail: error.message 
    });
  }
});

export default router;