import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";

// Importar rutas (ajusta las rutas según tu estructura)
import authRoutes from "./routes/auth.js";
import agendaRoutes from "./routes/agenda.routes.js";
import expositoresRoutes from "./routes/expositores.js";
import dashboardRoutes from "./routes/dashboard.js";
import notificacionesRoutes from "./routes/notificaciones.js";

// Importar funciones de notificaciones
import { sendSSE } from "./routes/notificaciones.js";
import { procesarNotificacionesProgramadas } from "./cron/notificacionesCron.js";

dotenv.config();
const app = express();

// ✅ CORS configurado correctamente
app.use(cors({
  origin: true, // 🔥 PERMITE firebase, localhost, etc.
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 👇 ESTA LÍNEA FALTABA
app.options("*", cors());

app.use(express.json());

const PORT = process.env.PORT || 3000;

// 🌍 Orígenes permitidos
const allowedOrigins = [
  "https://app-cmc.web.app",
  "https://app-cmc.firebaseapp.com",
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log("🌐 Request:", req.method, req.url);
  next();
});

app.use("/api/agenda", agendaRoutes);

// ✅ Health Check (IMPORTANTE para Render)
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CMC Backend API funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    database: pool ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ==========================
// 📡 Rutas API
// ==========================
app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes); // Alias con /api

app.use("/agenda", agendaRoutes);
app.use("/api/agenda/sessions", agendaRoutes); // Alias con /api

app.use("/speakers", speakersRoutes);
app.use("/api/speakers", speakersRoutes); // Alias con /api

app.use("/expositores", expositoresRoutes);
app.use("/api/expositores", expositoresRoutes); // Alias con /api

app.use("/dashboard", dashboardRoutes);
app.use("/api/dashboard", dashboardRoutes); // Alias con /api

app.use("/notificaciones", notificacionesRoutes);
app.use("/api/notificaciones", notificacionesRoutes); // Alias con /api

// =========================================
// 🔔 Server Sent Events (SSE) para notificaciones en tiempo real
// =========================================
app.get("/events", (req, res) => {
  const origin = req.headers.origin;

  // Configurar headers SSE
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  console.log("📡 Nueva conexión SSE establecida");

  // Enviar ping cada 15 segundos para mantener conexión viva
  const pingInterval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "ping", timestamp: Date.now() })}\n\n`);
  }, 15000);

  // Limpiar al cerrar conexión
  req.on("close", () => {
    clearInterval(pingInterval);
    console.log("❌ Conexión SSE cerrada");
  });
});

// ==============================
// ⏰ CRON - Notificaciones programadas
// Ejecuta cada 60 segundos
// ==============================
if (procesarNotificacionesProgramadas) {
  setInterval(() => {
    procesarNotificacionesProgramadas();
  }, 60000); // 60 segundos

  console.log("⏲️  CRON de notificaciones programadas activo (cada 60s)");
}

// ===========================
// ⏰ CRON Alternativo - Verificación de notificaciones pendientes
// Ejecuta cada 30 segundos (backup del CRON principal)
// ===========================
setInterval(async () => {
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

    if (pendientes.rows.length > 0) {
      console.log(`⏰ Procesando ${pendientes.rows.length} notificaciones programadas`);

      for (const notif of pendientes.rows) {
        console.log(`📤 Enviando notificación #${notif.id}: ${notif.titulo}`);

        // Enviar por SSE
        if (sendSSE) {
          sendSSE({
            tipo: "NEW_NOTIFICATION",
            data: notif,
          });
        }

        // Marcar como enviada
        await pool.query(
          `UPDATE notificaciones SET enviada = true, actualizada_en = NOW() WHERE id = $1`,
          [notif.id]
        );
      }
    }
  } catch (err) {
    console.error("❌ Error en CRON de notificaciones:", err.message);
  }
}, 30000); // 30 segundos

// ❌ 404 Handler - Endpoint no encontrado
app.use((req, res) => {
  console.warn(`⚠️  404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: "Endpoint no encontrado",
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// ❌ Error Handler Global
app.use((err, req, res, next) => {
  console.error("💥 Error global:", err);
  res.status(500).json({
    error: "Error interno del servidor",
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ✅ Iniciar servidor
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 CMC Backend Server Started        ║
╠════════════════════════════════════════╣
║   Port:        ${PORT.toString().padEnd(24)}║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(24)}║
║   Database:    ${pool ? 'Connected ✅'.padEnd(24) : 'Disconnected ❌'.padEnd(24)}║
╚════════════════════════════════════════╝
  `);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔔 SSE endpoint: http://localhost:${PORT}/events`);
  console.log(`⏰ CRON jobs: ACTIVE`);
});