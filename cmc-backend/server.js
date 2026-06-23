import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import pool from "./db.js";

// Rutas
import authRoutes from "./routes/auth.js";
import agendaRoutes from "./routes/agenda.js";
import speakersRoutes from "./routes/speakers.routes.js";
import expositoresRoutes from "./routes/expositores.routes.js";
import notificacionesRoutes from "./routes/notificaciones.js";
import configRoutes from "./routes/config.js";
import usersRoutes from "./routes/users.routes.js";
import statsRoutes from "./routes/stats.js";
import uploadRoutes from "./routes/upload.js";
import staffRoutes from "./routes/staff.js";
import { authRequired } from "./utils/authMiddleware.js";
import misRegistrosRoutes from "./routes/mis-registros.js";
import networkingRoutes from "./routes/networking.js";
import networkingExpoRoutes from "./routes/networking-expo.js";
import miMarcaRoutes from "./routes/mi-marca.js";
import miSesionRoutes from "./routes/mi-sesion.js";
import encuestasRoutes from "./routes/encuestas.js";
import brandingRoutes from "./routes/branding.js";
import scanRoutes from "./routes/scan.js";
import mapaRoutes from "./routes/mapa.js";
import eventosRoutes from "./routes/eventos.routes.js";
import pushRoutes from "./routes/push.js";
import excelRoutes from "./routes/excel.js";
import { eliminarUsuarioDefinitivo } from "./utils/eliminarUsuario.js";

import { sendSSE } from "./routes/notificaciones.js";
import { procesarNotificacionesProgramadas } from "./cron/notificacionesCron.js";


const app = express();
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
    allowedHeaders: ["Content-Type", "Authorization", "x-service-token"],
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
app.use("/api/auth", authRoutes);
app.use("/api/agenda", agendaRoutes);
app.use("/api/speakers", speakersRoutes);
// FIX: los 4 endpoints de expositores (estado, posicion, visita,
// mapa-config) vivían inline aquí Y en expositores.routes.js.
// Como esta sección se ejecutaba primero, las versiones de
// expositores.routes.js nunca se alcanzaban — código duplicado
// e inalcanzable. Se elimina la copia inline; expositores.routes.js
// ya tiene la misma lógica (verificada) y ahora sí se ejecuta.
app.use("/api/expositores", expositoresRoutes);
app.use("/api/notificaciones", notificacionesRoutes);
app.use("/api/config", configRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/mis-registros", misRegistrosRoutes);
app.use("/api/networking", networkingRoutes);
app.use("/api/networking-expo", networkingExpoRoutes);
app.use("/api/mi-marca", miMarcaRoutes);
app.use("/api/mi-sesion", miSesionRoutes);
app.use("/api/encuestas", encuestasRoutes);
app.use("/api/branding", brandingRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/mapa", mapaRoutes);
app.use("/api/eventos", eventosRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/excel", excelRoutes);

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

// ════════════════════════════════════════════════════════════
// CRON: Limpieza automática de papelera cada 24 horas
// Elimina permanentemente usuarios con activo=false por >30 días
//
// FIX: antes hacía DELETE FROM users directo, sin desvincular las
// tablas relacionadas (expositores, entradas, encuestas, etc.) —
// fallaba con foreign key constraint igual que el botón manual.
// Ahora usa la misma función compartida que /users/:id/permanente,
// para que ambos caminos de borrado nunca vuelvan a divergir.
// ════════════════════════════════════════════════════════════
const limpiarPapelera = async () => {
  try {
    const candidatos = await pool.query(`
      SELECT id, email FROM users
      WHERE activo = false
        AND COALESCE(fecha_eliminado, created_at) < NOW() - INTERVAL '30 days'
    `);

    if (candidatos.rows.length === 0) return;

    let eliminados = 0;
    let fallidos = 0;

    for (const candidato of candidatos.rows) {
      const resultado = await eliminarUsuarioDefinitivo(pool, candidato.id);
      if (resultado.ok) {
        eliminados++;
      } else {
        fallidos++;
        console.error(`[Cron] No se pudo eliminar ${candidato.email}: ${resultado.error}`);
      }
    }

    if (eliminados > 0) {
      console.log(`[Cron] 🗑️ Papelera: ${eliminados} usuario(s) eliminados permanentemente`);
    }
    if (fallidos > 0) {
      console.log(`[Cron] ⚠️ Papelera: ${fallidos} usuario(s) no se pudieron eliminar`);
    }
  } catch (err) {
    console.error('[Cron] Error en limpieza de papelera:', err.message);
  }
};

// Ejecutar al iniciar y luego cada 24 horas
limpiarPapelera();
setInterval(limpiarPapelera, 24 * 60 * 60 * 1000);

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
  console.log("  /api/networking /api/mi-marca");
  console.log("  /api/mi-sesion /api/mis-registros");
});