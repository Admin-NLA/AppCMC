// IMPORTANTE -------------------------------------------------------------------------------
// MODO A (recomendado): base64 en body
//        POST /api/upload/photo  { data: "data:image/jpeg;base64,..." }
//        → Guarda la URL base64 en users.avatar_url y la devuelve.
//        Sin dependencias extra. Ideal para imágenes de perfil pequeñas (<200KB).
//
// MODO B: URL externa
//        POST /api/upload/photo  { url: "https://..." }
//        → Guarda esa URL directamente en users.avatar_url.
//
// En ambos casos actualiza users.avatar_url del usuario autenticado
// y devuelve { ok: true, url } para que el frontend actualice el estado.
// ------------------------------------------------------------------------------------------

import express from 'express';
import pool    from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

const MAX_BASE64_SIZE = 3 * 1024 * 1024; // 3MB

router.post('/photo', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: base64Data, url: externalUrl } = req.body;

    let avatarUrl = null;

    // ── MODO B: URL externa ───────────────────────────────
    if (externalUrl && externalUrl.startsWith('http')) {
      avatarUrl = externalUrl;

    // ── MODO A: base64 ────────────────────────────────────
    } else if (base64Data && base64Data.startsWith('data:image')) {
      // Validar tamaño aproximado (base64 crece ~33% vs binario)
      const sizeEstimate = base64Data.length * 0.75;
      if (sizeEstimate > MAX_BASE64_SIZE) {
        return res.status(400).json({
          ok: false,
          error: `Imagen demasiado grande (máx ~225KB). Tamaño estimado: ${Math.round(sizeEstimate / 1024)}KB`
        });
      }
      avatarUrl = base64Data;

    } else {
      return res.status(400).json({
        ok: false,
        error: 'Se requiere { data: "data:image/...;base64,..." } o { url: "https://..." }'
      });
    }

    // Actualizar avatar_url en la DB
    await pool.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2',
      [avatarUrl, userId]
    );

    console.log(`[Upload] ✅ Avatar actualizado para usuario ${userId}`);

    res.json({ ok: true, url: avatarUrl });

  } catch (err) {
    console.error('❌ Error en POST /upload/photo:', err.message);
    res.status(500).json({ ok: false, error: 'Error al subir foto', details: err.message });
  }
});

export default router;