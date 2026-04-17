import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";

// Rutas
import authRoutes          from "./routes/auth.js";
import agendaRoutes        from "./routes/agenda.js";
import speakersRoutes      from "./routes/speakers.routes.js";
import expositoresRoutes   from "./routes/expositores.routes.js";
import dashboardRoutes     from "./routes/dashboard.js";
import notificacionesRoutes from "./routes/notificaciones.js";
import configRoutes        from "./routes/config.js";
import usersRoutes         from "./routes/users.routes.js";
import statsRoutes         from "./routes/stats.js";
import uploadRoutes        from "./routes/upload.js";
import staffRoutes         from "./routes/staff.js";
import { authRequired }    from "./utils/authMiddleware.js";
import qrRoutes            from "./routes/qr.js";
import misRegistrosRoutes  from "./routes/mis-registros.js";
import networkingRoutes    from "./routes/networking.js";
import miMarcaRoutes       from "./routes/mi-marca.js";
import miSesionRoutes      from "./routes/mi-sesion.js";
import encuestasRoutes     from "./routes/encuestas.js";
import brandingRoutes      from "./routes/branding.js";
import scanRoutes          from "./routes/scan.js";
import mapaRoutes          from "./routes/mapa.js";
import eventosRoutes       from "./routes/eventos.routes.js";

import { sendSSE }                          from "./routes/notificaciones.js";
import { procesarNotificacionesProgramadas } from "./cron/notificacionesCron.js";

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// CORS
// ============================================================
const allowedOrigins = [
  "https://app-cmc.web.app",
  "https://app-cmc.firebaseapp.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`❌ Origen rechazado: ${origin}`);
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"],
  })
);

