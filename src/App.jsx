import { Navigate, Route, Routes, BrowserRouter as Router } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { EventProvider } from "./contexts/EventContext.jsx";
import { NotificationProvider } from "./contexts/NotificationContext.jsx";

import Layout from "./Components/layout/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Agenda from "./pages/Agenda.jsx";
import Speakers from "./pages/Speakers.jsx";
import Expositores from "./pages/Expositores.jsx";
import Notificaciones from "./pages/Notificaciones.jsx";
import Perfil from "./pages/Perfil.jsx";
import StaffPanel from "./pages/StaffPanel.jsx";
import UsuariosPanel from "./pages/UsuariosPanel.jsx";
import ConfiguracionPanel from "./pages/ConfiguracionPanel.jsx";
import ExcelImport from "./pages/ExcelImport.jsx";
import QR from "./pages/QR.jsx";
import MisRegistros from "./pages/MisRegistros.jsx";
import Networking from "./pages/Networking.jsx";
import MiMarca from "./pages/MiMarca.jsx";
import MiSesion from "./pages/MiSesion.jsx";
import NotFound from "./pages/notfound-page.jsx";

// ============================================================
// PrivateRoute — guard genérico por rol
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
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// ============================================================
// PermRoute — guard basado en un permiso específico de sedeHelper
// Redirige a /dashboard si el permiso es false
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

  // Esperar a que los permisos estén listos
  if (!permisos) return null;

  if (!permisos[permiso]) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// ============================================================
// AppWithEvent — rutas principales
// ============================================================
function AppWithEvent() {
  const { user } = useAuth();

  return (
    <EventProvider user={user}>
      <Router>
        <Routes>
          {/* Login — sin Layout */}
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas — dentro del Layout */}
          <Route
            path="/"
            element={
              <PrivateRoute roles={["asistente", "staff", "speaker", "expositor", "super_admin"]}>
                <Layout />
              </PrivateRoute>
            }
          >
            {/* Dashboard — todos los roles autenticados */}
            <Route path="dashboard" element={<Dashboard />} />

            {/* Agenda — solo roles con verAgenda=true (sedeHelper) */}
            <Route
              path="agenda"
              element={
                <PermRoute permiso="verAgenda">
                  <Agenda />
                </PermRoute>
              }
            />

            {/* Speakers — solo roles con verSpeakers=true */}
            <Route
              path="speakers"
              element={
                <PermRoute permiso="verSpeakers">
                  <Speakers />
                </PermRoute>
              }
            />

            {/* Expositores — solo roles con verExpositores=true */}
            <Route
              path="expositores"
              element={
                <PermRoute permiso="verExpositores">
                  <Expositores />
                </PermRoute>
              }
            />

            {/* Networking — solo roles con verNetworking=true */}
            <Route
              path="networking"
              element={
                <PermRoute permiso="verNetworking">
                  <Networking />
                </PermRoute>
              }
            />

            {/* Mis Registros — solo roles con verMisRegistros=true */}
            <Route
              path="mis-registros"
              element={
                <PermRoute permiso="verMisRegistros">
                  <MisRegistros />
                </PermRoute>
              }
            />

            {/* QR — solo roles con verQR=true */}
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

            {/* Perfil — todos */}
            <Route path="perfil" element={<Perfil />} />

            {/* Notificaciones — todos */}
            <Route path="notificaciones" element={<Notificaciones />} />

            {/* Staff Panel — staff + super_admin */}
            <Route
              path="staff"
              element={
                <PermRoute permiso="verStaffPanel">
                  <StaffPanel />
                </PermRoute>
              }
            />

            {/* Usuarios Panel — staff (lectura) + super_admin (CRUD) */}
            <Route
              path="usuarios"
              element={
                <PrivateRoute roles={["staff", "super_admin"]}>
                  <UsuariosPanel />
                </PrivateRoute>
              }
            />

            {/* Configuración — super_admin únicamente */}
            <Route
              path="configuracion"
              element={
                <PrivateRoute roles={["super_admin"]}>
                  <ConfiguracionPanel />
                </PrivateRoute>
              }
            />

            {/* Excel Import — super_admin únicamente */}
            <Route
              path="admin/import"
              element={
                <PrivateRoute roles={["super_admin"]}>
                  <ExcelImport />
                </PrivateRoute>
              }
            />
          </Route>

          {/* 404 */}
          <Route path="/404" element={<NotFound />} />

          {/* Catch-all → dashboard */}
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