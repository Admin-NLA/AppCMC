import express from 'express';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

router.post('/photo', authRequired, async (req, res) => {
  try {
    // Por ahora, solo retorna un placeholder
    // El upload real se implementará después
    res.json({ 
      ok: true, 
      url: 'https://via.placeholder.com/150',
      message: 'Upload endpoint disponible (placeholder)'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;