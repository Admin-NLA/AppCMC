import express from 'express';
import { wordpressAPI } from '../config/wordpress.js';

const router = express.Router();

// Función helper para extraer info del class_list
function parseSpeakerClassList(classList = []) {
  let sede = null;
  let eventos = [];
  
  classList.forEach(cls => {
    // Detectar sede: team-category-chile, team-category-mexico, team-category-colombia
    if (cls === 'team-category-chile') sede = 'chile';
    if (cls === 'team-category-mexico') sede = 'mexico';
    if (cls === 'team-category-colombia') sede = 'colombia';
    
    // Detectar eventos que contengan año
    if (cls.startsWith('team-category-') && /\d{4}/.test(cls)) {
      // Ejemplos: team-category-speakers-2025-cl, team-category-toolbox-cl-2025
      eventos.push(cls.replace('team-category-', ''));
    }
  });
  
  return { sede, eventos };
}

// GET /api/speakers?sede=chile&edicion=2025
router.get('/', async (req, res) => {
  try {
    const { sede, edicion } = req.query;

    console.log(`[Speakers] Solicitando: sede=${sede}, edicion=${edicion}`);

    // Obtener speakers de WordPress
    const wpResponse = await wordpressAPI.get('/team-member', {
      params: {
        per_page: 100,
        _fields: 'id,title,content,slug,featured_media,class_list,acf'
      }
    });

    console.log(`[Speakers] Total obtenidos de WP: ${wpResponse.data.length}`);

    // Procesar cada speaker
    let speakers = wpResponse.data.map(post => {
      const { sede: detectedSede, eventos } = parseSpeakerClassList(post.class_list || []);
      
      return {
        id: post.id,
        wp_id: post.id,
        nombre: post.title?.rendered || '',
        biografia: post.content?.rendered || '',
        cargo: post.acf?.cargo || post.acf?.position || '',
        empresa: post.acf?.empresa || post.acf?.company || '',
        slug: post.slug,
        foto: post.featured_media || null,
        linkedin: post.acf?.linkedin || '',
        twitter: post.acf?.twitter || '',
        website: post.acf?.website || '',
        sede: detectedSede,
        eventos: eventos,
        source: 'wordpress'
      };
    });

    // Filtrar por sede si se proporciona
    if (sede) {
      const sedeLower = sede.toLowerCase();
      const before = speakers.length;
      speakers = speakers.filter(s => s.sede === sedeLower);
      console.log(`[Speakers] Filtro sede "${sede}": ${before} → ${speakers.length}`);
    }

    // Filtrar por edición si se proporciona
    if (edicion) {
      const before = speakers.length;
      speakers = speakers.filter(s =>
        s.eventos.some(e => e.includes(edicion))
      );
      console.log(`[Speakers] Filtro edicion "${edicion}": ${before} → ${speakers.length}`);
    }

    res.json({
      success: true,
      count: speakers.length,
      data: speakers
    });

  } catch (error) {
    console.error('❌ Error en GET /speakers:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener speakers',
      detail: error.message 
    });
  }
});

export default router;