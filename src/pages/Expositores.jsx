import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import API from "../services/api";
import {
  Search,
  MapPin,
  Globe,
  AlertCircle,
  Phone,
  Mail,
  ExternalLink,
  Lock,
  X,
} from "lucide-react";

export default function Expositores() {
  const { userProfile, permisos } = useAuth(); // ← AGREGADO: permisos

  const [expositores, setExpositores] = useState([]);
  const [filteredExpositores, setFilteredExpositores] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpositor, setSelectedExpositor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState("todos");
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  // ========================================================
  // FILTROS: Sede y Edición
  // ========================================================
  const [selectedSede, setSelectedSede] = useState("");
  const [selectedEdicion, setSelectedEdicion] = useState("");
  const [availableSedes, setAvailableSedes] = useState([]);
  const [availableEdiciones, setAvailableEdiciones] = useState([]);

  // ========================================================
  // NUEVO: Validar acceso usando permisos de sedeHelper
  // ========================================================
  const validateAccess = () => {
    if (!permisos) {
      console.warn("⚠️ Permisos aún no cargados");
      return false;
    }

    // Si verExpositores es false, denegar acceso
    if (!permisos.verExpositores) {
      setAccessDenied(true);
      setAccessMessage(
        `Tu pase (${userProfile?.tipo_pase}) no incluye acceso a Expositores.`
      );
      console.warn("❌ Acceso denegado: Usuario sin permiso para ver Expositores");
      return false;
    }

    console.log(`✅ Acceso concedido: Expositores visible para ${userProfile?.tipo_pase}`);
    return true;
  };

  // ========================================================
  // Cargar expositores al montar el componente
  // ========================================================
  useEffect(() => {
    if (!validateAccess()) {
      setLoading(false);
      return;
    }

    loadExpositores();
  }, [permisos, userProfile]);

  // ========================================================
  // Filtrar expositores cuando cambia búsqueda o categoría
  // ========================================================
  useEffect(() => {
    filterExpositores();
  }, [searchTerm, filterCategory, expositores, selectedSede, selectedEdicion]);

  // ========================================================
  // CARGAR EXPOSITORES DESDE API CON FILTROS
  // ========================================================
  const loadExpositores = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🏢 Cargando expositores...");

      const params = new URLSearchParams();

      // Aplicar filtro de sede si el usuario tiene filtraSede = true
      if (permisos?.filtraSede && userProfile?.sede) {
        params.append("sede", userProfile.sede);
      }

      // Aplicar filtro de edición si el usuario tiene filtraEdicion = true
      if (permisos?.filtraEdicion && userProfile?.edicion) {
        params.append("edicion", userProfile.edicion);
      }

      if (selectedSede) params.append("sede", selectedSede);
      if (selectedEdicion) params.append("edicion", selectedEdicion);

      const queryString = params.toString();
      const url = `/expositores${queryString ? `?${queryString}` : ""}`;

      console.log("🔗 URL:", url);

      const res = await API.get(url);

      const expositoresData = Array.isArray(res.data) ? res.data : [];

      console.log(`✅ ${expositoresData.length} expositores cargados`);

      const sedes = [...new Set(expositoresData.map((e) => e.sede).filter(Boolean))];
      setAvailableSedes(sedes.sort());

      const ediciones = [...new Set(expositoresData.map((e) => e.edicion).filter(Boolean))];
      setAvailableEdiciones(ediciones.sort());

      setExpositores(expositoresData);

    } catch (error) {
      console.error("❌ Error al cargar expositores:", error);
      setError(error.message);
      setExpositores([]);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // Recargar cuando cambian filtros sede/edición
  // ========================================================
  useEffect(() => {
    if (!accessDenied && userProfile) {
      loadExpositores();
    }
  }, [selectedSede, selectedEdicion]);

  // ========================================================
  // FILTRAR EXPOSITORES POR BÚSQUEDA, CATEGORÍA, SEDE Y EDICIÓN
  // ========================================================
  const filterExpositores = () => {
    console.log("🔍 Filtrando expositores. Término:", searchTerm, "Categoría:", filterCategory, "Total:", expositores.length);

    let filtered = expositores;

    // Filtro por búsqueda
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((e) => {
        const nombreMatch = e.nombre?.toLowerCase().includes(search);
        const categoriaMatch = e.categoria?.toLowerCase().includes(search);
        const descripcionMatch = e.descripcion?.toLowerCase().includes(search);
        const sedeMatch = e.sede?.toLowerCase().includes(search);

        return nombreMatch || categoriaMatch || descripcionMatch || sedeMatch;
      });
    }

    // Filtro por categoría
    if (filterCategory !== "todos") {
      const categoryLower = filterCategory.toLowerCase();
      filtered = filtered.filter((e) => e.categoria?.toLowerCase() === categoryLower);
    }

    // Filtro por sede seleccionado
    if (selectedSede) {
      filtered = filtered.filter((e) => e.sede === selectedSede);
    }

    // Filtro por edición seleccionado
    if (selectedEdicion) {
      filtered = filtered.filter((e) => e.edicion === selectedEdicion);
    }

    // ========================================================
    // ESPECIAL: Si es EXPOSITOR, mostrar SOLO su fila
    // ========================================================
    if (userProfile?.rol === "expositor") {
      filtered = filtered.filter((e) => e.usuario_id === userProfile.id);
      console.log(`🔐 Expositor ${userProfile.nombre}: mostrando SOLO su fila`);
    }

    console.log("📌 Expositores filtrados:", filtered.length);
    setFilteredExpositores(filtered);
  };

  // ========================================================
  // Obtener categorías únicas
  // ========================================================
  const getCategories = () => {
    const categories = new Set(expositores.map(e => e.categoria).filter(Boolean));
    return Array.from(categories);
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

  if (!permisos) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Cargando permisos…
      </div>
    );
  }

  // ❌ ACCESO DENEGADO
  if (accessDenied) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg flex gap-4">
          <Lock className="text-blue-600 flex-shrink-0 mt-1" size={24} />
          <div>
            <h2 className="text-lg font-bold text-blue-900 mb-2">Acceso Limitado</h2>
            <p className="text-blue-800 mb-4">{accessMessage}</p>
            <p className="text-sm text-blue-700">
              Solo Asistentes de Sesiones, Combo, Expositores y Speakers pueden ver esta sección.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Cargando expositores...</p>
      </div>
    );
  }

  const categories = getCategories();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Expositores del Evento</h1>
          {userProfile?.rol === "expositor" && (
            <p className="text-gray-600 text-sm mt-1">
              Mostrando tu información de expositor
            </p>
          )}
        </div>
        <span className="text-sm text-gray-500">
          {filteredExpositores.length} {userProfile?.rol === "expositor" ? "expositor" : "expositores"}
        </span>
      </div>

      {/* Error si hay */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Error al cargar expositores</p>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="space-y-4 mb-6">
        {/* Búsqueda */}
        <div className="relative">
          <Search size={20} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, categoría, descripción o sede..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filtros Sede y Edición */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Filtro Sede */}
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

          {/* Filtro Edición */}
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
        </div>

        {/* Filtro por categoría - SOLO SI NO ES EXPOSITOR */}
        {userProfile?.rol !== "expositor" && categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterCategory("todos")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterCategory === "todos"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
              }`}
            >
              Todos ({expositores.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                }`}
              >
                {cat} ({expositores.filter(e => e.categoria === cat).length})
              </button>
            ))}
          </div>
        )}

        {/* Info de filtros activos */}
        {(searchTerm || selectedSede || selectedEdicion || filterCategory !== "todos") && (
          <div className="text-sm text-gray-600">
            <p>
              Filtros activos:{" "}
              {searchTerm && (
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                  Búsqueda: "{searchTerm}"
                </span>
              )}
              {selectedSede && (
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                  Sede: {selectedSede}
                </span>
              )}
              {selectedEdicion && (
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                  Edición: {selectedEdicion}
                </span>
              )}
              {filterCategory !== "todos" && (
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Categoría: {filterCategory}
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Grid de expositores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExpositores.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-md p-12 text-center">
            <Search size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium mb-2">
              {expositores.length === 0
                ? "No hay expositores disponibles"
                : userProfile?.rol === "expositor"
                ? "Tu información de expositor no está disponible"
                : `No se encontraron expositores para "${searchTerm || filterCategory || selectedSede || selectedEdicion}"`}
            </p>
            {expositores.length > 0 && (searchTerm || filterCategory !== "todos" || selectedSede || selectedEdicion) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterCategory("todos");
                  setSelectedSede("");
                  setSelectedEdicion("");
                }}
                className="mt-3 text-blue-600 hover:text-blue-700 underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          filteredExpositores.map((expositor) => (
            <ExpositorCard
              key={expositor.id}
              expositor={expositor}
              onViewDetails={() => setSelectedExpositor(expositor)}
              isOwn={userProfile?.rol === "expositor" && expositor.usuario_id === userProfile.id}
            />
          ))
        )}
      </div>

      {/* Modal de detalles */}
      {selectedExpositor && (
        <ExpositorModal
          expositor={selectedExpositor}
          onClose={() => setSelectedExpositor(null)}
          isOwn={userProfile?.rol === "expositor" && selectedExpositor.usuario_id === userProfile.id}
        />
      )}
    </div>
  );
}

