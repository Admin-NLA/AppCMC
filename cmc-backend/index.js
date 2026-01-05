import express from "express";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import agendaRoutes from "./routes/agenda.js";

import { sendSSE } from "./routes/notificaciones.js";
import pool from "./db.js";
import speakersRoutes from "./routes/speakers.js";
import expositoresRoutes from "./routes/expositores.js";
import dashboardRoutes from "./routes/dashboard.js";
import notificacionesRoutes from "./routes/notificaciones.js";
import { procesarNotificacionesProgramadas } from "./cron/notificacionesCron.js";

const app = express();

// 🌍 Orígenes permitidos
const allowedOrigins = [
  "https://app-cmc.web.app",     // Frontend en Hosting
 // "https://cmc-app.onrender.com", // Backend Render (por si Render llama a otro servicio)
  "http://localhost:3000"         // Desarrollo local
];

// Middleware CORS principal
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      callback(null, false);
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================
// Rutas API
// ==========================
app.use("/auth", authRoutes);
app.use("/agenda", agendaRoutes);
app.use("/speakers", speakersRoutes);
app.use("/expositores", expositoresRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/notificaciones", notificacionesRoutes);


// =========================================
// 🔔 Server Sent Events (SSE) para notificaciones
// =========================================
app.get("/events", (req, res) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin); // <-- dinámico
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // ping cada 15s
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ ping: Date.now() })}\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(interval);
  });
});

// ==============================
// CRON cada 60 segundos
// ==============================
setInterval(() => {
  procesarNotificacionesProgramadas();
}, 60 * 1000);

console.log("⏲️  CRON de notificaciones programadas activo");

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("DB URL:", process.env.DATABASE_URL);
  console.log(`🚀 CMC Backend corriendo en puerto ${PORT}`);
});

// ===========================
// 🕒 CRON — Notificaciones programadas
// Corre cada 30 segundos
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
    `);

    if (pendientes.rows.length > 0) {
      pendientes.rows.forEach(async (n) => {
        console.log("⏰ Enviando notificación programada:", n.id);

        // Enviar por SSE
        sendSSE({
          tipo: "NEW_NOTIFICATION",
          data: n,
        });

        // Marcar como enviada
        await pool.query(
          `UPDATE notificaciones SET enviada = true WHERE id = $1`,
          [n.id]
        );
      });
    }
  } catch (err) {
    console.error("Error en CRON de notificaciones:", err);
  }
}, 30000); // 30 segundos