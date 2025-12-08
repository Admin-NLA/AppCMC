import { useState, useEffect, useMemo } from "react";

import {
  Building2,
  MapPin,
  Search,
  X,
  Mail,
  Globe,
  Package
} from "lucide-react";

export default function Expositores() {
  const [expositores, setExpositores] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpositor, setSelectedExpositor] = useState(null);
  const [showMap, setShowMap] = useState(true);
  const [loading, setLoading] = useState(true);

  /* ============================
     Cargar expositores
  ============================ */
  useEffect(() => {
    const loadExpositores = async () => {
      try {
        const snap = await getDocs(collection(db, "expositores"));
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setExpositores(data);
      } catch (e) {
        console.error("Error cargando expositores:", e);
      } finally {
        setLoading(false);
      }
    };

    loadExpositores();
  }, []);

  /* ============================
     Filtrado optimizado
  ============================ */
  const filteredExpositores = useMemo(() => {
    const t = searchTerm.toLowerCase();
    return expositores.filter((exp) => {
      const empresa = exp.empresa?.toLowerCase() || "";
      const stand = exp.stand?.toLowerCase() || "";
      const productos = exp.productos?.join(" ").toLowerCase() || "";
      return (
        empresa.includes(t) ||
        stand.includes(t) ||
        productos.includes(t)
      );
    });
  }, [searchTerm, expositores]);

  /* ============================
     Colores por categoría
  ============================ */
  const getCategoryColor = (categoria) => {
    const colors = {
      Platino: "bg-gray-200 text-gray-800 border-gray-400",
      Oro: "bg-yellow-100 text-yellow-800 border-yellow-400",
      Plata: "bg-gray-100 text-gray-700 border-gray-300",
    };
    return colors[categoria] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  /* ============================
     Loader
  ============================ */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  /* ============================
     UI
  ============================ */
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Building2 size={32} />
          Área de Exposición
        </h1>
        <p className="text-orange-100">Explora las empresas presentes</p>
      </div>

      {/* Toggle */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowMap(true)}
          className={`flex-1 py-3 rounded-lg font-semibold transition ${
            showMap
              ? "bg-orange-600 text-white"
              : "bg-white text-gray-700 border-2 border-gray-300"
          }`}
        >
          Ver Mapa
        </button>
        <button
          onClick={() => setShowMap(false)}
          className={`flex-1 py-3 rounded-lg font-semibold transition ${
            !showMap
              ? "bg-orange-600 text-white"
              : "bg-white text-gray-700 border-2 border-gray-300"
          }`}
        >
          Ver Lista
        </button>
      </div>

      {/* Mapa */}
      {showMap && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="font-bold text-xl mb-4 flex items-center gap-2">
            <MapPin className="text-orange-600" size={24} />
            Mapa del Área de Exposición
          </h2>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-xl">
            <div className="grid grid-cols-5 gap-4">
              {expositores.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => setSelectedExpositor(exp)}
                  className="bg-white p-4 rounded-lg border-2 border-orange-300 hover:border-orange-600 hover:shadow-lg transition cursor-pointer text-center"
                >
                  <div className="font-bold text-orange-600 text-lg mb-1">
                    {exp.stand}
                  </div>
                  <div className="text-xs text-gray-700 font-medium leading-tight">
                    {exp.empresa}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {!showMap && (
        <>
          {/* Buscador */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar empresa, stand o productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            <p className="text-sm text-gray-500 mt-2">
              {filteredExpositores.length} resultado(s)
            </p>
          </div>

          {/* Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExpositores.map((exp) => (
              <div
                key={exp.id}
                onClick={() => setSelectedExpositor(exp)}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition cursor-pointer"
              >
                <div className="w-14 h-14 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Building2 size={28} className="text-orange-600" />
                </div>

                <h3 className="font-bold text-lg text-gray-800 mb-2">
                  {exp.empresa}
                </h3>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <MapPin size={14} />
                  <span>Stand {exp.stand}</span>
                </div>

                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border-2 mb-3 ${getCategoryColor(
                    exp.categoria
                  )}`}
                >
                  {exp.categoria}
                </span>

                <p className="text-sm text-gray-600 line-clamp-2">
                  {exp.descripcion}
                </p>
              </div>
            ))}
          </div>

          {filteredExpositores.length === 0 && (
            <div className="bg-gray-50 p-12 rounded-xl text-center">
              <Building2 size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600">
                No hay expositores que coincidan con tu búsqueda.
              </p>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {selectedExpositor && (
        <ModalExpositor
          exp={selectedExpositor}
          onClose={() => setSelectedExpositor(null)}
          getCategoryColor={getCategoryColor}
        />
      )}
    </div>
  );
}

/* ============================
   MODAL independiente limpio
============================ */
function ModalExpositor({ exp, onClose, getCategoryColor }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 rounded-t-2xl flex justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
              <Building2 size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{exp.empresa}</h2>
              <p className="text-orange-100">Stand {exp.stand}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <span
            className={`inline-block px-4 py-2 rounded-lg text-sm font-bold border-2 ${getCategoryColor(
              exp.categoria
            )}`}
          >
            {exp.categoria}
          </span>

          {/* Descripción */}
          <div>
            <h3 className="font-bold text-lg mb-2">Acerca de</h3>
            <p className="text-gray-700 leading-relaxed">{exp.descripcion}</p>
          </div>

          {/* Productos */}
          {exp.productos?.length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Package size={20} className="text-orange-600" />
                Productos y Servicios
              </h3>
              <div className="flex flex-wrap gap-2">
                {exp.productos.map((p, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contacto */}
          <div>
            <h3 className="font-bold text-lg mb-3">Información de Contacto</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail size={20} className="text-orange-600" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium">{exp.email}</p>
                </div>
              </div>

              {exp.web && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Globe size={20} className="text-orange-600" />
                  <div>
                    <p className="text-xs text-gray-500">Sitio Web</p>
                    <a
                      href={exp.web}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-orange-600 hover:underline"
                    >
                      {exp.web}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin size={20} className="text-orange-600" />
                <div>
                  <p className="text-xs text-gray-500">Ubicación</p>
                  <p className="font-medium">Stand {exp.stand}</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
