// cmc-backend/routes/networking.js
// Sistema de citas CMC — Networking Expositor ↔ Asistente
//
// FLUJO:
//   1. Asistente ve directorio de expositores y solicita cita
//      → POST /networking  { expositor_id, fecha, hora, hora_fin?, notas? }
//      → cita queda en status='pendiente'
//
//   2. Expositor ve sus citas pendientes y las acepta o rechaza
//      → PUT /networking/:id  { status: 'confirmada' | 'rechazada', ubicacion?, notas? }
//
//   3. Ambos ven sus citas en su panel
//      → GET /networking/mis-citas  → citas del usuario (como solicitante o expositor)
//
//   4. Staff/Admin ven todas las citas
//      → GET /networking/admin
//
// TABLA: networking
//   id, solicitante_id, expositor_id (uuid del usuario con rol=expositor),
//   fecha, hora, hora_fin, status, ubicacion, notas, sede, created_at, updated_at

import express from 'express';
import pool    from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ── Helper: crear notificación interna ───────────────────
async function crearNotificacion(pool, { userId, titulo, mensaje, tipo, meta }) {
  try {
    await pool.query(
      `INSERT INTO notificaciones (titulo, mensaje, tipo, meta, tipo_usuario, activa, enviada, sede)
       VALUES ($1, $2, $3, $4, ARRAY[$5], true, true, 'ALL')`,
      [titulo, mensaje, tipo || 'info', JSON.stringify(meta || {}), userId]
    );
  } catch (e) {
    console.warn('[Networking] No se pudo crear notificación:', e.message);
  }
}



const ROLES_ADMIN = ['super_admin', 'staff'];
const STATUS_VALIDOS = ['pendiente', 'confirmada', 'rechazada', 'cancelada'];

// ── Helper: datos del expositor (nombre, stand, logo) ────────
async function getExpositor(id) {
  const r = await pool.query(
    `SELECT e.id, e.nombre, e.stand, e.logo_url, e.sede, e.categoria,
            u.id AS user_id, u.nombre AS user_nombre, u.email AS user_email, u.movil
     FROM expositores e
     LEFT JOIN users u ON u.id = e.usuario_id
     WHERE e.id = $1 AND e.activo = true`,
    [id]
  );
  return r.rows[0] || null;
}

// ── Helper: datos del solicitante ────────────────────────────
async function getSolicitante(id) {
  const r = await pool.query(
    'SELECT id, nombre, email, empresa, rol, tipo_pase, sede, movil, avatar_url FROM users WHERE id=$1',
    [id]
  );
  return r.rows[0] || null;
}

