// src/contexts/NotificationContext.jsx
import React, { createContext, useContext, useEffect, useState, useRef } from "react";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notificaciones, setNotificaciones] = useState([]); // { id, titulo, mensaje, creadoEn, read }
  const [unreadCount, setUnreadCount] = useState(0);
  const esRef = useRef(null);
  const reconnectRef = useRef({ tries: 0, timeoutId: null });

  const ADD = (n) => {
    setNotificaciones((prev) => {
      const exists = prev.find((p) => p.id === n.id);
      if (exists) return prev.map(p => p.id === n.id ? { ...p, ...n } : p);
      return [n, ...prev];
    });
    setUnreadCount((c) => c + 1);
  };

  const MARK_READ = (id) => {
    setNotificaciones((prev) =>
      prev.map(p => (p.id === id ? { ...p, read: true } : p))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const MARK_ALL_READ = () => {
    setNotificaciones((prev) => prev.map(p => ({ ...p, read: true })));
    setUnreadCount(0);
  };

  const CLEAR_ALL = () => {
    setNotificaciones([]);
    setUnreadCount(0);
  };

  // 🔥 FIX — Usar import.meta.env en lugar de process.env
  useEffect(() => {
    const URL =
      import.meta.env.VITE_NOTIF_URL ||
      "https://cmc-app.onrender.com/events";

    function connect() {
      try {
        const es = new EventSource(URL, { withCredentials: false });
        esRef.current = es;

        es.addEventListener("notification", (ev) => {
          try {
            const data = JSON.parse(ev.data);
            const item = {
              id: data.id || (Date.now() + "-" + Math.random()).toString(),
              titulo: data.titulo || data.title || "Notificación",
              mensaje: data.mensaje || data.message || "",
              creadoEn: data.creadoEn || new Date().toISOString(),
              read: false,
              meta: data.meta || {},
            };
            ADD(item);
          } catch (err) {
            console.error("Notification parse error:", err);
          }
        });

        es.onopen = () => {
          reconnectRef.current.tries = 0;
          console.info("[SSE] connected to", URL);
        };

        es.onerror = (err) => {
          console.warn("[SSE] error, will retry", err);
          es.close();
          scheduleReconnect();
        };

      } catch (err) {
        console.error("SSE connection failed", err);
        scheduleReconnect();
      }
    }

    function scheduleReconnect() {
      const tries = reconnectRef.current.tries || 0;
      reconnectRef.current.tries = tries + 1;
      const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(6, tries)));

      if (reconnectRef.current.timeoutId)
        clearTimeout(reconnectRef.current.timeoutId);

      reconnectRef.current.timeoutId = setTimeout(() => {
        connect();
      }, delay);
    }

    connect();

    return () => {
      if (esRef.current) esRef.current.close();
      if (reconnectRef.current.timeoutId) clearTimeout(reconnectRef.current.timeoutId);
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notificaciones,
        unreadCount,
        addNotification: ADD,
        markRead: MARK_READ,
        markAllRead: MARK_ALL_READ,
        clearAll: CLEAR_ALL,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificaciones() {
  return useContext(NotificationContext);
}
