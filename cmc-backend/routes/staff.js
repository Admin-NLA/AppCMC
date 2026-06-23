import express from 'express';
import pool from '../db.js';
import pool1 from '../db-neon1.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ========================================================
// Middleware: Verificar que es Staff
// ========================================================
const requireStaff = (req, res, next) => {
  if (req.user.rol !== 'staff' && req.user.rol !== 'super_admin') {
    return res.status(403).json({
      error: 'Solo staff puede acceder a estas rutas'
    });
  }
  next();
};

// ========================================================
// GET /api/staff/stats - Estadísticas generales
// ========================================================
router.get('/stats', authRequired, requireStaff, async (req, res) => {
  try {
    const { sede } = req.query;
    console.log('[Staff Stats] Obteniendo estadísticas...');

    // 1. USUARIOS REGISTRADOS POR TIPO_PASE
    const pasesResult = await pool.query(`
      SELECT 
        tipo_pase,
        COUNT(id) as cantidad
      FROM users
      WHERE activo = true
      GROUP BY tipo_pase
      ORDER BY cantidad DESC
    `);

    const byTipoPase = pasesResult.rows.reduce((acc, row) => {
      acc[row.tipo_pase] = parseInt(row.cantidad);
      return acc;
    }, {});

    // 2. TOTAL USUARIOS
    const totalUsersResult = await pool.query(`
      SELECT COUNT(id) as total FROM users WHERE activo = true
    `);
    const totalUsers = parseInt(totalUsersResult.rows[0]?.total || 0);

    // 3. CHECK-INS TOTALES ------------------------------ AJUSTE NUEVO WEB APP CMC--------------->
    // entradas + asistencias_sesion
    const totalCheckinsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(id) FROM entradas) +
        (SELECT COUNT(id) FROM asistencias_sesion) AS total
    `);
    const totalCheckins = parseInt(totalCheckinsResult.rows[0]?.total || 0);
    //---------------------------------------------------- AJUSTE NUEVO WEB APP CMC--------------->

    // 4. ASISTENCIAS POR TIPO (CURSOS vs SESIONES)
    const attendanceByTypeResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN a.session_id IN (
          SELECT id FROM agenda WHERE categoria = 'curso'
        ) THEN 1 END) as checkins_cursos,
        COUNT(CASE WHEN a.session_id IN (
          SELECT id FROM agenda WHERE categoria = 'sesion'
        ) THEN 1 END) as checkins_sesiones
      FROM asistencias_sesion a
    `);

    const attendanceByType = attendanceByTypeResult.rows[0] || {
      checkins_cursos: 0,
      checkins_sesiones: 0
    };

    // 5. CHECK-INS HOY ------------------------------ AJUSTE NUEVO WEB APP CMC--------------->
    // entradas + asistencias_sesion
    const checkinsHoyResult = await pool.query(`
      SELECT 
        (SELECT COUNT(id) FROM entradas WHERE DATE(created_at) = CURRENT_DATE) +
        (SELECT COUNT(id) FROM asistencias_sesion WHERE DATE(fecha) = CURRENT_DATE) AS total
    `);
    const checkinsHoy = parseInt(checkinsHoyResult.rows[0]?.total || 0);
    //------------------------------------------------- AJUSTE NUEVO WEB APP CMC--------------->

    // 6. USUARIOS POR SEDE
    const sedesResult = await pool.query(`
      SELECT 
        sede,
        COUNT(id) as cantidad
      FROM users
      WHERE activo = true AND sede IS NOT NULL
      GROUP BY sede
      ORDER BY cantidad DESC
    `);

    const bySede = sedesResult.rows.reduce((acc, row) => {
      acc[row.sede] = parseInt(row.cantidad);
      return acc;
    }, {});

    // Compilar respuesta
    const stats = {
      totalUsers,
      totalCheckins,
      checkinsHoy,
      byTipoPase,
      attendanceByType: {
        cursos: parseInt(attendanceByType.checkins_cursos || 0),
        sesiones: parseInt(attendanceByType.checkins_sesiones || 0)
      },
      bySede,
      timestamp: new Date().toISOString()
    };

    console.log('[Staff Stats] ✅ Estadísticas obtenidas:', {
      totalUsers,
      totalCheckins,
      checkinsHoy
    });

    res.json(stats);

  } catch (error) {
    console.error('❌ Error en GET /staff/stats:', error.message);
    res.status(500).json({
      error: 'Error al obtener estadísticas',
      details: error.message
    });
  }
});

