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

    // 3. CHECK-INS TOTALES
    const totalCheckinsResult = await pool.query(`
      SELECT COUNT(id) as total FROM asistencias_sesion
    `);
    const totalCheckins = parseInt(totalCheckinsResult.rows[0]?.total || 0);

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

    // 5. CHECK-INS HOY
    const todayCheckinsResult = await pool.query(`
      SELECT COUNT(id) as total
      FROM asistencias_sesion
      WHERE DATE(fecha) = CURRENT_DATE
    `);
    const checkinsToday = parseInt(todayCheckinsResult.rows[0]?.total || 0);

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
      checkinsToday,
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
      checkinsToday
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
    console.log('[Staff Checkins] Obteniendo registro de check-ins...');

    const limit = req.query.limit || 50;
    const offset = req.query.offset || 0;

    // Obtener check-ins con detalles de usuario y sesión
    const checkinsResult = await pool.query(`
      SELECT 
        a.id,
        a.user_id,
        a.session_id,
        a.fecha,
        u.nombre as usuario_nombre,
        u.email,
        u.tipo_pase,
        ag.title as sesion_titulo,
        ag.dia,
        ag.start_at as hora_sesion,
        ag.sala
      FROM asistencias_sesion a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN agenda ag ON a.session_id = ag.id
      ORDER BY a.fecha DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Contar total
    const countResult = await pool.query(`
      SELECT COUNT(id) as total FROM asistencias_sesion
    `);
    const total = parseInt(countResult.rows[0]?.total || 0);

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
    console.log('[Staff Resumen] Obteniendo resumen del día...');

    // Check-ins hoy
    const checkinsHoyResult = await pool.query(`
      SELECT COUNT(id) as total FROM asistencias_sesion
      WHERE DATE(fecha) = CURRENT_DATE
    `);
    const checkinsHoy = parseInt(checkinsHoyResult.rows[0]?.total || 0);

    // Sesiones hoy
    const sesionesHoyResult = await pool.query(`
      SELECT COUNT(DISTINCT session_id) as total
      FROM asistencias_sesion
      WHERE DATE(fecha) = CURRENT_DATE
    `);
    const sesionesHoy = parseInt(sesionesHoyResult.rows[0]?.total || 0);

    // Usuarios únicos hoy
    const usuariosHoyResult = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as total
      FROM asistencias_sesion
      WHERE DATE(fecha) = CURRENT_DATE
    `);
    const usuariosHoy = parseInt(usuariosHoyResult.rows[0]?.total || 0);

    // Últimas 5 entradas
    const ultimasEntradasResult = await pool.query(`
      SELECT 
        u.nombre,
        u.email,
        ag.title as sesion,
        a.fecha
      FROM asistencias_sesion a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN agenda ag ON a.session_id = ag.id
      WHERE DATE(a.fecha) = CURRENT_DATE
      ORDER BY a.fecha DESC
      LIMIT 5
    `);

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

export default router;