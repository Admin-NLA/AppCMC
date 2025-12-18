import React, { useMemo } from "react";
import { useNotificaciones } from "../contexts/NotificationContext";

// =========================
// Helpers
// =========================
function formatDay(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();

  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isToday) return "Hoy";
  if (isYesterday) return "Ayer";

  return d.toLocaleDateString();
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =========================
// Component
// =========================
export default function NotificationsPanel({ open, onClose }) {
  const {
    notificaciones,
    unreadCount,
    markRead,
    markAllRead,
  } = useNotificaciones();

  // =========================
  // Agrupar notificaciones
  // día -> tipo -> []
  // =========================
  const grouped = useMemo(() => {
    const result = {};

    notificaciones.forEach((n) => {
      const dayKey = formatDay(n.creadoEn);
      const typeKey = n.tipo || "info";

      if (!result[dayKey]) result[dayKey] = {};
      if (!result[dayKey][typeKey]) result[dayKey][typeKey] = [];

      result[dayKey][typeKey].push(n);
    });

    return result;
  }, [notificaciones]);

  return (
    <div
      className={`fixed top-0 right-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform 
      ${open ? "translate-x-0" : "translate-x-full"}`}
    >
      {/* ================= HEADER ================= */}
      <div className="p-4 border-b flex items-center justify-between dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
          Notificaciones
        </h3>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}

          <button
            onClick={markAllRead}
            className="text-xs text-blue-600 hover:underline"
          >
            Marcar todas
          </button>

          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:underline"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div className="p-4 overflow-y-auto h-full space-y-6">
        {Object.keys(grouped).length === 0 && (
          <div className="text-center text-sm text-gray-500">
            No hay notificaciones
          </div>
        )}

        {Object.entries(grouped).map(([day, types]) => (
          <div key={day}>
            {/* Día */}
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
              {day}
            </div>

            {Object.entries(types).map(([tipo, items]) => (
              <div key={tipo} className="mb-4">
                {/* Tipo */}
                <div className="text-xs text-gray-400 mb-1 capitalize">
                  {tipo}
                </div>

                <ul className="space-y-2">
                  {items.map((n) => (
                    <li
                      key={n.id}
                      className={`p-3 rounded-lg border shadow-sm transition
                        ${
                          n.read
                            ? "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                            : "bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700"
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-100">
                            {n.titulo}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {n.mensaje}
                          </div>
                        </div>

                        <div className="text-xs text-gray-400">
                          {formatTime(n.creadoEn)}
                        </div>
                      </div>

                      {!n.read && (
                        <div className="mt-2">
                          <button
                            onClick={() => markRead(n.id)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Marcar como leído
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}