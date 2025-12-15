// cmc-backend/routes/notificaciones.js
import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../utils/authMiddleware.js";

const router = Router();

/* ============================================
   🔵  SSE - Clientes conectados
============================================ */
let clients = [];

// Cliente se conecta a SSE
router.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.flushHeaders();

  const clientId = Date.now();
  clients.push({ id: clientId, res });

  console.log("🔔 Cliente SSE conectado:", clientId);

  req.on("close", () => {
    console.log("❌ Cliente SSE desconectado:", clientId);
    clients = clients.filter(c => c.id !== clientId);
  });
});

// Enviar a todos los clientes SSE
export function sendSSE(data) {
  clients.forEach(c => c.res.write(`data: ${JSON.stringify(data)}\n\n`));
}

/* ============================================
   1️⃣ CREAR NOTIFICACIÓN (solo admin/staff)
============================================ */
router.post("/", authRequired, async (req, res) => {
  try {
    const user = req.user;

    if (user.rol !== "admin" && user.rol !== "staff") {
      return res.status(403).json({ error: "Permiso denegado" });
    }

    const {
      titulo,
      mensaje,
      tipo,
      tipo_usuario,   // AHORA ARRAY ej: ["curso","sesiones","general"]
      sede,           // "MX" | "CL" | "CO" | "todos"
      meta,
      programada_para // opcional
    } = req.body;

    const result = await pool.query(
      `INSERT INTO notificaciones
      (id, titulo, mensaje, tipo, tipo_usuario, sede, meta, activa, created_by, created_at, programada_para, enviada)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, NOW(), $8, false)
       RETURNING *`,
      [
        titulo,
        mensaje,
        tipo,
        tipo_usuario || ["todos"],  // ARRAY 
        sede || "todos",
        meta || {},
        user.id,
        programada_para || null
      ]
    );

    // Enviar por SSE si NO es programada
    if (!programada_para) {
      sendSSE({ tipo: "NEW_NOTIFICATION", data: result.rows[0] });
    }

    res.json({ ok: true, notificacion: result.rows[0] });

  } catch (err) {
    console.error("Create notification error:", err);
    res.status(500).json({ error: "Error creando notificación" });
  }
});

/* ============================================
   2️⃣ LISTAR NOTIFICACIONES PARA EL USUARIO
============================================ */
router.get("/", authRequired, async (req, res) => {
  try {
    const user = req.user;

    const tipoPase = (user.tipo_pase || "general").toLowerCase();
    const rolSistema = user.rol; // admin, staff, expositor, speaker, etc.

    const sedeUsuario = user.sede || "MX";

    const result = await pool.query(
      `SELECT 
          n.*,
          CASE WHEN nv.vista IS NOT NULL THEN true ELSE false END AS vista
       FROM notificaciones n
       LEFT JOIN notificaciones_vistas nv
            ON nv.notificacion_id = n.id
           AND nv.user_id = $1
       WHERE n.activa = true
         AND (
               'todos' = ANY(n.tipo_usuario)
            OR $2 = ANY(n.tipo_usuario)
            OR $3 = ANY(n.tipo_usuario)
         )
         AND (n.sede = 'todos' OR n.sede = $4)
       ORDER BY n.created_at DESC`,
      [user.id, tipoPase, rolSistema, sedeUsuario]
    );

    res.json({ ok: true, notificaciones: result.rows });

  } catch (err) {
    console.error("List notifications error:", err);
    res.status(500).json({ error: "Error listando notificaciones" });
  }
});

