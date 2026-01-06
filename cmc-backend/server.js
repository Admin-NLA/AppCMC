import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/auth.routes.js';
import agendaRoutes from './src/routes/agenda.routes.js';
import speakersRoutes from './src/routes/speakers.routes.js';
import expositoresRoutes from './src/routes/expositores.routes.js';
import notificacionesRoutes from './src/routes/notificaciones.routes.js';
import adminRoutes from './src/routes/admin.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CORS - Permitir tu dominio de Firebase
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://app-cmc.web.app',
    'https://app-cmc.firebaseapp.com'
  ],
  credentials: true
}));

app.use(express.json());

// ✅ Health Check (IMPORTANTE para Render)
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CMC Backend API',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    database: 'connected',
    wordpress: 'connected'
  });
});

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/speakers', speakersRoutes);
app.use('/api/expositores', expositoresRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint no encontrado',
    path: req.path
  });
});

app.listen(PORT, () => {
  console.log(`🚀 CMC Backend corriendo en puerto ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});