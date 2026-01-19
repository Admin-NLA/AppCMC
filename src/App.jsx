import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { NotificationProvider } from "./contexts/NotificationContext.jsx";

// Layout global
import Layout from "./Components/layout/Layout.jsx";

// Páginas
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Agenda from "./pages/Agenda.jsx";
import Speakers from "./pages/Speakers.jsx";
import Expositores from "./pages/Expositores.jsx";
import Notificaciones from "./pages/Notificaciones.jsx";
import Perfil from "./pages/Perfil.jsx";
import StaffPanel from "./pages/StaffPanel.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import NotFound from "./pages/notfound-page.jsx";

// 🔒 Protección de rutas
function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();

  // 1️⃣ Mientras el AuthContext todavía está validando el token
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        Cargando sesión...
      </div>
    );
  }

  // 2️⃣ Ya terminó loading -> si no hay usuario, va al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3️⃣ Validar roles
  if (roles && !roles.includes(user.rol)) {
    console.warn("⛔ Acceso denegado para rol:", user?.rol);
    return <Navigate to="/dashboard" replace />;
  }

  // 4️⃣ Todo OK → renderiza la ruta
  return children;
}
// termina Proteccion de rutas

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
      <Router>
        <Routes>

          {/* ---------- LOGIN NO USA LAYOUT ---------- */}
          <Route path="/login" element={<Login />} />

          {/* ---------- TODAS LAS RUTAS PROTEGIDAS VAN DENTRO DEL LAYOUT ---------- */}
          <Route
            path="/"
            element={
              <PrivateRoute roles={['asistente', 'staff', 'speaker', 'expositor', 'super_admin']}>
                <Layout />
              </PrivateRoute>
            }
          >

            {/* Dashboard */}
            <Route
              path="dashboard"
              element={<Dashboard />}
            />

            {/* Agenda */}
            <Route
              path="agenda"
              element={<Agenda />}
            />

            {/* Speakers */}
            <Route
              path="speakers"
              element={<Speakers />}
            />

            {/* Expositores */}
            <Route
              path="expositores"
              element={<Expositores />}
            />

            {/* Notificaciones */}
            <Route
              path="notificaciones"
              element={<Notificaciones />}
            />

            {/* Perfil */}
            <Route
              path="perfil"
              element={<Perfil />}
            />

            {/* Staff Panel */}
            <Route
              path="staff"
              element={
                <PrivateRoute roles={['staff', 'super_admin']}>
                  <StaffPanel />
                </PrivateRoute>
              }
            />

            {/* Admin Panel */}
            <Route
              path="admin"
              element={
                <PrivateRoute roles={['super_admin']}>
                  <AdminPanel />
                </PrivateRoute>
              }
            />

          </Route>

          {/* ---------- NOT FOUND ---------- */}
          <Route path="/404" element={<NotFound />} />

          {/* ---------- DEFAULT ---------- */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}
