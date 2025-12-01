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

app.use(
  cors({
    origin: ["http://localhost:3000", "https://app-cmc.web.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ❌ ELIMINAR ESTO COMPLETAMENTE
// pool.connect()

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
