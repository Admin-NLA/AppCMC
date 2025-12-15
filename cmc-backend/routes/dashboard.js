// cmc-backend/routes/dashboard.js
import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../utils/authMiddleware.js";

const router = Router();

const toInt = (r) =>
  r?.rows?.[0] ? parseInt(r.rows[0].count || r.rows[0].value || 0) : 0;

router.get("/", authRequired, async (req, res) => {
  try {
    const user = req.user;
    const userId = user?.id;

    // ----------------------------
    // 1) Precargas generales
    // ----------------------------
    const pTotalSessions = pool.query("SELECT COUNT(*) FROM agenda");
    const pTotalSpeakers = pool.query("SELECT COUNT(*) FROM speakers");
    const pTotalExpositores = pool.query("SELECT COUNT(*) FROM expositores");

    const pCountBySede = pool.query(
      "SELECT sede, COUNT(*) FROM agenda GROUP BY sede"
    );

    const pCountByTipoPase = pool.query(
      "SELECT tipo_pase, COUNT(*) FROM users GROUP BY tipo_pase"
    );

    const pAsistenciasSesion = pool.query(
      "SELECT session_id, COUNT(*) FROM asistencias_sesion GROUP BY session_id"
    );

    const pAsistenciasCurso = pool.query(
      "SELECT curso_id, COUNT(*) FROM asistencias_curso GROUP BY curso_id"
    );

    const pFavs = userId
      ? pool.query("SELECT session_id FROM favoritos WHERE user_id = $1", [
          userId,
        ])
      : Promise.resolve({ rows: [] });

    const pUpcoming = pool.query(
      `SELECT id, title, start_at, end_at, room, sede
       FROM agenda
       WHERE start_at >= NOW()
       ORDER BY start_at ASC
       LIMIT 10`
    );

    // ----------------------------
    // 2) Networking (corregido según tu tabla)
    // ----------------------------
    const pMyNetworking = userId
      ? pool.query(
          `SELECT 
              id,
              fecha,
              hora,
              solicitante_id,
              expositor_id,
              status,
              created_at
           FROM networking
           WHERE solicitante_id = $1 OR expositor_id = $1
           ORDER BY fecha ASC, hora ASC
           LIMIT 20`,
          [userId]
        )
      : Promise.resolve({ rows: [] });

    // ----------------------------
    // 3) Historial escaneos (entradas)
    // ----------------------------
    const pScanHistory =
      user.rol === "staff" || user.rol === "admin"
        ? pool.query(
            `SELECT *
             FROM entradas
             ORDER BY created_at DESC
             LIMIT 200`
          )
        : Promise.resolve({ rows: [] });

    // Ejecutar todo:
    const [
      totalSessionsR,
      totalSpeakersR,
      totalExpositoresR,
      countBySedeR,
      countByTipoPaseR,
      asistenciasSesionR,
      asistenciasCursoR,
      favsR,
      upcomingR,
      expoMetricsR,
      myNetworkingR,
      scanHistoryR,
    ] = await Promise.all([
      pTotalSessions,
      pTotalSpeakers,
      pTotalExpositores,
      pCountBySede,
      pCountByTipoPase,
      pAsistenciasSesion,
      pAsistenciasCurso,
      pFavs,
      pUpcoming,
      Promise.resolve({ rows: [] }), // expositores_metrica (NO la usaremos por ahora)
      pMyNetworking,
      pScanHistory,
    ]);

    // ======================================
    // BASE GENERAL PARA TODOS LOS ROLES
    // ======================================
    const base = {
      totals: {
        sessions: toInt(totalSessionsR),
        speakers: toInt(totalSpeakersR),
        expositores: toInt(totalExpositoresR),
      },
      upcoming: upcomingR.rows || [],
      favorites: (favsR.rows || []).map((r) => r.session_id),
    };

    // ======================================
    // ROLE LOGIC
    // ======================================
    let rolePayload = {};

    // ---------------- STAFF / ADMIN ----------------
    if (user.rol === "staff" || user.rol === "admin") {
      rolePayload = {
        stats: {
          bySede: (countBySedeR.rows || []).map((r) => ({
            sede: r.sede,
            count: parseInt(r.count),
          })),
          byTipoPase: (countByTipoPaseR.rows || []).map((r) => ({
            tipo_pase: r.tipo_pase,
            count: parseInt(r.count),
          })),
          asistenciasSesion: asistenciasSesionR.rows,
          asistenciasCurso: asistenciasCursoR.rows,
        },
        networking: myNetworkingR.rows,
        scanHistory: scanHistoryR.rows,
      };
    }

    // ---------------- SPEAKER ----------------
    else if (user.rol === "speaker") {
      const mySessions = await pool
        .query(
          `SELECT a.id, a.title, a.start_at, a.room
           FROM agenda a
           WHERE $1 = ANY(a.speakers)
           ORDER BY a.start_at ASC`,
          [userId]
        )
        .catch(() => ({ rows: [] }));

      rolePayload = {
        mySessions: mySessions.rows,
        networking: myNetworkingR.rows,
      };
    }

    // ---------------- EXPOSITOR ----------------
    else if (user.rol === "expositor") {
      const expoData = await pool.query(
        `SELECT id, nombre, logo_url, stand, contact
         FROM expositores
         WHERE owner_id = $1 OR id = $1`,
        [userId]
      );

      rolePayload = {
        expositorProfile: expoData.rows[0] || null,
        networking: myNetworkingR.rows,
      };
    }

    // ---------------- ASISTENTES ----------------
    else {
      const entradasCount = await pool
        .query(
          `SELECT date_trunc('day', created_at) AS day, COUNT(*)
           FROM entradas
           WHERE user_id = $1
           GROUP BY day
           ORDER BY day ASC`,
          [userId]
        )
        .catch(() => ({ rows: [] }));

      const tipoPase = user.tipo_pase || "General";

      rolePayload = {
        tipo_pase: tipoPase,
        entradasPorDia: entradasCount.rows,
        favorites: base.favorites,
        networking: myNetworkingR.rows,
      };
    }

    return res.json({
      ok: true,
      role: user.rol,
      base,
      payload: rolePayload,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    return res.status(500).json({ ok: false, error: "Error interno en dashboard" });
  }
});

export default router;