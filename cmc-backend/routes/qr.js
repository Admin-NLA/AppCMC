// cmc-backend/routes/qr.js
//
// FIX: La versión anterior consultaba la tabla 'usuarios' que NO existe.
//      La tabla real se llama 'users'. También se corrigió el cast
//      del id (uuid en DB, no integer).

import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/qr/:usuario_id
 * Devuelve los datos necesarios para generar el QR del usuario.
 * Solo el propio usuario o el super_admin puede consultarlo.
 */
router.get('/:usuario_id', authRequired, async (req, res) => {
  try {
    const { usuario_id } = req.params;

    // FIX: comparar como string (ambos son uuid)
    if (req.user.id !== usuario_id && req.user.rol !== 'super_admin') {
      return res.status(403).json({ ok: false, error: 'No autorizado' });
    }

    // FIX: tabla corregida 'users' (antes era 'usuarios' — no existe)
    const result = await pool.query(
      `SELECT id, email, nombre, rol, tipo_pase, sede, empresa
       FROM users
       WHERE id = $1 AND activo = true`,
      [usuario_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];

    res.json({
      ok: true,
      qr: {
        id:        user.id,
        email:     user.email,
        nombre:    user.nombre,
        rol:       user.rol,
        pase:      user.tipo_pase,
        sede:      user.sede,
        empresa:   user.empresa,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (err) {
    console.error('❌ Error en GET /qr/:usuario_id:', err.message);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

export default router;