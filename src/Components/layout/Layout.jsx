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
  LogOut
} from "lucide-react";

export default function Layout() {
  const { logout, userProfile } = useAuth(); 
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

  const baseMenu = [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { to: "/agenda", label: "Agenda", icon: <Calendar size={18} /> },
    { to: "/speakers", label: "Speakers", icon: <Users size={18} /> },
    { to: "/expositores", label: "Expositores", icon: <Layers size={18} /> },

    // ❌ ESTA ruta de notificaciones puedes mantenerla aunque ya no será necesaria
    { to: "/notificaciones", label: "Notificaciones", icon: <Bell size={18} /> },

    { to: "/perfil", label: "Mi Perfil", icon: <User size={18} /> },
  ];

  const staffMenu = [
    { to: "/staff", label: "Registro Asistencias", icon: <Scan size={18} /> },
  ];

  const adminMenu = [
    { to: "/admin", label: "Panel de Administración", icon: <Settings size={18} /> },
  ];

  let finalMenu = [...baseMenu];

  if (userProfile?.rol === "staff" || userProfile?.rol === "super_admin") {
    finalMenu.push(...staffMenu);
  }

  if (userProfile?.rol === "super_admin") {
    finalMenu.push(...adminMenu);
  }

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

          {finalMenu.map((item) => (
            <Link
              key={item.to}
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
              {item.label}
            </Link>
          ))}

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

            {/* ---------------- 🔔 NOTIFICACIONES ---------------- */}
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

      {/* ---------------- PANEL DE NOTIFICACIONES ---------------- */}
      <NotificationsPanel open={panelOpen} onClose={() => setPanelOpen(false)} />

    </div>
  );
}