/* ============================================
   3️⃣ MARCAR NOTIFICACIÓN COMO VISTA
============================================ */
router.post("/:id/vista", authRequired, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO notificaciones_vistas
        (id, user_id, notificacion_id, vista, fecha)
       VALUES (gen_random_uuid(), $1, $2, true, NOW())
       ON CONFLICT (user_id, notificacion_id) DO NOTHING`,
      [req.user.id, req.params.id]
    );

    res.json({ ok: true });

  } catch (err) {
    console.error("Vista error:", err);
    res.status(500).json({ error: "Error marcando vista" });
  }
});

/* ============================================
   4️⃣ ACTIVAR / DESACTIVAR NOTIFICACIÓN
============================================ */
router.put("/:id/estado", authRequired, async (req, res) => {
  try {
    const user = req.user;

    if (user.rol !== "admin" && user.rol !== "staff") {
      return res.status(403).json({ error: "Permiso denegado" });
    }

    const { activa } = req.body;

    const result = await pool.query(
      `UPDATE notificaciones 
       SET activa = $1 
       WHERE id = $2 
       RETURNING *`,
      [activa, req.params.id]
    );

    res.json({ ok: true, notificacion: result.rows[0] });

  } catch (err) {
    console.error("Update estado error:", err);
    res.status(500).json({ error: "Error actualizando estado" });
  }
});

/* ============================================
   5️⃣ HISTORIAL COMPLETO DEL USUARIO
============================================ */
router.get("/historial", authRequired, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, nv.vista, nv.fecha
       FROM notificaciones n
       LEFT JOIN notificaciones_vistas nv
         ON nv.notificacion_id = n.id
        AND nv.user_id = $1
       ORDER BY n.created_at DESC`,
      [req.user.id]
    );

    res.json({ ok: true, historial: result.rows });

  } catch (err) {
    console.error("Historial error:", err);
    res.status(500).json({ error: "Error en historial" });
  }
});

// =====================================================================
// 6️⃣ EDITAR NOTIFICACIÓN (solo STAFF/ADMIN)
// =====================================================================
router.put("/:id", authRequired, async (req, res) => {
  try {
    const user = req.user;

    if (user.rol !== "staff" && user.rol !== "admin") {
      return res.status(403).json({ error: "Permiso denegado" });
    }

    const { id } = req.params;
    const {
      titulo,
      mensaje,
      tipo,
      tipo_usuario,
      meta,
      sede,
      programada_para
    } = req.body;

    const result = await pool.query(
      `UPDATE notificaciones
       SET 
         titulo = COALESCE($1, titulo),
         mensaje = COALESCE($2, mensaje),
         tipo = COALESCE($3, tipo),
         tipo_usuario = COALESCE($4, tipo_usuario),
         meta = COALESCE($5, meta),
         sede = COALESCE($6, sede),
         programada_para = $7,
         enviada = false  -- siempre reset al editar
       WHERE id = $8
       RETURNING *`,
      [
        titulo,
        mensaje,
        tipo,
        tipo_usuario,
        meta,
        sede,
        programada_para || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    res.json({
      ok: true,
      notificacion: result.rows[0]
    });

  } catch (err) {
    console.error("Update notification error:", err);
    res.status(500).json({ error: "Error actualizando notificación" });
  }
});

// =====================================================================
// 7 ELIMINAR NOTIFICACIÓN (solo STAFF/ADMIN)
// =====================================================================
router.delete("/:id", authRequired, async (req, res) => {
  try {
    const user = req.user;

    if (user.rol !== "staff" && user.rol !== "admin") {
      return res.status(403).json({ error: "Permiso denegado" });
    }

    const notificacionId = req.params.id;

    const result = await pool.query(
      `DELETE FROM notificaciones WHERE id = $1 RETURNING *`,
      [notificacionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    console.log("🗑️ Notificación eliminada:", id);

    // 🔥 Avisar por SSE
    sendSSE({
      tipo: "DELETE_NOTIFICATION",
      id
    });

    res.json({
      ok: true,
      message: "Notificación eliminada",
      notificacion: result.rows[0]
    });

  } catch (err) {
    console.error("Delete notification error:", err);
    res.status(500).json({ error: "Error eliminando notificación" });
  }
});

// =====================================================================
// 8 OBTENER UNA NOTIFICACIÓN POR ID
// =====================================================================
router.get("/:id", authRequired, async (req, res) => {
  try {
    const notificacionId = req.params.id;

    const result = await pool.query(
      `SELECT *
       FROM notificaciones
       WHERE id = $1`,
      [notificacionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Notificación no encontrada" });
    }

    res.json({ ok: true, notificacion: result.rows[0] });

  } catch (err) {
    console.error("Get notification by ID error:", err);
    res.status(500).json({ ok: false, error: "Error obteniendo la notificación" });
  }
});

export default router;