// ========================================================
// TARJETA DE EXPOSITOR
// ========================================================
function ExpositorCard({ expositor, onViewDetails, isOwn }) {
  return (
    <div
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer h-full flex flex-col relative"
      onClick={onViewDetails}
    >
      {/* Badge propio para expositor */}
      {isOwn && (
        <div className="absolute top-2 right-2 bg-blue-400 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
          🏢 TU EXPOSITOR
        </div>
      )}

      {/* Logo */}
      <div className="w-full h-40 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden">
        {expositor.logo_url ? (
          <img
            src={expositor.logo_url}
            alt={expositor.nombre}
            className="w-full h-full object-contain p-4"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/400x200?text=No+Logo";
            }}
          />
        ) : (
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-400">
              {expositor.nombre?.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Nombre */}
        <h3 className="text-lg font-bold mb-1 line-clamp-2">
          {expositor.nombre || "Sin nombre"}
        </h3>

        {/* Categoría */}
        {expositor.categoria && (
          <p className="text-sm text-blue-600 font-semibold mb-2">
            {expositor.categoria}
          </p>
        )}

        {/* Stand */}
        {expositor.stand && (
          <p className="text-sm text-gray-600 mb-3">Stand: {expositor.stand}</p>
        )}

        {/* Descripción resumida */}
        {expositor.descripcion && (
          <p className="text-sm text-gray-700 mb-4 line-clamp-2 flex-1">
            {expositor.descripcion}
          </p>
        )}

        {/* Tags: sede y edición */}
        <div className="flex flex-wrap gap-2 mb-4">
          {expositor.sede && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              {expositor.sede.toUpperCase()}
            </span>
          )}
          {expositor.edicion && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              {expositor.edicion}
            </span>
          )}
        </div>

        {/* Enlaces */}
        <div className="flex gap-2 border-t pt-3">
          {expositor.website && (
            <a
              href={expositor.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-gray-400 hover:text-blue-600 transition"
              title="Website"
            >
              <Globe size={16} />
            </a>
          )}
          {expositor.telefono && (
            <a
              href={`tel:${expositor.telefono}`}
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-gray-400 hover:text-red-600 transition"
              title={expositor.telefono}
            >
              <Phone size={16} />
            </a>
          )}
          {expositor.email && (
            <a
              href={`mailto:${expositor.email}`}
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-gray-400 hover:text-green-600 transition"
              title={expositor.email}
            >
              <Mail size={16} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================================================
// MODAL DE DETALLES DEL EXPOSITOR
// ========================================================
function ExpositorModal({ expositor, onClose, isOwn }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con logo */}
        <div className="relative">
          {/* Logo de fondo */}
          <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative overflow-hidden">
            {expositor.logo_url ? (
              <img
                src={expositor.logo_url}
                alt={expositor.nombre}
                className="w-full h-full object-contain p-4"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/800x400?text=No+Logo";
                }}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <div className="text-6xl font-bold text-gray-300">
                  {expositor.nombre?.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            {/* Badge propio */}
            {isOwn && (
              <div className="absolute top-4 right-4 bg-blue-400 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2">
                🏢 TU EXPOSITOR
              </div>
            )}

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-lg transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* Info superpuesta */}
          <div className="bg-white px-6 py-4 border-b">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {expositor.nombre}
            </h2>
            {expositor.categoria && (
              <p className="text-lg text-blue-600 font-semibold mb-1">
                {expositor.categoria}
              </p>
            )}
            {expositor.stand && (
              <p className="text-gray-600">Stand: {expositor.stand}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Descripción */}
          {expositor.descripcion && (
            <div>
              <h3 className="font-bold text-lg mb-2">Sobre</h3>
              <p className="text-gray-700 leading-relaxed">{expositor.descripcion}</p>
            </div>
          )}

          {/* Información de contacto */}
          <div className="space-y-3">
            {expositor.email && (
              <div className="flex items-center gap-3">
                <Mail size={20} className="text-blue-600" />
                <a
                  href={`mailto:${expositor.email}`}
                  className="text-blue-600 hover:underline break-all"
                >
                  {expositor.email}
                </a>
              </div>
            )}

            {expositor.telefono && (
              <div className="flex items-center gap-3">
                <Phone size={20} className="text-red-600" />
                <a
                  href={`tel:${expositor.telefono}`}
                  className="text-blue-600 hover:underline"
                >
                  {expositor.telefono}
                </a>
              </div>
            )}

            {expositor.website && (
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-green-600" />
                <a
                  href={expositor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all flex items-center gap-1"
                >
                  {expositor.website}
                  <ExternalLink size={14} />
                </a>
              </div>
            )}

            {expositor.sede && (
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-orange-600" />
                <span className="text-gray-700 capitalize">{expositor.sede}</span>
              </div>
            )}
          </div>

          {/* Información adicional */}
          {(expositor.industria || expositor.empleados || expositor.año_fundacion) && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2 text-sm">
              {expositor.industria && (
                <p><strong>Industria:</strong> {expositor.industria}</p>
              )}
              {expositor.empleados && (
                <p><strong>Empleados:</strong> {expositor.empleados}</p>
              )}
              {expositor.año_fundacion && (
                <p><strong>Fundada:</strong> {expositor.año_fundacion}</p>
              )}
            </div>
          )}

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