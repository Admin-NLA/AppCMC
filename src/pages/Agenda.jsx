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
  X,
} from "lucide-react";

export default function Agenda() {
  const { userProfile } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [selectedDay, setSelectedDay] = useState("todos");
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const days = [
    { id: "todos", label: "Todos" },
    { id: "lunes", label: "Lunes" },
    { id: "martes", label: "Martes" },
    { id: "miercoles", label: "Miércoles" },
    { id: "jueves", label: "Jueves" }
  ];

  // ========================================================
  // Cargar sesiones al montar el componente
  // ========================================================
  useEffect(() => {
    loadSessions();
  }, []);

  // ========================================================
  // Filtrar sesiones cuando cambia el día seleccionado
  // ========================================================
  useEffect(() => {
    filterSessions();
  }, [selectedDay, sessions]);

  // ========================================================
  // CARGAR SESIONES DESDE API
  // ========================================================
  const loadSessions = async () => {
    try {
      setLoading(true);
      
      const res = await API.get("/agenda/sessions");
      
      console.log("📅 Response estructura:", {
        hasSessions: !!res.data.sessions,
        isArray: Array.isArray(res.data.sessions),
        count: res.data.sessions?.length
      });
      
      // ✅ Extraer correctamente el array de sesiones
      const sessionData = Array.isArray(res.data.sessions) 
        ? res.data.sessions 
        : [];
      
      console.log("✅ Sesiones cargadas:", sessionData.length);
      console.log("📋 Primeras 3 sesiones:", sessionData.slice(0, 3));
      
      setSessions(sessionData);

    } catch (error) {
      console.error("❌ Error al cargar sesiones:", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // FILTRAR SESIONES POR DÍA
  // ========================================================
  const filterSessions = () => {
    console.log("🔍 Filtrando por:", selectedDay, "Total sesiones:", sessions.length);
    
    if (selectedDay === "todos") {
      setFilteredSessions(sessions);
      console.log("📌 Mostrando todas:", sessions.length);
      return;
    }

    const filtered = sessions.filter((s) => {
      // ✅ Usar el campo 'dia' directamente (que ya está normalizado en backend)
      const dia = s.dia ? String(s.dia).toLowerCase() : "";
      const match = dia === selectedDay;
      
      if (match) {
        console.log("✅ Match encontrado:", s.titulo, "día:", dia);
      }
      
      return match;
    });

    console.log("📌 Sesiones filtradas:", filtered.length);
    setFilteredSessions(filtered);
  };

  // ========================================================
  // AGREGAR A FAVORITOS
  // ========================================================
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

  // ========================================================
  // RENDERIZADO
  // ========================================================
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
        <span className="text-sm text-gray-500">
          {sessions.length} sesiones totales
        </span>
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
                <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-48">
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
              onViewDetails={() => setSelectedSession(session)}
            />
          ))
        )}
      </div>

      {/* Modal de detalles de sesión */}
      {selectedSession && (
        <SessionModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}

// ========================================================
// TARJETA DE SESIÓN
// ========================================================
function SessionCard({ session, onToggleFavorite, onViewDetails }) {
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
    <div 
      className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition cursor-pointer"
      onClick={onViewDetails}
    >
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
                {session.tipo.toUpperCase()}
              </span>
            )}
            {session.dia && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {session.dia}
              </span>
            )}
            {session.sede && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                {session.sede.toUpperCase()}
              </span>
            )}
          </div>

          <h3 className="text-xl font-bold mb-2">{session.titulo || 'Sin título'}</h3>
          {session.descripcion && (
            <p className="text-gray-600 mb-4 line-clamp-2">{session.descripcion}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {(session.horaInicio || session.horaFin) && (
              <div className="flex items-center gap-1">
                <Clock size={16} />
                {formatTime(session.horaInicio)}
                {session.horaFin && ` - ${formatTime(session.horaFin)}`}
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

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(session.id);
          }}
          className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition"
          title="Agregar a favoritos"
        >
          <StarOff size={24} className="text-gray-400 hover:text-yellow-500" />
        </button>
      </div>
    </div>
  );
}

// ========================================================
// MODAL DE DETALLES DE SESIÓN
// ========================================================
function SessionModal({ session, onClose }) {
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

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Sin fecha';
    try {
      return new Date(dateString).toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl sticky top-0">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">{session.titulo}</h2>
              <div className="flex flex-wrap gap-2">
                {session.tipo && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-white/20">
                    {session.tipo.toUpperCase()}
                  </span>
                )}
                {session.sede && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-white/20">
                    {session.sede.toUpperCase()}
                  </span>
                )}
                {session.edicion && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-white/20">
                    {session.edicion}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Descripción */}
          {session.descripcion && (
            <div>
              <h3 className="font-bold text-lg mb-2">Descripción</h3>
              <p className="text-gray-700 leading-relaxed">{session.descripcion}</p>
            </div>
          )}

          {/* Detalles */}
          <div className="grid grid-cols-2 gap-4">
            {(session.horaInicio || session.horaFin) && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600 mb-1 flex items-center gap-2">
                  <Clock size={14} />
                  HORARIO
                </p>
                <p className="font-bold text-blue-900">
                  {formatTime(session.horaInicio)}
                  {session.horaFin && ` - ${formatTime(session.horaFin)}`}
                </p>
              </div>
            )}

            {session.dia && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-xs text-gray-600 mb-1">DÍA</p>
                <p className="font-bold text-purple-900 capitalize">{session.dia}</p>
              </div>
            )}

            {session.sala && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-xs text-gray-600 mb-1 flex items-center gap-2">
                  <MapPin size={14} />
                  SALA
                </p>
                <p className="font-bold text-green-900">{session.sala}</p>
              </div>
            )}

            {session.edicion && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-xs text-gray-600 mb-1">EDICIÓN</p>
                <p className="font-bold text-orange-900">{session.edicion}</p>
              </div>
            )}
          </div>

          {/* Speaker */}
          {session.speakerNombre && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-2 flex items-center gap-2">
                <User size={14} />
                EXPOSITOR
              </p>
              <p className="font-bold text-gray-900">{session.speakerNombre}</p>
            </div>
          )}

          {/* QR Sala */}
          {session.qrSala && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600 mb-2">CÓDIGO QR</p>
              <p className="font-mono text-sm text-blue-900 break-all">{session.qrSala}</p>
            </div>
          )}

          {/* Información de fuente */}
          <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 border border-gray-200">
            {session.source === 'wordpress' && (
              <p>📡 <strong>Fuente:</strong> Sincronizado desde WordPress</p>
            )}
            {session.source === 'wordpress-edited' && (
              <p>📡 ✏️ <strong>Fuente:</strong> Editado localmente (basado en WordPress)</p>
            )}
            {session.source === 'local' && (
              <p>💾 <strong>Fuente:</strong> Creado localmente</p>
            )}
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}