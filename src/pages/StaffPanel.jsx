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
  CheckCircle,
  Activity,
  UserX,
  Search,
  UserCheck,
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

  // Tkinter Live (lectura en vivo de cmc-mobile)
  const [tkinterLive, setTkinterLive] = useState(null);

  // Expositores y Speakers (carga diferida, solo al entrar al tab)
  const [tkinterExpositores, setTkinterExpositores] = useState(null);
  const [loadingExpositores, setLoadingExpositores] = useState(false);
  const [tkinterSpeakers, setTkinterSpeakers] = useState(null);
  const [loadingSpeakers, setLoadingSpeakers] = useState(false);

  // Quién No Llegó
  const [noLlegaron, setNoLlegaron] = useState(null);
  const [diaFiltro, setDiaFiltro] = useState("");
  const [loadingNoLlegaron, setLoadingNoLlegaron] = useState(false);
  const [busquedaNoLlegaron, setBusquedaNoLlegaron] = useState("");
  const [registrandoId, setRegistrandoId] = useState(null);
  const [registroMsg, setRegistroMsg] = useState(null);

  // Resumen del Evento (estadísticas-evento) — carga diferida
  const [resumenEvento, setResumenEvento] = useState(null);
  const [loadingResumenEvento, setLoadingResumenEvento] = useState(false);
  const [descargandoExcel, setDescargandoExcel] = useState(false);

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
      const [statsRes, resumenRes, checkinsRes, sessionsRes, cursosRes, tkinterRes] = await Promise.all([
        API.get("/staff/stats").catch(() => null),
        API.get("/staff/resumen-diario").catch(() => null),
        API.get("/staff/checkins?limit=20").catch(() => null),
        API.get("/staff/sessions-stats").catch(() => null),
        API.get("/staff/cursos-stats").catch(() => null),
        API.get("/staff/tkinter-live").catch(() => null),
      ]);

      if (statsRes) setStats(statsRes.data);
      if (resumenRes) setResumenDiario(resumenRes.data);
      if (checkinsRes) setCheckins(checkinsRes.data.checkins || []);
      if (sessionsRes) setSessionStats(sessionsRes.data.sessions || []);
      if (cursosRes) setCursoStats(cursosRes.data.cursos || []);
      if (tkinterRes) setTkinterLive(tkinterRes.data);

      console.log("✅ Datos cargados");
    } catch (err) {
      console.error("❌ Error cargando datos:", err);
      setError("Error al cargar datos del dashboard");
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // Quién No Llegó — carga y acciones
  // ========================================================
  const loadNoLlegaron = async (dia = diaFiltro) => {
    try {
      setLoadingNoLlegaron(true);
      const query = dia ? `?dia=${dia}` : "";
      const res = await API.get(`/staff/quien-no-llego${query}`);
      setNoLlegaron(res.data);
    } catch (err) {
      console.error("❌ Error cargando quién no llegó:", err);
      setNoLlegaron(null);
    } finally {
      setLoadingNoLlegaron(false);
    }
  };

  useEffect(() => {
    if (activeTab === "no_llegaron" && noLlegaron === null && userProfile) {
      loadNoLlegaron();
    }
  }, [activeTab, userProfile]);

  useEffect(() => {
    if (activeTab === "no_llegaron" && userProfile) {
      loadNoLlegaron(diaFiltro);
    }
  }, [diaFiltro]);

  // ========================================================
  // Expositores — carga diferida al entrar al tab
  // ========================================================
  const loadExpositores = async () => {
    try {
      setLoadingExpositores(true);
      const res = await API.get("/staff/tkinter-expositores");
      setTkinterExpositores(res.data);
    } catch (err) {
      console.error("❌ Error cargando expositores:", err);
      setTkinterExpositores(null);
    } finally {
      setLoadingExpositores(false);
    }
  };

  useEffect(() => {
    if (activeTab === "tkinter_expositores" && tkinterExpositores === null && userProfile) {
      loadExpositores();
    }
  }, [activeTab, userProfile]);

  // ========================================================
  // Speakers — carga diferida al entrar al tab
  // ========================================================
  const loadSpeakers = async () => {
    try {
      setLoadingSpeakers(true);
      const res = await API.get("/staff/tkinter-speakers");
      setTkinterSpeakers(res.data);
    } catch (err) {
      console.error("❌ Error cargando speakers:", err);
      setTkinterSpeakers(null);
    } finally {
      setLoadingSpeakers(false);
    }
  };

  useEffect(() => {
    if (activeTab === "tkinter_speakers" && tkinterSpeakers === null && userProfile) {
      loadSpeakers();
    }
  }, [activeTab, userProfile]);

  // ========================================================
  // Resumen del Evento — carga diferida al entrar al tab
  // ========================================================
  const loadResumenEvento = async () => {
    try {
      setLoadingResumenEvento(true);
      const res = await API.get("/staff/estadisticas-evento");
      setResumenEvento(res.data);
    } catch (err) {
      console.error("❌ Error cargando resumen del evento:", err);
      setResumenEvento(null);
    } finally {
      setLoadingResumenEvento(false);
    }
  };

  useEffect(() => {
    if (activeTab === "resumen_evento" && resumenEvento === null && userProfile) {
      loadResumenEvento();
    }
  }, [activeTab, userProfile]);

  // ========================================================
  // Descargar Excel de estadísticas completas (4 hojas)
  // El backend responde con el archivo binario directamente,
  // así que se pide como blob y se dispara la descarga en el navegador.
  // ========================================================
  const descargarExcelEstadisticas = async () => {
    try {
      setDescargandoExcel(true);
      const res = await API.get("/excel/estadisticas", { responseType: "blob" });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const fecha = new Date().toISOString().split("T")[0];
      link.download = `estadisticas_cmc_${fecha}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Error descargando Excel:", err);
      setError("No se pudo generar el archivo Excel");
    } finally {
      setDescargandoExcel(false);
    }
  };

  const noLlegaronFiltrados = (noLlegaron?.usuarios || []).filter((u) => {
    if (!busquedaNoLlegaron.trim()) return true;
    const q = busquedaNoLlegaron.toLowerCase();
    return (
      u.nombre?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.empresa?.toLowerCase().includes(q)
    );
  });

  const exportarNoLlegaronCSV = () => {
    const filas = noLlegaronFiltrados;
    if (!filas.length) return;
    const header = "Nombre,Email,Empresa,Tipo de Pase,Sede\n";
    const body = filas
      .map((u) =>
        [u.nombre, u.email, u.empresa || "", u.tipo_pase || "", u.sede || ""]
          .map((v) => `"${(v || "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const sufijoDia = diaFiltro ? `_dia${diaFiltro}` : "_total";
    link.download = `no_llegaron${sufijoDia}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const registrarManual = async (usuario) => {
    setRegistrandoId(usuario.id);
    setRegistroMsg(null);
    try {
      const res = await API.post("/staff/registro-manual", { usuario_id: usuario.id });
      setRegistroMsg({ tipo: "ok", texto: res.data.message });
      setNoLlegaron((prev) =>
        prev
          ? {
            ...prev,
            total: prev.total - 1,
            usuarios: prev.usuarios.filter((u) => u.id !== usuario.id),
          }
          : prev
      );
    } catch (err) {
      setRegistroMsg({
        tipo: "error",
        texto: err.response?.data?.error || "No se pudo registrar la asistencia",
      });
    } finally {
      setRegistrandoId(null);
      setTimeout(() => setRegistroMsg(null), 4000);
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
          { id: "resumen_evento", label: "📑 Resumen del Evento", icon: "📑" },
          { id: "tkinter_live", label: "🔄 Tkinter Live", icon: "🔄" },
          { id: "tkinter_expositores", label: "🏢 Expositores", icon: "🏢" },
          { id: "tkinter_speakers", label: "🎤 Speakers", icon: "🎤" },
          { id: "no_llegaron", label: "🚫 Quién No Llegó", icon: "🚫" },
          { id: "general", label: "📈 Estadísticas", icon: "📈" },
          { id: "checkins", label: "✅ Check-ins", icon: "✅" },
          { id: "sesiones", label: "🎓 Sesiones", icon: "🎓" },
          { id: "cursos", label: "📚 Cursos", icon: "📚" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === tab.id
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
          RESUMEN DEL EVENTO — vista completa + descarga Excel
          ======================================================== */}
      {activeTab === "resumen_evento" && (
        <div className="space-y-6">
          {/* Botón de descarga, siempre visible en este tab */}
          <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Reporte completo del evento</h2>
              <p className="text-sm text-gray-500">Excel con 4 hojas: escaneos, estadísticos, asistentes y cursos</p>
            </div>
            <button
              onClick={descargarExcelEstadisticas}
              disabled={descargandoExcel}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              {descargandoExcel ? (
                <><RefreshCw size={16} className="animate-spin" /> Generando...</>
              ) : (
                <><Download size={16} /> Descargar Excel</>
              )}
            </button>
          </div>

          {loadingResumenEvento ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full" />
            </div>
          ) : !resumenEvento ? (
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg text-center">
              <AlertCircle className="mx-auto mb-2 text-amber-500" size={32} />
              <p className="text-amber-800 font-semibold">Sin datos disponibles</p>
            </div>
          ) : (
            <>
              {/* Totales generales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Entradas" value={resumenEvento.totalEntradas ?? "—"} color="blue" />
                <StatCard
                  icon={Calendar}
                  label="Día Actual del Evento"
                  value={resumenEvento.diaActual ? `Día ${resumenEvento.diaActual}` : "—"}
                  color="green"
                />
                <StatCard icon={Award} label="Citas Networking" value={resumenEvento.networking?.total ?? 0} color="purple" />
                <StatCard
                  icon={Activity}
                  label="Fecha"
                  value={resumenEvento.fechaHoy ? new Date(resumenEvento.fechaHoy).toLocaleDateString("es-MX") : "—"}
                  color="orange"
                />
              </div>

              {/* Resumen por día */}
              {resumenEvento.resumenPorDia && resumenEvento.resumenPorDia.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <BarChart3 size={22} className="text-blue-600" />
                    Entradas por Día y Tipo de Pase
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100 border-b text-left">
                          <th className="px-4 py-3 font-semibold">Día</th>
                          <th className="px-4 py-3 font-semibold">Combo</th>
                          <th className="px-4 py-3 font-semibold">Sesiones</th>
                          <th className="px-4 py-3 font-semibold">Curso</th>
                          <th className="px-4 py-3 font-semibold">Expositor</th>
                          <th className="px-4 py-3 font-semibold">Ponente</th>
                          <th className="px-4 py-3 font-semibold">Staff</th>
                          <th className="px-4 py-3 font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumenEvento.resumenPorDia.map((d) => (
                          <tr
                            key={d.dia}
                            className={`border-b hover:bg-gray-50 ${d.esDiaActual ? "bg-blue-50" : ""}`}
                          >
                            <td className="px-4 py-3 font-semibold">
                              Día {d.dia} {d.esDiaActual && <span className="text-blue-600 text-xs">(hoy)</span>}
                            </td>
                            <td className="px-4 py-3">{d.combo}</td>
                            <td className="px-4 py-3">{d.sesiones}</td>
                            <td className="px-4 py-3">{d.curso}</td>
                            <td className="px-4 py-3">{d.expositor}</td>
                            <td className="px-4 py-3">{d.ponente}</td>
                            <td className="px-4 py-3">{d.staff}</td>
                            <td className="px-4 py-3 font-bold">{d.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Usuarios registrados por tipo */}
              {resumenEvento.usuariosRegistrados && Object.keys(resumenEvento.usuariosRegistrados).length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Users size={22} className="text-blue-600" />
                    Usuarios Registrados por Tipo de Pase
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(resumenEvento.usuariosRegistrados).map(([tipo, cantidad]) => (
                      <div key={tipo} className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                        <p className="text-3xl font-bold text-blue-600">{cantidad}</p>
                        <p className="text-sm text-gray-600 capitalize mt-1">{tipo}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Networking */}
              {resumenEvento.networking && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Award size={22} className="text-purple-600" />
                    Citas de Networking
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={Award} label="Total" value={resumenEvento.networking.total} color="purple" />
                    <StatCard icon={CheckCircle} label="Confirmadas" value={resumenEvento.networking.confirmadas} color="green" />
                    <StatCard icon={Clock} label="Pendientes" value={resumenEvento.networking.pendientes} color="orange" />
                    <StatCard icon={AlertCircle} label="Rechazadas" value={resumenEvento.networking.rechazadas} color="blue" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================
          TKINTER LIVE — lectura en vivo de cmc-mobile, sin copiar
          ======================================================== */}
      {activeTab === "tkinter_live" && (
        <div className="space-y-6">
          {!tkinterLive ? (
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg text-center">
              <Activity className="mx-auto mb-2 text-amber-500" size={32} />
              <p className="text-amber-800 font-semibold">Sin datos disponibles</p>
              <p className="text-amber-700 text-sm mt-1">
                No se pudo leer información desde cmc-mobile en este momento.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={Users} label="Total Asistentes" value={tkinterLive.total_attendees ?? "—"} color="blue" />
                <StatCard icon={CheckCircle} label="Escaneos Entrada" value={tkinterLive.entry_scans ?? "—"} color="green" />
                <StatCard
                  icon={Activity}
                  label="Última Actualización"
                  value={tkinterLive.updated_at ? new Date(tkinterLive.updated_at).toLocaleTimeString("es-MX") : "—"}
                  color="purple"
                />
              </div>

              {tkinterLive.daily_summary && Object.keys(tkinterLive.daily_summary).length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <BarChart3 size={22} className="text-blue-600" />
                    Asistencia por Día (en vivo)
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100 border-b text-left">
                          <th className="px-4 py-3 font-semibold">Día</th>
                          <th className="px-4 py-3 font-semibold text-blue-700">General</th>
                          <th className="px-4 py-3 font-semibold text-green-700">Sesiones</th>
                          <th className="px-4 py-3 font-semibold text-orange-700">Cursos</th>
                          <th className="px-4 py-3 font-semibold text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(tkinterLive.daily_summary)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([dia, conteos]) => (
                            <tr key={dia} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 font-semibold capitalize">{dia.replace("day_", "Día ")}</td>
                              <td className="px-4 py-3">
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold text-sm">{conteos.general}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold text-sm">{conteos.sessions}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-bold text-sm">{conteos.courses}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full font-bold text-sm">{conteos.total}</span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tkinterLive.attendees && tkinterLive.attendees.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Users size={22} className="text-green-600" />
                    Asistentes — {tkinterLive.attendees.length} personas
                  </h2>
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-100">
                        <tr className="border-b text-left">
                          <th className="px-3 py-2">ID</th>
                          <th className="px-3 py-2">Nombre</th>
                          <th className="px-3 py-2">Empresa</th>
                          <th className="px-3 py-2">Tipo</th>
                          <th className="px-3 py-2 text-center">Día 1</th>
                          <th className="px-3 py-2 text-center">Día 2</th>
                          <th className="px-3 py-2 text-center">Día 3</th>
                          <th className="px-3 py-2 text-center">Día 4</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tkinterLive.attendees.map((a, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-xs text-gray-500">{a.ID}</td>
                            <td className="px-3 py-2 font-medium">{a["Nombre(s)"]} {a["Apellido(s)"]}</td>
                            <td className="px-3 py-2 text-gray-600 text-xs">{a.Empresa}</td>
                            <td className="px-3 py-2">
                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">{a["Tipo de Asistente"]}</span>
                            </td>
                            {["Día 1", "Día 2", "Día 3", "Día 4"].map((d) => (
                              <td key={d} className="px-3 py-2 text-center">
                                {a[d] === "X" ? <span className="text-green-600 font-bold text-base">✓</span> : <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================
          EXPOSITORES — lectura en vivo de cmc-mobile
          ======================================================== */}
      {activeTab === "tkinter_expositores" && (
        <div className="space-y-6">
          {loadingExpositores ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full" />
            </div>
          ) : !tkinterExpositores ? (
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg text-center">
              <Building2 className="mx-auto mb-2 text-amber-500" size={32} />
              <p className="text-amber-800 font-semibold">Sin datos disponibles</p>
              <p className="text-amber-700 text-sm mt-1">
                No se pudo leer información de expositores desde cmc-mobile en este momento.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={Building2} label="Total Expositores" value={tkinterExpositores.total_exhibitors ?? "—"} color="blue" />
                <StatCard icon={CheckCircle} label="Ya Escaneados" value={tkinterExpositores.total_scanned_exhibitors ?? 0} color="green" />
                <StatCard
                  icon={Activity}
                  label="Última Actualización"
                  value={tkinterExpositores.updated_at ? new Date(tkinterExpositores.updated_at).toLocaleTimeString("es-MX") : "—"}
                  color="purple"
                />
              </div>

              {tkinterExpositores.daily_exhibitor_stats && Object.keys(tkinterExpositores.daily_exhibitor_stats).length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <BarChart3 size={22} className="text-blue-600" />
                    Asistencia de Expositores por Día
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(tkinterExpositores.daily_exhibitor_stats).map(([dia, conteo]) => (
                      <div key={dia} className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 text-center">
                        <p className="text-2xl font-bold text-blue-600">{conteo.actual ?? 0} / {conteo.expected ?? 0}</p>
                        <p className="text-sm text-gray-600 capitalize mt-1">{dia.replace("day_", "Día ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tkinterExpositores.exhibitors && tkinterExpositores.exhibitors.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Building2 size={22} className="text-blue-600" />
                    Personal de Expositores — {tkinterExpositores.exhibitors.length} personas
                  </h2>
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-100">
                        <tr className="border-b text-left">
                          <th className="px-3 py-2">ID</th>
                          <th className="px-3 py-2">Nombre</th>
                          <th className="px-3 py-2">Empresa</th>
                          <th className="px-3 py-2 text-center">Día 3</th>
                          <th className="px-3 py-2 text-center">Día 4</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tkinterExpositores.exhibitors.map((e, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-xs text-gray-500">{e.ID}</td>
                            <td className="px-3 py-2 font-medium">{e["Nombre(s)"]} {e["Apellido(s)"]}</td>
                            <td className="px-3 py-2 text-gray-600 text-xs">{e.Empresa}</td>
                            {["Día 3", "Día 4"].map((d) => (
                              <td key={d} className="px-3 py-2 text-center">
                                {e[d] === "X" ? <span className="text-green-600 font-bold text-base">✓</span> : <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================
          SPEAKERS / PONENTES — lectura en vivo de cmc-mobile
          ======================================================== */}
      {activeTab === "tkinter_speakers" && (
        <div className="space-y-6">
          {loadingSpeakers ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full" />
            </div>
          ) : !tkinterSpeakers ? (
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg text-center">
              <Users className="mx-auto mb-2 text-amber-500" size={32} />
              <p className="text-amber-800 font-semibold">Sin datos disponibles</p>
              <p className="text-amber-700 text-sm mt-1">
                No se pudo leer información de speakers desde cmc-mobile en este momento.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={Users} label="Total Speakers" value={tkinterSpeakers.total_speakers ?? "—"} color="blue" />
                <StatCard icon={CheckCircle} label="Ya Escaneados" value={tkinterSpeakers.total_scanned_speakers ?? 0} color="green" />
                <StatCard
                  icon={Activity}
                  label="Última Actualización"
                  value={tkinterSpeakers.updated_at ? new Date(tkinterSpeakers.updated_at).toLocaleTimeString("es-MX") : "—"}
                  color="purple"
                />
              </div>

              {tkinterSpeakers.daily_speaker_stats && Object.keys(tkinterSpeakers.daily_speaker_stats).length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <BarChart3 size={22} className="text-blue-600" />
                    Asistencia de Speakers por Día
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(tkinterSpeakers.daily_speaker_stats).map(([dia, conteo]) => (
                      <div key={dia} className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 text-center">
                        <p className="text-2xl font-bold text-purple-600">{conteo.actual ?? 0} / {conteo.expected ?? 0}</p>
                        <p className="text-sm text-gray-600 capitalize mt-1">{dia.replace("day_", "Día ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tkinterSpeakers.speakers && tkinterSpeakers.speakers.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Users size={22} className="text-purple-600" />
                    Speakers / Ponentes — {tkinterSpeakers.speakers.length} personas
                  </h2>
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-100">
                        <tr className="border-b text-left">
                          <th className="px-3 py-2">ID</th>
                          <th className="px-3 py-2">Nombre</th>
                          <th className="px-3 py-2">Empresa</th>
                          <th className="px-3 py-2 text-center">Día 1</th>
                          <th className="px-3 py-2 text-center">Día 2</th>
                          <th className="px-3 py-2 text-center">Día 3</th>
                          <th className="px-3 py-2 text-center">Día 4</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tkinterSpeakers.speakers.map((s, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-xs text-gray-500">{s.ID}</td>
                            <td className="px-3 py-2 font-medium">{s["Nombre(s)"]} {s["Apellido(s)"]}</td>
                            <td className="px-3 py-2 text-gray-600 text-xs">{s.Empresa}</td>
                            {["Día 1", "Día 2", "Día 3", "Día 4"].map((d) => (
                              <td key={d} className="px-3 py-2 text-center">
                                {s[d] === "X" ? <span className="text-green-600 font-bold text-base">✓</span> : <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================
          QUIÉN NO LLEGÓ
          ======================================================== */}
      {activeTab === "no_llegaron" && (
        <div className="space-y-6">
          {registroMsg && (
            <div className={`p-4 rounded-lg border flex items-center gap-2 ${registroMsg.tipo === "ok" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
              {registroMsg.tipo === "ok" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span className="text-sm font-medium">{registroMsg.texto}</span>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-500" />
              <select
                value={diaFiltro}
                onChange={(e) => setDiaFiltro(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm font-medium"
              >
                <option value="">Todos los días (nunca llegó)</option>
                <option value="1">Solo Día 1</option>
                <option value="2">Solo Día 2</option>
                <option value="3">Solo Día 3</option>
                <option value="4">Solo Día 4</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o empresa..."
                value={busquedaNoLlegaron}
                onChange={(e) => setBusquedaNoLlegaron(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>

            <button
              onClick={() => loadNoLlegaron(diaFiltro)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition"
            >
              <RefreshCw size={16} /> Actualizar
            </button>

            <button
              onClick={exportarNoLlegaronCSV}
              disabled={!noLlegaronFiltrados.length}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40"
            >
              <Download size={16} /> Exportar CSV
            </button>
          </div>

          {loadingNoLlegaron ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full" />
            </div>
          ) : !noLlegaron ? (
            <div className="bg-red-50 border border-red-200 p-6 rounded-lg text-center">
              <AlertCircle className="mx-auto mb-2 text-red-500" size={28} />
              <p className="text-red-800 font-semibold">No se pudo cargar la información</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">
                      {diaFiltro ? `Sin registro el Día ${diaFiltro}` : "Sin registro ningún día"}
                    </p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{noLlegaron.total}</p>
                  </div>
                  <div className="p-3 rounded-full bg-red-100 text-red-600">
                    <UserX size={24} />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600 text-sm mb-2">Por tipo de pase</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(noLlegaron.porTipoPase || {}).map(([tipo, cantidad]) => (
                      <span key={tipo} className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
                        {tipo}: {cantidad}
                      </span>
                    ))}
                    {Object.keys(noLlegaron.porTipoPase || {}).length === 0 && (
                      <span className="text-gray-400 text-sm">Sin datos</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">
                  Lista de asistentes sin registro
                  <span className="text-sm font-normal text-gray-500 ml-2">({noLlegaronFiltrados.length} mostrados)</span>
                </h2>
                {noLlegaronFiltrados.length > 0 ? (
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-100">
                        <tr className="border-b">
                          <th className="px-4 py-2 text-left">Nombre</th>
                          <th className="px-4 py-2 text-left">Email</th>
                          <th className="px-4 py-2 text-left">Empresa</th>
                          <th className="px-4 py-2 text-left">Tipo Pase</th>
                          <th className="px-4 py-2 text-left">Sede</th>
                          <th className="px-4 py-2 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {noLlegaronFiltrados.map((u) => (
                          <tr key={u.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium">{u.nombre}</td>
                            <td className="px-4 py-2 text-blue-600">{u.email}</td>
                            <td className="px-4 py-2 text-gray-600">{u.empresa || "—"}</td>
                            <td className="px-4 py-2">
                              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold">{u.tipo_pase || "—"}</span>
                            </td>
                            <td className="px-4 py-2 capitalize">{u.sede || "—"}</td>
                            <td className="px-4 py-2 text-center">
                              <button
                                onClick={() => registrarManual(u)}
                                disabled={registrandoId === u.id}
                                className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Marcar como presente hoy"
                              >
                                {registrandoId === u.id ? (
                                  <><RefreshCw size={14} className="animate-spin" /> Registrando...</>
                                ) : (
                                  <><UserCheck size={14} /> Marcar presente</>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8">
                    {busquedaNoLlegaron ? "Ningún resultado coincide con la búsqueda" : "🎉 Todos los asistentes tienen registro"}
                  </p>
                )}
              </div>
            </>
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
                          className={`px-2 py-1 rounded text-xs font-semibold ${session.categoria === "curso"
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