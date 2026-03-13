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
import qrRoutes            from "./routes/qr.js";
import misRegistrosRoutes  from "./routes/mis-registros.js";
import networkingRoutes    from "./routes/networking.js";
import miMarcaRoutes       from "./routes/mi-marca.js";
import miSesionRoutes      from "./routes/mi-sesion.js";
import encuestasRoutes     from "./routes/encuestas.js";
import brandingRoutes      from "./routes/branding.js";
import galeriaRoutes       from "./routes/galeria.js";

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
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"],
  })
);

app.options("*", cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use("/api/expositores",    expositoresRoutes);
app.use("/api/dashboard",      dashboardRoutes);
app.use("/api/notificaciones", notificacionesRoutes);
app.use("/api/users",          usersRoutes);
app.use("/api/stats",          statsRoutes);
app.use("/api/upload",         uploadRoutes);
app.use("/api/staff",          staffRoutes);
app.use("/api/qr",             qrRoutes);
app.use("/api/mis-registros",  misRegistrosRoutes);
app.use("/api/networking",     networkingRoutes);
app.use("/api/mi-marca",       miMarcaRoutes);
app.use("/api/mi-sesion",      miSesionRoutes);
app.use("/api/branding",       brandingRoutes);
app.use("/api/galeria",        galeriaRoutes);
app.use("/api/encuestas",      encuestasRoutes);
app.use("/api/config",         configRoutes);

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