import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import API from "../services/api";
import {
  Users,
  Calendar,
  Building2,
  TrendingUp,
  Download,
  BarChart3,
  Award,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function StaffPanel() {
  const { userProfile } = useAuth();

  const [stats, setStats] = useState(null);
  const [resumenDiario, setResumenDiario] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [sessionStats, setSessionStats] = useState([]);
  const [cursoStats, setCursoStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("resumen");

  // ========================================================
  // Cargar datos al montar
  // ========================================================
  useEffect(() => {
    if (userProfile) {
      loadAllData();
    }
  }, [userProfile]);

  // ========================================================
  // Cargar todos los datos
  // ========================================================
  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("📊 Cargando datos de staff...");

      // Cargar en paralelo
      const [statsRes, resumenRes, checkinsRes, sessionsRes, cursosRes] = await Promise.all([
        API.get("/staff/stats").catch(() => null),
        API.get("/staff/resumen-diario").catch(() => null),
        API.get("/staff/checkins?limit=20").catch(() => null),
        API.get("/staff/sessions-stats").catch(() => null),
        API.get("/staff/cursos-stats").catch(() => null),
      ]);

      if (statsRes) setStats(statsRes.data);
      if (resumenRes) setResumenDiario(resumenRes.data);
      if (checkinsRes) setCheckins(checkinsRes.data.checkins || []);
      if (sessionsRes) setSessionStats(sessionsRes.data.sessions || []);
      if (cursosRes) setCursoStats(cursosRes.data.cursos || []);

      console.log("✅ Datos cargados");
    } catch (err) {
      console.error("❌ Error cargando datos:", err);
      setError("Error al cargar datos del dashboard");
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // Validación de acceso
  // ========================================================
  if (!userProfile || (userProfile.rol !== "staff" && userProfile.rol !== "super_admin")) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
        <AlertCircle className="inline mr-2 text-red-600" />
        <p className="text-red-800 font-semibold">
          No tienes permisos para acceder al panel de Staff
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando panel de staff...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
        <AlertCircle className="inline mr-2 text-red-600" />
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadAllData}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========================================================
          HEADER
          ======================================================== */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Panel de Staff</h1>
            <p className="text-blue-100 mt-2">{userProfile.nombre} • {userProfile.rol}</p>
          </div>
          <button
            onClick={loadAllData}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ========================================================
          TABS
          ======================================================== */}
      <div className="flex gap-2 border-b">
        {[
          { id: "resumen", label: "📊 Resumen Hoy", icon: "📊" },
          { id: "general", label: "📈 Estadísticas", icon: "📈" },
          { id: "checkins", label: "✅ Check-ins", icon: "✅" },
          { id: "sesiones", label: "🎓 Sesiones", icon: "🎓" },
          { id: "cursos", label: "📚 Cursos", icon: "📚" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================
          RESUMEN HOY
          ======================================================== */}
      {activeTab === "resumen" && (
        <div className="space-y-6">
          {/* Cards principales */}
          {resumenDiario && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                icon={Clock}
                label="Check-ins Hoy"
                value={resumenDiario.resumen.checkinsHoy}
                color="blue"
              />
              <StatCard
                icon={Calendar}
                label="Sesiones Hoy"
                value={resumenDiario.resumen.sesionesHoy}
                color="green"
              />
              <StatCard
                icon={Users}
                label="Usuarios Únicos"
                value={resumenDiario.resumen.usuariosHoy}
                color="purple"
              />
            </div>
          )}

          {/* Últimas entradas */}
          {resumenDiario && resumenDiario.ultimasEntradas.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Últimas 5 Entradas</h2>
              <div className="space-y-2">
                {resumenDiario.ultimasEntradas.map((entrada, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded border-l-4 border-blue-600"
                  >
                    <div>
                      <p className="font-semibold">{entrada.nombre}</p>
                      <p className="text-sm text-gray-600">{entrada.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{entrada.sesion}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(entrada.fecha).toLocaleTimeString("es-MX")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          ESTADÍSTICAS GENERALES
          ======================================================== */}
      {activeTab === "general" && (
        <div className="space-y-6">
          {/* Cards principales */}
          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                  icon={Users}
                  label="Usuarios Totales"
                  value={stats.totalUsers}
                  color="blue"
                />
                <StatCard
                  icon={CheckCircle}
                  label="Check-ins Totales"
                  value={stats.totalCheckins}
                  color="green"
                />
                <StatCard
                  icon={Calendar}
                  label="Asistencias a Cursos"
                  value={stats.attendanceByType.cursos}
                  color="orange"
                />
                <StatCard
                  icon={Award}
                  label="Asistencias a Sesiones"
                  value={stats.attendanceByType.sesiones}
                  color="purple"
                />
              </div>

              {/* Usuarios por tipo de pase */}
              {Object.keys(stats.byTipoPase).length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <BarChart3 size={24} className="text-blue-600" />
                    Usuarios por Tipo de Pase
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(stats.byTipoPase).map(([pase, cantidad]) => (
                      <div
                        key={pase}
                        className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200"
                      >
                        <p className="text-3xl font-bold text-blue-600">{cantidad}</p>
                        <p className="text-sm text-gray-600 capitalize mt-1">{pase}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Usuarios por sede */}
              {Object.keys(stats.bySede).length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Building2 size={24} className="text-orange-600" />
                    Usuarios por Sede
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(stats.bySede).map(([sede, cantidad]) => (
                      <div
                        key={sede}
                        className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200"
                      >
                        <p className="text-3xl font-bold text-orange-600">{cantidad}</p>
                        <p className="text-sm text-gray-600 capitalize mt-1">{sede}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================
          CHECK-INS DETALLADO
          ======================================================== */}
      {activeTab === "checkins" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Registro de Check-ins</h2>
          {checkins.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-4 py-2 text-left">Usuario</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Tipo Pase</th>
                    <th className="px-4 py-2 text-left">Sesión</th>
                    <th className="px-4 py-2 text-left">Hora</th>
                    <th className="px-4 py-2 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {checkins.map((checkin) => (
                    <tr key={checkin.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{checkin.usuario_nombre}</td>
                      <td className="px-4 py-2 text-blue-600">{checkin.email}</td>
                      <td className="px-4 py-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                          {checkin.tipo_pase}
                        </span>
                      </td>
                      <td className="px-4 py-2">{checkin.sesion_titulo || "—"}</td>
                      <td className="px-4 py-2">
                        {checkin.hora_sesion
                          ? new Date(checkin.hora_sesion).toLocaleTimeString("es-MX")
                          : "—"}
                      </td>
                      <td className="px-4 py-2">
                        {new Date(checkin.fecha).toLocaleString("es-MX")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No hay check-ins registrados</p>
          )}
        </div>
      )}

      {/* ========================================================
          ASISTENCIA POR SESIÓN
          ======================================================== */}
      {activeTab === "sesiones" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Asistencia por Sesión</h2>
          {sessionStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-4 py-2 text-left">Sesión</th>
                    <th className="px-4 py-2 text-left">Tipo</th>
                    <th className="px-4 py-2 text-left">Día</th>
                    <th className="px-4 py-2 text-left">Hora</th>
                    <th className="px-4 py-2 text-left">Sala</th>
                    <th className="px-4 py-2 text-right">Asistentes</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionStats.map((session) => (
                    <tr key={session.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{session.titulo}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            session.categoria === "curso"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {session.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-2 capitalize">{session.dia || "—"}</td>
                      <td className="px-4 py-2">
                        {session.hora
                          ? new Date(session.hora).toLocaleTimeString("es-MX", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-2">{session.sala || "—"}</td>
                      <td className="px-4 py-2 text-right font-bold text-blue-600">
                        {session.asistentes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No hay sesiones registradas</p>
          )}
        </div>
      )}

      {/* ========================================================
          ASISTENCIA POR CURSO
          ======================================================== */}
      {activeTab === "cursos" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Asistencia por Curso</h2>
          {cursoStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-4 py-2 text-left">Curso</th>
                    <th className="px-4 py-2 text-left">Día</th>
                    <th className="px-4 py-2 text-left">Hora</th>
                    <th className="px-4 py-2 text-left">Sala</th>
                    <th className="px-4 py-2 text-right">Asistentes</th>
                  </tr>
                </thead>
                <tbody>
                  {cursoStats.map((curso) => (
                    <tr key={curso.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{curso.titulo}</td>
                      <td className="px-4 py-2 capitalize">{curso.dia || "—"}</td>
                      <td className="px-4 py-2">
                        {curso.hora
                          ? new Date(curso.hora).toLocaleTimeString("es-MX", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-2">{curso.sala || "—"}</td>
                      <td className="px-4 py-2 text-right font-bold text-green-600">
                        {curso.asistentes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No hay cursos registrados</p>
          )}
        </div>
      )}
    </div>
  );
}

// ========================================================
// COMPONENTE STAT CARD
// ========================================================
function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{label}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colors[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

function CheckCircle({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}