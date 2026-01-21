import { createContext, useContext, useEffect, useState } from "react";

const EventContext = createContext();

export function EventProvider({ user, children }) {
  const [sedeActiva, setSedeActiva] = useState(null);
  const [edicionActiva, setEdicionActiva] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setReady(false);
      return;
    }

    setSedeActiva(user.sede || null);
    setEdicionActiva(user.edicion || 2025);

    setReady(true);
  }, [user]);

  return (
    <EventContext.Provider
      value={{
        sedeActiva,
        edicionActiva,
        setSedeActiva,
        setEdicionActiva,
        ready,
        multiSede: Boolean(user?.multi_sedes),
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