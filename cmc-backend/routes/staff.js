import express from 'express';
import pool from '../db.js';
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
// GET /api/staff/usuarios-tipo-pase - Usuarios por tipo de pase
// ========================================================
router.get('/usuarios-tipo-pase', authRequired, requireStaff, async (req, res) => {
  try {
    console.log('[Staff Usuarios Pase] Obteniendo usuarios por tipo de pase...');

    const tipoPase = req.query.tipo_pase;
    const limit = req.query.limit || 100;
    const offset = req.query.offset || 0;

    let query = `
      SELECT 
        id,
        nombre,
        email,
        tipo_pase,
        rol,
        sede,
        empresa,
        created_at
      FROM users
      WHERE activo = true
    `;

    const params = [];

    if (tipoPase) {
      query += ` AND tipo_pase = $${params.length + 1}`;
      params.push(tipoPase);
    }

    query += ` ORDER BY nombre ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    console.log('[Staff Usuarios Pase] ✅ Obtenidos:', result.rows.length);

    res.json({
      usuarios: result.rows,
      total: result.rows.length,
      tipo_pase: tipoPase || 'todos'
    });

  } catch (error) {
    console.error('❌ Error en GET /staff/usuarios-tipo-pase:', error.message);
    res.status(500).json({
      error: 'Error al obtener usuarios',
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

// ================== AJUSTE NUEVO WEB APP CMC=======================================================>
// GET /api/staff/checkins-recientes - Últimos check-ins
// ========================================================
router.get('/checkins-recientes', authRequired, requireStaff, async (req, res) => {
  try {
    const { sede, limit: limitParam } = req.query;
    const limit = parseInt(limitParam) || 10;

    const result = await pool.query(`
      SELECT nombre, email, sesion, fecha, tipo_pase, origen FROM (
        SELECT
          u.nombre,
          u.email,
          CONCAT('Entrada Día ', e.dia) AS sesion,
          e.created_at AS fecha,
          u.tipo_pase,
          'entrada' AS origen,
          e.dia AS dia
        FROM entradas e
        JOIN users u ON u.id = e.user_id
        UNION ALL
        SELECT
          u.nombre,
          u.email,
          ag.title AS sesion,
          a.fecha,
          u.tipo_pase,
          'sesion' AS origen,
          ag.dia AS dia
        FROM asistencias_sesion a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN agenda ag ON ag.id = a.session_id
      ) t
      ORDER BY fecha DESC
      LIMIT $1
    `, [limit]);

    res.json({
      checkins: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error en GET /staff/checkins-recientes:', error.message);
    res.status(500).json({
      error: 'Error al obtener checkins recientes',
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
    const sedeFilter = sede ? `AND e.sede = '${sede}'` : '';

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
      WHERE 1=1 ${sedeFilter}
      GROUP BY e.dia, u.tipo_pase
      ORDER BY e.dia
    `);

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
      WHERE 1=1 ${sedeFilter}
    `);
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
export default router;