import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { EventProvider } from "./contexts/EventContext.jsx";
import { NotificationProvider } from "./contexts/NotificationContext.jsx";

// Layout
import Layout from "./Components/layout/Layout.jsx";

// Páginas públicas
import Login from "./pages/Login.jsx";

// Páginas comunes
import Dashboard from "./pages/Dashboard.jsx";
import Agenda from "./pages/Agenda.jsx";
import Speakers from "./pages/Speakers.jsx";
import Expositores from "./pages/Expositores.jsx";
import Notificaciones from "./pages/Notificaciones.jsx";
import Perfil from "./pages/Perfil.jsx";
import Networking from "./pages/Networking.jsx";

// Páginas de asistente
import MisRegistros from "./pages/MisRegistros.jsx";
import QR from "./pages/QR.jsx";

// Páginas de rol especial
import MiMarca from "./pages/MiMarca.jsx";
import MiSesion from "./pages/MiSesion.jsx";
import Encuestas      from "./pages/Encuestas.jsx";
import BrandingPanel  from "./pages/BrandingPanel.jsx";
import Galeria        from "./pages/Galeria.jsx";
import MapaExpo       from "./pages/MapaExpo.jsx";
//import Scanner        from "./pages/Scanner.jsx";

// Páginas de staff / admin
import StaffPanel from "./pages/StaffPanel.jsx";
import UsuariosPanel from "./pages/UsuariosPanel.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import ConfiguracionPanel from "./pages/ConfiguracionPanel.jsx";
import ExcelImport from "./pages/ExcelImport.jsx";

// 404
import NotFound from "./pages/notfound-page.jsx";

// ============================================================
// TODOS LOS ROLES VÁLIDOS DEL SISTEMA
// FIX: La versión anterior solo incluía 'asistente' (genérico),
//      bloqueando a los 4 subtipos que la DB guarda con nombres
//      compuestos como 'asistente_general', 'asistente_curso', etc.
// ============================================================
const TODOS_LOS_ROLES = [
  'asistente_general',
  'asistente_curso',
  'asistente_sesiones',
  'asistente_combo',
  'expositor',
  'speaker',
  'staff',
  'super_admin',
];

