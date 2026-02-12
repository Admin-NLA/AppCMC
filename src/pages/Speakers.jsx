import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import API from "../services/api";
import {
  Search,
  MapPin,
  Mail,
  Linkedin,
  Twitter,
  Globe,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  X,
} from "lucide-react";

export default function Speakers() {
  const { userProfile } = useAuth();

  const [speakers, setSpeakers] = useState([]);
  const [filteredSpeakers, setFilteredSpeakers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ========================================================
  // Cargar speakers al montar el componente
  // ========================================================
  useEffect(() => {
    loadSpeakers();
  }, []);

  // ========================================================
  // Filtrar speakers cuando cambia el término de búsqueda
  // ========================================================
  useEffect(() => {
    filterSpeakers();
  }, [searchTerm, speakers]);

  // ========================================================
  // CARGAR SPEAKERS DESDE API
  // ========================================================
  const loadSpeakers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("📢 Cargando speakers...");

      // ✅ USAR API INSTANCE DIRECTAMENTE
      const res = await API.get("/speakers");

      console.log("📢 Response tipo:", typeof res.data);
      console.log("📢 Es array?", Array.isArray(res.data));
      console.log("📢 Primeras 3 items:", res.data.slice(0, 3));

      // ✅ Validar que es un array
      const speakersData = Array.isArray(res.data) ? res.data : [];

      console.log(`✅ ${speakersData.length} speakers cargados`);

      setSpeakers(speakersData);

    } catch (error) {
      console.error("❌ Error al cargar speakers:", error);
      setError(error.message);
      setSpeakers([]);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // FILTRAR SPEAKERS POR BÚSQUEDA
  // ========================================================
  const filterSpeakers = () => {
    console.log("🔍 Filtrando speakers. Término:", searchTerm, "Total:", speakers.length);

    if (!searchTerm.trim()) {
      setFilteredSpeakers(speakers);
      console.log("📌 Sin filtro, mostrando todos:", speakers.length);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = speakers.filter((s) => {
      const nombreMatch = s.nombre?.toLowerCase().includes(search);
      const cargoMatch = s.cargo?.toLowerCase().includes(search);
      const empresaMatch = s.empresa?.toLowerCase().includes(search);
      const sedeMatch = s.sede?.toLowerCase().includes(search);

      const match = nombreMatch || cargoMatch || empresaMatch || sedeMatch;

      if (match) {
        console.log(
          `✅ Match encontrado: ${s.nombre} (${s.cargo} - ${s.empresa})`
        );
      }

      return match;
    });

    console.log("📌 Speakers filtrados:", filtered.length);
    setFilteredSpeakers(filtered);
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
        <p className="ml-4 text-gray-600">Cargando speakers...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Speakers del Evento</h1>
        <span className="text-sm text-gray-500">
          {speakers.length} speakers totales
        </span>
      </div>

      {/* Error si hay */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Error al cargar speakers</p>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, cargo, empresa o sede..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Debug info */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertCircle size={20} className="text-blue-600 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 mb-1">Información de depuración:</p>
            <p className="text-blue-800">
              <strong>Total speakers cargados:</strong> {speakers.length}
            </p>
            <p className="text-blue-800">
              <strong>Búsqueda actual:</strong> "{searchTerm || 'ninguna'}"
            </p>
            <p className="text-blue-800">
              <strong>Speakers mostrados:</strong> {filteredSpeakers.length}
            </p>
            {speakers.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-700 hover:text-blue-900">
                  Ver estructura de primer speaker
                </summary>
                <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-48">
                  {JSON.stringify(speakers[0], null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>

      {/* Grid de speakers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSpeakers.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-md p-12 text-center">
            <Search size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium mb-2">
              {speakers.length === 0
                ? "No hay speakers disponibles"
                : `No se encontraron speakers para "${searchTerm}"`}
            </p>
            {speakers.length > 0 && searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="mt-3 text-blue-600 hover:text-blue-700 underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          filteredSpeakers.map((speaker) => (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              onViewDetails={() => setSelectedSpeaker(speaker)}
            />
          ))
        )}
      </div>

      {/* Modal de detalles */}
      {selectedSpeaker && (
        <SpeakerModal
          speaker={selectedSpeaker}
          onClose={() => setSelectedSpeaker(null)}
        />
      )}
    </div>
  );
}

// ========================================================
// TARJETA DE SPEAKER
// ========================================================
function SpeakerCard({ speaker, onViewDetails }) {
  return (
    <div
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer h-full flex flex-col"
      onClick={onViewDetails}
    >
      {/* Foto */}
      <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center overflow-hidden">
        {speaker.foto ? (
          <img
            src={speaker.foto}
            alt={speaker.nombre}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/400x300?text=No+Foto";
            }}
          />
        ) : (
          <div className="text-center">
            <div className="text-5xl font-bold text-white/30">
              {speaker.nombre?.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Nombre */}
        <h3 className="text-lg font-bold mb-1 line-clamp-2">
          {speaker.nombre || "Sin nombre"}
        </h3>

        {/* Cargo */}
        {speaker.cargo && (
          <p className="text-sm text-blue-600 font-semibold mb-2">
            {speaker.cargo}
          </p>
        )}

        {/* Empresa */}
        {speaker.empresa && (
          <p className="text-sm text-gray-600 mb-3">{speaker.empresa}</p>
        )}

        {/* Bio resumida */}
        {speaker.bio && (
          <p className="text-sm text-gray-700 mb-4 line-clamp-2 flex-1">
            {speaker.bio}
          </p>
        )}

        {/* Tags: sede y edición */}
        <div className="flex flex-wrap gap-2 mb-4">
          {speaker.sede && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              {speaker.sede.toUpperCase()}
            </span>
          )}
          {speaker.edicion && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              {speaker.edicion}
            </span>
          )}
          {speaker.source === "wordpress" && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              📡 WP
            </span>
          )}
        </div>

        {/* Redes sociales */}
        <div className="flex gap-2 border-t pt-3">
          {speaker.email && (
            <a
              href={`mailto:${speaker.email}`}
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-gray-400 hover:text-blue-600 transition"
              title={speaker.email}
            >
              <Mail size={16} />
            </a>
          )}
          {speaker.linkedin && (
            <a
              href={speaker.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-gray-400 hover:text-blue-700 transition"
              title="LinkedIn"
            >
              <Linkedin size={16} />
            </a>
          )}
          {speaker.twitter && (
            <a
              href={speaker.twitter}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-gray-400 hover:text-blue-400 transition"
              title="Twitter"
            >
              <Twitter size={16} />
            </a>
          )}
          {speaker.website && (
            <a
              href={speaker.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-gray-400 hover:text-gray-700 transition"
              title="Website"
            >
              <Globe size={16} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================================================
// MODAL DE DETALLES DEL SPEAKER
// ========================================================
function SpeakerModal({ speaker, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con foto */}
        <div className="relative">
          {/* Foto de fondo */}
          <div className="w-full h-64 bg-gradient-to-br from-blue-500 to-blue-700 overflow-hidden relative">
            {speaker.foto ? (
              <img
                src={speaker.foto}
                alt={speaker.nombre}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/800x400?text=No+Foto";
                }}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <div className="text-7xl font-bold text-white/30">
                  {speaker.nombre?.charAt(0).toUpperCase()}
                </div>
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
              {speaker.nombre}
            </h2>
            {speaker.cargo && (
              <p className="text-lg text-blue-600 font-semibold mb-1">
                {speaker.cargo}
              </p>
            )}
            {speaker.empresa && (
              <p className="text-gray-600">{speaker.empresa}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Bio */}
          {speaker.bio && (
            <div>
              <h3 className="font-bold text-lg mb-2">Sobre</h3>
              <p className="text-gray-700 leading-relaxed">{speaker.bio}</p>
            </div>
          )}

          {/* Información de contacto */}
          <div className="space-y-2">
            {speaker.email && (
              <div className="flex items-center gap-3">
                <Mail size={20} className="text-blue-600" />
                <a
                  href={`mailto:${speaker.email}`}
                  className="text-blue-600 hover:underline break-all"
                >
                  {speaker.email}
                </a>
              </div>
            )}

            {speaker.telefono && (
              <div className="flex items-center gap-3">
                <span className="text-gray-600">📱</span>
                <a
                  href={`tel:${speaker.telefono}`}
                  className="text-blue-600 hover:underline"
                >
                  {speaker.telefono}
                </a>
              </div>
            )}

            {speaker.sede && (
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-orange-600" />
                <span className="text-gray-700 capitalize">{speaker.sede}</span>
              </div>
            )}

            {speaker.edicion && (
              <div className="flex items-center gap-3">
                <span className="text-purple-600">📅</span>
                <span className="text-gray-700">{speaker.edicion}</span>
              </div>
            )}
          </div>

          {/* Redes sociales */}
          <div className="space-y-2 border-t pt-4">
            {speaker.linkedin && (
              <a
                href={speaker.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                <Linkedin size={20} className="text-blue-700" />
                <span className="text-blue-700 font-medium">LinkedIn</span>
              </a>
            )}

            {speaker.twitter && (
              <a
                href={speaker.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                <Twitter size={20} className="text-blue-400" />
                <span className="text-blue-700 font-medium">Twitter</span>
              </a>
            )}

            {speaker.website && (
              <a
                href={speaker.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                <Globe size={20} className="text-gray-700" />
                <span className="text-gray-700 font-medium">Website</span>
              </a>
            )}
          </div>

          {/* Información de fuente */}
          <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 border border-gray-200">
            {speaker.source === "wordpress" && (
              <p>📡 <strong>Fuente:</strong> Sincronizado desde WordPress</p>
            )}
            {speaker.source === "local" && (
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