import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useEvent } from "../contexts/EventContext.jsx";
import API from "../services/api";
import {
  Users,
  Search,
  AlertCircle,
  Filter,
  Mail,
  MapPin,
  Briefcase,
  X
} from "lucide-react";
import Header from "../Components/layout/Header";

export default function Networking() {
  const { userProfile, permisos } = useAuth();
  const { sedeActiva, edicionActiva } = useEvent();

  const [asistentes, setAsistentes] = useState([]);
  const [filteredAsistentes, setFilteredAsistentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [error, setError] = useState(null);
  const [selectedAsistente, setSelectedAsistente] = useState(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRol, setSelectedRol] = useState("todos");
  const [selectedSede, setSelectedSede] = useState("todos");

  const roles = [
    { id: "todos", label: "Todos los roles" },
    { id: "asistente_general", label: "Asistente General" },
    { id: "asistente_curso", label: "Asistente Curso" },
    { id: "asistente_sesiones", label: "Asistente Sesiones" },
    { id: "asistente_combo", label: "Asistente Combo" },
    { id: "expositor", label: "Expositor" },
    { id: "speaker", label: "Speaker" }
  ];

  // ========================================================
  // VALIDACIÓN DE ACCESO
  // ========================================================
  const validateAccess = () => {
    if (!permisos?.verNetworking) {
      setAccessDenied(true);
      setAccessMessage("No tienes permiso para acceder al networking");
      return false;
    }
    return true;
  };

  // ========================================================
  // CARGAR ASISTENTES
  // ========================================================
  useEffect(() => {
    if (!validateAccess()) {
      setLoading(false);
      return;
    }
    loadAsistentes();
  }, [permisos, userProfile]);

  const loadAsistentes = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      // Filtros automáticos por sede/edición
      if (permisos?.filtraSede && sedeActiva) {
        params.append("sede", sedeActiva);
      }
      if (permisos?.filtraEdicion && edicionActiva) {
        params.append("edicion", edicionActiva);
      }

      // ⚠️ CASO ESPECIAL: Rol ASISTENTE GENERAL (tipo_pase = general)
      // Solo ve otros asistentes generales
      if (userProfile?.rol === "asistente" && userProfile?.tipo_pase === "general") {
        params.append("tipo_pase", "general");
      }

      const res = await API.get(`/networking?${params.toString()}`);
      const data = Array.isArray(res.data) ? res.data : res.data.asistentes || [];

      console.log(`✅ ${data.length} asistentes cargados`);
      setAsistentes(data);
      applyFilters(data);
    } catch (err) {
      console.error("Error cargando asistentes:", err);
      setError("Error al cargar los asistentes");
      setAsistentes([]);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // APLICAR FILTROS
  // ========================================================
  const applyFilters = (data) => {
    let filtered = [...data];

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por rol
    if (selectedRol !== "todos") {
      filtered = filtered.filter((a) => a.rol === selectedRol);
    }

    // Filtro por sede
    if (selectedSede !== "todos") {
      filtered = filtered.filter((a) => a.sede === selectedSede);
    }

    setFilteredAsistentes(filtered);
  };

  // Re-aplicar filtros cuando cambian
  useEffect(() => {
    applyFilters(asistentes);
  }, [searchTerm, selectedRol, selectedSede]);

  // Obtener sedes únicas
  const sedesUnicas = [...new Set(asistentes.map((a) => a.sede).filter(Boolean))];

  // ========================================================
  // RENDERIZADO
  // ========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando asistentes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 mt-1" size={24} />
              <div>
                <p className="text-red-800 font-semibold text-lg">{accessMessage}</p>
                <p className="text-red-700 text-sm mt-2">
                  Solo Asistentes de Sesiones, Combo y algunos otros roles pueden acceder.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Users size={32} className="text-blue-600" />
            Networking
          </h1>
          <p className="text-gray-600">
            Red de contactos del evento - Conéctate con otros asistentes
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 flex items-start gap-3">
            <AlertCircle className="text-red-600 mt-1" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Filter size={20} />
            Filtros
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Buscar por nombre, email o empresa
              </label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Rol */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Rol
              </label>
              <select
                value={selectedRol}
                onChange={(e) => setSelectedRol(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sede */}
            {sedesUnicas.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sede
                </label>
                <select
                  value={selectedSede}
                  onChange={(e) => setSelectedSede(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="todos">Todas las sedes</option>
                  {sedesUnicas.map((sede) => (
                    <option key={sede} value={sede}>
                      {sede.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Resumen */}
            <div className="flex items-end">
              <div className="w-full">
                <p className="text-sm text-gray-600 mb-2">
                  Mostrando {filteredAsistentes.length} de {asistentes.length}
                </p>
                <div className="flex gap-2">
                  {searchTerm || selectedRol !== "todos" || selectedSede !== "todos" ? (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedRol("todos");
                        setSelectedSede("todos");
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-semibold text-sm"
                    >
                      Limpiar filtros
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de asistentes */}
        {filteredAsistentes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">
              {asistentes.length === 0
                ? "No hay asistentes disponibles"
                : "No hay asistentes que coincidan con los filtros"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAsistentes.map((asistente) => (
              <AsistenteCard
                key={asistente.id}
                asistente={asistente}
                onSelect={() => setSelectedAsistente(asistente)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalles */}
      {selectedAsistente && (
        <AsistenteModal
          asistente={selectedAsistente}
          onClose={() => setSelectedAsistente(null)}
        />
      )}
    </div>
  );
}

// ========================================================
// COMPONENTES AUXILIARES
// ========================================================

function AsistenteCard({ asistente, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition cursor-pointer overflow-hidden"
    >
      {/* Avatar */}
      <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
        {asistente.foto ? (
          <img
            src={asistente.foto}
            alt={asistente.nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-white text-5xl font-bold">
            {asistente.nombre?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-lg mb-1">
          {asistente.nombre || "Sin nombre"}
        </h3>

        <p className="text-sm text-blue-600 font-semibold mb-3 capitalize">
          {asistente.rol?.replace(/_/g, " ") || "N/A"}
        </p>

        {/* Email */}
        {asistente.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Mail size={16} />
            <span className="truncate">{asistente.email}</span>
          </div>
        )}

        {/* Empresa */}
        {asistente.empresa && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Briefcase size={16} />
            <span className="truncate">{asistente.empresa}</span>
          </div>
        )}

        {/* Sede */}
        {asistente.sede && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin size={16} />
            <span className="uppercase font-semibold text-orange-600">
              {asistente.sede}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function AsistenteModal({ asistente, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-1">{asistente.nombre}</h2>
            <p className="text-blue-100 capitalize">
              {asistente.rol?.replace(/_/g, " ")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          {/* Email */}
          {asistente.email && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                Email
              </p>
              <a
                href={`mailto:${asistente.email}`}
                className="text-blue-600 hover:text-blue-700 break-all"
              >
                {asistente.email}
              </a>
            </div>
          )}

          {/* Teléfono */}
          {asistente.telefono && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                Teléfono
              </p>
              <p>{asistente.telefono}</p>
            </div>
          )}

          {/* Empresa */}
          {asistente.empresa && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                Empresa
              </p>
              <p>{asistente.empresa}</p>
            </div>
          )}

          {/* Cargo */}
          {asistente.cargo && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                Cargo
              </p>
              <p>{asistente.cargo}</p>
            </div>
          )}

          {/* Sede */}
          {asistente.sede && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                Sede
              </p>
              <p className="text-orange-600 font-semibold uppercase">
                {asistente.sede}
              </p>
            </div>
          )}

          {/* Bio */}
          {asistente.bio && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                Bio
              </p>
              <p className="text-gray-700 text-sm">{asistente.bio}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}