// cmc-backend/routes/scan.js
//
// Módulo de Scanner QR para registro de asistencias
//
// FLUJO:
//   1. Staff escanea el QR del asistente (contiene su JSON con id, email, etc.)
//   2. POST /api/scan/checkin  { qr_payload, tipo, sesion_id?, sede }
//      → Decodifica el QR, identifica al usuario, registra en la tabla correcta
//   3. GET /api/scan/sesiones  → Lista de sesiones activas del día (para elegir)
//   4. GET /api/scan/stats     → Contador en tiempo real de la sesión/evento
//   5. GET /api/scan/historial → Últimos N registros del scanner
//
// TIPOS DE CHECKIN:
//   • 'entrada'  → tabla entradas  (entrada al evento, general por día)
//   • 'sesion'   → tabla asistencias_sesion  (requiere sesion_id)
//   • 'curso'    → tabla asistencias_curso   (requiere sesion_id = curso)
//   • 'expositor'→ tabla expositores_metrica (visita a stand)
//
// AUTENTICACIÓN:
//   Los endpoints de POST requieren rol staff o super_admin.
//   GET /sesiones y GET /stats son accesibles para todos los autenticados.

import express from 'express';
import pool    from '../db.js';
import { authRequired, requireRole } from '../utils/authMiddleware.js';

const router = express.Router();

const ROLES_SCANNER = ['staff', 'super_admin'];

// ── Helper: parsear el payload del QR ───────────────────
function parseQRPayload(raw) {
  if (!raw) throw new Error('QR vacío');
  try {
    if (typeof raw === 'object') return raw;
    return JSON.parse(raw);
  } catch {
    throw new Error('QR inválido: no es JSON válido');
  }
}

// ── Helper: verificar duplicado ─────────────────────────
async function yaTieneRegistro(tabla, userIdCol, userId, sesionIdCol, sesionId) {
  const r = await pool.query(
    `SELECT 1 FROM ${tabla} WHERE ${userIdCol} = $1 AND ${sesionIdCol} = $2`,
    [userId, sesionId]
  );
  return r.rows.length > 0;
}

