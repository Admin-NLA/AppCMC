import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useEvent } from "../contexts/EventContext.jsx";
import API from "../services/api";
import { CheckCircle, AlertCircle, Filter, Search, Download } from "lucide-react";
import Header from "../Components/layout/Header";

export default function MisRegistros() {
  const { userProfile, permisos } = useAuth();
  const { sedeActiva, edicionActiva } = useEvent();

  const [registros, setRegistros] = useState([]);
  const [filteredRegistros, setFilteredRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [error, setError] = useState(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDia, setSelectedDia] = useState("todos");
  const [selectedTipo, setSelectedTipo] = useState("todos");

  const dias = [
    { id: "todos", label: "Todos los días" },
    { id: "1", label: "Lunes (D1)" },
    { id: "2", label: "Martes (D2)" },
    { id: "3", label: "Miércoles (D3)" },
    { id: "4", label: "Jueves (D4)" }
  ];

  const tipos = [
    { id: "todos", label: "Todos los tipos" },
    { id: "entrada", label: "Entrada" },
    { id: "sesion", label: "Sesión" },
    { id: "curso", label: "Curso" },
    { id: "networking", label: "Networking" }
  ];

  // ========================================================
  // VALIDACIÓN DE ACCESO
  // ========================================================
  const validateAccess = () => {
    if (!permisos?.verMisRegistros) {
      setAccessDenied(true);
      setAccessMessage("No tienes permiso para acceder a tus registros");
      return false;
    }
    return true;
  };

  // ========================================================
  // CARGAR REGISTROS
  // ========================================================
  useEffect(() => {
    if (!validateAccess()) {
      setLoading(false);
      return;
    }
    loadRegistros();
  }, [permisos, userProfile]);

  const loadRegistros = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      // Siempre filtra por usuario actual (filterByUser = true)
      if (permisos?.filterByUser && userProfile?.id) {
        params.append("usuario_id", userProfile.id);
      }

      // Filtros opcionales
      if (permisos?.filtraSede && sedeActiva) {
        params.append("sede", sedeActiva);
      }
      if (permisos?.filtraEdicion && edicionActiva) {
        params.append("edicion", edicionActiva);
      }

      const res = await API.get(`/mis-registros?${params.toString()}`);
      const data = Array.isArray(res.data) ? res.data : res.data.registros || [];

      console.log(`✅ ${data.length} registros cargados`);
      setRegistros(data);
      applyFilters(data);
    } catch (err) {
      console.error("Error cargando registros:", err);
      setError("Error al cargar tus registros");
      setRegistros([]);
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
        (r) =>
          r.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.evento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.lugar?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por día
    if (selectedDia !== "todos") {
      filtered = filtered.filter((r) => r.dia?.toString() === selectedDia);
    }

    // Filtro por tipo
    if (selectedTipo !== "todos") {
      filtered = filtered.filter((r) => r.tipo === selectedTipo);
    }

    setFilteredRegistros(filtered);
  };

  // Re-aplicar filtros cuando cambian
  useEffect(() => {
    applyFilters(registros);
  }, [searchTerm, selectedDia, selectedTipo]);

  // ========================================================
  // DESCARGAR CSV
  // ========================================================
  const downloadCSV = () => {
    if (filteredRegistros.length === 0) return;

    const headers = ["Fecha", "Hora", "Evento", "Tipo", "Lugar", "Sede"];
    const rows = filteredRegistros.map((r) => [
      new Date(r.fecha).toLocaleDateString("es-MX"),
      new Date(r.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
      r.titulo || r.evento || "N/A",
      r.tipo || "N/A",
      r.lugar || "N/A",
      r.sede || "N/A"
    ]);

    let csvContent = headers.join(",") + "\n";
    rows.forEach((row) => {
      csvContent += row.map((cell) => `"${cell}"`).join(",") + "\n";
    });

    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    link.download = `mis-registros-${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            <p className="text-gray-600">Cargando tus registros...</p>
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
                  Tu tipo de pase no incluye acceso a esta sección.
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
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <CheckCircle size={32} className="text-blue-600" />
            Mis Registros
          </h1>
          <p className="text-gray-600">
            Historial de tus check-ins y asistencias en el evento
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
                Buscar
              </label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Evento, lugar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Día */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Día
              </label>
              <select
                value={selectedDia}
                onChange={(e) => setSelectedDia(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {dias.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo
              </label>
              <select
                value={selectedTipo}
                onChange={(e) => setSelectedTipo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Descargar */}
            <div className="flex items-end">
              <button
                onClick={downloadCSV}
                disabled={filteredRegistros.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition font-semibold"
              >
                <Download size={18} />
                Descargar CSV
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de registros */}
        {filteredRegistros.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <CheckCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">
              {registros.length === 0
                ? "No tienes registros aún"
                : "No hay registros que coincidan con los filtros"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Desktop view - Tabla */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Hora
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Evento
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Tipo
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Lugar
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Sede
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistros.map((reg, idx) => (
                    <tr
                      key={reg.id || idx}
                      className="border-b border-gray-200 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        {new Date(reg.fecha).toLocaleDateString("es-MX")}
                      </td>
                      <td className="px-6 py-4">
                        {new Date(reg.fecha).toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {reg.titulo || reg.evento || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 capitalize">
                          {reg.tipo || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {reg.lugar || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded uppercase">
                          {reg.sede || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile view - Tarjetas */}
            <div className="md:hidden space-y-3 p-4">
              {filteredRegistros.map((reg, idx) => (
                <div
                  key={reg.id || idx}
                  className="border border-gray-200 rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-gray-900">
                      {reg.titulo || reg.evento || "Sin título"}
                    </h3>
                    <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded uppercase">
                      {reg.sede || "N/A"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    📅 {new Date(reg.fecha).toLocaleDateString("es-MX")} -{" "}
                    {new Date(reg.fecha).toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                  {reg.lugar && (
                    <p className="text-sm text-gray-600">📍 {reg.lugar}</p>
                  )}
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 capitalize">
                      {reg.tipo || "N/A"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumen */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-3">📊 Resumen</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-blue-600 text-sm">Total de registros</p>
              <p className="text-2xl font-bold text-blue-900">{registros.length}</p>
            </div>
            <div>
              <p className="text-blue-600 text-sm">Filtrados</p>
              <p className="text-2xl font-bold text-blue-900">
                {filteredRegistros.length}
              </p>
            </div>
            {/* Estadísticas por tipo */}
            <div>
              <p className="text-blue-600 text-sm">Entradas</p>
              <p className="text-2xl font-bold text-blue-900">
                {registros.filter((r) => r.tipo === "entrada").length}
              </p>
            </div>
            <div>
              <p className="text-blue-600 text-sm">Sesiones</p>
              <p className="text-2xl font-bold text-blue-900">
                {registros.filter((r) => r.tipo === "sesion").length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}