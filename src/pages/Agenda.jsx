import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import API from "../services/api";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Star,
  StarOff,
} from "lucide-react";

export default function Agenda() {
  const { userProfile } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [selectedDay, setSelectedDay] = useState("lunes");
  const [loading, setLoading] = useState(true);

  const days = ["lunes", "martes", "miercoles", "jueves"];

  // Cargar sesiones al montar el componente
  useEffect(() => {
    loadSessions();
  }, []);

  // Filtrar sesiones cuando cambia el día seleccionado
  useEffect(() => {
    filterSessions();
  }, [selectedDay, sessions]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      
      // Llamar al endpoint correcto
      const res = await API.get("/agenda/sessions");
      
      console.log("📅 Sesiones recibidas:", res.data);

      // Extraer las sesiones del response
      const sessionData = res.data.sessions || [];
      setSessions(Array.isArray(sessionData) ? sessionData : []);

    } catch (error) {
      console.error("❌ Error al cargar sesiones:", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const filterSessions = () => {
    const filtered = sessions.filter((s) => {
      if (!s.horaInicio) return false;

      const day = new Date(s.horaInicio)
        .toLocaleDateString("es-MX", { weekday: "long" })
        .toLowerCase();

      return day === selectedDay;
    });

    setFilteredSessions(filtered);
  };

  const toggleFavorite = async (sessionId) => {
    if (!userProfile) return;

    try {
      const url = `/agenda/favorite/${sessionId}`;

      await API.post(url, {
        userId: userProfile.id
      });

      console.log("⭐ Favorito actualizado");

    } catch (error) {
      console.error("❌ Error al actualizar favorito:", error);
    }
  };

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
        <p className="ml-4 text-gray-600">Cargando agenda...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Agenda del Evento</h1>
      </div>

      {/* Filtros por día */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
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

      {/* Debug info */}
      <div className="bg-gray-100 p-4 rounded-lg mb-4 text-sm">
        <p><strong>Total sesiones:</strong> {sessions.length}</p>
        <p><strong>Día seleccionado:</strong> {selectedDay}</p>
        <p><strong>Sesiones filtradas:</strong> {filteredSessions.length}</p>
      </div>

      {/* Lista de sesiones */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <Calendar size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">
              {sessions.length === 0 
                ? "No hay sesiones disponibles"
                : `No hay sesiones programadas para ${selectedDay}`
              }
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onToggleFavorite={toggleFavorite}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SessionCard({ session, onToggleFavorite }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                session.tipo === "conferencia"
                  ? "bg-blue-100 text-blue-700"
                  : session.tipo === "curso"
                  ? "bg-green-100 text-green-700"
                  : "bg-purple-100 text-purple-700"
              }`}
            >
              {session.tipo}
            </span>
          </div>

          <h3 className="text-xl font-bold mb-2">{session.titulo}</h3>
          <p className="text-gray-600 mb-4 line-clamp-2">{session.descripcion}</p>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock size={16} />
              {session.horaInicio ? new Date(session.horaInicio).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit'
              }) : 'Sin hora'}
              {session.horaFin && ` - ${new Date(session.horaFin).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit'
              })}`}
            </div>

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

        <button
          onClick={() => onToggleFavorite(session.id)}
          className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <StarOff size={24} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
}