// ============================================================
// POST /api/scan/checkin
// Registro principal — acepta cualquier tipo
// Body: {
//   qr_payload: string | object,   ← JSON del QR del asistente
//   tipo: 'entrada' | 'sesion' | 'curso' | 'expositor',
//   sesion_id?: uuid,              ← requerido para tipo sesion/curso
//   stand_id?: uuid,               ← requerido para tipo expositor
//   sede?: string,
//   dia?: number,                  ← 1-4 para entradas
//   forzar?: boolean               ← ignorar duplicado (re-escaneo)
// }
// ============================================================
router.post('/checkin', authRequired, async (req, res) => {
  try {
    if (!ROLES_SCANNER.includes(req.user.rol)) {
      return res.status(403).json({ ok: false, error: 'Sin permisos de scanner' });
    }

    const { qr_payload, tipo = 'entrada', sesion_id, stand_id, sede, dia, forzar = false } = req.body;

    // Parsear QR
    let qr;
    try {
      qr = parseQRPayload(qr_payload);
    } catch (e) {
      return res.status(400).json({ ok: false, error: e.message });
    }

    const userId = qr.id;
    if (!userId) {
      return res.status(400).json({ ok: false, error: 'QR sin ID de usuario' });
    }

    // Verificar que el usuario existe
    const userResult = await pool.query(
      'SELECT id, nombre, email, rol, tipo_pase, sede FROM users WHERE id = $1 AND activo = true',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Usuario no registrado en el sistema' });
    }
    const usuario = userResult.rows[0];

    let registro = null;
    let yaRegistrado = false;

    // ── TIPO: entrada general al evento ──────────────────
    if (tipo === 'entrada') {
      const diaActual = dia || new Date().getDay() || 1; // lunes=1
      const fechaHoy  = new Date().toISOString().split('T')[0];

      // Verificar duplicado (hoy)
      const dup = await pool.query(
        `SELECT 1 FROM entradas WHERE user_id = $1 AND fecha = $2`,
        [userId, fechaHoy]
      );
      yaRegistrado = dup.rows.length > 0;

      if (yaRegistrado && !forzar) {
        return res.json({
          ok: true,
          yaRegistrado: true,
          usuario,
          mensaje: `${usuario.nombre} ya tiene entrada registrada hoy`,
        });
      }

      if (!yaRegistrado) {
        const r = await pool.query(
          `INSERT INTO entradas (id, user_id, fecha, tipo, sede, dia, registrado_por, metodo, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'qr', NOW())
           RETURNING *`,
          [userId, fechaHoy, usuario.tipo_pase || 'general', sede || usuario.sede, diaActual, req.user.id]
        );
        registro = r.rows[0];
      }
    }

    // ── TIPO: sesión o curso ──────────────────────────────
    else if (tipo === 'sesion' || tipo === 'curso') {
      if (!sesion_id) {
        return res.status(400).json({ ok: false, error: 'sesion_id requerido para tipo sesion/curso' });
      }

      // Verificar que la sesión existe
      const sesResult = await pool.query(
        'SELECT id, title AS titulo, categoria, tipo FROM agenda WHERE id = $1',
        [sesion_id]
      );
      if (sesResult.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Sesión no encontrada' });
      }
      const sesion = sesResult.rows[0];

      const tabla = sesion.categoria === 'curso' ? 'asistencias_curso' : 'asistencias_sesion';
      const colSesion = sesion.categoria === 'curso' ? 'curso_id' : 'session_id';

      // Verificar duplicado
      const dupQ = await pool.query(
        `SELECT 1 FROM ${tabla} WHERE user_id = $1 AND ${colSesion} = $2`,
        [userId, sesion_id]
      );
      yaRegistrado = dupQ.rows.length > 0;

      if (yaRegistrado && !forzar) {
        return res.json({
          ok: true,
          yaRegistrado: true,
          usuario,
          sesion,
          mensaje: `${usuario.nombre} ya tiene asistencia en "${sesion.titulo}"`,
        });
      }

      if (!yaRegistrado) {
        const r = await pool.query(
          `INSERT INTO ${tabla} (id, user_id, ${colSesion}, fecha, registrado_por, metodo, sede)
           VALUES (gen_random_uuid(), $1, $2, NOW(), $3, 'qr', $4)
           RETURNING *`,
          [userId, sesion_id, req.user.id, sede || usuario.sede]
        );
        registro = r.rows[0];

        // También registrar entrada del día si no tiene
        const fechaHoy = new Date().toISOString().split('T')[0];
        await pool.query(
          `INSERT INTO entradas (id, user_id, fecha, tipo, sede, dia, registrado_por, metodo, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'qr', NOW())
           ON CONFLICT DO NOTHING`,
          [userId, fechaHoy, usuario.tipo_pase || 'general', sede || usuario.sede,
           new Date().getDay() || 1, req.user.id]
        ).catch(() => {}); // Ignorar si falla (ON CONFLICT no funciona sin índice único)
      }

      console.log(`✅ [Scanner] ${tipo} registrado: user=${usuario.nombre}, sesion=${sesion.titulo}`);
      return res.json({
        ok: true,
        yaRegistrado,
        tipo,
        usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, tipo_pase: usuario.tipo_pase },
        sesion: { id: sesion.id, titulo: sesion.titulo, categoria: sesion.categoria },
        registro,
        mensaje: yaRegistrado
          ? `${usuario.nombre} ya registrado en "${sesion.titulo}"`
          : `✅ ${usuario.nombre} registrado en "${sesion.titulo}"`,
      });
    }

    // ── TIPO: visita a stand (expositor) ─────────────────
    else if (tipo === 'expositor') {
      if (!stand_id) {
        return res.status(400).json({ ok: false, error: 'stand_id requerido para tipo expositor' });
      }

      const expoResult = await pool.query(
        'SELECT id, nombre FROM expositores WHERE id = $1',
        [stand_id]
      );
      if (expoResult.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Stand no encontrado' });
      }
      const stand = expoResult.rows[0];

      // Verificar duplicado (por día)
      const fechaHoy = new Date().toISOString().split('T')[0];
      const dupQ = await pool.query(
        `SELECT 1 FROM expositores_metrica WHERE user_id = $1 AND expositor_id = $2 AND DATE(created_at) = $3`,
        [userId, stand_id, fechaHoy]
      );
      yaRegistrado = dupQ.rows.length > 0;

      if (!yaRegistrado) {
        await pool.query(
          `INSERT INTO expositores_metrica (id, expositor_id, user_id, created_at, tipo, metodo)
           VALUES (gen_random_uuid(), $1, $2, NOW(), 'visita', 'qr')`,
          [stand_id, userId]
        );
      }

      return res.json({
        ok: true,
        yaRegistrado,
        tipo,
        usuario: { id: usuario.id, nombre: usuario.nombre, tipo_pase: usuario.tipo_pase },
        stand: { id: stand.id, nombre: stand.nombre },
        mensaje: yaRegistrado
          ? `${usuario.nombre} ya visitó este stand hoy`
          : `✅ ${usuario.nombre} registrado en stand "${stand.nombre}"`,
      });
    }

    console.log(`✅ [Scanner] entrada registrada: user=${usuario.nombre}`);
    res.json({
      ok: true,
      yaRegistrado,
      tipo,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, tipo_pase: usuario.tipo_pase },
      registro,
      mensaje: yaRegistrado
        ? `${usuario.nombre} ya tiene entrada registrada hoy`
        : `✅ ${usuario.nombre} — Entrada registrada`,
    });

  } catch (err) {
    console.error('❌ POST /scan/checkin:', err.message);
    res.status(500).json({ ok: false, error: 'Error al registrar: ' + err.message });
  }
});

