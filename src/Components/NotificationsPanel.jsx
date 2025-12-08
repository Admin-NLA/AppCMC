// src/components/NotificationsPanel.jsx
import React from "react";
import { useNotificaciones } from "../contexts/NotificationContext";

export default function NotificationsPanel({ open, onClose }) {
  const { notificaciones, unreadCount, markRead, markAllRead, clearAll } = useNotificaciones();

  return (
    <div className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform 
      ${open ? "translate-x-0" : "translate-x-full"}`}>
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Notificaciones</h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && <span className="text-sm text-white bg-red-600 px-2 py-1 rounded">{unreadCount} nuevas</span>}
          <button onClick={() => { markAllRead(); }} className="text-sm text-gray-600 hover:underline">Marcar todas</button>
          <button onClick={() => { clearAll(); }} className="text-sm text-red-600 hover:underline">Limpiar</button>
          <button onClick={onClose} className="ml-2 text-gray-600">Cerrar</button>
        </div>
      </div>

      <div className="p-3 overflow-y-auto h-full">
        {notificaciones.length === 0 && (
          <div className="text-center text-sm text-gray-500">No hay notificaciones</div>
        )}

        <ul className="space-y-2">
          {notificaciones.map((n) => (
            <li key={n.id} className={`p-3 rounded-lg border ${n.read ? "bg-gray-50 dark:bg-gray-700" : "bg-white dark:bg-gray-800"} shadow-sm`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-800 dark:text-gray-100">{n.titulo}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{n.mensaje}</div>
                </div>
                <div className="text-xs text-gray-400">{new Date(n.creadoEn).toLocaleString()}</div>
              </div>
              <div className="mt-2 flex gap-2">
                {!n.read && <button onClick={() => markRead(n.id)} className="text-xs text-blue-600">Marcar leído</button>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
