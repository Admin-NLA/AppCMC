import { useState, useEffect } from "react";
import API from "../../services/api";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { usePush } from "../../hooks/usePush.js";

import { useNotificaciones } from "../../contexts/NotificationContext.jsx";
import NotificationsPanel from "../../Components/NotificationsPanel.jsx";

import {
  Menu, X, Moon, Sun, Calendar, Users, LayoutDashboard, Layers,
  Bell, User, Scan, Settings, LogOut, Map, Network, FileText, Award, QrCode,
  ClipboardList, Palette, ChevronDown, ChevronRight, Eye, EyeOff
} from "lucide-react";

import { useMemo } from "react";

// ============================================================
// Mapeo centralizado: label → ruta  ícono
// Agrega aquí cualquier nuevo item de sedeHelper.menuItems
// ============================================================
const MENU_MAP = {
  "Dashboard": { to: "/dashboard", icon: <LayoutDashboard size={18} /> },
  "Agenda": { to: "/agenda", icon: <Calendar size={18} /> },
  "Agenda (D1-D2)": { to: "/agenda", icon: <Calendar size={18} /> },
  "Agenda (D3-D4)": { to: "/agenda", icon: <Calendar size={18} /> },
  "Agenda (D1-4)": { to: "/agenda", icon: <Calendar size={18} /> },
  "Agenda (lectura)": { to: "/agenda", icon: <Calendar size={18} /> },
  "Agenda (ver)": { to: "/agenda", icon: <Calendar size={18} /> },
  "Mapa Expo": { to: "/mapa-expo", icon: <Map size={18} /> },
  "Expositores": { to: "/expositores", icon: <Layers size={18} /> },
  "Expositores (ver)": { to: "/expositores", icon: <Layers size={18} /> },
  "Speakers": { to: "/speakers", icon: <Users size={18} /> },
  "Speakers (ver)": { to: "/speakers", icon: <Users size={18} /> },
  "Networking": { to: "/networking", icon: <Network size={18} /> },
  "Perfil": { to: "/perfil", icon: <User size={18} /> },
  "Mi Perfil": { to: "/perfil", icon: <User size={18} /> },
  "Mi Sesión": { to: "/mi-sesion", icon: <Award size={18} /> },
  "Mi Marca": { to: "/mi-marca", icon: <Layers size={18} /> },
  "Encuestas": { to: "/encuestas", icon: <ClipboardList size={18} /> },
  "Mi QR": { to: "/qr", icon: <QrCode size={18} /> },
  "QR": { to: "/qr", icon: <QrCode size={18} /> },
  "Mis Registros": { to: "/mis-registros", icon: <FileText size={18} /> },
  "Mis Cursos": { to: "/mis-cursos", icon: <Calendar size={18} /> },
  "Notificaciones": { to: "/notificaciones", icon: <Bell size={18} /> },
  //"Staff Panel":       { to: "/staff",          icon: <Scan size={18} /> },
  //"Usuarios":          { to: "/usuarios",       icon: <Users size={18} /> },
  "Usuarios (ver)": { to: "/usuarios", icon: <Users size={18} /> },
  "Admin Panel": { to: "/admin", icon: <Settings size={18} /> },
  //"Branding":          { to: "/branding",       icon: <Palette size={18} /> },
  //"Configuración":     { to: "/configuracion",  icon: <Settings size={18} /> },
  //"Excel Import":      { to: "/admin/import",   icon: <FileText size={18} /> },
};

