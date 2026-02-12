import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import API from "../services/api";
import {
  Bell,
  AlertCircle,
  Check,
  Trash2,
  Clock,
} from "lucide-react";

export default function Notificaciones() {
  const { userProfile } = useAuth();

  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("todos");

  // ========================================================
  // Cargar notificaciones al montar el componente
  // ========================================================
  useEffect(() => {
    loadNotificaciones();
  }, []);

  // ========================================================
  // CARGAR NOTIFICACIONES DESDE API
  // ========================================================
  const loadNotificaciones = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("📬 Cargando notificaciones...");

      // ✅ USAR API INSTANCE DIRECTAMENTE
      const res = await API.get("/notificaciones");

      console.log("📬 Response tipo:", typeof res.data);
      console.log("📬 Es array?", Array.isArray(res.data));
      console.log("📬 Primeras 3 items:", res.data.slice(0, 3));

      // ✅ Validar que es un array
      const notificacionesData = Array.isArray(res.data) ? res.data : [];

      console.log(`✅ ${notificacionesData.length} notificaciones cargadas`);

      setNotificaciones(notificacionesData);

    } catch (error) {
      console.error("❌ Error al cargar notificaciones:", error);
      setError(error.message);
      setNotificaciones([]);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // MARCAR COMO LEÍDA
  // ========================================================
  const markAsRead = async (notifId) => {
    try {
      console.log("✅ Marcando notificación como leída:", notifId);

      await API.put(`/notificaciones/${notifId}`, {
        leida: true
      });

      // Actualizar estado local
      setNotificaciones(
        notificaciones.map((n) =>
          n.id === notifId ? { ...n, leida: true } : n
        )
      );

    } catch (error) {
      console.error("❌ Error al marcar como leída:", error);
    }
  };

  // ========================================================
  // ELIMINAR NOTIFICACIÓN
  // ========================================================
  const deleteNotificacion = async (notifId) => {
    try {
      console.log("🗑️ Eliminando notificación:", notifId);

      await API.delete(`/notificaciones/${notifId}`);

      // Actualizar estado local
      setNotificaciones(notificaciones.filter((n) => n.id !== notifId));

    } catch (error) {
      console.error("❌ Error al eliminar notificación:", error);
    }
  };

  // ========================================================
  // FILTRAR NOTIFICACIONES
  // ========================================================
  const filteredNotificaciones = notificaciones.filter((n) => {
    if (filterStatus === "leidas") return n.leida === true;
    if (filterStatus === "no-leidas") return n.leida === false;
    return true; // 'todos'
  });

  // ========================================================
  // RENDERIZADO
  // ========================================================
  if (!userProfile) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Cargando perfil…
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Cargando notificaciones...</p>
      </div>
    );
  }

  const unreadCount = notificaciones.filter((n) => !n.leida).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Notificaciones</h1>
        <div className="flex gap-2 items-center">
          {unreadCount > 0 && (
            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
              {unreadCount} sin leer
            </span>
          )}
          <span className="text-sm text-gray-500">
            {notificaciones.length} total
          </span>
        </div>
      </div>

      {/* Error si hay */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Error al cargar notificaciones</p>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilterStatus("todos")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filterStatus === "todos"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
          }`}
        >
          Todas ({notificaciones.length})
        </button>
        <button
          onClick={() => setFilterStatus("no-leidas")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filterStatus === "no-leidas"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
          }`}
        >
          Sin leer ({unreadCount})
        </button>
        <button
          onClick={() => setFilterStatus("leidas")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filterStatus === "leidas"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
          }`}
        >
          Leídas ({notificaciones.filter((n) => n.leida).length})
        </button>
      </div>

      {/* Debug info */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertCircle size={20} className="text-blue-600 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 mb-1">Información de depuración:</p>
            <p className="text-blue-800">
              <strong>Total notificaciones:</strong> {notificaciones.length}
            </p>
            <p className="text-blue-800">
              <strong>Sin leer:</strong> {unreadCount}
            </p>
            <p className="text-blue-800">
              <strong>Leídas:</strong> {notificaciones.filter((n) => n.leida).length}
            </p>
            <p className="text-blue-800">
              <strong>Filtro actual:</strong> {filterStatus}
            </p>
            {notificaciones.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-700 hover:text-blue-900">
                  Ver estructura de primer notificación
                </summary>
                <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-48">
                  {JSON.stringify(notificaciones[0], null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>

      {/* Lista de notificaciones */}
      <div className="space-y-3">
        {filteredNotificaciones.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Bell size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium mb-2">
              {notificaciones.length === 0
                ? "No hay notificaciones"
                : `No hay notificaciones ${filterStatus}`}
            </p>
          </div>
        ) : (
          filteredNotificaciones.map((notif) => (
            <NotificacionCard
              key={notif.id}
              notif={notif}
              onMarkAsRead={() => markAsRead(notif.id)}
              onDelete={() => deleteNotificacion(notif.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ========================================================
// TARJETA DE NOTIFICACIÓN
// ========================================================
function NotificacionCard({ notif, onMarkAsRead, onDelete }) {
  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return "Recientemente";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Hace un momento";
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours}h`;
      if (diffDays < 7) return `Hace ${diffDays}d`;

      return date.toLocaleDateString("es-MX", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  // Determinar color según tipo
  const getTypeColor = (tipo) => {
    switch (tipo) {
      case "info":
        return "bg-blue-50 border-l-4 border-blue-500";
      case "warning":
        return "bg-yellow-50 border-l-4 border-yellow-500";
      case "error":
        return "bg-red-50 border-l-4 border-red-500";
      case "success":
        return "bg-green-50 border-l-4 border-green-500";
      default:
        return "bg-gray-50 border-l-4 border-gray-500";
    }
  };

  // Obtener icono según tipo
  const getTypeIcon = (tipo) => {
    switch (tipo) {
      case "info":
        return <AlertCircle size={20} className="text-blue-600" />;
      case "warning":
        return <AlertCircle size={20} className="text-yellow-600" />;
      case "error":
        return <AlertCircle size={20} className="text-red-600" />;
      case "success":
        return <Check size={20} className="text-green-600" />;
      default:
        return <Bell size={20} className="text-gray-600" />;
    }
  };

  return (
    <div
      className={`rounded-lg p-4 flex items-start gap-4 transition ${getTypeColor(
        notif.tipo
      )} ${notif.leida ? "opacity-60" : "opacity-100"}`}
    >
      {/* Icono */}
      <div className="flex-shrink-0 mt-1">{getTypeIcon(notif.tipo)}</div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 mb-1">
          {notif.titulo || "Sin título"}
        </h3>
        <p className="text-gray-700 text-sm mb-2">
          {notif.mensaje || "Sin mensaje"}
        </p>

        {/* Detalles */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock size={14} />
          <span>{formatDate(notif.created_at)}</span>
          {notif.tipo && (
            <>
              <span>•</span>
              <span className="capitalize">{notif.tipo}</span>
            </>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex-shrink-0 flex gap-2">
        {!notif.leida && (
          <button
            onClick={onMarkAsRead}
            className="p-2 hover:bg-white/50 rounded-lg transition"
            title="Marcar como leída"
          >
            <Check size={18} className="text-gray-600" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-2 hover:bg-white/50 rounded-lg transition text-red-600"
          title="Eliminar"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}