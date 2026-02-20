import express from 'express';
import multer from 'multer';
import admin from 'firebase-admin';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/photo', authRequired, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    
    const bucket = admin.storage().bucket();
    const filename = `profile_${req.user.id}_${Date.now()}.jpg`;
    const file = bucket.file(filename);
    
    await file.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype }
    });
    
    const url = await file.getSignedUrl({ action: 'read', expires: Date.now() + 100*365*24*60*60*1000 });
    
    res.json({ ok: true, url: url[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;