app.options("*", cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================================
// Health checks
// ============================================================
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "CMC Backend API funcionando",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    database: pool ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Rutas API
// ============================================================
app.use("/api/auth",           authRoutes);
app.use("/api/agenda",         agendaRoutes);
app.use("/api/speakers",       speakersRoutes);
// ── Endpoints críticos expositores (inline para garantizar deploy) ──
app.patch("/api/expositores/:id/estado", authRequired, async (req, res) => {
  try {
    const rol = req.user?.rol;
    if (!["super_admin","staff"].includes(rol))
      return res.status(403).json({ error: "Sin permisos" });
    const { id } = req.params;
    const { estado_stand } = req.body;
    const valid = ["libre","solicitado","ocupado","no_disponible"];
    if (!valid.includes(estado_stand))
      return res.status(400).json({ error: `Estado inválido. Usa: ${valid.join(", ")}` });
    const r = await pool.query(
      `UPDATE expositores SET estado_stand=$1 WHERE id=$2 RETURNING id, nombre, estado_stand`,
      [estado_stand, id]
    );
    if (!r.rows.length) return res.status(404).json({ error: "No encontrado" });
    console.log(`[Expo] Estado actualizado: ${r.rows[0].nombre} → ${estado_stand}`);
    res.json({ ok: true, expositor: r.rows[0] });
  } catch (err) {
    console.error("[Expo] Error PATCH estado:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/expositores/:id/posicion", authRequired, async (req, res) => {
  try {
    const rol = req.user?.rol;
    if (!["super_admin","staff"].includes(rol))
      return res.status(403).json({ error: "Sin permisos" });
    const { id } = req.params;
    const { grid_col, grid_fila, ancho_celdas, alto_celdas } = req.body;
    const r = await pool.query(
      `UPDATE expositores SET
        grid_col     = $1,
        grid_fila    = $2,
        ancho_celdas = COALESCE($3, 1),
        alto_celdas  = COALESCE($4, 1)
       WHERE id = $5
       RETURNING id, nombre, grid_col, grid_fila, ancho_celdas, alto_celdas`,
      [
        grid_col  != null ? parseInt(grid_col)  : null,
        grid_fila != null ? parseInt(grid_fila) : null,
        ancho_celdas ? parseInt(ancho_celdas) : null,
        alto_celdas  ? parseInt(alto_celdas)  : null,
        id,
      ]
    );
    if (!r.rows.length) return res.status(404).json({ error: "No encontrado" });
    console.log(`[Expo] Posición actualizada: ${r.rows[0].nombre} → (${grid_col},${grid_fila})`);
    res.json({ ok: true, expositor: r.rows[0] });
  } catch (err) {
    console.error("[Expo] Error PATCH posicion:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/expositores/:id/visita", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo = "visita" } = req.body;
    await pool.query(
      `INSERT INTO expositores_metrica (expositor_id, user_id, tipo) VALUES ($1,$2,$3)`,
      [id, req.user.id, tipo]
    ).catch(() => {});
    res.json({ ok: true, message: `${tipo} registrado` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/expositores/mapa-config/:sede", authRequired, async (req, res) => {
  try {
    if (!["super_admin","staff"].includes(req.user?.rol))
      return res.status(403).json({ error: "Sin permisos" });
    const { sede } = req.params;
    const { edicion = 2026, grid_cols, grid_filas } = req.body;
    await pool.query(
      `INSERT INTO mapa_config (sede, edicion, grid_cols, grid_filas)
       VALUES (LOWER($1), $2, $3, $4)
       ON CONFLICT (sede, edicion)
       DO UPDATE SET grid_cols=$3, grid_filas=$4, updated_at=NOW()`,
      [sede, parseInt(edicion), parseInt(grid_cols)||46, parseInt(grid_filas)||22]
    );
    console.log(`[MapaConfig] Guardado: ${sede} → ${grid_cols}×${grid_filas}`);
    res.json({ ok: true, config: { sede, edicion, grid_cols, grid_filas } });
  } catch (err) {
    console.error("[MapaConfig] Error PUT:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use("/api/expositores",    expositoresRoutes);
app.use("/api/dashboard",      dashboardRoutes);
app.use("/api/notificaciones", notificacionesRoutes);
app.use("/api/config",         configRoutes);
app.use("/api/users",          usersRoutes);
app.use("/api/stats",          statsRoutes);
app.use("/api/upload",         uploadRoutes);
app.use("/api/staff",          staffRoutes);
app.use("/api/qr",             qrRoutes);
app.use("/api/mis-registros",  misRegistrosRoutes);
app.use("/api/networking",     networkingRoutes);
app.use("/api/mi-marca",       miMarcaRoutes);
app.use("/api/mi-sesion",      miSesionRoutes);
app.use("/api/encuestas",      encuestasRoutes);
app.use("/api/branding",       brandingRoutes);
app.use("/api/scan",           scanRoutes);
app.use("/api/mapa",           mapaRoutes);
app.use("/api/eventos",        eventosRoutes);

// ============================================================
// CRON — Notificaciones programadas (cada 30 segundos)
// ============================================================
setInterval(async () => {
  // 1. Ejecutar el cron principal si está disponible
  if (procesarNotificacionesProgramadas) {
    procesarNotificacionesProgramadas();
  }

  // 2. Procesar notificaciones pendientes directamente desde la DB
  try {
    const pendientes = await pool.query(`
      SELECT *
      FROM notificaciones
      WHERE activa = true
        AND programada_para IS NOT NULL
        AND enviada = false
        AND programada_para <= NOW()
      LIMIT 10
    `);

    if (pendientes.rows.length === 0) return;

    console.log(`⏰ Procesando ${pendientes.rows.length} notificaciones programadas`);

    for (const notif of pendientes.rows) {
      if (sendSSE) {
        sendSSE({ tipo: "NEW_NOTIFICATION", data: notif });
      }

      await pool.query(
        `UPDATE notificaciones SET enviada = true, actualizada_en = NOW() WHERE id = $1`,
        [notif.id]
      );
    }
  } catch (err) {
    console.error("❌ Error en CRON de notificaciones:", err.message);
  }
}, 30000);

console.log("⏲️  CRON de notificaciones activo (cada 30s)");

// ============================================================
// 404 y error global
// ============================================================
app.use((req, res) => {
  console.warn(`⚠️  404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: "Endpoint no encontrado",
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  console.error("💥 Error global:", err);
  res.status(500).json({
    error: "Error interno del servidor",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ============================================================
// Arranque
// ============================================================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 CMC Backend Server Started        ║
╠════════════════════════════════════════╣
║   Port:        ${PORT.toString().padEnd(24)}║
║   Environment: ${(process.env.NODE_ENV || "development").padEnd(24)}║
╚════════════════════════════════════════╝
  `);
  console.log("📋 Rutas disponibles:");
  console.log("  /api/auth      /api/agenda     /api/speakers");
  console.log("  /api/users     /api/stats      /api/staff");
  console.log("  /api/qr        /api/networking /api/mi-marca");
  console.log("  /api/mi-sesion /api/mis-registros");
});