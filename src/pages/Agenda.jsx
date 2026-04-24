import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Heart,
  AlertCircle,
  X,
  Lock,
  Filter,
} from "lucide-react";


// Normaliza variantes de sede al mismo valor canónico
const normalizarSede = (s) => {
  if (!s) return s;
  const mapa = {
    'cl': 'chile', 'CL': 'chile', 'Chile': 'chile',
    'mx': 'mexico', 'MX': 'mexico', 'México': 'mexico', 'Mexico': 'mexico',
    'co': 'colombia', 'CO': 'colombia', 'Colombia': 'colombia',
  };
  return mapa[s] || s.toLowerCase();
};

export default function Agenda() {
  const { userProfile, permisos } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [selectedDay, setSelectedDay] = useState("todos");
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  // ========================================================
  // FILTROS: Sede y Edición (solo para super_admin / staff)
  // ========================================================
  const [selectedSede, setSelectedSede] = useState("");
  const [selectedEdicion, setSelectedEdicion] = useState("");
  const [availableSedes, setAvailableSedes] = useState([]);
  const [availableEdiciones, setAvailableEdiciones] = useState([]);

  // ========================================================
  // Favoritos
  // ========================================================
  const [favorites, setFavorites] = useState(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [wpWarning, setWpWarning] = useState(null);  // Bug C: aviso WP caído

  const days = [
    { id: "todos", label: "Todos", numero: 0 },
    { id: "lunes", label: "Lunes", numero: 1 },
    { id: "martes", label: "Martes", numero: 2 },
    { id: "miercoles", label: "Miércoles", numero: 3 },
    { id: "jueves", label: "Jueves", numero: 4 },
  ];

  // ========================================================
  // Validar acceso
  // ========================================================
  const validateAccess = useCallback(() => {
    if (!permisos) return false;

    if (!permisos.verAgenda) {
      setAccessDenied(true);
      setAccessMessage(
        `Tu pase (${userProfile?.tipo_pase || userProfile?.rol}) no incluye acceso a la Agenda.`
      );
      return false;
    }

    setAccessDenied(false);
    return true;
  }, [permisos, userProfile]);

  // ========================================================
  // Cargar sesiones — FIX: un solo conjunto de params limpios
  // ========================================================
  const loadSessions = useCallback(async () => {
    if (!permisos || !userProfile) return;

    try {
      setLoading(true);
      setWpWarning(null);

      const params = new URLSearchParams();

      // FIX Bug 1: el filtro manual tiene precedencia sobre el automático.
      // Si el usuario eligió sede manualmente (super_admin/staff), usar esa.
      // Si no, y el rol requiere filtrar por sede, usar la sede del perfil.
      if (selectedSede) {
        params.append("sede", selectedSede);
      } else if (permisos.filtraSede && userProfile.sede) {
        params.append("sede", userProfile.sede);
      }

      // Mismo patrón para edición
      if (selectedEdicion) {
        params.append("edicion", selectedEdicion);
      } else if (permisos.filtraEdicion && userProfile.edicion) {
        params.append("edicion", userProfile.edicion);
      }

      const queryString = params.toString();
      const url = `/agenda/sessions${queryString ? `?${queryString}` : ""}`;

      console.log("[Agenda] Cargando:", url);

      const res = await API.get(url);
      const sessionData = Array.isArray(res.data.sessions) ? res.data.sessions : [];

      console.log("[Agenda] Sesiones recibidas del backend:", sessionData.length);

      // Extraer sedes y ediciones disponibles para los selectores
      const sedes = [...new Set(sessionData.map((s) => normalizarSede(s.sede)).filter(Boolean))];
      setAvailableSedes(sedes.sort());

      const ediciones = [...new Set(sessionData.map((s) => s.edicion).filter(Boolean))];
      setAvailableEdiciones(ediciones.sort());

      setSessions(sessionData);
      // Bug C: el backend incluye 'warning' cuando WP no está disponible
      setWpWarning(res.data.warning || null);
    } catch (error) {
      console.error("[Agenda] Error al cargar sesiones:", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [permisos, userProfile, selectedSede, selectedEdicion]);

  // ========================================================
  // FIX Bug 2: cargar solo cuando permisos y usuario están listos
  // ========================================================
  useEffect(() => {
    if (!permisos || !userProfile) return;

    if (!validateAccess()) {
      setLoading(false);
      return;
    }

    loadSessions();
    loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permisos, userProfile]);

  // Recargar cuando cambian los filtros manuales de sede/edición
  useEffect(() => {
    if (!accessDenied && permisos && userProfile) {
      loadSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSede, selectedEdicion]);

  // ========================================================
  // FIX Bug 3: filterSessions — dias null no descartan la sesión
  // para super_admin/staff (diasPermitidos vacío = sin restricción)
  // ========================================================
  useEffect(() => {
    if (!userProfile || !permisos) {
      setFilteredSessions([]);
      return;
    }

    const diasPermitidos = permisos.diasPermitidos || [];
    const sinRestriccionDias = diasPermitidos.length === 0;

    console.log("[Agenda] Filtrando:", {
      selectedDay,
      diasPermitidos,
      sinRestriccionDias,
      totalSesiones: sessions.length,
    });

    let filtered = sessions.filter((s) => {
      const diaSesion = s.dia !== null && s.dia !== undefined ? parseInt(s.dia) : null;

      // Sin restricción de días (super_admin, staff, combo): mostrar todas
      if (sinRestriccionDias) return true;

      // Con restricción: descartar día null o fuera del rango permitido
      if (diaSesion === null || isNaN(diaSesion)) return false;
      return diasPermitidos.includes(diaSesion);
    });

    // Filtro por día seleccionado en el tab
    if (selectedDay !== "todos") {
      const diaNumero = days.find((d) => d.id === selectedDay)?.numero;
      if (diaNumero !== undefined) {
        filtered = filtered.filter((s) => parseInt(s.dia) === diaNumero);
      }
    }

    // Filtros manuales de sede/edición (para cuando el usuario los cambia
    // en el selector — ya se aplican en el backend, pero si el backend
    // retornó datos mixtos por algún motivo, esto actúa como segunda barrera)
    if (selectedSede) {
      filtered = filtered.filter((s) => normalizarSede(s.sede) === selectedSede);
    }
    if (selectedEdicion) {
      filtered = filtered.filter(
        (s) => String(s.edicion) === String(selectedEdicion)
      );
    }

    // Solo favoritos
    if (showOnlyFavorites) {
      filtered = filtered.filter((s) => favorites.has(s.id));
    }

    setFilteredSessions(filtered);
  }, [selectedDay, selectedSede, selectedEdicion, sessions, userProfile, permisos, favorites, showOnlyFavorites]);

  // ========================================================
  // Cargar favoritos
  // ========================================================
  const loadFavorites = async () => {
    if (!userProfile?.id) return;

    try {
      setLoadingFavorites(true);
      const res = await API.get(`/users/${userProfile.id}`);
      if (res.data.favoritos) {
        setFavorites(new Set(res.data.favoritos));
      }
    } catch {
      try {
        const saved = localStorage.getItem(`favorites_${userProfile.id}`);
        if (saved) setFavorites(new Set(JSON.parse(saved)));
      } catch {
        // sin favoritos guardados
      }
    } finally {
      setLoadingFavorites(false);
    }
  };

  // ========================================================
  // Toggle favorito
  // ========================================================
  const toggleFavorite = async (sessionId) => {
    if (!userProfile) return;

    if (!permisos?.puedeFavoritos) {
      alert("Tu pase no permite marcar favoritos");
      return;
    }

    try {
      const isFavorite = favorites.has(sessionId);
      const newFavorites = new Set(favorites);
      isFavorite ? newFavorites.delete(sessionId) : newFavorites.add(sessionId);
      setFavorites(newFavorites);
      localStorage.setItem(`favorites_${userProfile.id}`, JSON.stringify([...newFavorites]));

      if (isFavorite) {
        await API.delete(`/agenda/favorite/${sessionId}`);
      } else {
        await API.post(`/agenda/favorite/${sessionId}`, { userId: userProfile.id });
      }
    } catch (error) {
      console.error("[Agenda] Error al actualizar favorito:", error);
      loadFavorites();
    }
  };

  // ========================================================
  // Guards de render
  // ========================================================
  if (!userProfile || !permisos) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Cargando…
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg flex gap-4">
          <Lock className="text-blue-600 flex-shrink-0 mt-1" size={24} />
          <div>
            <h2 className="text-lg font-bold text-blue-900 mb-2">Acceso Limitado</h2>
            <p className="text-blue-800 mb-4">{accessMessage}</p>
            {permisos?.verExpositores && (
              <button
                onClick={() => navigate("/expositores")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Ver Expositores →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando agenda...</p>
        </div>
      </div>
    );
  }

  // ========================================================
  // Render principal
  // ========================================================
  const diasPermitidos = permisos.diasPermitidos || [];
  const sinRestriccionDias = diasPermitidos.length === 0;
  const diasTexto = { 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves" };
  const diasPermitidosTexto = diasPermitidos.map((d) => diasTexto[d]).join(", ");

  // Mostrar el selector de sede/edición solo para roles sin restricción (admin/staff)
  const puedeVerFiltroManual = !permisos.filtraSede || permisos.puedeEditar;

  return (
    <div>
      {/* Bug C — Banner WordPress caído */}
      {wpWarning && (
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-xl text-sm mb-4">
          <span className="shrink-0">⚠️</span>
          <div className="flex-1">
            <span className="font-semibold">WordPress no disponible — </span>
            mostrando sesiones guardadas localmente. La agenda puede estar incompleta.
          </div>
          <button onClick={() => setWpWarning(null)} className="shrink-0 opacity-60 hover:opacity-100 ml-2">✕</button>
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Agenda del Evento</h1>
          <p className="text-gray-600 text-sm mt-1">
            {userProfile.tipo_pase
              ? <>Pase: <span className="font-semibold capitalize">{userProfile.tipo_pase}</span> | </>
              : null}
            {sinRestriccionDias
              ? "Acceso completo"
              : <>Acceso: <span className="font-semibold">{diasPermitidosTexto}</span></>}
          </p>
        </div>
        <span className="text-sm text-gray-500">
          {showOnlyFavorites
            ? `${filteredSessions.length} favorito${filteredSessions.length !== 1 ? "s" : ""}`
            : `${filteredSessions.length} de ${sessions.length} sesiones`}
        </span>
      </div>

      {/* Banner de acceso limitado */}
      {!sinRestriccionDias && diasPermitidos.length < 4 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6 flex gap-3">
          <AlertCircle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-900">Acceso Limitado</p>
            <p className="text-amber-800 text-sm">
              Tu pase te permite ver sesiones solo en: <strong>{diasPermitidosTexto}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Panel de filtros */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-blue-600" />
          <h3 className="font-semibold text-gray-800">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sede — solo visible para roles sin restricción */}
          {(userProfile?.rol === "super_admin" || userProfile?.rol === "staff") && availableSedes.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sede</label>
              <select
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas las sedes</option>
                {availableSedes.map((sede) => (
                  <option key={sede} value={sede}>
                    {sede.charAt(0).toUpperCase() + sede.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Edición — solo visible para roles sin restricción */}
          {userProfile?.rol === "super_admin" && availableEdiciones.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Edición</label>
              <select
                value={selectedEdicion}
                onChange={(e) => setSelectedEdicion(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas las ediciones</option>
                {availableEdiciones.map((edicion) => (
                  <option key={edicion} value={edicion}>
                    {edicion}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle favoritos — solo si tiene permiso */}
          {permisos?.puedeFavoritos && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ver</label>
              <button
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`w-full px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${showOnlyFavorites
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
              >
                <Heart size={18} fill={showOnlyFavorites ? "currentColor" : "none"} />
                {showOnlyFavorites ? "Solo Favoritos" : "Todas"}
              </button>
            </div>
          )}
        </div>

        {/* Filtros activos */}
        {(selectedSede || selectedEdicion || showOnlyFavorites) && (
          <div className="mt-3 text-sm text-gray-600 flex flex-wrap gap-2 items-center">
            <span className="text-gray-500">Filtros activos:</span>
            {selectedSede && (
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Sede: {selectedSede}
                <button onClick={() => setSelectedSede("")} className="hover:text-blue-600"><X size={12} /></button>
              </span>
            )}
            {selectedEdicion && (
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Edición: {selectedEdicion}
                <button onClick={() => setSelectedEdicion("")} className="hover:text-blue-600"><X size={12} /></button>
              </span>
            )}
            {showOnlyFavorites && (
              <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded">
                ♥ Solo Favoritos
                <button onClick={() => setShowOnlyFavorites(false)} className="hover:text-red-600"><X size={12} /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs de días */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedDay("todos")}
          className={`px-6 py-2 rounded-lg font-medium transition whitespace-nowrap ${selectedDay === "todos"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
        >
          Todos
        </button>

        {days
          .filter((day) => day.numero > 0)
          .map((day) => {
            const permitido = sinRestriccionDias || diasPermitidos.includes(day.numero);
            return (
              <button
                key={day.id}
                onClick={() => permitido && setSelectedDay(day.id)}
                disabled={!permitido}
                title={!permitido ? `Tu pase no incluye ${day.label}` : undefined}
                className={`px-6 py-2 rounded-lg font-medium transition whitespace-nowrap ${!permitido
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                    : selectedDay === day.id
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
              >
                {day.label}
                {!permitido && <Lock size={14} className="inline ml-1" />}
              </button>
            );
          })}
      </div>

      {/* Lista de sesiones */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <Calendar size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium mb-2">
              {sessions.length === 0
                ? "No hay sesiones disponibles"
                : showOnlyFavorites
                  ? "No tienes sesiones marcadas como favoritas"
                  : `No hay sesiones para ${selectedDay === "todos" ? "los días permitidos" : "este día"}`}
            </p>
            {sessions.length > 0 &&
              (selectedDay !== "todos" || selectedSede || selectedEdicion || showOnlyFavorites) && (
                <button
                  onClick={() => {
                    setSelectedDay("todos");
                    setSelectedSede("");
                    setSelectedEdicion("");
                    setShowOnlyFavorites(false);
                  }}
                  className="mt-3 text-blue-600 hover:text-blue-700 underline"
                >
                  Limpiar filtros
                </button>
              )}
          </div>
        ) : (
          filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isFavorite={favorites.has(session.id)}
              onToggleFavorite={toggleFavorite}
              onViewDetails={() => setSelectedSession(session)}
              canMarkFavorites={permisos?.puedeFavoritos}
              esLectura={permisos?.esLectura}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {selectedSession && (
        <SessionModal
          session={selectedSession}
          isFavorite={favorites.has(selectedSession.id)}
          onToggleFavorite={toggleFavorite}
          onClose={() => setSelectedSession(null)}
          canMarkFavorites={permisos?.puedeFavoritos}
          esLectura={permisos?.esLectura}
        />
      )}
    </div>
  );
}

// ========================================================
// SessionCard
// ========================================================
function SessionCard({ session, isFavorite, onToggleFavorite, onViewDetails, canMarkFavorites, esLectura }) {
  const formatTime = (dateString) => {
    if (!dateString) return "Sin hora";
    try {
      return new Date(dateString).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    } catch {
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
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {session.tipo && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${session.tipo === "conferencia" ? "bg-blue-100 text-blue-700"
                  : session.tipo === "curso" ? "bg-green-100 text-green-700"
                    : "bg-purple-100 text-purple-700"
                }`}>
                {session.tipo.toUpperCase()}
              </span>
            )}
            {session.dia !== null && session.dia !== undefined && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                Día {session.dia}
              </span>
            )}
            {session.sede && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                {session.sede.toUpperCase()}
              </span>
            )}
            {session.edicion && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                {session.edicion}
              </span>
            )}
            {esLectura && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                <Lock size={12} /> Lectura
              </span>
            )}
          </div>

          <h3 className="text-xl font-bold mb-2">{session.titulo || "Sin título"}</h3>
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

        {canMarkFavorites && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(session.id); }}
            className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition"
            title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          >
            <Heart size={24} className={isFavorite ? "text-red-600 fill-red-600" : "text-gray-400"} />
          </button>
        )}
      </div>
    </div>
  );
}

// ========================================================
// SessionModal
// ========================================================
function SessionModal({ session, isFavorite, onToggleFavorite, onClose, canMarkFavorites, esLectura }) {
  const formatTime = (dateString) => {
    if (!dateString) return "Sin hora";
    try {
      return new Date(dateString).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl sticky top-0">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{session.titulo}</h2>
              <div className="flex flex-wrap gap-2">
                {session.tipo && <span className="px-3 py-1 rounded-full text-sm font-medium bg-white/20">{session.tipo.toUpperCase()}</span>}
                {session.sede && <span className="px-3 py-1 rounded-full text-sm font-medium bg-white/20">{session.sede.toUpperCase()}</span>}
                {session.edicion && <span className="px-3 py-1 rounded-full text-sm font-medium bg-white/20">{session.edicion}</span>}
                {esLectura && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-900 flex items-center gap-1">
                    <Lock size={14} /> Lectura
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canMarkFavorites && (
                <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(session.id); }} className="text-white hover:bg-white/20 p-2 rounded-lg transition">
                  <Heart size={24} className={isFavorite ? "fill-current" : ""} />
                </button>
              )}
              <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition">
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {session.descripcion && (
            <div>
              <h3 className="font-bold text-lg mb-2">Descripción</h3>
              <p className="text-gray-700 leading-relaxed">{session.descripcion}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {(session.horaInicio || session.horaFin) && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600 mb-1 flex items-center gap-2"><Clock size={14} /> HORARIO</p>
                <p className="font-bold text-blue-900">
                  {formatTime(session.horaInicio)}
                  {session.horaFin && ` - ${formatTime(session.horaFin)}`}
                </p>
              </div>
            )}
            {session.dia !== null && session.dia !== undefined && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-xs text-gray-600 mb-1">DÍA</p>
                <p className="font-bold text-purple-900">Día {session.dia}</p>
              </div>
            )}
            {session.sala && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-xs text-gray-600 mb-1 flex items-center gap-2"><MapPin size={14} /> SALA</p>
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

          {session.speakerNombre && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-2 flex items-center gap-2"><User size={14} /> EXPOSITOR</p>
              <p className="font-bold text-gray-900">{session.speakerNombre}</p>
            </div>
          )}

          <div className="flex gap-2">
            {canMarkFavorites && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(session.id); }}
                className={`flex-1 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${isFavorite ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
              >
                <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
                {isFavorite ? "En Favoritos" : "Agregar a Favoritos"}
              </button>
            )}
            <button onClick={onClose} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}