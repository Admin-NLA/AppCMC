// src/contexts/EventContext.jsx
//
// FIX: El contexto original solo leía user.sede del perfil del usuario,
// ignorando completamente la configuración guardada en /api/config/evento-activo.
// Resultado: cambiar la sede en ConfiguracionPanel no tenía ningún efecto.
//
// NUEVO FLUJO:
//   1. Al montar, llama GET /api/config/evento-activo para obtener
//      sede_activa, edicion_activa y fechas del evento.
//   2. Super_admin y staff usan la sede_activa del backend (pueden verlo todo).
//   3. Asistentes/expositores/speakers usan su propia user.sede —
//      si no tienen sede asignada, caen al default del backend.
//   4. refreshConfig() permite recargar desde cualquier página
//      (ConfiguracionPanel lo llama tras guardar).

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import API from "../services/api";

const EventContext = createContext();

export function EventProvider({ user, children }) {
  const [sedeActiva,    setSedeActiva]    = useState(null);
  const [edicionActiva, setEdicionActiva] = useState(2026);
  const [fechaInicio,   setFechaInicio]   = useState(null);
  const [fechaFin,      setFechaFin]      = useState(null);
  const [tiposActivos,  setTiposActivos]  = useState([]);
  const [ready,         setReady]         = useState(false);
  const [configBackend, setConfigBackend] = useState(null); // config raw del backend

// ── Cargar config desde el backend ──────────────────────
  const refreshConfig = useCallback(async () => {
    try {
      const res = await API.get("/config/evento-activo");
      const data = res.data?.data || res.data;
      if (data) {
        setConfigBackend(data);
        setEdicionActiva(data.edicion_activa ?? 2026);
        setFechaInicio(data.fecha_inicio ?? null);
        setFechaFin(data.fecha_fin ?? null);
        // tipos_activos puede no existir en la tabla config simple
        if (data.tipos_activos) {
          setTiposActivos(
            Array.isArray(data.tipos_activos)
              ? data.tipos_activos
              : ["brujula","toolbox","spark","orion","tracker","curso"]
          );
        }
        return data;
      }
    } catch (err) {
      console.warn("⚠️ EventContext: no se pudo cargar config del backend:", err.message);
    }
    return null;
  }, []);

  // ── Resolver sedeActiva según rol + config backend ───────
  const resolverSede = useCallback((userData, backendConfig) => {
    if (!userData) return null;

    // Super admin y staff pueden ver todo — usamos la sede del backend como "contexto"
    // pero NO filtramos por ella (pueden cambiarla manualmente)
    if (userData.rol === "super_admin" || userData.rol === "staff") {
      return backendConfig?.sede_activa ?? null;
    }

    // Asistentes, speakers, expositores: usan su propia sede
    // Si no tienen sede asignada, usar la del backend
    return userData.sede ?? backendConfig?.sede_activa ?? null;
  }, []);

  // ── Efecto principal: cuando cambia el usuario ───────────
  useEffect(() => {
    if (!user) {
      setReady(false);
      setConfigBackend(null);
      return;
    }

    setReady(false);

    refreshConfig().then((backendConfig) => {
      const sede = resolverSede(user, backendConfig);
      setSedeActiva(sede);
      setReady(true);
      console.log(`✅ EventContext listo: sede=${sede}, edicion=${backendConfig?.edicion_activa ?? 2026}`);
    });
  }, [user?.id]); // Solo re-ejecutar si cambia el usuario (no en cada render)

  return (
    <EventContext.Provider
      value={{
        sedeActiva,
        edicionActiva,
        fechaInicio,
        fechaFin,
        tiposActivos,
        setSedeActiva,
        setEdicionActiva,
        ready,
        multiSede: Boolean(user?.multi_sedes),
        configBackend,
        refreshConfig,  // ← ConfiguracionPanel llama esto tras guardar
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEvent debe usarse dentro de EventProvider");
  }
  return context;
}