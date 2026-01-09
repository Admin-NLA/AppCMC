import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../utils/authMiddleware.js";
import {
  sedesPermitidasFromPases,
  sedeActivaPorFecha
} from "../../src/utils/sedeHelper.js";
import { parseSessionSlug } from "../utils/slugParser.js";
import axios from "axios";

const router = Router();

// Alias para compatibilidad con frontend
// ✅ Alias real para sesiones
router.get("/sessions", authRequired, async (req, res) => {
  try {
    const usuario = req.user;
    const pases = usuario?.pases || [];

    const sedesPermitidasRaw = sedesPermitidasFromPases(pases);
    const sedesPermitidas = sedesPermitidasRaw.map(s => s.name);

    if (
      (!sedesPermitidas || sedesPermitidas.length === 0) &&
      usuario.rol !== "admin"
    ) {
      return res.status(403).json({ error: "No tienes acceso a ninguna sede." });
    }

    let { sede } = req.query;

    if (sedesPermitidas.length === 1) {
      sede = sedesPermitidas[0];
    } else if (!sede) {
      const auto = sedeActivaPorFecha();
      sede = auto?.name || sedesPermitidas[0];
    }

    const year = req.query.year
  ? parseInt(req.query.year)
  : new Date().getFullYear();

    const result = await pool.query(
      `
      SELECT *,
        COALESCE(year_override, year) AS year_final
      FROM agenda
      WHERE sede = $1
        AND COALESCE(year_override, year) = $2
      ORDER BY start_at ASC
      `,
      [sede, year]
    );

    const sessions = result.rows.map(s => ({
      id: s.id,
      titulo: s.title,
      descripcion: s.description,
      horaInicio: s.start_at,
      horaFin: s.end_at,
      sala: s.room,
      tipo: s.tipo || "conferencia",
      dia: s.dia,
      speakerNombre: s.speaker_nombre || null,
      sede: s.sede,
      year: s.year_final,
      checkIns: s.check_ins || [],
    }));

    res.json({ sessions });
  } catch (err) {
    console.error("Agenda sessions error:", err);
    res.status(500).json({ error: "Error al obtener agenda" });
  }
});

/* ========================================================================
   GET — SESIÓN POR ID (STAFF/USER/ADMIN)
========================================================================= */
router.get("/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM agenda WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Sesión no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Agenda ID error:", err);
    res.status(500).json({ error: "Error al obtener sesión" });
  }
});

/* importar sesiones desde WordPress  */
router.post("/sync/wp", authRequired, async (req, res) => {
  try {
    if (!["admin", "staff"].includes(req.user.rol)) {
      return res.status(403).json({ error: "Solo staff/admin" });
    }

    const WP_URL = "https://cmc-latam.com/wp-json/wp/v2/session?per_page=100";

    const wpRes = await axios.get(WP_URL, {
      headers: {
        "User-Agent": "CMC-App/1.0",
        "Accept": "application/json"
      },
      timeout: 10000
    });
    
    const wpSessions = wpRes.data;

    let inserted = 0;
    let skipped = 0;

    for (const wp of wpSessions) {
      const parsed = parseSessionSlug(wp.slug);
      if (!parsed) continue;

      await pool.query(
        `
        INSERT INTO agenda (
          title,
          description,
          start_at,
          end_at,
          sede,
          year,
          tipo,
          categoria,
          external_source
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          wp.title.rendered,
          wp.content.rendered,
          wp.acf?.start_at || null,
          wp.acf?.end_at || null,
          parsed.sede,
          parsed.anio,
          parsed.tipo,
          parsed.categoria,
          {
            source: "wordpress",
            wp_id: wp.id,
            slug: wp.slug
          }
        ]
      );

      inserted++;
    }

    res.json({ ok: true, inserted, skipped });

  } catch (err) {
    console.error("WP sync error REAL:", err.message);
    res.status(500).json({
      error: "Error sincronizando WordPress",
      detail: err.message
    });
  }
});

/* ========================================================================
   CRUD ADMIN — SOLO ADMIN
========================================================================= */

// Crear sesión
router.post("/", authRequired, async (req, res) => {
  try {
    if (req.user.rol !== "admin")
      return res.status(403).json({ error: "Solo admin puede crear sesiones" });

    const { title, description, start_at, end_at, room, speakers, sede } = req.body;

    const result = await pool.query(
      `INSERT INTO agenda (title, description, start_at, end_at, room, speakers, sede)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, start_at, end_at, room, speakers || [], sede]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Agenda create error:", err);
    res.status(500).json({ error: "Error al crear sesión" });
  }
});

// Editar sesión
router.put("/:id", authRequired, async (req, res) => {
  try {
    if (req.user.rol !== "admin")
      return res.status(403).json({ error: "Solo admin puede editar" });

    const { id } = req.params;
    const { title, description, start_at, end_at, room, speakers, sede } = req.body;

    const result = await pool.query(
      `UPDATE agenda
       SET title=$1, description=$2, start_at=$3, end_at=$4, room=$5, speakers=$6, sede=$7
       WHERE id=$8
       RETURNING *`,
      [title, description, start_at, end_at, room, speakers, sede, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Agenda update error:", err);
    res.status(500).json({ error: "Error al actualizar sesión" });
  }
});

// Eliminar sesión
router.delete("/:id", authRequired, async (req, res) => {
  try {
    if (req.user.rol !== "admin")
      return res.status(403).json({ error: "Solo admin puede eliminar" });

    const { id } = req.params;

    await pool.query("DELETE FROM agenda WHERE id = $1", [id]);

    res.json({ message: "Sesión eliminada" });
  } catch (err) {
    console.error("Agenda delete error:", err);
    res.status(500).json({ error: "Error al eliminar sesión" });
  }
});

/* ========================================================================
   POST — CHECK-IN A SESIÓN
========================================================================= */
router.post("/checkin", authRequired, async (req, res) => {
  try {
    const { qr, userId } = req.body;

    if (!qr || !userId) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    // validar sesión
    const sessionResult = await pool.query(
      "SELECT id, title FROM agenda WHERE id = $1",
      [qr]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: "Sesión no válida" });
    }

    // evitar doble check-in
    const exists = await pool.query(
      `SELECT 1 FROM asistencias_sesion 
       WHERE session_id = $1 AND user_id = $2`,
      [qr, userId]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "Ya registraste asistencia" });
    }

    await pool.query(
      `INSERT INTO asistencias_sesion (session_id, user_id)
       VALUES ($1, $2)`,
      [qr, userId]
    );

    res.json({
      ok: true,
      session: sessionResult.rows[0],
    });
  } catch (err) {
    console.error("Check-in error:", err);
    res.status(500).json({ error: "Error al registrar asistencia" });
  }
});

/* ========================================================================
   FAVORITOS — GUARDAR SESIÓN
========================================================================= */
router.post("/favorite/:id", authRequired, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    await pool.query(
      `INSERT INTO favoritos (user_id, session_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, sessionId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Favorite error:", err);
    res.status(500).json({ error: "Error al guardar favorito" });
  }
});

/* ========================================================================
   FAVORITOS — QUITAR SESIÓN
========================================================================= */
router.post("/unfavorite/:id", authRequired, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    await pool.query(
      `DELETE FROM favoritos WHERE user_id = $1 AND session_id = $2`,
      [userId, sessionId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Unfavorite error:", err);
    res.status(500).json({ error: "Error al quitar favorito" });
  }
});

router.use((err, req, res, next) => {
  console.error("Agenda error:", err);
  res.status(500).json({ error: "Error en agenda" });
});

export default router;