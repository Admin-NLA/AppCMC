import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ========================================================
// GET /stats - Obtener estadísticas generales
// ========================================================
router.get('/', authRequired, async (req, res) => {
  try {
    console.log('[Stats] Obteniendo estadísticas generales...');

    // 1. CONTAR SESIONES ACTIVAS
    const sessionsResult = await pool.query(`
      SELECT COUNT(DISTINCT id) as total
      FROM agenda
      WHERE activo = true
    `);
    const totalSessions = parseInt(sessionsResult.rows[0]?.total || 0);

    // 2. CONTAR SPEAKERS ACTIVOS
    const speakersResult = await pool.query(`
      SELECT COUNT(DISTINCT id) as total
      FROM speakers
      WHERE activo = true
    `);
    const totalSpeakers = parseInt(speakersResult.rows[0]?.total || 0);

    // 3. CONTAR EXPOSITORES ACTIVOS
    const expositoresResult = await pool.query(`
      SELECT COUNT(DISTINCT id) as total
      FROM expositores
      WHERE activo = true
    `);
    const totalExpositores = parseInt(expositoresResult.rows[0]?.total || 0);

    // 4. CONTAR USUARIOS ACTIVOS
    const usersResult = await pool.query(`
      SELECT COUNT(DISTINCT id) as total
      FROM users
      WHERE activo = true
    `);
    const totalUsers = parseInt(usersResult.rows[0]?.total || 0);

    // 5. CONTAR POR TIPO DE PASE
    const pasesResult = await pool.query(`
      SELECT 
        tipo_pase,
        COUNT(id) as cantidad
      FROM users
      WHERE activo = true
      GROUP BY tipo_pase
      ORDER BY cantidad DESC
    `);

    const pasesStats = pasesResult.rows.reduce((acc, row) => {
      acc[row.tipo_pase] = parseInt(row.cantidad);
      return acc;
    }, {});

    // 6. CONTAR POR ROL
    const rolesResult = await pool.query(`
      SELECT 
        rol,
        COUNT(id) as cantidad
      FROM users
      WHERE activo = true
      GROUP BY rol
      ORDER BY cantidad DESC
    `);

    const rolesStats = rolesResult.rows.reduce((acc, row) => {
      acc[row.rol] = parseInt(row.cantidad);
      return acc;
    }, {});

    // 7. CONTAR POR SEDE
    const sedesResult = await pool.query(`
      SELECT 
        sede,
        COUNT(DISTINCT id) as cantidad
      FROM users
      WHERE activo = true AND sede IS NOT NULL
      GROUP BY sede
      ORDER BY cantidad DESC
    `);

    const sedesStats = sedesResult.rows.reduce((acc, row) => {
      acc[row.sede] = parseInt(row.cantidad);
      return acc;
    }, {});

    // 8. CHECK-INS REGISTRADOS
    const checkinsResult = await pool.query(`
      SELECT COUNT(id) as total
      FROM asistencias_sesion
    `);
    const totalCheckIns = parseInt(checkinsResult.rows[0]?.total || 0);

    // Compilar respuesta
    const stats = {
      sessions: totalSessions,
      speakers: totalSpeakers,
      expositores: totalExpositores,
      users: totalUsers,
      checkIns: totalCheckIns,
      byTipoPase: pasesStats,
      byRol: rolesStats,
      bySede: sedesStats,
      timestamp: new Date().toISOString()
    };

    console.log('[Stats] ✅ Estadísticas obtenidas:', {
      sessions: totalSessions,
      speakers: totalSpeakers,
      expositores: totalExpositores,
      users: totalUsers,
      checkIns: totalCheckIns
    });

    res.json(stats);

  } catch (error) {
    console.error('❌ Error en GET /stats:', error.message);
    res.status(500).json({
      error: 'Error al obtener estadísticas',
      details: error.message
    });
  }
});

export default router;