// cmc-backend/routes/notificaciones.js
// ✅ CONSOLIDADO: SSE + CRUD + Broadcast
import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../utils/authMiddleware.js";

const router = Router();

/* ============================================
   🔵 SSE - Server-Sent Events
   Manejo de clientes conectados en tiempo real
============================================ */
let clients = [];

/**
 * Endpoint SSE - Clientes se conectan aquí para recibir notificaciones en tiempo real
 * Uso: const es = new EventSource('/api/notificaciones/events')
 */
router.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const clientId = Date.now();
  clients.push({ id: clientId, res });

  console.log(`🔔 [SSE] Cliente conectado: ${clientId}`);

  req.on("close", () => {
    console.log(`❌ [SSE] Cliente desconectado: ${clientId}`);
    clients = clients.filter(c => c.id !== clientId);
  });
});

/**
 * Función interna para enviar SSE a todos los clientes conectados
 * @param {Object} data - Datos a enviar (automaticamente serializado a JSON)
 */
function sendSSE(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try {
      client.res.write(message);
    } catch (err) {
      console.error(`❌ [SSE] Error enviando a cliente ${client.id}:`, err.message);
    }
  });
}

/* ============================================
   📋 LISTAR NOTIFICACIONES
============================================ */

/**
 * GET /notificaciones
 * Obtiene todas las notificaciones del usuario actual
 * Filtra por tipo_pase, rol y sede
 */
router.get("/", authRequired, async (req, res) => {
  try {
    const user = req.user;
    const tipoPase = (user.tipo_pase || "general").toLowerCase();
    const rolSistema = user.rol;
    const sedeUsuario = user.sede || "MX";

    console.log(`📬 [GET /notificaciones] Usuario: ${user.email}, Pase: ${tipoPase}`);

    const result = await pool.query(
      `SELECT 
        n.id,
        n.titulo,
        n.mensaje,
        n.tipo,
        n.enviada,
        n.activa,
        n.created_at,
        n.created_by,
        n.meta,
        CASE WHEN nv.vista_at IS NOT NULL THEN true ELSE false END AS leida,
        nv.vista_at
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
       ORDER BY n.created_at DESC
       LIMIT 100`,
      [user.id, tipoPase, rolSistema, sedeUsuario]
    );

    console.log(`✅ [GET /notificaciones] ${result.rows.length} notificaciones encontradas`);
    res.json(result.rows);

  } catch (err) {
    console.error("❌ [GET /notificaciones] Error:", err.message);
    res.status(500).json({ error: "Error listando notificaciones", details: err.message });
  }
});

/**
 * GET /notificaciones/:id
 * Obtiene una notificación específica por ID
 */
router.get("/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        id,
        titulo,
        mensaje,
        tipo,
        enviada,
        activa,
        created_at,
        created_by,
        meta
       FROM notificaciones
       WHERE id = $1 AND activa = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("❌ [GET /:id] Error:", err.message);
    res.status(500).json({ error: "Error obteniendo notificación", details: err.message });
  }
});

/* ============================================
   ✍️  CREAR NOTIFICACIÓN
============================================ */

/**
 * POST /notificaciones
 * Crea una notificación nueva
 * Solo: super_admin, staff
 */
