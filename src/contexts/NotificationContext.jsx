// src/contexts/NotificationContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useMemo,
} from "react";
import { useAuth } from "./AuthContext.jsx";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { userProfile } = useAuth();
  const rol = userProfile?.rol || "asistente";

  const [notificaciones, setNotificaciones] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const esRef = useRef(null);
  const reconnectRef = useRef({ tries: 0, timeoutId: null });

  // =========================
  // Helpers
  // =========================
  const normalizeDateKey = (iso) => {
    const d = new Date(iso);
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  };

  const humanDayLabel = (key) => {
    const today = new Date();
    const d = new Date(key);

    const diff =
      (today.setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24);

    if (diff === 0) return "Hoy";
    if (diff === 1) return "Ayer";
    return d.toLocaleDateString();
  };

  // =========================
  // Actions
  // =========================
  const ADD = (n) => {
    setNotificaciones((prev) => {
      const exists = prev.some((p) => p.id === n.id);
      if (exists) return prev;
      return [n, ...prev];
    });

    setUnreadCount((c) => c + 1);
  };

  const MARK_READ = async (id) => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL}/notificaciones/${id}/vista`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setNotificaciones((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, leida: true } : n
        )
      );

      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("Error marcando notificación como leída", err);
    }
  };

  const MARK_ALL_READ = () => {
    setNotificaciones((prev) =>
      prev.map((n) => ({ ...n, leida: true }))
    );
    setUnreadCount(0);
  };

  const CLEAR_ALL = () => {
    setNotificaciones([]);
    setUnreadCount(0);
  };

  // =========================
  // 🔄 CARGA INICIAL desde API
  // =========================
  useEffect(() => {
    if (!userProfile?.id) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:4000/api"}/notificaciones`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const lista = Array.isArray(data) ? data : [];
        setNotificaciones(lista.map(n => ({
          id: n.id,
          titulo: n.titulo,
          mensaje: n.mensaje,
          tipo: n.tipo || "info",
          creadoEn: n.created_at,
          meta: n.meta || {},
          leida: n.leida || false,
        })));
        setUnreadCount(lista.filter(n => !n.leida).length);
      })
      .catch(() => { }); // silencioso si falla
  }, [userProfile?.id]);

  // =========================
  // SSE
  // =========================
  useEffect(() => {
    // FIX: no conectar SSE sin usuario autenticado (evita errores en cold start de Render)
    if (!userProfile?.id) {
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      clearTimeout(reconnectRef.current.timeoutId);
      reconnectRef.current.tries = 0;
      return;
    }

    const token = localStorage.getItem("token");
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
    // Pasar token como query param para SSE (EventSource no soporta headers)
    const URL = `${baseURL}/notificaciones/events?token=${token}&userId=${userProfile.id}`;

    function connect() {
      try {
        const es = new EventSource(URL);
        esRef.current = es;

        es.onmessage = (ev) => {
          try {
            const raw = JSON.parse(ev.data);
            const d = raw.data || raw;

            const item = {
              id: d.id,
              titulo: d.titulo,
              mensaje: d.mensaje,
              tipo: d.tipo || "info",
              creadoEn: d.created_at || new Date().toISOString(),
              meta: d.meta || {},
              leida: false,
            };

            ADD(item);
          } catch (err) {
            console.error("Error parseando SSE", err);
          }
        };

        es.onopen = () => {
          reconnectRef.current.tries = 0;
          console.log("[SSE] conectado");
        };

        es.onerror = () => {
          es.close();
          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    }

    function scheduleReconnect() {
      const tries = reconnectRef.current.tries++;
      const delay = Math.min(30000, 1000 * 2 ** tries);

      clearTimeout(reconnectRef.current.timeoutId);
      reconnectRef.current.timeoutId = setTimeout(connect, delay);
    }

    connect();

    return () => {
      if (esRef.current) esRef.current.close();
      clearTimeout(reconnectRef.current.timeoutId);
    };
  }, [userProfile?.id]);

  // =========================
  // 🔥 AGRUPACIÓN (día + tipo)
  // =========================
  const grouped = useMemo(() => {
    const acc = {};

    notificaciones.forEach((n) => {
      const dayKey = normalizeDateKey(n.creadoEn);
      const tipo = n.tipo || "info";

      if (!acc[dayKey]) {
        acc[dayKey] = {
          label: humanDayLabel(dayKey),
          tipos: {},
        };
      }

      if (!acc[dayKey].tipos[tipo]) {
        acc[dayKey].tipos[tipo] = [];
      }

      acc[dayKey].tipos[tipo].push(n);
    });

    return acc;
  }, [notificaciones]);

  // =========================
  // Provider
  // =========================
  return (
    <NotificationContext.Provider
      value={{
        notificaciones,
        grouped,
        unreadCount,
        markRead: MARK_READ,
        markAllRead: MARK_ALL_READ,
        clearAll: CLEAR_ALL,
        rol, // por si el UI lo necesita
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificaciones() {
  return useContext(NotificationContext);
}