export default function Layout() {
  const { logout, userProfile, permisos, previewRol, isPreviewMode, setPreviewRol, clearPreview } = useAuth();
  const { isSupported, isSubscribed, permission, requestPermission } = usePush();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const toggleGroup = (group) => {
    // Solo un grupo abierto a la vez — cerrar los demás
    setOpenGroups(prev => {
      const estaAbierto = prev[group];
      // Cerrar todos y abrir solo el clickeado (si estaba cerrado)
      const reset = Object.fromEntries(Object.keys(prev).map(k => [k, false]));
      return { ...reset, [group]: !estaAbierto };
    });
  };

  const { unreadCount } = useNotificaciones();

  const toggleMenu = () => setOpen(!open);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  // Branding state — se aplica via style props (sobreescribe Tailwind hardcodeado)
  const [branding, setBranding] = useState({});

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const sede = userProfile?.sede || 'mexico';
        const r = await API.get(`/branding/${sede}`).catch(() => null);
        if (!r?.data?.branding) return;
        const b = r.data.branding;
        setBranding(b);
        // CSS variables para componentes que usen var()
        const root = document.documentElement;
        if (b.colorPrimario) root.style.setProperty('--color-primary', b.colorPrimario);
        if (b.colorSecundario) root.style.setProperty('--color-secondary', b.colorSecundario);
        if (b.colorBoton) root.style.setProperty('--color-btn', b.colorBoton);
      } catch { /* silencioso */ }
    };
    if (userProfile) loadBranding();
  }, [userProfile?.sede]);

  const toggleDark = () => {
    const newMode = !dark;
    setDark(newMode);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  // Construir menú desde permisos.menuItems usando MENU_MAP
  /*const menu = permisos
    ? permisos.menuItems
        .map((label) => ({ label, ...MENU_MAP[label] }))
        .filter((item) => item.to) // descartar labels no mapeados
    : [];*/

  const menu = useMemo(() => {
    return permisos
      ? permisos.menuItems
        .map((label) => ({ label, ...MENU_MAP[label] }))
        .filter((item) => item.to)
      : [];
  }, [permisos]);

  useEffect(() => {
    if (menu.length > 0) {
      const activeItem = menu.find(item => item.to === location.pathname);
      if (activeItem) {
        const group = getGroup(activeItem.label);
        setOpenGroups(prev => ({ ...prev, [group]: true }));
      }
    }
  }, [location.pathname, menu]);

  // ============================================================
  // Agrupador dinámico (NO rompe permisos)
  // ============================================================
  const getGroup = (label) => {
    if (
      label.includes("Expositores") ||
      label.includes("Mapa") ||
      label.includes("Networking")
    ) return "Expo";

    if (label.includes("Speakers")) return "Speakers";

    if (
      label.includes("Perfil") ||
      label.includes("QR") ||
      label.includes("Registros") ||
      label.includes("Cursos") ||
      label.includes("Sesión") ||
      label.includes("Marca")
    ) return "Usuario";

    if (
      label.includes("Encuestas") ||
      label.includes("Notificaciones")
    ) return "Informativos";

    if (label.includes("Admin")) return "Admin";

    //return "otros"; // 🔥 clave para no perder nada
  };

  const NO_GROUP = ["Dashboard", "Agenda"];
  const directItems = menu.filter(item =>
    NO_GROUP.some(label => item.label.includes(label))
  );

  const groupedMenu = menu
    .filter(item => !NO_GROUP.some(label => item.label.includes(label)))
    .reduce((acc, item) => {
      const group = getGroup(item.label);

      if (!acc[group]) acc[group] = [];
      acc[group].push(item);

      return acc;
    }, {});

  const formatTitle = (path) => {
    const clean = path.replace("/", "");
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">

      {/* Sidebar */}
      <aside
        className={`cmc-sidebar fixed top-0 left-0 h-full w-64 shadow-lg z-40 transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        style={{ backgroundColor: branding.colorMenu || '#1e293b' }}
      >
        <div className="p-4 border-b border-white/10 flex items-center gap-2 min-h-[68px]">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.logoAlt || "CMC"}
              className="h-10 max-w-[160px] object-contain"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/icon-192.png"; // fallback local
              }}
            />
          ) : (
            <>
              <img src="/icons/Logo_CMC.svg" className="w-10 h-10 object-contain" />
              <span className="text-xl font-bold" style={{ color: branding.colorTextoMenu || '#ffffff' }}>
                {branding.appNombre || 'CMC App'}
              </span>
            </>
          )}
        </div>

        <nav className="px-4 py-4 space-y-2" style={{ color: branding.colorTextoMenu || "#ffffff" }}>
          <div className="text-xs uppercase mb-2 px-2 opacity-50">
            Menú
            {/* ITEMS DIRECTOS (sin dropdown) */}
            {directItems.map((item, index) => (
              <Link
                key={`direct-${item.to}-${index}`}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 p-2 pl-2 rounded-lg text-sm font-medium transition-all
                  ${location.pathname === item.to
                    ? "bg-white/10 font-semibold"
                    : "opacity-80 hover:bg-white/10 hover:opacity-100"
                  }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>

          {Object.keys(groupedMenu).length > 0 ? (
            Object.entries(groupedMenu).map(([group, items]) => {
              const isOpen = openGroups[group];

              return (
                <div key={group}>

                  {/* HEADER DEL GRUPO (CLICKABLE) */}
                  <button
                    onClick={() => toggleGroup(group)}
                    className="flex items-center justify-between w-full px-2 py-2 mt-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600">
                    <span>{group}</span>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  {/* CONTENIDO ANIMADO */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      }`}
                  >
                    {items.map((item, index) => (
                      <Link
                        key={`${item.to}-${index}`}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 p-2 pl-4 rounded-lg text-sm font-medium transition-all
                          ${location.pathname === item.to
                            ? "bg-white/10 font-semibold"
                            : "opacity-80 hover:bg-white/10 hover:opacity-100"
                          }`}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-2 text-xs text-gray-500">
              ⚠️ No hay permisos disponibles
            </div>
          )}

          <div className="border-t pt-4 mt-4 dark:border-gray-700">
            <button
              onClick={logout}
              className="flex items-center w-full gap-3 p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg text-sm font-medium"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </nav>
      </aside>

      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30 md:hidden"
          onClick={toggleMenu}
        />
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col ml-0 md:ml-64">

        {/* Header */}
        <header className="flex items-center justify-between shadow px-5 py-3 dark:bg-gray-800 dark:text-white" style={{ backgroundColor: branding.colorHeader || undefined, color: branding.colorTextoHeader || undefined }}>
          <button className="md:hidden text-gray-700 dark:text-gray-300" onClick={toggleMenu}>
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>

          <h1 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
            {formatTitle(location.pathname) || "Dashboard"}
          </h1>

          <div className="flex items-center gap-4">
            {/* Notificaciones */}
            <button onClick={() => setPanelOpen(true)} className="relative">
              <Bell size={20} className="text-gray-700 dark:text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs rounded-full px-1">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Vista previa de rol — solo super_admin */}
            {userProfile?.rol === "super_admin" && (
              <div className="flex items-center gap-1.5">
                {isPreviewMode ? (
                  <button
                    onClick={clearPreview}
                    title="Salir de vista previa"
                    className="flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600 px-2 py-1 rounded-lg hover:bg-amber-200 transition font-semibold"
                  >
                    <EyeOff size={13} />
                    Salir: {previewRol}
                  </button>
                ) : (
                  <select
                    title="Ver la app como otro rol"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const [rol, pase] = val.split("|");
                      setPreviewRol(rol, pase || null);
                      e.target.value = "";
                    }}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>👁 Ver como...</option>
                    <option value="staff">Staff</option>
                    <option value="expositor">Expositor</option>
                    <option value="speaker">Speaker</option>
                    <option value="asistente_general|general">Asistente General</option>
                    <option value="asistente_curso|curso">Asistente Curso</option>
                    <option value="asistente_sesiones|sesiones">Asistente Sesiones</option>
                    <option value="asistente_combo|combo">Asistente Combo</option>
                  </select>
                )}
              </div>
            )}

            {/* Dark mode */}
            <button onClick={toggleDark} className="text-gray-700 dark:text-gray-300">
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Avatar → click lleva a /perfil */}
            <Link to="/perfil" className="flex items-center gap-2 hover:opacity-80 transition">
              <img
                src={userProfile?.avatar_url || userProfile?.avatar
                  || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.nombre || 'U')}&background=2563eb&color=fff&size=64`}
                className="w-9 h-9 rounded-full border dark:border-gray-600 object-cover"
                alt="avatar"
              />
              <span className="hidden md:block text-gray-700 dark:text-gray-300 text-sm font-medium">
                {userProfile?.nombre || "Usuario"}
              </span>
            </Link>
          </div>
        </header>
        {/* Banner Web Push — solo si soportado y no suscrito */}
        {isSupported && !isSubscribed && permission === 'default' && userProfile && (
          <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-blue-600 text-white text-sm">
            <span className="flex items-center gap-2">
              🔔 <span>Activa las notificaciones push para recibir alertas aunque la app esté cerrada</span>
            </span>
            <button
              onClick={requestPermission}
              className="shrink-0 bg-white text-blue-600 font-semibold px-3 py-1 rounded-lg text-xs hover:bg-blue-50 transition"
            >
              Activar ahora
            </button>
          </div>
        )}

        {/* Banner modo vista previa */}
        {isPreviewMode && (
          <div className="bg-amber-400 dark:bg-amber-600 text-amber-900 dark:text-white px-4 py-1.5 flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-2">
              <Eye size={13} />
              Vista previa como: <strong className="uppercase">{previewRol}</strong>
              — El menú y los permisos simulan este rol
            </span>
            <button onClick={clearPreview} className="underline hover:no-underline">
              Volver a Super Admin
            </button>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-5 text-gray-900 dark:text-gray-100">
          <Outlet />
        </main>
      </div>

      {/* Panel de notificaciones */}
      {panelOpen && (
        <NotificationsPanel onClose={() => setPanelOpen(false)} />
      )}
    </div>
  );
}