router.post("/", authRequired, async (req, res) => {
  try {
    const user = req.user;

    // Validar permisos
    if (user.rol !== "super_admin" && user.rol !== "staff") {
      return res.status(403).json({ error: "Permiso denegado. Solo admin/staff." });
    }

    const {
      titulo,
      mensaje,
      tipo = "info",
      tipo_usuario = ["todos"],
      sede = "todos",
      meta = {},
      programada_para = null
    } = req.body;

    // Validar campos requeridos
    if (!titulo || !mensaje) {
      return res.status(400).json({ error: "Campos requeridos: titulo, mensaje" });
    }

    console.log(`📝 [POST] Creando notificación: "${titulo}"`);

    const result = await pool.query(
      `INSERT INTO notificaciones
       (id, titulo, mensaje, tipo, tipo_usuario, sede, meta, activa, created_by, created_at, programada_para, enviada)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, NOW(), $8, false)
       RETURNING *`,
      [titulo, mensaje, tipo, tipo_usuario, sede, meta, user.id, programada_para]
    );

    const notificacion = result.rows[0];

    // Enviar por SSE si NO es programada
    if (!programada_para) {
      console.log(`📡 [SSE] Enviando notificación en tiempo real`);
      sendSSE({ 
        tipo: "NEW_NOTIFICATION", 
        data: notificacion 
      });
    }

    console.log(`✅ [POST] Notificación creada: ${notificacion.id}`);
    res.status(201).json({ ok: true, notificacion });

  } catch (err) {
    console.error("❌ [POST] Error:", err.message);
    res.status(500).json({ error: "Error creando notificación", details: err.message });
  }
});

/**
 * POST /notificaciones/broadcast
 * Envía notificación a múltiples usuarios
 * Solo: super_admin, staff
 */
router.post("/broadcast", authRequired, async (req, res) => {
  try {
    const user = req.user;

    if (user.rol !== "super_admin" && user.rol !== "staff") {
      return res.status(403).json({ error: "Permiso denegado" });
    }

    const { usuarios, titulo, mensaje, tipo = "info" } = req.body;

    if (!usuarios || usuarios.length === 0 || !titulo || !mensaje) {
      return res.status(400).json({ 
        error: "Campos requeridos: usuarios[], titulo, mensaje" 
      });
    }

    console.log(`📢 [BROADCAST] Enviando a ${usuarios.length} usuarios`);

    const result = await pool.query(
      `INSERT INTO notificaciones
       (id, titulo, mensaje, tipo, tipo_usuario, sede, activa, created_by, created_at, enviada)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'todos', true, $5, NOW(), true)
       RETURNING id`,
      [titulo, mensaje, tipo, usuarios, user.id]
    );

    // Enviar por SSE
    sendSSE({
      tipo: "BROADCAST_NOTIFICATION",
      usuarios,
      data: { titulo, mensaje, tipo }
    });

    console.log(`✅ [BROADCAST] ${usuarios.length} usuarios notificados`);
    res.status(201).json({ 
      ok: true, 
      count: usuarios.length, 
      message: `Notificación enviada a ${usuarios.length} usuarios`,
      id: result.rows[0].id
    });

  } catch (err) {
    console.error("❌ [BROADCAST] Error:", err.message);
    res.status(500).json({ error: "Error en broadcast", details: err.message });
  }
});

/* ============================================
   🔄 ACTUALIZAR NOTIFICACIÓN
============================================ */

/**
 * PUT /notificaciones/:id
 * Actualiza una notificación existente
 * Solo: super_admin, staff
 */
router.put("/:id", authRequired, async (req, res) => {
  try {
    const user = req.user;

    if (user.rol !== "super_admin" && user.rol !== "staff") {
      return res.status(403).json({ error: "Permiso denegado" });
    }

    const { id } = req.params;
    const {
      titulo,
      mensaje,
      tipo,
      tipo_usuario,
      sede,
      meta,
      programada_para
    } = req.body;

    console.log(`✏️ [PUT] Actualizando notificación: ${id}`);

    const result = await pool.query(
      `UPDATE notificaciones
       SET 
         titulo = COALESCE($1, titulo),
         mensaje = COALESCE($2, mensaje),
         tipo = COALESCE($3, tipo),
         tipo_usuario = COALESCE($4, tipo_usuario),
         sede = COALESCE($5, sede),
         meta = COALESCE($6, meta),
         programada_para = $7,
         enviada = false
       WHERE id = $8
       RETURNING *`,
      [titulo, mensaje, tipo, tipo_usuario, sede, meta, programada_para || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    console.log(`✅ [PUT] Notificación actualizada: ${id}`);
    res.json({ ok: true, notificacion: result.rows[0] });

  } catch (err) {
    console.error("❌ [PUT] Error:", err.message);
    res.status(500).json({ error: "Error actualizando notificación", details: err.message });
  }
});

/**
 * POST /notificaciones/:id/vista
 * Marca una notificación como vista por el usuario
 */
router.post("/:id/vista", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`👁️ [VISTA] Usuario ${userId} marca notificación ${id} como vista`);

    await pool.query(
      `INSERT INTO notificaciones_vistas
       (id, user_id, notificacion_id, vista_at)
       VALUES (gen_random_uuid(), $1, $2, NOW())
       ON CONFLICT (user_id, notificacion_id) DO NOTHING`,
      [userId, id]
    );

    console.log(`✅ [VISTA] Marcada como vista`);
    res.json({ ok: true });

  } catch (err) {
    console.error("❌ [VISTA] Error:", err.message);
    res.status(500).json({ error: "Error marcando vista", details: err.message });
  }
});

