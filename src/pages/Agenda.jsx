import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import {
  sedesPermitidasFromPases,
  sedeActivaPorFecha,
} from "../utils/sedeHelper.js";

export default function Agenda() {
  const { userProfile } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [selectedDay, setSelectedDay] = useState("lunes");
  const [selectedSede, setSelectedSede] = useState(null);
  const [loading, setLoading] = useState(true);

  const days = ["lunes", "martes", "miercoles", "jueves"];

  // ===============================
  // Sedes por pases
  // ===============================
  const pasesUsuario = userProfile?.pases || [];
  const sedesPermitidas = sedesPermitidasFromPases(pasesUsuario);
  const sedePorFecha = sedeActivaPorFecha();

  // ===============================
  // Selección automática de sede
  // ===============================
  useEffect(() => {
    if (!userProfile) return;

    // Fallback si no hay pases
    if (!userProfile.pases || userProfile.pases.length === 0) {
      setSelectedSede("MX"); // asegúrate que exista en DB
      return;
    }

    // Una sola sede permitida
    if (sedesPermitidas.length === 1) {
      setSelectedSede(sedesPermitidas[0].name);
      return;
    }

    // Sede por fecha
    if (!selectedSede && sedePorFecha) {
      setSelectedSede(sedePorFecha.name);
    }
  }, [userProfile, sedesPermitidas, sedePorFecha, selectedSede]);

  // ===============================
  // Cargar sesiones
  // ===============================
  useEffect(() => {
    if (!selectedSede) return;

    const loadSessions = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/agenda/sessions?sede=${selectedSede}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      } catch (err) {
        console.error("Error cargando agenda:", err);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [selectedSede]);

  // ===============================
  // Filtrar por día
  // ===============================
  useEffect(() => {
    const filtered = sessions.filter(
      (s) =>
        typeof s.dia === "string" &&
        s.dia.toLowerCase() === selectedDay
    );
    setFilteredSessions(filtered);
  }, [sessions, selectedDay]);

  // ===============================
  // Guards
  // ===============================
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
      </div>
    );
  }

  // ===============================
  // UI
  // ===============================
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Agenda del Evento</h1>

      {/* Filtros por día */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              selectedDay === day
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {day.charAt(0).toUpperCase() + day.slice(1)}
          </button>
        ))}
      </div>

      {/* Sesiones */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <Calendar size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">
              No hay sesiones programadas para este día
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))
        )}
      </div>
    </div>
  );
}

/* ==========================================
      Tarjeta de sesión
========================================== */
function SessionCard({ session }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
      <div className="flex-1">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            session.tipo === "conferencia"
              ? "bg-blue-100 text-blue-700"
              : session.tipo === "curso"
              ? "bg-green-100 text-green-700"
              : "bg-purple-100 text-purple-700"
          }`}
        >
          {session.tipo || "Sesión"}
        </span>

        <h3 className="text-xl font-bold mt-2 mb-2">
          {session.titulo}
        </h3>

        {session.descripcion && (
          <p className="text-gray-600 mb-4">{session.descripcion}</p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {session.horaInicio && session.horaFin && (
            <div className="flex items-center gap-1">
              <Clock size={16} />
              {session.horaInicio} - {session.horaFin}
            </div>
          )}

          {session.sala && (
            <div className="flex items-center gap-1">
              <MapPin size={16} />
              {session.sala}
            </div>
          )}

          {session.speakerNombre && (
            <div className="flex items-center gap-1">
              <User size={16} />
              {session.speakerNombre}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}