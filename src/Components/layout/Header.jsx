import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  LogOut, User, Menu, X, Map, Network, Calendar, Layers, Users,
  Scan, Settings, FileText, Award, Bell, LayoutDashboard, QrCode
} from "lucide-react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

// Mapeo corregido de menú
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
  // FIX: Admin Panel ahora apunta a /admin-panel en lugar de /configuracion
  "Admin Panel":       { to: "/admin-panel",    icon: <Settings size={16} /> },
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
      text: "Tu sesión actual finalizará",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, cerrar sesión",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      logout();
      navigate("/login");
      Swal.fire({
        title: "¡Sesión cerrada!",
        text: "Has cerrado sesión exitosamente",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const menuItems = permisos?.menuItems || ["Perfil"];

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <img
          src="https://cmc-latam.com/wp-content/uploads/2024/10/cmc-logo-azul.svg"
          alt="CMC Logo"
          className="h-8"
        />
        <h1 className="text-xl font-bold text-gray-800 hidden sm:block">
          CMC {new Date().getFullYear()}
        </h1>
      </div>

      {/* Desktop Menu */}
      <nav className="hidden lg:flex items-center gap-6">
        {menuItems.map((itemKey) => {
          const menuItem = MENU_MAP[itemKey];
          if (!menuItem) return null;

          return (
            <button
              key={itemKey}
              onClick={() => navigate(menuItem.to)}
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition font-medium"
            >
              {menuItem.icon}
              <span>{itemKey}</span>
            </button>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 transition font-medium"
        >
          <LogOut size={16} />
          <span>Salir</span>
        </button>
      </nav>

      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="lg:hidden text-gray-700 hover:text-blue-600"
      >
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 lg:hidden">
          <nav className="flex flex-col p-4 gap-3">
            {menuItems.map((itemKey) => {
              const menuItem = MENU_MAP[itemKey];
              if (!menuItem) return null;

              return (
                <button
                  key={itemKey}
                  onClick={() => {
                    navigate(menuItem.to);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-3 text-gray-700 hover:bg-gray-100 p-3 rounded-lg transition"
                >
                  {menuItem.icon}
                  <span>{itemKey}</span>
                </button>
              );
            })}
            <button
              onClick={() => {
                handleLogout();
                setMenuOpen(false);
              }}
              className="flex items-center gap-3 text-red-600 hover:bg-red-50 p-3 rounded-lg transition"
            >
              <LogOut size={16} />
              <span>Salir</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}