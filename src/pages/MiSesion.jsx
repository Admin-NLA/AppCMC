import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useEvent } from "../contexts/EventContext.jsx";
import API from "../services/api";
import {
  Mic,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  Calendar,
  FileText,
  Download,
  TrendingUp
} from "lucide-react";
import Header from "../Components/layout/Header";

export default function MiSesion() {
  const { userProfile, permisos } = useAuth();
  const { sedeActiva, edicionActiva } = useEvent();

  const [sesion, setSesion] = useState(null);
  const [asistentes, setAsistentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalAsistentes: 0,
    confirmados: 0,
    checkIns: 0
  });

  // ========================================================
  // VALIDACIÓN DE ACCESO
  // ========================================================
  const validateAccess = () => {
    if (!permisos?.verMiSesion) {
      setAccessDenied(true);
      setAccessMessage("Solo Speakers pueden acceder a su información de sesión");
      return false;
    }
    return true;
  };

  // ========================================================
  // CARGAR SESIÓN Y DETALLES
  // ========================================================
  useEffect(() => {
    if (!validateAccess()) {
      setLoading(false);
      return;
    }
    loadSesion();
  }, [permisos, userProfile]);

  const loadSesion = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      // Filtro por speaker actual
      if (userProfile?.id) {
        params.append("speaker_id", userProfile.id);
      }

      // Filtros opcionales
      if (permisos?.filtraSede && sedeActiva) {
        params.append("sede", sedeActiva);
      }
      if (permisos?.filtraEdicion && edicionActiva) {
        params.append("edicion", edicionActiva);
      }

      // Cargar sesión del speaker
      const sesionRes = await API.get(`/mi-sesion?${params.toString()}`);
      const sesionData = sesionRes.data?.sesion;

      if (sesionData) {
        setSesion(sesionData);

        // Cargar asistentes de la sesión
        try {
          const asistentesRes = await API.get(
            `/mi-sesion/asistentes/${sesionData.id}`
          );
          const asistentesData = Array.isArray(asistentesRes.data?.asistentes)
            ? asistentesRes.data.asistentes
            : [];

          setAsistentes(asistentesData);
          setStats(asistentesRes.data?.stats || {
            totalAsistentes: asistentesData.length,
            confirmados: 0,
            checkIns: 0
          });
        } catch (err) {
          console.log("No se pudieron cargar asistentes:", err.message);
        }
      } else {
        setSesion(null);
      }

      console.log("✅ Sesión cargada");
    } catch (err) {
      console.error("Error cargando sesión:", err);
      setError("Error al cargar tu sesión");
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // DESCARGAR LISTA DE ASISTENTES
  // ========================================================
  const downloadAsistentes = () => {
    if (asistentes.length === 0) return;

    const headers = ["Nombre", "Email", "Empresa", "Cargo", "Check-in"];
    const rows = asistentes.map((a) => [
      a.nombre || "N/A",
      a.email || "N/A",
      a.empresa || "N/A",
      a.cargo || "N/A",
      a.checkin_at ? "✓" : "✗"
    ]);

    let csvContent = headers.join(",") + "\n";
    rows.forEach((row) => {
      csvContent += row.map((cell) => `"${cell}"`).join(",") + "\n";
    });

    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    link.download = `asistentes-${sesion?.id}-${new Date().getTime()}.csv`;
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
            <p className="text-gray-600">Cargando tu sesión...</p>
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
                  Contacta a soporte si crees que es un error.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 mt-1" size={24} />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!sesion) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg text-center">
            <Mic size={48} className="mx-auto text-blue-600 mb-4" />
            <p className="text-blue-800 font-semibold">
              No tienes sesiones asignadas
            </p>
            <p className="text-blue-700 text-sm mt-2">
              Contacta a los organizadores para ser asignado como speaker.
            </p>
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
            <Mic size={32} className="text-blue-600" />
            Mi Sesión
          </h1>
          <p className="text-gray-600">
            Información de tu sesión y asistentes
          </p>
        </div>

        {/* Tarjeta principal de la sesión */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* Encabezado */}
          <div className="mb-6 pb-6 border-b-2 border-gray-200">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {sesion.titulo}
            </h2>
            <div className="flex flex-wrap gap-4 text-gray-600">
              {sesion.dia && (
                <span className="flex items-center gap-2">
                  <Calendar size={18} />
                  Día {sesion.dia}
                </span>
              )}
              {sesion.sede && (
                <span className="flex items-center gap-2">
                  <MapPin size={18} />
                  <span className="uppercase font-semibold text-orange-600">
                    {sesion.sede}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Información de horario */}
          {(sesion.horaInicio || sesion.horaFin) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="flex items-start gap-3">
                <Clock className="text-blue-600 mt-1" size={24} />
                <div>
                  <p className="text-sm text-gray-600 font-semibold">
                    HORARIO
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {sesion.horaInicio &&
                      new Date(
                        `2025-01-01 ${sesion.horaInicio}`
                      ).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    {sesion.horaFin &&
                      ` - ${new Date(
                        `2025-01-01 ${sesion.horaFin}`
                      ).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}`}
                  </p>
                </div>
              </div>

              {sesion.lugar && (
                <div className="flex items-start gap-3">
                  <MapPin className="text-purple-600 mt-1" size={24} />
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">
                      LUGAR
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {sesion.lugar}
                    </p>
                  </div>
                </div>
              )}

              {sesion.duracion && (
                <div className="flex items-start gap-3">
                  <Clock className="text-green-600 mt-1" size={24} />
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">
                      DURACIÓN
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {sesion.duracion} min
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Descripción */}
          {sesion.descripcion && (
            <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FileText size={20} />
                Descripción
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {sesion.descripcion}
              </p>
            </div>
          )}

          {/* Speakers (si hay múltiples) */}
          {sesion.speakers && Array.isArray(sesion.speakers) && sesion.speakers.length > 0 && (
            <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users size={20} />
                Speakers
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sesion.speakers.map((speaker) => (
                  <div key={speaker.id} className="border border-gray-200 rounded-lg p-4">
                    <p className="font-semibold text-gray-900">{speaker.nombre}</p>
                    {speaker.cargo && (
                      <p className="text-sm text-gray-600">{speaker.cargo}</p>
                    )}
                    {speaker.empresa && (
                      <p className="text-sm text-gray-600">{speaker.empresa}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Estadísticas de asistentes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard
            label="Total Inscritos"
            value={stats.totalAsistentes}
            icon={Users}
            color="blue"
          />
          <StatCard
            label="Confirmados"
            value={stats.confirmados}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            label="Check-ins"
            value={stats.checkIns}
            icon={Calendar}
            color="purple"
          />
        </div>

        {/* Tabla de asistentes */}
        {asistentes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">
              No hay asistentes registrados aún
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Asistentes</h3>
                <button
                  onClick={downloadAsistentes}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                >
                  <Download size={18} />
                  Descargar CSV
                </button>
              </div>
            </div>

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
                      Check-in
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {asistentes.map((asistente, idx) => (
                    <tr
                      key={asistente.id || idx}
                      className="border-b border-gray-200 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {asistente.nombre}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {asistente.email}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {asistente.empresa || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {asistente.cargo || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {asistente.checkin_at ? (
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold text-xs">
                            ✓ Check-in
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-semibold text-xs">
                            Pendiente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile - Tarjetas */}
            <div className="md:hidden space-y-3 p-4">
              {asistentes.map((asistente, idx) => (
                <div
                  key={asistente.id || idx}
                  className="border border-gray-200 rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {asistente.nombre}
                      </h4>
                      <p className="text-sm text-gray-600">{asistente.email}</p>
                    </div>
                    {asistente.checkin_at ? (
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold text-xs">
                        ✓
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-semibold text-xs">
                        -
                      </span>
                    )}
                  </div>
                  {(asistente.empresa || asistente.cargo) && (
                    <p className="text-sm text-gray-600">
                      {asistente.empresa && (
                        <>
                          {asistente.empresa}
                          {asistente.cargo && " • "}
                        </>
                      )}
                      {asistente.cargo}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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