// ========================================================
// GET /api/staff/checkins - Registro de check-ins
// ========================================================
router.get('/checkins', authRequired, requireStaff, async (req, res) => {
  try {
    const { sede } = req.query;
    console.log('[Staff Checkins] Obteniendo registro de check-ins...');

    const limit = req.query.limit || 50;
    const offset = req.query.offset || 0;

    // ------------------------------------------------------------- --- AJUSTE NUEVO WEB APP CMC--------------->
    // Obtener check-ins con detalles de usuario y sesión --- AJUSTE NUEVO WEB APP CMC
    const checkinsResult = await pool.query(`
      SELECT
        e.id,
        e.user_id,
        NULL::uuid        AS session_id,
        e.created_at      AS fecha,
        u.nombre          AS usuario_nombre,
        u.email,
        u.tipo_pase,
        CONCAT('Entrada Día ', e.dia) AS sesion_titulo,
        e.dia,
        e.created_at      AS hora_sesion,
        e.sede            AS sala,
        'entrada'         AS origen
      FROM entradas e
      JOIN users u ON u.id = e.user_id
      UNION ALL
      SELECT
        a.id,
        a.user_id,
        a.session_id,
        a.fecha,
        u.nombre          AS usuario_nombre,
        u.email,
        u.tipo_pase,
        ag.title          AS sesion_titulo,
        ag.dia,
        ag.start_at       AS hora_sesion,
        ag.sala,
        'sesion'          AS origen
      FROM asistencias_sesion a
      LEFT JOIN users u  ON u.id  = a.user_id
      LEFT JOIN agenda ag ON ag.id = a.session_id
      ORDER BY fecha DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Contar total (entradas + asistencias_sesion)
    const countResult = await pool.query(`
      SELECT 
        (SELECT COUNT(id) FROM entradas) +
        (SELECT COUNT(id) FROM asistencias_sesion) AS total
    `);
    const total = parseInt(countResult.rows[0]?.total || 0);
    // ------------------------------------------------------------- --- AJUSTE NUEVO WEB APP CMC--------------->

    console.log('[Staff Checkins] ✅ Obtenidos:', checkinsResult.rows.length);

    res.json({
      checkins: checkinsResult.rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: (parseInt(offset) + parseInt(limit)) < total
    });

  } catch (error) {
    console.error('❌ Error en GET /staff/checkins:', error.message);
    res.status(500).json({
      error: 'Error al obtener check-ins',
      details: error.message
    });
  }
});

// ========================================================
// GET /api/staff/sessions-stats - Asistencia por sesión
// ========================================================
router.get('/sessions-stats', authRequired, requireStaff, async (req, res) => {
  try {
    const { sede } = req.query;
    console.log('[Staff Sessions Stats] Obteniendo asistencia por sesión...');

    const result = await pool.query(`
      SELECT 
        ag.id,
        ag.title as titulo,
        ag.dia,
        ag.start_at as hora,
        ag.sala,
        ag.tipo,
        COUNT(a.id) as asistentes,
        ag.categoria
      FROM agenda ag
      LEFT JOIN asistencias_sesion a ON ag.id = a.session_id
      WHERE ag.activo = true
      GROUP BY ag.id, ag.title, ag.dia, ag.start_at, ag.sala, ag.tipo, ag.categoria
      ORDER BY ag.start_at DESC NULLS LAST
      LIMIT 100
    `);

    console.log('[Staff Sessions Stats] ✅ Obtenidas:', result.rows.length);

    res.json({
      sessions: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error en GET /staff/sessions-stats:', error.message);
    res.status(500).json({
      error: 'Error al obtener estadísticas de sesiones',
      details: error.message
    });
  }
});

// ========================================================
// GET /api/staff/cursos-stats - Asistencia por curso
// ========================================================
router.get('/cursos-stats', authRequired, requireStaff, async (req, res) => {
  try {
    const { sede } = req.query;
    console.log('[Staff Cursos Stats] Obteniendo asistencia por curso...');

    const result = await pool.query(`
      SELECT 
        ag.id,
        ag.title as titulo,
        ag.dia,
        ag.start_at as hora,
        ag.sala,
        COUNT(a.id) as asistentes
      FROM agenda ag
      LEFT JOIN asistencias_sesion a ON ag.id = a.session_id
      WHERE ag.activo = true AND ag.categoria = 'curso'
      GROUP BY ag.id, ag.title, ag.dia, ag.start_at, ag.sala
      ORDER BY ag.start_at DESC NULLS LAST
      LIMIT 100
    `);

    console.log('[Staff Cursos Stats] ✅ Obtenidos:', result.rows.length);

    res.json({
      cursos: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error en GET /staff/cursos-stats:', error.message);
    res.status(500).json({
      error: 'Error al obtener estadísticas de cursos',
      details: error.message
    });
  }
});

// ========================================================
// GET /api/staff/resumen-diario - Resumen del día
// ========================================================
router.get('/resumen-diario', authRequired, requireStaff, async (req, res) => {
  try {
    const { sede } = req.query;
    console.log('[Staff Resumen] Obteniendo resumen del día...');

    // Check-ins hoy
    const checkinsHoyResult = await pool.query(`
      SELECT COUNT(id) as total FROM asistencias_sesion
      WHERE DATE(fecha) = CURRENT_DATE
    `);
    const checkinsHoy = parseInt(checkinsHoyResult.rows[0]?.total || 0);

    //------------------------------------------------- AJUSTE NUEVO WEB APP CMC--------------->
    // Sesiones hoy
    const sesionesHoyResult = await pool.query(`
      SELECT COUNT(DISTINCT session_id) as total
      FROM asistencias_sesion
      WHERE DATE(fecha) = CURRENT_DATE
    `);
    const sesionesHoy = parseInt(sesionesHoyResult.rows[0]?.total || 0);

    // Usuarios únicos hoy (entradas + asistencias_sesion)
    const usuariosHoyResult = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as total FROM (
        SELECT user_id FROM entradas WHERE DATE(created_at) = CURRENT_DATE
        UNION
        SELECT user_id FROM asistencias_sesion WHERE DATE(fecha) = CURRENT_DATE
      ) t
    `);
    const usuariosHoy = parseInt(usuariosHoyResult.rows[0]?.total || 0);

    /// Últimas 5 entradas (entradas + asistencias_sesion)
    const ultimasEntradasResult = await pool.query(`
      SELECT nombre, email, sesion, fecha FROM (
        SELECT
          u.nombre,
          u.email,
          CONCAT('Entrada Día ', e.dia) AS sesion,
          e.created_at AS fecha
        FROM entradas e
        JOIN users u ON u.id = e.user_id
        WHERE DATE(e.created_at) = CURRENT_DATE
        UNION ALL
        SELECT
          u.nombre,
          u.email,
          ag.title AS sesion,
          a.fecha
        FROM asistencias_sesion a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN agenda ag ON ag.id = a.session_id
        WHERE DATE(a.fecha) = CURRENT_DATE
      ) t
      ORDER BY fecha DESC
      LIMIT 5
    `);
    //------------------------------------------------- AJUSTE NUEVO WEB APP CMC--------------->

    res.json({
      resumen: {
        checkinsHoy,
        sesionesHoy,
        usuariosHoy
      },
      ultimasEntradas: ultimasEntradasResult.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en GET /staff/resumen-diario:', error.message);
    res.status(500).json({
      error: 'Error al obtener resumen diario',
      details: error.message
    });
  }
});

// ========================================================
// GET /api/staff/estadisticas-evento - Estadísticas completas
// Replica lo que muestra App Mobile + totales del evento
// ========================================================
router.get('/estadisticas-evento', authRequired, requireStaff, async (req, res) => {
  try {
    const { sede } = req.query;
    // FIX SEGURIDAD: antes se interpolaba `sede` directo en el SQL
    // (`AND e.sede = '${sede}'`), permitiendo inyección SQL vía query
    // string. Ahora todo usa $1 parametrizado.

    // Día actual del evento (basado en calendario_sedes)
    const calendarioRes = await pool.query(`
      SELECT fecha_inicio, fecha_fin 
      FROM calendario_sedes 
      WHERE activo = true ${sede ? `AND sede = $1` : ''}
      LIMIT 1
    `, sede ? [sede] : []);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    let diaActual = null;

    if (calendarioRes.rows.length > 0) {
      const inicio = new Date(calendarioRes.rows[0].fecha_inicio);
      inicio.setHours(0, 0, 0, 0);
      const diff = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < 4) diaActual = diff + 1;
    }

    // Estadísticas por día — entradas
    const porDiaRes = await pool.query(`
      SELECT 
        e.dia,
        u.tipo_pase,
        COUNT(*) as total
      FROM entradas e
      JOIN users u ON u.id = e.user_id
      WHERE ($1::text IS NULL OR e.sede = $1)
      GROUP BY e.dia, u.tipo_pase
      ORDER BY e.dia
    `, [sede || null]);

    // Construir estructura por día
    const diasMap = { 1: {}, 2: {}, 3: {}, 4: {} };
    for (const row of porDiaRes.rows) {
      const dia = row.dia;
      const tipo = row.tipo_pase || 'otros';
      if (!diasMap[dia]) diasMap[dia] = {};
      diasMap[dia][tipo] = parseInt(row.total);
    }

    const resumenPorDia = [1, 2, 3, 4].map(dia => {
      const d = diasMap[dia] || {};
      const total = Object.values(d).reduce((a, b) => a + b, 0);
      return {
        dia,
        total,
        combo: d.combo || 0,
        sesiones: d.sesiones || 0,
        curso: d.curso || 0,
        expositor: d.expositor || 0,
        ponente: d.ponente || 0,
        staff: d.staff || 0,
        otros: d.general || d.null || 0,
        esDiaActual: dia === diaActual
      };
    });

    // Totales generales del evento
    const totalEventoRes = await pool.query(`
      SELECT COUNT(*) as total FROM entradas e
      WHERE ($1::text IS NULL OR e.sede = $1)
    `, [sede || null]);
    const totalEvento = parseInt(totalEventoRes.rows[0]?.total || 0);

    // Asistencias a sesiones por día
    const sesionesRes = await pool.query(`
      SELECT ag.dia, COUNT(a.id) as total
      FROM asistencias_sesion a
      JOIN agenda ag ON ag.id = a.session_id
      GROUP BY ag.dia
      ORDER BY ag.dia
    `);
    const sesionesMap = {};
    for (const row of sesionesRes.rows) {
      sesionesMap[row.dia] = parseInt(row.total);
    }

    // Usuarios registrados por tipo de pase
    const usuariosRes = await pool.query(`
      SELECT tipo_pase, COUNT(*) as total
      FROM users WHERE activo = true
      ${sede ? `AND sede = $1` : ''}
      GROUP BY tipo_pase
    `, sede ? [sede] : []);

    const usuariosPorTipo = usuariosRes.rows.reduce((acc, row) => {
      acc[row.tipo_pase || 'otros'] = parseInt(row.total);
      return acc;
    }, {});

    // Citas networking
    const citasRes = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'confirmada' THEN 1 END) as confirmadas,
        COUNT(CASE WHEN status = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN status = 'rechazada' THEN 1 END) as rechazadas
      FROM networking
      ${sede ? `WHERE sede = $1` : ''}
    `, sede ? [sede] : []);

    const citas = citasRes.rows[0] || {};

    res.json({
      ok: true,
      diaActual,
      fechaHoy: hoy.toISOString().split('T')[0],
      totalEntradas: totalEvento,
      usuariosRegistrados: usuariosPorTipo,
      resumenPorDia,
      sesionesAsistencia: sesionesMap,
      networking: {
        total: parseInt(citas.total || 0),
        confirmadas: parseInt(citas.confirmadas || 0),
        pendientes: parseInt(citas.pendientes || 0),
        rechazadas: parseInt(citas.rechazadas || 0),
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en estadisticas-evento:', error.message);
    res.status(500).json({ error: 'Error al obtener estadísticas', details: error.message });
  }
});
// ================== AJUSTE NUEVO WEB APP CMC=======================================================>
// ════════════════════════════════════════════════════════════
// GET /api/staff/tkinter-live
//
// Lee EN VIVO la base cmc-mobile (Neon #1 — la que alimenta el
// Flask/Render que recibe los escaneos del Tkinter durante el
// evento). No copia ni guarda nada — siempre devuelve el estado
// actual exacto, igual patrón que networking-expo.js.
//
// Devuelve: totales generales, resumen por día (general/sesiones/
// cursos) y la lista completa de asistentes con su asistencia
// día por día, tal como vienen en el JSONB de `statistics`.
// ════════════════════════════════════════════════════════════
router.get('/tkinter-live', authRequired, requireStaff, async (req, res) => {
  try {
    console.log('[Staff TkinterLive] Consultando cmc-mobile en vivo...');

    const result = await pool1.query(`
      SELECT s.stats, s.updated_at, e.location, e.year
      FROM statistics s
      JOIN events e ON e.event_id = s.event_id
      ORDER BY s.updated_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json(null);
    }

    const row = result.rows[0];
    const stats = row.stats || {};

    // Resumen por día a partir de daily_attendee_type_scans
    // (incluye combo, que antes faltaba en el desglose)
    const dailyRaw = stats.daily_attendee_type_scans || {};
    const dailySummary = {};
    for (const [diaKey, conteos] of Object.entries(dailyRaw)) {
      dailySummary[diaKey] = {
        general: conteos.general || 0,
        sessions: conteos.sessions || 0,
        courses: conteos.courses || 0,
        combo: conteos.combo || 0,
        total:
          (conteos.general || 0) +
          (conteos.sessions || 0) +
          (conteos.courses || 0) +
          (conteos.combo || 0) +
          (conteos['s/d'] || 0),
      };
    }

    res.json({
      total_attendees: stats.total_attendees ?? null,
      total_exhibitors: stats.total_exhibitors ?? null,
      total_speakers: stats.total_speakers ?? null,
      entry_scans: stats.entry_scans ?? null,
      daily_summary: dailySummary,
      attendees: stats.attendees_scan_stats ?? [],
      sede: row.location,
      edicion: row.year,
      updated_at: row.updated_at,
    });
  } catch (error) {
    console.error('❌ Error en GET /staff/tkinter-live:', error.message);
    res.status(500).json({
      error: 'Error al consultar cmc-mobile',
      details: error.message,
    });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/staff/quien-no-llego
//
// Cruza los usuarios activos de la App CMC Web (esta base) contra
// la lista de asistentes escaneados que vive en cmc-mobile (leída
// en vivo, sin copiar nada). El cruce se hace por qr_code = ID del
// Excel/Tkinter.
//
// Soporta ?dia=N (1-4) para filtrar por un día específico, o sin
// parámetro para "nunca ha llegado ningún día".
// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
// GET /api/staff/tkinter-expositores
//
// Lee EN VIVO la lista de expositores (personal de stands) desde
// cmc-mobile. Campo real en el JSONB: exhibitor_scan_stats
// (confirmado directo de la estructura real de statistics.stats).
// Cada expositor tiene Día 3 / Día 4 únicamente (no Día 1/2),
// ya que el expo normalmente abre los últimos días del evento.
// ════════════════════════════════════════════════════════════
router.get('/tkinter-expositores', authRequired, requireStaff, async (req, res) => {
  try {
    console.log('[Staff TkinterExpositores] Consultando cmc-mobile en vivo...');

    const result = await pool1.query(`
      SELECT s.stats, s.updated_at
      FROM statistics s
      ORDER BY s.updated_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json(null);
    }

    const stats = result.rows[0].stats || {};

    res.json({
      total_exhibitors: stats.total_exhibitors ?? null,
      total_scanned_exhibitors: stats.total_scanned_exhibitors ?? 0,
      daily_exhibitor_stats: stats.daily_exhibitor_stats ?? {},
      exhibitor_companies: stats.exhibitor_companies ?? [],
      exhibitors: stats.exhibitor_scan_stats ?? [],
      updated_at: result.rows[0].updated_at,
    });
  } catch (error) {
    console.error('❌ Error en GET /staff/tkinter-expositores:', error.message);
    res.status(500).json({ error: 'Error al consultar expositores', details: error.message });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/staff/tkinter-speakers
//
// Lee EN VIVO la lista de speakers/ponentes desde cmc-mobile.
// Campo real en el JSONB: speakers_scan_stats (con "s" al final,
// distinto de exhibitor_scan_stats que va en singular).
// ════════════════════════════════════════════════════════════
router.get('/tkinter-speakers', authRequired, requireStaff, async (req, res) => {
  try {
    console.log('[Staff TkinterSpeakers] Consultando cmc-mobile en vivo...');

    const result = await pool1.query(`
      SELECT s.stats, s.updated_at
      FROM statistics s
      ORDER BY s.updated_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json(null);
    }

    const stats = result.rows[0].stats || {};

    res.json({
      total_speakers: stats.total_speakers ?? null,
      total_scanned_speakers: stats.total_scanned_speakers ?? 0,
      daily_speaker_stats: stats.daily_speaker_stats ?? {},
      speakers: stats.speakers_scan_stats ?? [],
      updated_at: result.rows[0].updated_at,
    });
  } catch (error) {
    console.error('❌ Error en GET /staff/tkinter-speakers:', error.message);
    res.status(500).json({ error: 'Error al consultar speakers', details: error.message });
  }
});

router.get('/quien-no-llego', authRequired, requireStaff, async (req, res) => {
  try {
    const { sede, dia } = req.query;
    console.log('[Staff QuienNoLlego] Consultando... dia=', dia || 'todos');

    // 1. Traer el JSONB más reciente de cmc-mobile (en vivo)
    const statsRes = await pool1.query(`
      SELECT s.stats
      FROM statistics s
      ORDER BY s.updated_at DESC
      LIMIT 1
    `);
    const attendeesScan = statsRes.rows[0]?.stats?.attendees_scan_stats || [];

    // 2. Construir el set de qr_code que SÍ tienen registro
    //    (en el día solicitado, o en cualquier día si no se especifica)
    const diaLabel = dia ? `Día ${parseInt(dia)}` : null;
    const conRegistro = new Set();

    for (const a of attendeesScan) {
      const qr = String(a.ID || '').trim();
      if (!qr) continue;

      if (diaLabel) {
        if (String(a[diaLabel] || '').trim().toUpperCase() === 'X') {
          conRegistro.add(qr);
        }
      } else {
        const llegoAlgunDia = ['Día 1', 'Día 2', 'Día 3', 'Día 4'].some(
          (d) => String(a[d] || '').trim().toUpperCase() === 'X'
        );
        if (llegoAlgunDia) conRegistro.add(qr);
      }
    }

    // 3. Traer usuarios activos de la App CMC Web y filtrar los que
    //    NO están en el set de "con registro"
    const params = [];
    let sedeFilter = '';
    if (sede) {
      params.push(sede);
      sedeFilter = `AND u.sede = $${params.length}`;
    }

    // También se considera "con registro" si ya existe una fila en
    // `entradas` (por ejemplo, un registro manual hecho desde la
    // propia App CMC Web) — así la persona desaparece de esta lista
    // de inmediato sin esperar al próximo escaneo del Tkinter.
    let diaEntradasFilter = '';
    const entradasParams = [];
    if (dia) {
      entradasParams.push(parseInt(dia));
      diaEntradasFilter = `AND e.dia = $${entradasParams.length}`;
    }

    const usersRes = await pool.query(
      `SELECT
         u.id, u.nombre, u.email, u.tipo_pase, u.empresa, u.sede, u.qr_code
       FROM users u
       WHERE u.activo = true
         AND u.qr_code IS NOT NULL
         AND u.rol LIKE 'asistente%'
         ${sedeFilter}
         AND NOT EXISTS (
           SELECT 1 FROM entradas e
           WHERE e.user_id = u.id
           ${diaEntradasFilter}
         )
       ORDER BY u.nombre ASC`,
      [...params, ...entradasParams]
    );

    // usersRes.rows ya excluye a quien tiene fila en `entradas` (registro
    // manual o sync previo). Ahora excluimos también a quien aparece
    // con 'X' en el JSONB de cmc-mobile (escaneado por el Tkinter).
    const sinRegistro = usersRes.rows.filter((u) => !conRegistro.has(String(u.qr_code).trim()));

    const porTipoPase = sinRegistro.reduce((acc, row) => {
      const key = row.tipo_pase || 'sin_tipo';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    console.log(`[Staff QuienNoLlego] ✅ ${sinRegistro.length} usuarios sin registro`);

    res.json({
      ok: true,
      dia: dia ? parseInt(dia) : null,
      total: sinRegistro.length,
      porTipoPase,
      usuarios: sinRegistro,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error en GET /staff/quien-no-llego:', error.message);
    res.status(500).json({
      error: 'Error al obtener usuarios sin registro',
      details: error.message,
    });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/staff/registro-manual
//
// Permite al staff marcar manualmente a un asistente como presente
// HOY, sin pasar por el Tkinter. Solo escribe en la base propia
// (tabla `entradas`) — nunca se escribe en cmc-mobile, que es de
// solo lectura desde aquí.
//
// Body: { usuario_id, dia? }  (dia opcional, 1-4; si no se pasa,
// se calcula contra calendario_sedes de la sede del usuario)
// ════════════════════════════════════════════════════════════
router.post('/registro-manual', authRequired, requireStaff, async (req, res) => {
  const client = await pool.connect();
  try {
    const { usuario_id, dia } = req.body;
    if (!usuario_id) {
      return res.status(400).json({ error: 'usuario_id es requerido' });
    }

    const userRes = await client.query(
      `SELECT id, nombre, email, tipo_pase, sede
       FROM users WHERE id = $1 AND activo = true`,
      [usuario_id]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado o inactivo' });
    }
    const user = userRes.rows[0];

    let diaFinal = dia ? parseInt(dia) : null;
    if (!diaFinal) {
      const calRes = await client.query(
        `SELECT fecha_inicio FROM calendario_sedes
         WHERE sede = $1 AND activo = true LIMIT 1`,
        [user.sede]
      );
      if (calRes.rows.length > 0) {
        const inicio = new Date(calRes.rows[0].fecha_inicio);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        inicio.setHours(0, 0, 0, 0);
        const diffDias = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24)) + 1;
        diaFinal = diffDias >= 1 && diffDias <= 4 ? diffDias : 1;
      } else {
        diaFinal = 1;
      }
    }

    const entradaRes = await client.query(
      `INSERT INTO entradas (user_id, fecha, tipo, sede, dia, registrado_por, metodo)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, 'manual_staff')
       ON CONFLICT (user_id, dia, sede) DO UPDATE
         SET metodo = 'manual_staff', registrado_por = $5
       RETURNING *`,
      [user.id, user.tipo_pase, user.sede, diaFinal, req.user.id]
    );

    console.log(`[Staff RegistroManual] ✅ ${user.nombre} marcado presente Día ${diaFinal} por ${req.user.nombre || req.user.id}`);

    res.json({
      ok: true,
      message: `${user.nombre} registrado como presente — Día ${diaFinal}`,
      entrada: entradaRes.rows[0],
      dia: diaFinal,
    });
  } catch (error) {
    console.error('❌ Error en POST /staff/registro-manual:', error.message);
    res.status(500).json({ error: 'Error al registrar asistencia', details: error.message });
  } finally {
    client.release();
  }
});

export default router;