import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { LogOut, User, Menu, X, Bell } from "lucide-react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

export default function Header() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // ========================================================
  // SIMULADAS: Notificaciones (puedes conectar a API real)
  // ========================================================
  const [notifications] = useState([
    { id: 1, title: "Bienvenida", message: "Te damos la bienvenida al evento", read: false },
    { id: 2, title: "Nueva sesión", message: "Se agregó una nueva sesión a tu agenda", read: true },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
      customClass: {
        title: "text-gray-800",
        popup: "rounded-2xl shadow-lg",
      },
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

  return (
    <header className="bg-blue-600 text-white shadow-md sticky top-0 z-50">
      <div className="px-4 md:px-6 py-3">
        <div className="flex justify-between items-center">
          {/* Logo y nombre - Responsive */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <img
              src="/icon-192.png"
              alt="CMC Logo"
              className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white p-0.5"
              onError={(e) => (e.target.style.display = "none")}
            />
            <div className="hidden sm:block">
              <h1 className="text-sm md:text-lg font-bold leading-tight">CMC LATAM 2025</h1>
              <p className="text-xs text-blue-100">Gestión del Congreso</p>
            </div>
          </div>

          {/* Desktop Menu - Visible en pantallas md+ */}
          <div className="hidden md:flex items-center gap-4">
            {userProfile ? (
              <>
                {/* Notificaciones Desktop */}
                <div className="relative">
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative p-2 hover:bg-blue-700 rounded-lg transition"
                    title="Notificaciones"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown de Notificaciones */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white text-gray-800 rounded-lg shadow-xl z-50">
                      <div className="p-4 border-b border-gray-200">
                        <h3 className="font-bold text-lg">Notificaciones</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            No hay notificaciones
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`p-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition ${
                                !notif.read ? "bg-blue-50" : ""
                              }`}
                            >
                              <p className="font-semibold text-sm">{notif.title}</p>
                              <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        className="w-full p-2 text-center text-blue-600 text-sm font-semibold hover:bg-gray-50 border-t"
                      >
                        Ver todas
                      </button>
                    </div>
                  )}
                </div>

                {/* Perfil Desktop */}
                <div className="flex items-center gap-2 bg-blue-700 rounded-lg px-3 py-1.5">
                  <User size={16} />
                  <div className="text-sm">
                    <p className="font-semibold">{userProfile.nombre || "Usuario"}</p>
                    <p className="text-xs text-blue-200 capitalize">
                      {userProfile.rol || "Sin rol"}
                    </p>
                  </div>
                </div>

                {/* Logout Desktop */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 bg-blue-800 hover:bg-blue-700 transition px-3 py-1.5 rounded-lg text-sm font-medium"
                >
                  <LogOut size={16} />
                  <span>Salir</span>
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

          {/* Mobile Menu Button - Visible en pantallas < md */}
          <div className="md:hidden flex items-center gap-2">
            {/* Notificaciones Mobile */}
            {userProfile && (
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 hover:bg-blue-700 rounded-lg transition"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-xs">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Notificaciones Mobile */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white text-gray-800 rounded-lg shadow-xl z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-bold text-lg">Notificaciones</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No hay notificaciones
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition ${
                              !notif.read ? "bg-blue-50" : ""
                            }`}
                          >
                            <p className="font-semibold text-xs">{notif.title}</p>
                            <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hamburger Menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-blue-700 rounded-lg transition"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu - Dropdown */}
        {menuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3 border-t border-blue-500 pt-4">
            {userProfile ? (
              <>
                {/* Info Usuario Mobile */}
                <div className="bg-blue-700 rounded-lg px-3 py-2">
                  <p className="font-semibold text-sm">{userProfile.nombre || "Usuario"}</p>
                  <p className="text-xs text-blue-200 capitalize">
                    {userProfile.rol || "Sin rol"}
                  </p>
                </div>

                {/* Link Perfil Mobile */}
                <button
                  onClick={() => {
                    navigate("/perfil");
                    setMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-2 hover:bg-blue-700 transition px-3 py-2 rounded-lg text-sm font-medium"
                >
                  <User size={16} />
                  Mi Perfil
                </button>

                {/* Logout Mobile */}
                <button
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-2 bg-blue-800 hover:bg-blue-700 transition px-3 py-2 rounded-lg text-sm font-medium"
                >
                  <LogOut size={16} />
                  Salir
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  navigate("/");
                  setMenuOpen(false);
                }}
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