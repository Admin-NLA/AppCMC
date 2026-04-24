import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useEvent } from "../contexts/EventContext.jsx";
import API from "../services/api";
import {
  Users,
  TrendingUp,
  AlertCircle,
  Search,
  Download,
  Plus,
  X,
  Calendar,
  Mail,
  Briefcase,
  Filter
} from "lucide-react";

export default function MiMarca() {
  const { userProfile, permisos } = useAuth();
  const { sedeActiva, edicionActiva } = useEvent();

  const [visitantes, setVisitantes] = useState([]);
  const [filteredVisitantes, setFilteredVisitantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, hoy: 0, por_dia: {} });
  const [showNewVisitante, setShowNewVisitante] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDia, setSelectedDia] = useState("todos");
  const [selectedFecha, setSelectedFecha] = useState("");

  const dias = [
    { id: "todos", label: "Todos los días" },
    { id: "1", label: "Lunes (D1)" },
    { id: "2", label: "Martes (D2)" },
    { id: "3", label: "Miércoles (D3)" },
    { id: "4", label: "Jueves (D4)" }
  ];

  // ========================================================
  // VALIDACIÓN DE ACCESO
  // ========================================================
  const validateAccess = () => {
    if (!permisos?.verMiMarca) {
      setAccessDenied(true);
      setAccessMessage("Solo Expositores pueden acceder a su panel de marca");
      return false;
    }
    return true;
  };

  // ========================================================
  // CARGAR VISITANTES
  // ========================================================
  useEffect(() => {
    if (!validateAccess()) {
      setLoading(false);
      return;
    }
    loadVisitantes();
  }, [permisos, userProfile]);

  const loadVisitantes = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      // Filtro por usuario (expositor actual)
      if (permisos?.filterByUser && userProfile?.id) {
        params.append("expositor_id", userProfile.id);
      }

      // Filtros opcionales
      if (permisos?.filtraSede && sedeActiva) {
        params.append("sede", sedeActiva);
      }
      if (permisos?.filtraEdicion && edicionActiva) {
        params.append("edicion", edicionActiva);
      }

      const res = await API.get(`/mi-marca?${params.toString()}`);
      const data = Array.isArray(res.data?.visitantes) ? res.data.visitantes : [];

      setVisitantes(data);
      setStats(res.data?.stats || { total: data.length, hoy: 0, por_dia: {} });
      applyFilters(data);

      console.log(`✅ ${data.length} visitantes cargados`);
    } catch (err) {
      console.error("Error cargando visitantes:", err);
      setError("Error al cargar tus visitantes");
      setVisitantes([]);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // APLICAR FILTROS
  // ========================================================
  const applyFilters = (data) => {
    let filtered = [...data];

    if (searchTerm) {
      filtered = filtered.filter(
        (v) =>
          v.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDia !== "todos") {
      filtered = filtered.filter((v) => v.dia?.toString() === selectedDia);
    }

    if (selectedFecha) {
      filtered = filtered.filter((v) => {
        const vFecha = new Date(v.fecha).toISOString().split("T")[0];
        return vFecha === selectedFecha;
      });
    }

    setFilteredVisitantes(filtered);
  };

  useEffect(() => {
    applyFilters(visitantes);
  }, [searchTerm, selectedDia, selectedFecha]);

  // ========================================================
  // DESCARGAR CSV
  // ========================================================
  const downloadCSV = () => {
    if (filteredVisitantes.length === 0) return;

    const headers = ["Nombre", "Email", "Empresa", "Cargo", "Teléfono", "Fecha", "Hora"];
    const rows = filteredVisitantes.map((v) => [
      v.nombre || "N/A",
      v.email || "N/A",
      v.empresa || "N/A",
      v.cargo || "N/A",
      v.telefono || "N/A",
      new Date(v.fecha).toLocaleDateString("es-MX"),
      new Date(v.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
    ]);

    let csvContent = headers.join(",") + "\n";
    rows.forEach((row) => {
      csvContent += row.map((cell) => `"${cell}"`).join(",") + "\n";
    });

    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    link.download = `visitantes-${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ========================================================
  // RENDERIZADO
  // ========================================================

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando visitantes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 mt-1" size={24} />
              <div>
                <p className="text-red-800 font-semibold text-lg">{accessMessage}</p>
                <p className="text-red-700 text-sm mt-2">
                  Contacta a soporte si crees que es un error.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Users size={32} className="text-blue-600" />
            Mi Marca
          </h1>
          <p className="text-gray-600">
            Registro de visitantes y control de asistencia en tu stand
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 flex items-start gap-3">
            <AlertCircle className="text-red-600 mt-1" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Visitantes"
            value={stats.total}
            icon={Users}
            color="blue"
          />
          <StatCard
            label="Hoy"
            value={stats.hoy}
            icon={Calendar}
            color="purple"
          />
          <StatCard
            label="Prom. por día"
            value={Math.round(stats.total / (Object.keys(stats.por_dia).length || 1))}
            icon={TrendingUp}
            color="green"
          />
          <div className="bg-white rounded-lg shadow-md p-6">
            <button
              onClick={() => setShowNewVisitante(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              <Plus size={20} />
              Nuevo Visitante
            </button>
          </div>
        </div>

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
                  placeholder="Nombre, email, empresa..."
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

            {/* Fecha */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha específica
              </label>
              <input
                type="date"
                value={selectedFecha}
                onChange={(e) => setSelectedFecha(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Descargar */}
            <div className="flex items-end">
              <button
                onClick={downloadCSV}
                disabled={filteredVisitantes.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition font-semibold"
              >
                <Download size={18} />
                Descargar CSV
              </button>
            </div>
          </div>
        </div>

        {/* Tabla/Lista de visitantes */}
        {filteredVisitantes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">
              {visitantes.length === 0
                ? "Aún no has registrado visitantes"
                : "No hay visitantes que coincidan con los filtros"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Desktop - Tabla */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Nombre
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Empresa
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Cargo
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Hora
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisitantes.map((vis, idx) => (
                    <tr
                      key={vis.id || idx}
                      className="border-b border-gray-200 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {vis.nombre}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {vis.email}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {vis.empresa || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {vis.cargo || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(vis.fecha).toLocaleDateString("es-MX")}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(vis.fecha).toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile - Tarjetas */}
            <div className="md:hidden space-y-3 p-4">
              {filteredVisitantes.map((vis, idx) => (
                <div
                  key={vis.id || idx}
                  className="border border-gray-200 rounded-lg p-4 space-y-2"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{vis.nombre}</h3>
                    <p className="text-sm text-gray-600">{vis.email}</p>
                  </div>
                  {vis.empresa && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Briefcase size={16} />
                      {vis.empresa}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Calendar size={16} />
                    {new Date(vis.fecha).toLocaleDateString("es-MX")} -{" "}
                    {new Date(vis.fecha).toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal para nuevo visitante */}
      {showNewVisitante && (
        <NewVisitanteModal
          onClose={() => setShowNewVisitante(false)}
          onSuccess={() => {
            setShowNewVisitante(false);
            loadVisitantes();
          }}
          expositorId={userProfile?.id}
        />
      )}
    </div>
  );
}

// ========================================================
// COMPONENTES AUXILIARES
// ========================================================

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600"
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{label}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colors[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}


// ============================================================
// MODAL — Registrar visita al stand
//
// FIX: El backend ya no acepta datos manuales de visitante.
//      Ahora busca al asistente por email en la tabla users
//      y registra la visita con su user_id real.
//      Endpoint cambiado: /mi-marca/visitante → /mi-marca/visita
// ============================================================
function NewVisitanteModal({ onClose, onSuccess, expositorId }) {
  const [email, setEmail] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [encontrado, setEncontrado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Buscar usuario por email
  const buscarUsuario = async () => {
    if (!email.trim()) return;
    setBuscando(true);
    setError(null);
    setEncontrado(null);

    try {
      // Usamos el endpoint de users con filtro de email
      const res = await API.get(`/users?email=${encodeURIComponent(email.trim())}`);
      const users = Array.isArray(res.data) ? res.data : [];
      const match = users.find((u) => u.email?.toLowerCase() === email.trim().toLowerCase());

      if (match) {
        setEncontrado(match);
      } else {
        setError("No se encontró ningún asistente con ese email.");
      }
    } catch (err) {
      // Fallback: intentar registro directo si el backend lo soporta
      setError("No se pudo verificar el email. Intenta de nuevo.");
    } finally {
      setBuscando(false);
    }
  };

  const handleRegistrar = async () => {
    if (!encontrado) return;
    setLoading(true);
    setError(null);

    try {
      await API.post("/mi-marca/visita", {
        visitante_user_id: encontrado.id,
        tipo: "visita_stand",
      });
      onSuccess();
    } catch (err) {
      setError("Error al registrar la visita.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-5 flex justify-between items-center">
          <h2 className="text-xl font-bold">Registrar Visita al Stand</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-blue-700 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Buscar por email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email del asistente
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEncontrado(null); }}
                onKeyDown={(e) => e.key === "Enter" && buscarUsuario()}
                placeholder="correo@ejemplo.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={buscarUsuario}
                disabled={buscando || !email.trim()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition text-sm font-medium"
              >
                {buscando ? "…" : "Buscar"}
              </button>
            </div>
          </div>

          {/* Resultado encontrado */}
          {encontrado && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-800 mb-1">✅ Asistente encontrado</p>
              <p className="font-bold text-gray-900">{encontrado.nombre}</p>
              <p className="text-sm text-gray-600">{encontrado.email}</p>
              {encontrado.empresa && (
                <p className="text-sm text-gray-600">{encontrado.empresa}</p>
              )}
              <p className="text-xs text-gray-500 mt-1 capitalize">
                {encontrado.rol?.replace("_", " ")}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleRegistrar}
              disabled={!encontrado || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-semibold text-sm"
            >
              {loading ? "Registrando…" : "Registrar Visita"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}