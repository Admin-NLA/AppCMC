// src/context/EventContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const EventContext = createContext(null);

export const EventProvider = ({ children }) => {
  const { user } = useAuth();

  const [sedeActiva, setSedeActiva] = useState(null);
  const [edicionActiva, setEdicionActiva] = useState(null);
  const [sedesPermitidas, setSedesPermitidas] = useState([]);
  const [edicionesPermitidas, setEdicionesPermitidas] = useState([]);

  useEffect(() => {
    if (!user || !user.pases) return;

    const pases = user.pases;

    // Ediciones permitidas
    const ediciones = [...new Set(pases.map(p => p.edicion))].sort();
    setEdicionesPermitidas(ediciones);

    // Año actual
    const currentYear = new Date().getFullYear();

    // Edición activa por defecto
    const edicionDefault = ediciones.includes(currentYear)
      ? currentYear
      : Math.max(...ediciones);

    setEdicionActiva(edicionDefault);

    // Sedes permitidas (según edición activa)
    const sedes = pases
      .filter(p => p.edicion === edicionDefault)
      .map(p => p.sede);

    const sedesUnicas = [...new Set(sedes)];
    setSedesPermitidas(sedesUnicas);

    // Sede activa por defecto
    setSedeActiva(sedesUnicas.length === 1 ? sedesUnicas[0] : sedesUnicas[0]);

  }, [user]);

  const value = {
    sedeActiva,
    edicionActiva,
    sedesPermitidas,
    edicionesPermitidas,
    setSedeActiva,
    setEdicionActiva
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
};