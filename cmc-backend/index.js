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

// 🌍 Orígenes permitidos
const allowedOrigins = [
  "https://app-cmc.web.app",     // Frontend en Firebase Hosting
  "https://cmc-app.onrender.com", // Backend Render (por si Render llama a otro servicio)
  "http://localhost:3000"         // Desarrollo local
];

// Middleware CORS principal
app.use(cors({
  origin: [
    "https://app-cmc.web.app",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// =========================================
// 🔔 Server Sent Events (SSE) para notificaciones
// =========================================
app.get("/events", (req, res) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", "https://app-cmc.web.app");
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

// ==========================
// Rutas API
// ==========================
app.use("/auth", authRoutes);
app.use("/agenda", agendaRoutes);
app.use("/speakers", speakersRoutes);
app.use("/expositores", expositoresRoutes);
app.use("/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 CMC Backend corriendo en puerto ${PORT}`)
);
