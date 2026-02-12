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
} from "lucide-react";

export default function Expositores() {
  const { userProfile } = useAuth();

  const [expositores, setExpositores] = useState([]);
  const [filteredExpositores, setFilteredExpositores] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpositor, setSelectedExpositor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState("todos");

  // ========================================================
  // Cargar expositores al montar el componente
  // ========================================================
  useEffect(() => {
    loadExpositores();
  }, []);

  // ========================================================
  // Filtrar expositores cuando cambia búsqueda o categoría
  // ========================================================
  useEffect(() => {
    filterExpositores();
  }, [searchTerm, filterCategory, expositores]);

  // ========================================================
  // CARGAR EXPOSITORES DESDE API
  // ========================================================
  const loadExpositores = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🏢 Cargando expositores...");

      // ✅ USAR API INSTANCE DIRECTAMENTE
      const res = await API.get("/expositores");

      console.log("🏢 Response tipo:", typeof res.data);
      console.log("🏢 Es array?", Array.isArray(res.data));
      console.log("🏢 Primeras 3 items:", res.data.slice(0, 3));

      // ✅ Validar que es un array
      const expositoresData = Array.isArray(res.data) ? res.data : [];

      console.log(`✅ ${expositoresData.length} expositores cargados`);

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
  // FILTRAR EXPOSITORES POR BÚSQUEDA Y CATEGORÍA
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
        <h1 className="text-3xl font-bold">Expositores del Evento</h1>
        <span className="text-sm text-gray-500">
          {expositores.length} expositores totales
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

        {/* Filtro por categoría */}
        {categories.length > 0 && (
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
      </div>

      {/* Debug info */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertCircle size={20} className="text-blue-600 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 mb-1">Información de depuración:</p>
            <p className="text-blue-800">
              <strong>Total expositores cargados:</strong> {expositores.length}
            </p>
            <p className="text-blue-800">
              <strong>Búsqueda actual:</strong> "{searchTerm || 'ninguna'}"
            </p>
            <p className="text-blue-800">
              <strong>Categoría:</strong> {filterCategory}
            </p>
            <p className="text-blue-800">
              <strong>Expositores mostrados:</strong> {filteredExpositores.length}
            </p>
            {expositores.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-700 hover:text-blue-900">
                  Ver estructura de primer expositor
                </summary>
                <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-48">
                  {JSON.stringify(expositores[0], null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>

      {/* Grid de expositores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExpositores.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-md p-12 text-center">
            <Search size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium mb-2">
              {expositores.length === 0
                ? "No hay expositores disponibles"
                : `No se encontraron expositores para "${searchTerm || filterCategory}"`}
            </p>
            {expositores.length > 0 && (searchTerm || filterCategory !== "todos") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterCategory("todos");
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
            />
          ))
        )}
      </div>

      {/* Modal de detalles */}
      {selectedExpositor && (
        <ExpositorModal
          expositor={selectedExpositor}
          onClose={() => setSelectedExpositor(null)}
        />
      )}
    </div>
  );
}

// ========================================================
// TARJETA DE EXPOSITOR
// ========================================================
function ExpositorCard({ expositor, onViewDetails }) {
  return (
    <div
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer h-full flex flex-col"
      onClick={onViewDetails}
    >
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

        {/* Tags: sede */}
        {expositor.sede && (
          <div className="mb-4">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              {expositor.sede.toUpperCase()}
            </span>
          </div>
        )}

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
function ExpositorModal({ expositor, onClose }) {
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

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-lg transition"
            >
              ✕
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