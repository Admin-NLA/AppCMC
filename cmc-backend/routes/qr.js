// cmc-backend/routes/qr.js
//
// FIX: La versión anterior consultaba la tabla 'usuarios' que NO existe.
//      La tabla real se llama 'users'. También se corrigió el cast
//      del id (uuid en DB, no integer).
//
// FIX 2: Se agrega el campo `vcard` con el MISMO formato que genera
//        el Tkinter/Flask (vCard 3.0). El escáner del Tkinter identifica
//        al asistente por la línea EMAIL;TYPE=INTERNET: del vCard, así
//        que mientras el email coincida, el QR generado aquí es
//        reconocido sin modificar nada del lado del Tkinter.

import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// Mapeo tipo_pase/rol → etiqueta de NOTE (igual que VCARD_TYPES del Tkinter)
const VCARD_NOTE_LABEL = {
  asistente_combo: 'Asistente',
  asistente_sesiones: 'Asistente',
  asistente_curso: 'Asistente',
  asistente_general: 'Asistente Expo',
  expositor: 'Expositor',
  speaker: 'Speaker',
  staff: 'Comité Organizador',
  super_admin: 'Comité Organizador',
};

function splitNombre(nombreCompleto) {
  const partes = (nombreCompleto || '').trim().split(/\s+/);
  if (partes.length <= 1) return { nombre: partes[0] || '', apellido: '' };
  return { nombre: partes[0], apellido: partes.slice(1).join(' ') };
}

function buildVCard(user) {
  const { nombre, apellido } = splitNombre(user.nombre);
  const empresa = user.empresa || '';
  const email = user.email || '';
  const telefono = (user.movil || '').replace(/\D/g, '');
  const sede = (user.sede || '').toUpperCase();
  const año = new Date().getFullYear();
  const tipoLabel = VCARD_NOTE_LABEL[user.rol] || VCARD_NOTE_LABEL[user.tipo_pase] || 'Asistente';

  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${nombre} ${apellido}`.trim(),
    `N:${apellido};${nombre};;;`,
    `ORG:${empresa}`,
    `EMAIL;TYPE=INTERNET:${email}`,
    `TEL;TYPE=CELL:${telefono}`,
    `NOTE:${tipoLabel} CMC ${sede} ${año}`,
    'END:VCARD',
  ].join('\r\n');
}

/**
 * GET /api/qr/:usuario_id
 * Devuelve los datos necesarios para generar el QR del usuario,
 * incluyendo el vcard ya formateado (idéntico al del Tkinter).
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
      `SELECT id, email, nombre, rol, tipo_pase, sede, empresa, movil, qr_code
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
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        pase: user.tipo_pase,
        sede: user.sede,
        empresa: user.empresa,
        qr_code: user.qr_code,
        vcard: buildVCard(user),   // ← formato que escanea el Tkinter
        timestamp: new Date().toISOString(),
      },
    });

  } catch (err) {
    console.error('❌ Error en GET /qr/:usuario_id:', err.message);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

export default router;