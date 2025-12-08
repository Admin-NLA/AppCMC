import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { LogOut, User } from "lucide-react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

export default function Header() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

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
    <header className="flex justify-between items-center px-6 py-3 bg-blue-600 text-white shadow-md">
      {/* Logo o nombre del evento */}
      <div className="flex items-center gap-3">
        <img
          src="/icon-192.png"
          alt="CMC Logo"
          className="w-8 h-8 rounded-full bg-white p-1"
          onError={(e) => (e.target.style.display = "none")}
        />
        <div>
          <h1 className="text-lg font-bold leading-tight">CMC LATAM 2025</h1>
          <p className="text-xs text-blue-100">Gestión del Congreso</p>
        </div>
      </div>

      {/* Usuario y cierre de sesión */}
      <div className="flex items-center gap-4">
        {userProfile ? (
          <>
            <div className="flex items-center gap-2 bg-blue-700 rounded-lg px-3 py-1.5">
              <User size={16} />
              <div className="text-sm">
                <p className="font-semibold">{userProfile.nombre || "Usuario"}</p>
                <p className="text-xs text-blue-200 capitalize">
                  {userProfile.rol || "Sin rol"}
                </p>
              </div>
            </div>

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
    </header>
  );
}
