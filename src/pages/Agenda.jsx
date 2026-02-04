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
  AlertCircle,
} from "lucide-react";

export default function Agenda() {
  const { userProfile } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [selectedDay, setSelectedDay] = useState("todos");
  const [loading, setLoading] = useState(true);

  const days = [
    { id: "todos", label: "Todos" },
    { id: "lunes", label: "Lunes" },
    { id: "martes", label: "Martes" },
    { id: "miercoles", label: "Miércoles" },
    { id: "jueves", label: "Jueves" }
  ];

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
      
      const res = await API.get("/agenda/sessions");
      
      console.log("📅 Sesiones recibidas:", res.data);
      console.log("📅 Primera sesión:", res.data.sessions?.[0]);

      // Extraer las sesiones del response
      const sessionData = res.data.sessions || res.data || [];
      setSessions(Array.isArray(sessionData) ? sessionData : []);

    } catch (error) {
      console.error("❌ Error al cargar sesiones:", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const filterSessions = () => {
    // Si selecciona "todos", mostrar todas
    if (selectedDay === "todos") {
      setFilteredSessions(sessions);
      return;
    }

    const filtered = sessions.filter((s) => {
      // Si la sesión tiene el campo 'dia', usarlo
      if (s.dia) {
        return s.dia.toLowerCase() === selectedDay;
      }

      // Si no tiene 'dia', intentar extraerlo de horaInicio
      if (s.horaInicio) {
        const day = new Date(s.horaInicio)
          .toLocaleDateString("es-MX", { weekday: "long" })
          .toLowerCase();
        return day === selectedDay;
      }

      // Si no tiene ni 'dia' ni 'horaInicio', no mostrar
      return false;
    });

    setFilteredSessions(filtered);
  };

  const toggleFavorite = async (sessionId) => {
    if (!userProfile) return;

    try {
      await API.post(`/agenda/favorite/${sessionId}`, {
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
            key={day.id}
            onClick={() => setSelectedDay(day.id)}
            className={`px-6 py-2 rounded-lg font-medium transition whitespace-nowrap ${
              selectedDay === day.id
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {day.label}
          </button>
        ))}
      </div>

      {/* Debug info */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertCircle size={20} className="text-blue-600 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 mb-1">Información de depuración:</p>
            <p className="text-blue-800"><strong>Total sesiones cargadas:</strong> {sessions.length}</p>
            <p className="text-blue-800"><strong>Filtro actual:</strong> {selectedDay}</p>
            <p className="text-blue-800"><strong>Sesiones mostradas:</strong> {filteredSessions.length}</p>
            {sessions.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-700 hover:text-blue-900">
                  Ver estructura de primera sesión
                </summary>
                <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
                  {JSON.stringify(sessions[0], null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>

      {/* Lista de sesiones */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <Calendar size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium mb-2">
              {sessions.length === 0 
                ? "No hay sesiones disponibles"
                : `No hay sesiones programadas para ${selectedDay}`
              }
            </p>
            {sessions.length > 0 && selectedDay !== "todos" && (
              <button
                onClick={() => setSelectedDay("todos")}
                className="mt-3 text-blue-600 hover:text-blue-700 underline"
              >
                Ver todas las sesiones
              </button>
            )}
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
  // Función para formatear la hora
  const formatTime = (dateString) => {
    if (!dateString) return 'Sin hora';
    try {
      return new Date(dateString).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {session.tipo && (
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
            )}
            {session.dia && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {session.dia}
              </span>
            )}
          </div>

          <h3 className="text-xl font-bold mb-2">{session.titulo || 'Sin título'}</h3>
          {session.descripcion && (
            <p className="text-gray-600 mb-4 line-clamp-2">{session.descripcion}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock size={16} />
              {formatTime(session.horaInicio)}
              {session.horaFin && ` - ${formatTime(session.horaFin)}`}
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
          title="Agregar a favoritos"
        >
          <StarOff size={24} className="text-gray-400 hover:text-yellow-500" />
        </button>
      </div>
    </div>
  );
}