// ============================================================
// GET /api/scan/sesiones  — sesiones activas del día
// ============================================================
router.get('/sesiones', authRequired, async (req, res) => {
  try {
    const { dia, sede } = req.query;

    const conditions = ['activo = true'];
    const values     = [];
    let p = 1;

    if (dia)  { conditions.push(`dia = $${p++}`);  values.push(parseInt(dia)); }
    if (sede) { conditions.push(`sede = $${p++}`); values.push(sede); }

    const r = await pool.query(
      `SELECT id, title AS titulo, dia, start_at AS hora_inicio, end_at AS hora_fin,
              sala, tipo, categoria, sede, edicion
       FROM agenda
       WHERE ${conditions.join(' AND ')}
       ORDER BY start_at ASC NULLS LAST`,
      values
    );

    res.json({ ok: true, sesiones: r.rows, total: r.rows.length });
  } catch (err) {
    console.error('❌ GET /scan/sesiones:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// GET /api/scan/stats  — contador en tiempo real
// ============================================================
router.get('/stats', authRequired, async (req, res) => {
  try {
    const { sesion_id, sede } = req.query;

    const fechaHoy = new Date().toISOString().split('T')[0];

    // Entradas hoy
    const entradasR = await pool.query(
      `SELECT COUNT(*) FROM entradas WHERE fecha = $1 ${sede ? 'AND sede = $2' : ''}`,
      sede ? [fechaHoy, sede] : [fechaHoy]
    );

    // Asistencias a sesión específica
    let asistSesion = 0;
    if (sesion_id) {
      const r = await pool.query(
        'SELECT COUNT(*) FROM asistencias_sesion WHERE session_id = $1',
        [sesion_id]
      );
      asistSesion = parseInt(r.rows[0].count);
    }

    // Últimos 5 registros
    const ultimosR = await pool.query(
      `SELECT u.nombre, u.tipo_pase, e.created_at, 'entrada' AS tipo
       FROM entradas e
       JOIN users u ON u.id = e.user_id
       WHERE e.fecha = $1 ${sede ? 'AND e.sede = $2' : ''}
       ORDER BY e.created_at DESC LIMIT 5`,
      sede ? [fechaHoy, sede] : [fechaHoy]
    );

    res.json({
      ok: true,
      stats: {
        entradas_hoy:    parseInt(entradasR.rows[0].count),
        asistentes_sesion: asistSesion,
        fecha: fechaHoy,
      },
      ultimos: ultimosR.rows,
    });
  } catch (err) {
    console.error('❌ GET /scan/stats:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// GET /api/scan/historial  — últimos N registros del scanner
// ============================================================
router.get('/historial', authRequired, async (req, res) => {
  try {
    if (!ROLES_SCANNER.includes(req.user.rol)) {
      return res.status(403).json({ ok: false, error: 'Sin permisos' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const fechaHoy = new Date().toISOString().split('T')[0];

    const r = await pool.query(
      `SELECT
         a.id, a.fecha AS timestamp,
         u.nombre, u.email, u.tipo_pase,
         ag.title AS sesion,
         'sesion' AS tipo
       FROM asistencias_sesion a
       JOIN users u  ON u.id  = a.user_id
       JOIN agenda ag ON ag.id = a.session_id
       WHERE a.registrado_por = $1
         AND DATE(a.fecha) = $2
       UNION ALL
       SELECT
         e.id, e.created_at AS timestamp,
         u.nombre, u.email, u.tipo_pase,
         'Entrada general' AS sesion,
         'entrada' AS tipo
       FROM entradas e
       JOIN users u ON u.id = e.user_id
       WHERE e.registrado_por = $1
         AND e.fecha = $2
       ORDER BY timestamp DESC
       LIMIT $3`,
      [req.user.id, fechaHoy, limit]
    );

    res.json({ ok: true, registros: r.rows, total: r.rows.length });
  } catch (err) {
    console.error('❌ GET /scan/historial:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;