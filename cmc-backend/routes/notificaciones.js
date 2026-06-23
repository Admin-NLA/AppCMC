// cmc-backend/routes/notificaciones.js
// ✅ CONSOLIDADO: SSE + CRUD + Broadcast
import { Router } from "express";
import pool from "../db.js";
import { sendPushToUser } from './push.js';
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

  // Identificar al usuario por userId en query param
  const userId = req.query.userId || null;
  const clientId = Date.now();
  clients.push({ id: clientId, res, userId });

  console.log(`🔔 [SSE] Cliente conectado: ${clientId} userId:${userId}`);

  req.on("close", () => {
    console.log(`❌ [SSE] Cliente desconectado: ${clientId}`);
    clients = clients.filter(c => c.id !== clientId);
  });
});

/**
 * Función interna para enviar SSE a todos los clientes conectados
 * @param {Object} data - Datos a enviar (automaticamente serializado a JSON)
 */
function sendSSE(data, targetUserId = null) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try {
      // Si hay destinatario específico, filtrar por userId
      if (targetUserId && client.userId && client.userId !== String(targetUserId)) return;
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
               -- Notificaciones broadcast (por tipo de usuario)
               (
                 (
                   'todos' = ANY(n.tipo_usuario)
                OR $2 = ANY(n.tipo_usuario)
                OR $3 = ANY(n.tipo_usuario)
                 )
                 AND (n.sede IS NULL OR n.sede = 'todos' OR n.sede = 'ALL' OR n.sede = $4)
               )
               -- Notificaciones dirigidas directamente a este usuario (ej: citas networking)
               OR (n.meta->>'user_destino' = $1::text)
         )
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
      // Web Push — si hay usuarios específicos, enviarles push
      if (notificacion && tipo_usuario && !tipo_usuario.includes('todos')) {
        try {
          const usersRes = await pool.query(
            `SELECT id FROM users WHERE rol = ANY($1::text[]) AND activo = true`,
            [tipo_usuario]
          );
          const userIds = usersRes.rows.map(r => r.id);
          await Promise.all(userIds.map(uid =>
            sendPushToUser(uid, { titulo, mensaje, tipo, meta: {} }).catch(() => { })
          ));
        } catch (e) { /* silencioso */ }
      }
    }

    console.log(`✅ [POST] Notificación creada: ${notificacion.id}`);
    res.status(201).json({ ok: true, notificacion });

  } catch (err) {
    console.error("❌ [POST] Error:", err.message);
    res.status(500).json({ error: "Error creando notificación", details: err.message });
  }
});

/* ============================================
   🔄 ACTUALIZAR NOTIFICACIÓN
============================================ */

/**
 * PUT /notificaciones/:id/leida
 * Marca una notificación como leída por el usuario actual.
 * El frontend (Notificaciones.jsx) llama: PUT /notificaciones/:id { leida: true }
 * Este endpoint es el alias correcto — registra en notificaciones_vistas.
 *
 * FIX: el frontend usaba PUT /:id con { leida: true }, pero ese endpoint
 *      solo permite staff/admin y actualiza la notificación en sí (no la vista).
 *      Se agrega este endpoint dedicado accesible por cualquier usuario autenticado.
 */
router.put("/:id/leida", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`👁️ [LEIDA] Usuario ${userId} marca notificación ${id} como leída`);

    await pool.query(
      `INSERT INTO notificaciones_vistas
       (id, user_id, notificacion_id, vista_at)
       VALUES (gen_random_uuid(), $1, $2, NOW())
       ON CONFLICT (user_id, notificacion_id) DO NOTHING`,
      [userId, id]
    );

    console.log(`✅ [LEIDA] Registrada vista`);
    res.json({ ok: true });

  } catch (err) {
    console.error("❌ [LEIDA] Error:", err.message);
    res.status(500).json({ error: "Error marcando como leída", details: err.message });
  }
});

/**
 * PUT /notificaciones/:id
 * Actualiza una notificación existente
 * Solo: super_admin, staff
 */
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

export default router;