// ============================================================
// PrivateRoute — guard por rol exacto
// ============================================================
function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.rol)) {
    console.warn(`⛔ Acceso denegado: rol "${user.rol}" no está en [${roles.join(', ')}]`);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// ============================================================
// PermRoute — guard por permiso específico de sedeHelper
// ============================================================
function PermRoute({ children, permiso }) {
  const { user, permisos, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Esperar a que sedeHelper construya los permisos
  if (!permisos) return null;

  if (!permisos[permiso]) {
    console.warn(`⛔ PermRoute: permiso "${permiso}" es false para rol "${user.rol}"`);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// ============================================================
// AppWithEvent — árbol de rutas
// ============================================================
function AppWithEvent() {
  const { user } = useAuth();

  return (
    <EventProvider user={user}>
      <Router>
        <Routes>

          {/* ── Login — sin layout ── */}
          <Route path="/login" element={<Login />} />

          {/* ── Rutas protegidas — dentro del Layout ── */}
          <Route
            path="/"
            element={
              // FIX: incluir los 8 roles reales (antes solo 'asistente' genérico)
              <PrivateRoute roles={TODOS_LOS_ROLES}>
                <Layout />
              </PrivateRoute>
            }
          >

            {/* Dashboard — todos los roles */}
            <Route path="dashboard" element={<Dashboard />} />

            {/* Perfil — todos los roles */}
            <Route path="perfil" element={<Perfil />} />

            {/* Notificaciones — todos los roles */}
            <Route path="notificaciones" element={<Notificaciones />} />

            {/* Agenda — solo quienes tienen verAgenda=true */}
            <Route
              path="agenda"
              element={
                <PermRoute permiso="verAgenda">
                  <Agenda />
                </PermRoute>
              }
            />

            {/* Speakers — solo quienes tienen verSpeakers=true */}
            <Route
              path="speakers"
              element={
                <PermRoute permiso="verSpeakers">
                  <Speakers />
                </PermRoute>
              }
            />

            {/* Expositores — solo quienes tienen verExpositores=true */}
            <Route
              path="expositores"
              element={
                <PermRoute permiso="verExpositores">
                  <Expositores />
                </PermRoute>
              }
            />

            {/* Mapa Expo — plano del salón de exposición */}
            <Route
              path="mapa-expo"
              element={
                <PermRoute permiso="verMapa">
                  <MapaExpo />
                </PermRoute>
              }
            />

            {/* Networking — solo quienes tienen verNetworking=true */}
            <Route
              path="networking"
              element={
                <PermRoute permiso="verNetworking">
                  <Networking />
                </PermRoute>
              }
            />

            {/* Mis Registros — asistentes, speaker, expositor */}
            <Route
              path="mis-registros"
              element={
                <PermRoute permiso="verMisRegistros">
                  <MisRegistros />
                </PermRoute>
              }
            />

            {/* QR — asistentes y speaker */}
            <Route
              path="qr"
              element={
                <PermRoute permiso="verQR">
                  <QR />
                </PermRoute>
              }
            />

            {/* Mi Marca — solo expositor */}
            <Route
              path="mi-marca"
              element={
                <PermRoute permiso="verMiMarca">
                  <MiMarca />
                </PermRoute>
              }
            />

            {/* Mi Sesión — solo speaker */}
            <Route
              path="mi-sesion"
              element={
                <PermRoute permiso="verMiSesion">
                  <MiSesion />
                </PermRoute>
              }
            />

            {/* Scanner QR — staff y super_admin */}
            <Route
              path="scanner"
              element={
                <PrivateRoute roles={['staff', 'super_admin']}>
                  <Scanner />
                </PrivateRoute>
              }
            />

            {/* Galería — todos los roles autenticados */}
            <Route
              path="galeria"
              element={
                <PermRoute permiso="verGaleria">
                  <Galeria />
                </PermRoute>
              }
            />

            {/* Encuestas — todos los roles autenticados */}
            <Route
              path="encuestas"
              element={
                <PermRoute permiso="verEncuestas">
                  <Encuestas />
                </PermRoute>
              }
            />

            {/* Staff Panel — staff + super_admin */}
            <Route
              path="staff"
              element={
                <PermRoute permiso="verStaffPanel">
                  <StaffPanel />
                </PermRoute>
              }
            />

            {/* Usuarios — staff (lectura) y super_admin (CRUD) */}
            <Route
              path="usuarios"
              element={
                <PrivateRoute roles={['staff', 'super_admin']}>
                  <UsuariosPanel />
                </PrivateRoute>
              }
            />

            {/* Admin Panel — super_admin únicamente */}
            {/* FIX: ruta faltante — AdminPanel.jsx existía pero sin Route */}
            <Route
              path="admin"
              element={
                <PrivateRoute roles={['super_admin']}>
                  <AdminPanel />
                </PrivateRoute>
              }
            />

            {/* Branding — super_admin únicamente */}
            <Route
              path="branding"
              element={
                <PrivateRoute roles={['super_admin']}>
                  <BrandingPanel />
                </PrivateRoute>
              }
            />

            {/* Configuración — super_admin únicamente */}
            <Route
              path="configuracion"
              element={
                <PrivateRoute roles={['super_admin']}>
                  <ConfiguracionPanel />
                </PrivateRoute>
              }
            />

            {/* Excel Import — super_admin únicamente */}
            <Route
              path="admin/import"
              element={
                <PrivateRoute roles={['super_admin']}>
                  <ExcelImport />
                </PrivateRoute>
              }
            />

          </Route>

          {/* ── 404 ── */}
          <Route path="/404" element={<NotFound />} />

          {/* ── Catch-all → dashboard ── */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </Router>
    </EventProvider>
  );
}

// ============================================================
// App root
// ============================================================
export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppWithEvent />
      </NotificationProvider>
    </AuthProvider>
  );
}