import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";

// 🔔 Notificaciones
import { useNotificaciones } from "../../contexts/NotificationContext.jsx";
import NotificationsPanel from "../../Components/NotificationsPanel.jsx";

import {
  Menu,
  X,
  Moon,
  Sun,
  Calendar,
  Users,
  LayoutDashboard,
  Layers,
  Bell,
  User,
  Scan,
  Settings,
  LogOut,
  Map,
  Network,
  FileText,
  Award
} from "lucide-react";

export default function Layout() {
  const { logout, userProfile, permisos } = useAuth(); // ← AGREGADO: permisos
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  // 👉 estado del panel de notificaciones
  const [panelOpen, setPanelOpen] = useState(false);

  // 👉 contador de notificaciones no leídas
  const { unreadCount } = useNotificaciones();

  const toggleMenu = () => setOpen(!open);

  // Dark mode logic
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  const toggleDark = () => {
    const newMode = !dark;
    setDark(newMode);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  // ========== NUEVO: MENÚ DINÁMICO BASADO EN PERMISOS ==========
  /**
   * Construye el menú dinámicamente según permisos del usuario
   * Usa permisos.menuItems de sedeHelper.js
   */
  const buildMenu = () => {
    if (!permisos) return [];

    // Mapeo de nombres a rutas e íconos
    const menuMap = {
      "Dashboard": { to: "/dashboard", icon: <LayoutDashboard size={18} /> },
      "Agenda (D1-D2)": { to: "/agenda", icon: <Calendar size={18} /> },
      "Agenda (D3-D4)": { to: "/agenda", icon: <Calendar size={18} /> },
      "Agenda (D1-4)": { to: "/agenda", icon: <Calendar size={18} /> },
      "Agenda": { to: "/agenda", icon: <Calendar size={18} /> },
      "Agenda (lectura)": { to: "/agenda", icon: <Calendar size={18} /> },
      "Mapa Expo": { to: "/mapa-expo", icon: <Map size={18} /> },
      "Expositores": { to: "/expositores", icon: <Layers size={18} /> },
      "Speakers": { to: "/speakers", icon: <Users size={18} /> },
      "Perfil": { to: "/perfil", icon: <User size={18} /> },
      "Mi Perfil": { to: "/perfil", icon: <User size={18} /> },
      "Mi Sesión": { to: "/mi-sesion", icon: <Award size={18} /> },
      "Mi Marca": { to: "/mi-marca", icon: <Layers size={18} /> },
      "Mi QR": { to: "/qr", icon: <FileText size={18} /> },
      "Networking": { to: "/networking", icon: <Network size={18} /> },
      "Mis Registros": { to: "/mis-registros", icon: <FileText size={18} /> },
      "Mis Cursos": { to: "/mis-cursos", icon: <Calendar size={18} /> },
      "Staff Panel": { to: "/staff", icon: <Scan size={18} /> },
      "Usuarios": { to: "/usuarios", icon: <Users size={18} /> },
      "Usuarios (ver)": { to: "/usuarios", icon: <Users size={18} /> },
      "Notificaciones": { to: "/notificaciones", icon: <Bell size={18} /> },
      "Admin Panel": { to: "/admin", icon: <Settings size={18} /> },
      "Agenda (ver)": { to: "/agenda", icon: <Calendar size={18} /> },
      "Speakers (ver)": { to: "/speakers", icon: <Users size={18} /> },
      "Expositores (ver)": { to: "/expositores", icon: <Layers size={18} /> },
      "Configuración": { to: "/configuracion", icon: <Settings size={18} /> },
      "Excel Import": { to: "/excel-import", icon: <FileText size={18} /> },
    };

    // Construir menú desde permisos.menuItems
    return permisos.menuItems
      .map(itemLabel => menuMap[itemLabel])
      .filter(Boolean); // Eliminar undefined
  };
  // ============================================================

  const menu = buildMenu();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">

      {/* ---------- SIDEBAR ---------- */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg z-40 transform transition-transform duration-300 
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="p-5 border-b dark:border-gray-700 text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Layers size={22} /> CMC App
        </div>

        <nav className="px-4 py-4 space-y-2">

          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">
            Navegación
          </div>

          {/* ========== MENÚ DINÁMICO ==========  */}
          {menu.length > 0 ? (
            menu.map((item, index) => (
              <Link
                key={`${item.to}-${index}`}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 p-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    location.pathname === item.to
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
              >
                {item.icon}
                {item.to.replace("/", "").charAt(0).toUpperCase() + item.to.replace("/", "").slice(1)}
              </Link>
            ))
          ) : (
            <div className="p-2 text-xs text-gray-500">
              ⚠️ No hay permisos disponibles
            </div>
          )}
          {/* ==================================== */}

          <div className="border-t pt-4 mt-4 dark:border-gray-700">
            <button
              onClick={logout}
              className="flex items-center w-full gap-3 p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </nav>
      </aside>

      {/* ---------- OVERLAY (móvil) ---------- */}
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-30 md:hidden" onClick={toggleMenu} />
      )}

      {/* ---------- CONTENT AREA ---------- */}
      <div className="flex-1 flex flex-col ml-0 md:ml-64">

        {/* ---------- HEADER ---------- */}
        <header className="flex items-center justify-between bg-white dark:bg-gray-800 shadow px-5 py-3">
          
          <button className="md:hidden text-gray-700 dark:text-gray-300" onClick={toggleMenu}>
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>

          <h1 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
            {location.pathname.replace("/", "").toUpperCase() || "DASHBOARD"}
          </h1>

          {/* ACCIONES DEL HEADER */}
          <div className="flex items-center gap-4">

            {/* 🔔 NOTIFICACIONES */}
            <button onClick={() => setPanelOpen(true)} className="relative">
              <Bell size={20} className="text-gray-700 dark:text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs rounded-full px-1">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Modo oscuro */}
            <button onClick={toggleDark} className="text-gray-700 dark:text-gray-300">
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Avatar */}
            <div className="flex items-center gap-2">
              <img
                src={userProfile?.avatar || "https://i.pravatar.cc/40"}
                className="w-9 h-9 rounded-full border dark:border-gray-600"
              />
              <span className="hidden md:block text-gray-700 dark:text-gray-300 text-sm font-medium">
                {userProfile?.nombre || "Usuario"}
              </span>
            </div>
          </div>
        </header>

        {/* ---------- MAIN CONTENT ---------- */}
        <main className="flex-1 overflow-y-auto p-5 text-gray-900 dark:text-gray-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
}