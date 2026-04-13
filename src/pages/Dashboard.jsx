// src/pages/Dashboard.jsx
// Dashboard principal CMC — vista adaptada por rol
//
// FIXES:
//   • Eliminado <Header /> y wrapper min-h-screen (Layout ya los provee)
//   • useState llamados DENTRO del componente (antes estaban fuera del if guard)
//   • AsistenteView: muestra mis check-ins, próximas sesiones del día, encuestas pendientes
//   • SpeakerView: carga las sesiones reales del speaker desde /mi-sesion
//   • ExpositorView: muestra visitantes reales desde /mi-marca
//   • Roles compuestos correctos: asistente_general, asistente_combo, etc.

import { useEffect, useState } from "react";
import { useAuth }  from "../contexts/AuthContext.jsx";
import { useEvent } from "../contexts/EventContext.jsx";
import { Link }     from "react-router-dom";
import API from "../services/api";
import {
  Calendar, Users, Building2, CheckCircle, Clock,
  TrendingUp, Award, Bell, Mic, QrCode, ClipboardList,
  Map, Loader2, ChevronRight, Star, RefreshCw
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────
const fmtHora = v => {
  if (!v) return null;
  try { return new Date(v).toLocaleTimeString("es", { hour:"2-digit", minute:"2-digit" }); }
  catch { return v; }
};

const ROL_LABEL = {
  super_admin:          "Super Admin",
  staff:                "Staff",
  speaker:              "Speaker",
  expositor:            "Expositor",
  asistente_general:    "Asistente General",
  asistente_curso:      "Asistente Curso",
  asistente_sesiones:   "Asistente Sesiones",
  asistente_combo:      "Asistente Combo",
};

// ── StatCard ────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color = "blue", to }) {
  const palette = {
    blue:   "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    green:  "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
    pink:   "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400",
  };
  const card = (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-center justify-between hover:shadow-sm transition">
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-black text-gray-900 dark:text-white mt-0.5">{value ?? "—"}</p>
      </div>
      <div className={`p-3 rounded-xl ${palette[color]}`}>
        <Icon size={22} />
      </div>
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

// ── Acceso rápido ────────────────────────────────────────────
function QuickLink({ to, icon: Icon, label, color = "blue" }) {
  const palette = {
    blue:   "border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600",
    green:  "border-green-200 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600",
    purple: "border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600",
    orange: "border-orange-200 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600",
  };
  return (
    <Link to={to}
      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition group ${palette[color]}`}>
      <Icon size={20} />
      <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">{label}</span>
      <ChevronRight size={16} className="ml-auto text-gray-400 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

// ── DASHBOARD PRINCIPAL ──────────────────────────────────────
export default function Dashboard() {
  const { userProfile, permisos, previewRol, previewTipoPase } = useAuth();
  const { sedeActiva, edicionActiva, ready } = useEvent();

  const [stats,          setStats]          = useState(null);
  const [sesionesHoy,    setSesionesHoy]    = useState([]);
  const [misRegistros,   setMisRegistros]   = useState([]);
  const [encuestasPend,  setEncuestasPend]  = useState(0);
  const [visitantes,     setVisitantes]     = useState(0);
  const [misSesiones,    setMisSesiones]    = useState([]);
  const [loading,        setLoading]        = useState(true);

  // En modo preview, usar el rol simulado para adaptar el dashboard
  const rolEfectivo = previewRol || userProfile?.rol;
  const rol = rolEfectivo;
  const esAdmin     = rol === "super_admin" || rol === "staff";
  const esSpeaker   = rol === "speaker";
  const esExpositor = rol === "expositor";
  const esAsistente = !esAdmin && !esSpeaker && !esExpositor;

  useEffect(() => {
    if (userProfile && ready) loadDashboard();
  }, [userProfile, ready]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Stats globales (todos los roles)
      const statsRes = await API.get("/stats").catch(() => null);
      if (statsRes) setStats(statsRes.data);

      // Próximas sesiones del día
      const params = new URLSearchParams({ limit: "8" });
      if (sedeActiva)    params.append("sede", sedeActiva);
      if (edicionActiva) params.append("edicion", String(edicionActiva));
      const sesRes = await API.get(`/agenda/sessions?${params}`).catch(() => null);
      const todasSesiones = sesRes?.data?.sessions || sesRes?.data || [];
      setSesionesHoy(Array.isArray(todasSesiones) ? todasSesiones.slice(0, 6) : []);

      // Datos específicos por rol
      if (esAsistente) {
        const [regRes, encRes] = await Promise.all([
          API.get("/mis-registros?limit=3").catch(() => null),
          API.get("/encuestas").catch(() => null),
        ]);
        setMisRegistros(regRes?.data?.registros?.slice(0,3) || []);
        const pendientes = (encRes?.data?.encuestas || []).filter(e => !e.ya_respondio);
        setEncuestasPend(pendientes.length);
      }

      if (esSpeaker) {
        const spRes = await API.get(
          `/mi-sesion?speaker_id=${userProfile.id}${sedeActiva ? `&sede=${sedeActiva}` : ""}`
        ).catch(() => null);
        setMisSesiones(spRes?.data?.sesiones || []);
      }

      if (esExpositor) {
        const visRes = await API.get("/mi-marca").catch(() => null);
        setVisitantes(visRes?.data?.visitantes?.length || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Guards ───────────────────────────────────────────────
  if (!permisos || !ready || !userProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Saludo */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            ¡Bienvenido, {userProfile.nombre?.split(" ")[0]}! 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {ROL_LABEL[rol] || rol}
            {sedeActiva    && <> · <span className="capitalize font-medium">{sedeActiva}</span></>}
            {edicionActiva && <> · Edición {edicionActiva}</>}
          </p>
        </div>
        <button onClick={loadDashboard} disabled={loading}
          className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition disabled:opacity-50">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════
              ADMIN / STAFF
          ══════════════════════════════════════════════ */}
          {esAdmin && stats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Calendar}  label="Sesiones"    value={stats.sessions}    color="blue"   to="/agenda" />
                <StatCard icon={Mic}       label="Speakers"    value={stats.speakers}    color="purple" to="/speakers" />
                <StatCard icon={Building2} label="Expositores" value={stats.expositores} color="orange" to="/expositores" />
                <StatCard icon={Users}     label="Usuarios"    value={stats.users}       color="green"  to="/usuarios" />
              </div>

              {/* Por sede */}
              {Object.keys(stats.bySede || {}).length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                  <h2 className="font-bold text-gray-900 dark:text-white mb-4">Usuarios por sede</h2>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(stats.bySede).map(([sede, count]) => (
                      <div key={sede} className="flex-1 min-w-24 bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-orange-600">{count}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">{sede}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Por tipo de pase */}
              {Object.keys(stats.byTipoPase || {}).length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                  <h2 className="font-bold text-gray-900 dark:text-white mb-4">Por tipo de pase</h2>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(stats.byTipoPase).map(([pase, count]) => (
                      <div key={pase} className="flex-1 min-w-24 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-purple-600">{count}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">{pase.replace(/_/g," ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accesos rápidos admin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <QuickLink to="/admin"         icon={Users}    label="Panel de Admin"    color="blue" />
                <QuickLink to="/staff"         icon={TrendingUp} label="Staff Panel"     color="green" />
                <QuickLink to="/agenda"        icon={Calendar} label="Agenda"            color="purple" />
                <QuickLink to="/usuarios"      icon={Users}    label="Usuarios"          color="orange" />
                <QuickLink to="/notificaciones" icon={Bell}    label="Notificaciones"    color="blue" />
                {rol === "super_admin" && <QuickLink to="/branding" icon={Star} label="Branding" color="pink" />}
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════
              SPEAKER
          ══════════════════════════════════════════════ */}
          {esSpeaker && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={Mic}   label="Mis sesiones" value={misSesiones.length} color="blue" />
                <StatCard icon={Users} label="Check-ins totales"
                  value={misSesiones.length} color="green" />
              </div>

              {misSesiones.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-5 py-4 border-b dark:border-gray-700">
                    <h2 className="font-bold text-gray-900 dark:text-white">Mis sesiones</h2>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {misSesiones.map(s => (
                      <div key={s.id} className="px-5 py-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                            {s.titulo || s.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                            {s.dia && <span>Día {s.dia}</span>}
                            {(s.horaInicio || s.start_at) &&
                              <span>{fmtHora(s.horaInicio || s.start_at)}</span>}
                            {(s.sala || s.room) && <span>· {s.sala || s.room}</span>}
                          </p>
                        </div>
                        {s.sede && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-semibold uppercase shrink-0">
                            {s.sede}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <QuickLink to="/mi-sesion"     icon={Mic}          label="Mi Sesión (detalle)" color="blue" />
                <QuickLink to="/encuestas"     icon={ClipboardList} label="Mis Encuestas"       color="purple" />
                <QuickLink to="/notificaciones" icon={Bell}         label="Notificaciones"       color="orange" />
                <QuickLink to="/perfil"        icon={Users}        label="Mi Perfil"            color="green" />
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════
              EXPOSITOR
          ══════════════════════════════════════════════ */}
          {esExpositor && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={Users}     label="Visitantes hoy" value={visitantes} color="blue"   to="/mi-marca" />
                <StatCard icon={Calendar}  label="Sesiones"        value={stats?.sessions}  color="purple" to="/agenda" />
                <StatCard icon={Building2} label="Expositores"     value={stats?.expositores} color="orange" to="/expositores" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <QuickLink to="/mi-marca"      icon={Building2}    label="Mi Marca / Visitantes" color="blue" />
                <QuickLink to="/mapa-expo"     icon={Map}          label="Mapa de Exposición"    color="orange" />
                <QuickLink to="/encuestas"     icon={ClipboardList} label="Encuestas"            color="purple" />
                <QuickLink to="/notificaciones" icon={Bell}         label="Notificaciones"        color="green" />
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════
              ASISTENTE (todos los subtipos)
          ══════════════════════════════════════════════ */}
          {esAsistente && (
            <>
              {/* Mis stats personales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={CheckCircle}  label="Mis check-ins"    value={misRegistros.length} color="green"  to="/mis-registros" />
                <StatCard icon={ClipboardList} label="Encuestas pend."  value={encuestasPend}       color="orange" to="/encuestas" />
                <StatCard icon={Calendar}     label="Sesiones totales"  value={stats?.sessions}     color="blue"   to="/agenda" />
                <StatCard icon={Building2}    label="Expositores"       value={stats?.expositores}  color="purple" to="/expositores" />
              </div>

              {/* Mis últimos registros */}
              {misRegistros.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-5 py-4 border-b dark:border-gray-700 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <CheckCircle size={17} className="text-green-500" /> Mis últimas asistencias
                    </h2>
                    <Link to="/mis-registros" className="text-xs text-blue-600 hover:underline">Ver todo</Link>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {misRegistros.map((r, i) => (
                      <div key={r.id || i} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {r.titulo || r.sesion || r.tipo || "Entrada"}
                          </p>
                          {r.fecha && (
                            <p className="text-xs text-gray-400">
                              {new Date(r.fecha).toLocaleDateString("es", {day:"numeric",month:"short"})}
                            </p>
                          )}
                        </div>
                        <CheckCircle size={16} className="text-green-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Próximas sesiones del evento */}
              {sesionesHoy.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-5 py-4 border-b dark:border-gray-700 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock size={17} className="text-blue-500" /> Sesiones del evento
                    </h2>
                    <Link to="/agenda" className="text-xs text-blue-600 hover:underline">Ver agenda</Link>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {sesionesHoy.map((s, i) => (
                      <div key={s.id || i} className="px-5 py-3 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {s.title || s.titulo}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                            {s.dia && <span>Día {s.dia}</span>}
                            {(s.start_at || s.horaInicio) &&
                              <span>{fmtHora(s.start_at || s.horaInicio)}</span>}
                            {(s.sala || s.room) && <span>· {s.sala || s.room}</span>}
                          </p>
                        </div>
                        {s.tipo && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize shrink-0">
                            {s.tipo}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accesos rápidos asistente */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {permisos?.verAgenda && (
                  <QuickLink to="/agenda"       icon={Calendar}     label="Agenda"           color="blue" />
                )}
                <QuickLink to="/qr"             icon={QrCode}       label="Mi QR"            color="green" />
                <QuickLink to="/mis-registros"  icon={CheckCircle}  label="Mis Registros"    color="purple" />
                {permisos?.verEncuestas && (
                  <QuickLink to="/encuestas"    icon={ClipboardList} label="Encuestas"       color="orange" />
                )}
                {permisos?.verMapa && (
                  <QuickLink to="/mapa-expo"    icon={Map}          label="Mapa Expo"        color="orange" />
                )}
                <QuickLink to="/notificaciones" icon={Bell}         label="Notificaciones"   color="blue" />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}