// ─────────────────────────────────────────────────────────────
// GET /api/networking/expositores
// Directorio de expositores disponibles para agendar cita
// ─────────────────────────────────────────────────────────────
router.get('/expositores', authRequired, async (req, res) => {
  try {
    const { sede } = req.query;
    let q = `
      SELECT e.id, e.nombre, e.descripcion, e.stand, e.logo_url,
             e.categoria, e.website_url, e.sede, e.edicion,
             e.contact,
             u.id AS user_id, u.nombre AS contacto_nombre,
             u.email AS contacto_email
      FROM expositores e
      LEFT JOIN users u ON u.id = e.usuario_id
      WHERE e.activo = true
    `;
    const p = [];
    if (sede) { q += ` AND e.sede = $1`; p.push(sede); }
    q += ' ORDER BY e.nombre ASC';
    const r = await pool.query(q, p);
    res.json({ ok: true, expositores: r.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/networking/mis-citas
// Citas del usuario autenticado (como solicitante O como expositor)
// ─────────────────────────────────────────────────────────────
router.get('/mis-citas', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar si el usuario tiene un expositor asociado
    const expRes = await pool.query(
      'SELECT id FROM expositores WHERE usuario_id = $1 AND activo = true LIMIT 1',
      [userId]
    );
    const expositorId = expRes.rows[0]?.id || null;

    const r = await pool.query(`
      SELECT n.*,
             -- Datos del solicitante
             us.nombre        AS solicitante_nombre,
             us.email         AS solicitante_email,
             us.empresa       AS solicitante_empresa,
             us.rol           AS solicitante_rol,
             us.avatar_url    AS solicitante_avatar,
             us.movil         AS solicitante_movil,
             -- Datos del expositor
             e.nombre         AS expositor_nombre,
             e.stand          AS expositor_stand,
             e.logo_url       AS expositor_logo,
             e.sede           AS expositor_sede
      FROM networking n
      JOIN users      us ON us.id = n.solicitante_id
      JOIN expositores e ON e.id  = n.expositor_id
      WHERE n.solicitante_id = $1
         OR ($2::uuid IS NOT NULL AND n.expositor_id = $2)
      ORDER BY n.fecha ASC, n.hora ASC
    `, [userId, expositorId]);

    res.json({ ok: true, citas: r.rows, total: r.rows.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/networking/disponibilidad/:expositor_id
// Horarios ya ocupados de un expositor en una fecha
// ─────────────────────────────────────────────────────────────
router.get('/disponibilidad/:expositor_id', authRequired, async (req, res) => {
  try {
    const { expositor_id } = req.params;
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ error: 'fecha requerida' });

    const r = await pool.query(`
      SELECT hora, hora_fin, status
      FROM networking
      WHERE expositor_id = $1 AND fecha = $2
        AND status IN ('pendiente','confirmada')
      ORDER BY hora ASC
    `, [expositor_id, fecha]);

    res.json({ ok: true, ocupados: r.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/networking/admin
// Todas las citas (staff/admin)
// ─────────────────────────────────────────────────────────────
router.get('/admin', authRequired, async (req, res) => {
  try {
    if (!ROLES_ADMIN.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const { sede, fecha, status } = req.query;
    let q = `
      SELECT n.*,
             us.nombre AS solicitante_nombre, us.email AS solicitante_email,
             us.empresa AS solicitante_empresa, us.rol AS solicitante_rol,
             e.nombre  AS expositor_nombre, e.stand AS expositor_stand,
             e.sede    AS expositor_sede
      FROM networking n
      JOIN users       us ON us.id = n.solicitante_id
      JOIN expositores e  ON e.id  = n.expositor_id
      WHERE 1=1
    `;
    const p = [];
    if (sede)   { q += ` AND n.sede = $${p.length+1}`;    p.push(sede); }
    if (fecha)  { q += ` AND n.fecha = $${p.length+1}`;   p.push(fecha); }
    if (status) { q += ` AND n.status = $${p.length+1}`;  p.push(status); }
    q += ' ORDER BY n.fecha ASC, n.hora ASC';

    const r = await pool.query(q, p);
    res.json({ ok: true, citas: r.rows, total: r.rows.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/networking
// Solicitar cita (asistente → expositor)
// ─────────────────────────────────────────────────────────────
router.post('/', authRequired, async (req, res) => {
  try {
    const { expositor_id, fecha, hora, hora_fin, notas } = req.body;
    const solicitante_id = req.user.id;

    if (!expositor_id || !fecha || !hora) {
      return res.status(400).json({ error: 'expositor_id, fecha y hora son requeridos' });
    }

    // Verificar que el expositor existe
    const expo = await getExpositor(expositor_id);
    if (!expo) return res.status(404).json({ error: 'Expositor no encontrado' });

    // Verificar que no existe ya una cita del mismo usuario en ese horario
    const dup = await pool.query(`
      SELECT id FROM networking
      WHERE solicitante_id = $1 AND fecha = $2 AND hora = $3
        AND status NOT IN ('rechazada','cancelada')
    `, [solicitante_id, fecha, hora]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'Ya tienes una cita en ese horario' });
    }

    // Verificar que el expositor no tiene cita confirmada en ese mismo slot
    const conflict = await pool.query(`
      SELECT id FROM networking
      WHERE expositor_id = $1 AND fecha = $2 AND hora = $3
        AND status IN ('pendiente','confirmada')
    `, [expositor_id, fecha, hora]);
    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: 'El expositor ya tiene una cita en ese horario' });
    }

    const r = await pool.query(`
      INSERT INTO networking
        (solicitante_id, expositor_id, fecha, hora, hora_fin, notas, status, sede, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', $7, NOW(), NOW())
      RETURNING *
    `, [solicitante_id, expositor_id, fecha, hora, hora_fin || null, notas || null, expo.sede || null]);

    const citaCreada = r.rows[0];

    // Notificar al expositor (si tiene usuario vinculado)
    if (expo.user_id) {
      const sol = await getSolicitante(solicitante_id);
      await crearNotificacion(pool, {
        userId: expo.user_id,
        titulo: '📅 Nueva solicitud de cita',
        mensaje: `${sol?.nombre || 'Un asistente'} quiere reunirse contigo el ${fecha} a las ${hora.slice(0,5)}`,
        tipo: 'cita_solicitada',
        meta: { cita_id: citaCreada.id, solicitante_id, expositor_id },
      });
    }
    // Notificar al solicitante (confirmación de envío)
    await crearNotificacion(pool, {
      userId: solicitante_id,
      titulo: '✅ Solicitud enviada',
      mensaje: `Tu solicitud de cita con ${expo.nombre} para el ${fecha} a las ${hora.slice(0,5)} fue enviada. Espera confirmación.`,
      tipo: 'cita_enviada',
      meta: { cita_id: citaCreada.id, expositor_id },
    });

    res.status(201).json({ ok: true, cita: citaCreada, message: 'Cita solicitada correctamente' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/networking/:id
// Actualizar cita (expositor confirma/rechaza, asistente cancela)
// ─────────────────────────────────────────────────────────────
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, ubicacion, notas, hora_fin } = req.body;
    const userId = req.user.id;

    // Verificar que la cita existe y que el usuario tiene permiso para modificarla
    const citaRes = await pool.query(`
      SELECT n.*, e.usuario_id AS expositor_user_id
      FROM networking n
      JOIN expositores e ON e.id = n.expositor_id
      WHERE n.id = $1
    `, [id]);

    if (citaRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    const cita = citaRes.rows[0];

    const esSolicitante  = cita.solicitante_id === userId;
    const esExpositor    = cita.expositor_user_id === userId;
    const esAdmin        = ROLES_ADMIN.includes(req.user.rol);

    if (!esSolicitante && !esExpositor && !esAdmin) {
      return res.status(403).json({ error: 'Sin permiso para modificar esta cita' });
    }

    // Validar transiciones de status
    if (status) {
      if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).json({ error: `Status inválido. Opciones: ${STATUS_VALIDOS.join(', ')}` });
      }
      // Solo el expositor o admin pueden confirmar/rechazar
      if (['confirmada','rechazada'].includes(status) && !esExpositor && !esAdmin) {
        return res.status(403).json({ error: 'Solo el expositor puede confirmar o rechazar citas' });
      }
      // Solo el solicitante o admin pueden cancelar
      if (status === 'cancelada' && !esSolicitante && !esAdmin) {
        return res.status(403).json({ error: 'Solo el solicitante puede cancelar su cita' });
      }
    }

    const r = await pool.query(`
      UPDATE networking SET
        status     = CASE WHEN $1::text IS NOT NULL THEN $1 ELSE status END,
        ubicacion  = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE ubicacion END,
        notas      = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE notas END,
        hora_fin   = COALESCE($4, hora_fin),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [status || null, ubicacion || null, notas || null, hora_fin || null, id]);

    const citaActualizada = r.rows[0];

    // Notificaciones según el nuevo status
    if (status) {
      const msgs = {
        confirmada: {
          paraQuien: cita.solicitante_id,
          titulo: '✅ Cita confirmada',
          mensaje: `Tu cita con ${cita.expositor_nombre || 'el expositor'} el ${cita.fecha} a las ${cita.hora?.slice(0,5)} fue confirmada.${ubicacion ? ` Ubicación: ${ubicacion}` : ''}`,
        },
        rechazada: {
          paraQuien: cita.solicitante_id,
          titulo: '❌ Cita rechazada',
          mensaje: `Lo sentimos, tu solicitud de cita con el expositor para el ${cita.fecha} fue rechazada.`,
        },
        cancelada: {
          paraQuien: cita.expositor_user_id,
          titulo: '🚫 Cita cancelada',
          mensaje: `${(await getSolicitante(cita.solicitante_id).catch(()=>({nombre:'El asistente'})))?.nombre} canceló la cita del ${cita.fecha} a las ${cita.hora?.slice(0,5)}.`,
        },
      };
      const notif = msgs[status];
      if (notif?.paraQuien) {
        await crearNotificacion(pool, {
          userId: notif.paraQuien,
          titulo: notif.titulo,
          mensaje: notif.mensaje,
          tipo: `cita_${status}`,
          meta: { cita_id: id },
        });
      }
    }

    res.json({ ok: true, cita: citaActualizada });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/networking/:id  — cancelar (alias de PUT con cancelada)
// ─────────────────────────────────────────────────────────────
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const r = await pool.query(
      'SELECT solicitante_id FROM networking WHERE id=$1', [id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });

    const esAdmin = ROLES_ADMIN.includes(req.user.rol);
    if (r.rows[0].solicitante_id !== userId && !esAdmin) {
      return res.status(403).json({ error: 'Sin permiso' });
    }

    await pool.query(
      "UPDATE networking SET status='cancelada', updated_at=NOW() WHERE id=$1", [id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;