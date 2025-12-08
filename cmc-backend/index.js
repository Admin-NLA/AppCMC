import express from "express";
import cors from "cors";
import pool from "./db.js";
import authRoutes from "./routes/auth.js";
import agendaRoutes from "./routes/agenda.js";
import speakersRoutes from "./routes/speakers.js";
import expositoresRoutes from "./routes/expositores.js";
import dashboardRoutes from "./routes/dashboard.js";

import "dotenv/config";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
  "http://localhost:3000",
  "https://app-cmc.web.app",
  "https://cmc-app.onrender.com"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS bloqueado: " + origin));
    }
  },
  credentials: true,
}));

// =========================================
// 🔔 Server Sent Events (SSE) para notificaciones
// =========================================
app.get("/events", (req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGINS.split(",")[0]);
  res.flushHeaders();

  // Enviar ping cada 15 segundos para mantener viva la conexión
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ ping: Date.now() })}\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(interval);
  });
});

// Rutas
app.use("/auth", authRoutes);
app.use("/agenda", agendaRoutes);
app.use("/speakers", speakersRoutes);
app.use("/expositores", expositoresRoutes);
app.use("/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 CMC Backend corriendo en puerto ${PORT}`)
);
