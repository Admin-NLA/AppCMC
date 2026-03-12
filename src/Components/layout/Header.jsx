import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  LogOut, User, Menu, X, Map, Network, Calendar, Layers, Users,
  Scan, Settings, FileText, Award, Bell, LayoutDashboard, QrCode
} from "lucide-react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

// Mismo mapeo que Layout.jsx — fuente única de verdad
const MENU_MAP = {
  "Dashboard":          { to: "/dashboard",     icon: <LayoutDashboard size={16} /> },
  "Agenda":             { to: "/agenda",         icon: <Calendar size={16} /> },
  "Agenda (D1-D2)":    { to: "/agenda",         icon: <Calendar size={16} /> },
  "Agenda (D3-D4)":    { to: "/agenda",         icon: <Calendar size={16} /> },
  "Agenda (D1-4)":     { to: "/agenda",         icon: <Calendar size={16} /> },
  "Agenda (lectura)":  { to: "/agenda",         icon: <Calendar size={16} /> },
  "Agenda (ver)":      { to: "/agenda",         icon: <Calendar size={16} /> },
  "Mapa Expo":         { to: "/mapa-expo",      icon: <Map size={16} /> },
  "Expositores":       { to: "/expositores",    icon: <Layers size={16} /> },
  "Expositores (ver)": { to: "/expositores",    icon: <Layers size={16} /> },
  "Speakers":          { to: "/speakers",       icon: <Users size={16} /> },
  "Speakers (ver)":    { to: "/speakers",       icon: <Users size={16} /> },
  "Networking":        { to: "/networking",     icon: <Network size={16} /> },
  "Perfil":            { to: "/perfil",         icon: <User size={16} /> },
  "Mi Perfil":         { to: "/perfil",         icon: <User size={16} /> },
  "Mi Sesión":         { to: "/mi-sesion",      icon: <Award size={16} /> },
  "Mi Marca":          { to: "/mi-marca",       icon: <Layers size={16} /> },
  "Mi QR":             { to: "/qr",             icon: <QrCode size={16} /> },
  "QR":                { to: "/qr",             icon: <QrCode size={16} /> },
  "Mis Registros":     { to: "/mis-registros",  icon: <FileText size={16} /> },
  "Mis Cursos":        { to: "/mis-cursos",     icon: <Calendar size={16} /> },
  "Notificaciones":    { to: "/notificaciones", icon: <Bell size={16} /> },
  "Staff Panel":       { to: "/staff",          icon: <Scan size={16} /> },
  "Usuarios":          { to: "/usuarios",       icon: <Users size={16} /> },
  "Usuarios (ver)":    { to: "/usuarios",       icon: <Users size={16} /> },
  "Admin Panel":       { to: "/admin-panel",  icon: <Settings size={16} /> },
  "Configuración":     { to: "/configuracion",  icon: <Settings size={16} /> },
  "Excel Import":      { to: "/admin/import",   icon: <FileText size={16} /> },
};

export default function Header() {
  const { userProfile, logout, permisos } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "¿Cerrar sesión?",
      text: "Tu sesión se cerrará y deberás iniciar nuevamente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, salir",
      cancelButtonText: "Cancelar",
      background: "#ffffff",
      customClass: { title: "text-gray-800", popup: "rounded-2xl shadow-lg" },
    });

    if (!result.isConfirmed) return;

    try {
      await logout();
      localStorage.clear();
      sessionStorage.clear();

      await Swal.fire({
        icon: "success",
        title: "Sesión cerrada correctamente 👋",
        showConfirmButton: false,
        timer: 1500,
        background: "#ffffff",
      });

      navigate("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      Swal.fire({
        icon: "error",
        title: "Error al cerrar sesión",
        text: "Intenta nuevamente.",
        confirmButtonColor: "#2563eb",
      });
    }
  };

  // Construir menú móvil desde permisos.menuItems
  const mobileMenu = permisos
    ? permisos.menuItems
        .map((label) => ({ label, ...MENU_MAP[label] }))
        .filter((item) => item.to)
    : [];

  return (
    <header className="bg-blue-600 text-white shadow-md sticky top-0 z-50">
      <div className="px-4 md:px-6 py-3">
        <div className="flex justify-between items-center">

          {/* Logo */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <img
              src="/icon-192.png"
              alt="CMC Logo"
              className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white p-0.5"
              onError={(e) => (e.target.style.display = "none")}
            />
            <div className="hidden sm:block">
              <h1 className="text-sm md:text-lg font-bold leading-tight">CMC LATAM APP</h1>
              <p className="text-xs text-blue-100">Gestión del Evento</p>
            </div>
          </div>

          {/* Desktop — perfil + logout */}
          <div className="hidden md:flex items-center gap-4">
            {userProfile ? (
              <>
                <div className="flex items-center gap-2 bg-blue-700 rounded-lg px-3 py-1.5">
                  <User size={16} />
                  <div className="text-sm">
                    <p className="font-semibold">{userProfile.nombre || "Usuario"}</p>
                    <p className="text-xs text-blue-200 capitalize">{userProfile.rol || "Sin rol"}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 bg-blue-800 hover:bg-blue-700 transition px-3 py-1.5 rounded-lg text-sm font-medium"
                >
                  <LogOut size={16} />
                  Salir
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate("/")}
                className="bg-blue-800 hover:bg-blue-700 transition px-3 py-1.5 rounded-lg text-sm font-medium"
              >
                Iniciar sesión
              </button>
            )}
          </div>

          {/* Mobile — hamburger */}
          <div className="md:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-blue-700 rounded-lg transition"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-2 border-t border-blue-500 pt-4">
            {userProfile ? (
              <>
                <div className="bg-blue-700 rounded-lg px-3 py-2 mb-3">
                  <p className="font-semibold text-sm">{userProfile.nombre || "Usuario"}</p>
                  <p className="text-xs text-blue-200 capitalize">{userProfile.rol || "Sin rol"}</p>
                </div>

                {mobileMenu.length > 0 ? (
                  mobileMenu.map((item, index) => (
                    <button
                      key={`mobile-${item.to}-${index}`}
                      onClick={() => { navigate(item.to); setMenuOpen(false); }}
                      className="w-full text-left flex items-center gap-2 hover:bg-blue-700 transition px-3 py-2 rounded-lg text-sm font-medium"
                    >
                      {item.icon}
                      {/* FIX: mostrar label legible, no la ruta */}
                      {item.label}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-blue-100">
                    ⚠️ No hay menú disponible
                  </div>
                )}

                <button
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="w-full text-left flex items-center gap-2 bg-blue-800 hover:bg-blue-700 transition px-3 py-2 rounded-lg text-sm font-medium mt-2"
                >
                  <LogOut size={16} />
                  Salir
                </button>
              </>
            ) : (
              <button
                onClick={() => { navigate("/"); setMenuOpen(false); }}
                className="w-full text-left bg-blue-800 hover:bg-blue-700 transition px-3 py-2 rounded-lg text-sm font-medium"
              >
                Iniciar sesión
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}