/**
 * PUT /notificaciones/:id/estado
 * Activa o desactiva una notificación
 */
router.put("/:id/estado", authRequired, async (req, res) => {
  try {
    const user = req.user;

    if (user.rol !== "super_admin" && user.rol !== "staff") {
      return res.status(403).json({ error: "Permiso denegado" });
    }

    const { id } = req.params;
    const { activa } = req.body;

    console.log(`⚙️ [ESTADO] Cambiando estado de ${id} a activa=${activa}`);

    const result = await pool.query(
      `UPDATE notificaciones 
       SET activa = $1 
       WHERE id = $2 
       RETURNING *`,
      [activa, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    console.log(`✅ [ESTADO] Actualizado`);
    res.json({ ok: true, notificacion: result.rows[0] });

  } catch (err) {
    console.error("❌ [ESTADO] Error:", err.message);
    res.status(500).json({ error: "Error actualizando estado", details: err.message });
  }
});

/* ============================================
   🗑️ ELIMINAR NOTIFICACIÓN
============================================ */

/**
 * DELETE /notificaciones/:id
 * Elimina (soft delete) una notificación
 * Solo: super_admin, staff
 */
router.delete("/:id", authRequired, async (req, res) => {
  try {
    const user = req.user;

    if (user.rol !== "super_admin" && user.rol !== "staff") {
      return res.status(403).json({ error: "Permiso denegado" });
    }

    const { id } = req.params;

    console.log(`🗑️ [DELETE] Eliminando notificación: ${id}`);

    const result = await pool.query(
      `UPDATE notificaciones 
       SET activa = false 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    // Avisar por SSE
    sendSSE({
      tipo: "DELETE_NOTIFICATION",
      id
    });

    console.log(`✅ [DELETE] Notificación eliminada: ${id}`);
    res.json({ ok: true, message: "Notificación eliminada", notificacion: result.rows[0] });

  } catch (err) {
    console.error("❌ [DELETE] Error:", err.message);
    res.status(500).json({ error: "Error eliminando notificación", details: err.message });
  }
});

/* ============================================
   📊 HISTORIAL Y UTILIDADES
============================================ */

/**
 * GET /notificaciones/historial/completo
 * Obtiene el historial completo del usuario
 */
router.get("/historial/completo", authRequired, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        n.*,
        CASE WHEN nv.vista_at IS NOT NULL THEN true ELSE false END AS leida,
        nv.vista_at
       FROM notificaciones n
       LEFT JOIN notificaciones_vistas nv
         ON nv.notificacion_id = n.id
        AND nv.user_id = $1
       ORDER BY n.created_at DESC`,
      [userId]
    );

    res.json({ ok: true, historial: result.rows });

  } catch (err) {
    console.error("❌ [HISTORIAL] Error:", err.message);
    res.status(500).json({ error: "Error en historial", details: err.message });
  }
});

export { sendSSE };
export default router;