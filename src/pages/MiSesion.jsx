// src/pages/MiSesion.jsx
// Panel del Speaker — muestra su(s) sesión(es), asistentes en tiempo real,
// estadísticas y formulario de edición de perfil público.
//
// FIXES aplicados:
//   • Eliminado import Header + todos los <Header /> y wrappers min-h-screen
//   • Backend devuelve sesiones[] + sesion (primera) — ahora maneja múltiples
//   • Campos correctos: titulo, horaInicio/horaFin (alias de start_at/end_at),
//     sala, lugar (alias de room), descripcion, dia
//   • Formulario de edición de perfil speaker (bio, photo_url, cargo,
//     linkedin_url, twitter_url, website_url) → PUT /api/mi-sesion/perfil

import { useState, useEffect, useCallback } from "react";
import { useAuth }  from "../contexts/AuthContext.jsx";
import { useEvent } from "../contexts/EventContext.jsx";
import API from "../services/api";
import {
  Mic, Clock, MapPin, Users, AlertCircle, Calendar,
  FileText, Download, TrendingUp, Edit2, Save, X,
  CheckCircle, RefreshCw, Loader2, ChevronDown, ChevronUp,
  Linkedin, Globe, Twitter
} from "lucide-react";

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function MiSesion() {
  const { userProfile, permisos } = useAuth();
  const { sedeActiva, edicionActiva } = useEvent();

  const [sesiones,     setSesiones]     = useState([]);
  const [sesionActiva, setSesionActiva] = useState(null); // sesión seleccionada del tab
  const [asistentes,   setAsistentes]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingAs,    setLoadingAs]    = useState(false);
  const [error,        setError]        = useState(null);
  const [stats, setStats] = useState({ totalAsistentes: 0, confirmados: 0, checkIns: 0 });

  // Edición de perfil
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfilForm, setPerfilForm] = useState({
    bio: "", photo_url: "", cargo: "", linkedin_url: "", twitter_url: "", website_url: ""
  });
  const [savingPerfil,  setSavingPerfil]  = useState(false);
  const [perfilMsg,     setPerfilMsg]     = useState(null);

  // ── Validación ────────────────────────────────────────────
  if (!permisos?.verMiSesion) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-6 rounded-2xl flex items-start gap-3 max-w-lg">
        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={22} />
        <div>
          <p className="font-bold text-red-800 dark:text-red-300">Solo Speakers</p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            Esta sección es exclusiva para ponentes del evento.
          </p>
        </div>
      </div>
    );
  }

  // ── Cargar sesiones ───────────────────────────────────────
  const loadSesiones = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const params = new URLSearchParams();
      if (userProfile?.id) params.append("speaker_id", userProfile.id);
      if (sedeActiva)      params.append("sede", sedeActiva);
      if (edicionActiva)   params.append("edicion", edicionActiva);

      const res = await API.get(`/mi-sesion?${params}`);
      const list = Array.isArray(res.data.sesiones) ? res.data.sesiones : [];
      setSesiones(list);
      if (list.length > 0 && !sesionActiva) setSesionActiva(list[0]);
    } catch (err) {
      setError("No se pudo cargar la información de tu sesión");
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id, sedeActiva, edicionActiva]);

  useEffect(() => { if (userProfile) loadSesiones(); }, [userProfile]);

  // ── Cargar asistentes cuando cambia la sesión activa ─────
  useEffect(() => {
    if (!sesionActiva?.id) return;
    (async () => {
      try {
        setLoadingAs(true);
        const res = await API.get(`/mi-sesion/asistentes/${sesionActiva.id}`);
        setAsistentes(res.data.asistentes || []);
        setStats(res.data.stats || { totalAsistentes: 0, confirmados: 0, checkIns: 0 });
      } catch {
        setAsistentes([]);
      } finally {
        setLoadingAs(false);
      }
    })();
  }, [sesionActiva?.id]);

  // ── Guardar perfil ────────────────────────────────────────
  const handleSavePerfil = async (e) => {
    e.preventDefault();
    try {
      setSavingPerfil(true); setPerfilMsg(null);
      await API.put("/mi-sesion/perfil", perfilForm);
      setPerfilMsg({ ok: true, text: "Perfil actualizado correctamente" });
      setEditandoPerfil(false);
      setTimeout(() => setPerfilMsg(null), 4000);
    } catch (err) {
      setPerfilMsg({ ok: false, text: err.response?.data?.error || err.message });
    } finally {
      setSavingPerfil(false);
    }
  };

  // ── Descargar CSV de asistentes ───────────────────────────
  const downloadCSV = () => {
    if (!asistentes.length) return;
    const headers = ["Nombre", "Email", "Empresa", "Rol", "Check-in"];
    const rows = asistentes.map(a => [
      a.nombre || "", a.email || "", a.empresa || "",
      a.rol || "", a.checkin_at ? new Date(a.checkin_at).toLocaleString("es") : "Pendiente"
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    link.download = `asistentes_${sesionActiva?.titulo?.replace(/\s+/g,"_") || "sesion"}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // ── Formato hora ──────────────────────────────────────────
  const fmtHora = (val) => {
    if (!val) return null;
    try {
      return new Date(val).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    } catch { return val; }
  };

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-5 rounded-2xl flex items-center gap-3 text-sm text-red-700 dark:text-red-300">
        <AlertCircle size={18} /> {error}
        <button onClick={loadSesiones} className="ml-auto underline">Reintentar</button>
      </div>
    );
  }

  if (!sesiones.length) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <Mic size={52} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">Sin sesiones asignadas</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
          Contacta a los organizadores del CMC para ser asignado como ponente.
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Mic className="text-blue-600" size={26} />
            Mi Sesión
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {sesiones.length} sesión{sesiones.length > 1 ? "es" : ""} asignada{sesiones.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSesiones}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => {
              setPerfilForm({
                bio: "", photo_url: "", cargo: "", linkedin_url: "", twitter_url: "", website_url: ""
              });
              setEditandoPerfil(true);
            }}
            className="flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
          >
            <Edit2 size={15} /> Editar mi perfil
          </button>
        </div>
      </div>

      {/* Mensaje perfil */}
      {perfilMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border
          ${perfilMsg.ok
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300"
            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300"}`}>
          {perfilMsg.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {perfilMsg.text}
        </div>
      )}

      {/* Modal edición de perfil */}
      {editandoPerfil && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="font-bold text-lg dark:text-white flex items-center gap-2">
                <Edit2 size={18} className="text-blue-600" /> Editar perfil de Speaker
              </h2>
              <button onClick={() => setEditandoPerfil(false)}>
                <X size={20} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleSavePerfil} className="p-5 space-y-4">
              <p className="text-xs text-gray-400">
                Estos datos se muestran en la sección pública de Speakers del evento.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Cargo / Puesto</label>
                <input className={inputCls} placeholder="Ej: Director de Mantenimiento"
                  value={perfilForm.cargo}
                  onChange={e => setPerfilForm(p => ({...p, cargo: e.target.value}))} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">URL Foto de perfil</label>
                <input type="url" className={inputCls} placeholder="https://..."
                  value={perfilForm.photo_url}
                  onChange={e => setPerfilForm(p => ({...p, photo_url: e.target.value}))} />
                {perfilForm.photo_url && (
                  <img src={perfilForm.photo_url} alt="" className="w-16 h-16 rounded-full object-cover border mt-1"
                    onError={e => e.target.style.display="none"} />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Biografía</label>
                <textarea className={inputCls} rows={4} placeholder="Cuéntanos sobre ti..."
                  value={perfilForm.bio}
                  onChange={e => setPerfilForm(p => ({...p, bio: e.target.value}))} />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase flex items-center gap-1">
                    <Linkedin size={12} /> LinkedIn
                  </label>
                  <input type="url" className={inputCls} placeholder="https://linkedin.com/in/..."
                    value={perfilForm.linkedin_url}
                    onChange={e => setPerfilForm(p => ({...p, linkedin_url: e.target.value}))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase flex items-center gap-1">
                    <Twitter size={12} /> Twitter / X
                  </label>
                  <input type="url" className={inputCls} placeholder="https://twitter.com/..."
                    value={perfilForm.twitter_url}
                    onChange={e => setPerfilForm(p => ({...p, twitter_url: e.target.value}))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase flex items-center gap-1">
                    <Globe size={12} /> Sitio web
                  </label>
                  <input type="url" className={inputCls} placeholder="https://..."
                    value={perfilForm.website_url}
                    onChange={e => setPerfilForm(p => ({...p, website_url: e.target.value}))} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingPerfil}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition">
                  {savingPerfil ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {savingPerfil ? "Guardando..." : "Guardar cambios"}
                </button>
                <button type="button" onClick={() => setEditandoPerfil(false)}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs de sesiones (si hay más de una) */}
      {sesiones.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sesiones.map(s => (
            <button key={s.id}
              onClick={() => setSesionActiva(s)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition
                ${sesionActiva?.id === s.id
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400"}`}
            >
              Día {s.dia} · {s.titulo?.slice(0,30)}{(s.titulo?.length||0) > 30 ? "…" : ""}
            </button>
          ))}
        </div>
      )}

      {sesionActiva && (
        <>
          {/* Tarjeta principal de la sesión */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
              {sesionActiva.titulo}
            </h2>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
              {sesionActiva.dia && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={16} className="text-blue-500" /> Día {sesionActiva.dia}
                </span>
              )}
              {(sesionActiva.horaInicio || sesionActiva.start_at) && (
                <span className="flex items-center gap-1.5">
                  <Clock size={16} className="text-green-500" />
                  {fmtHora(sesionActiva.horaInicio || sesionActiva.start_at)}
                  {(sesionActiva.horaFin || sesionActiva.end_at) &&
                    ` – ${fmtHora(sesionActiva.horaFin || sesionActiva.end_at)}`}
                </span>
              )}
              {(sesionActiva.sala || sesionActiva.lugar) && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-purple-500" />
                  {sesionActiva.sala || sesionActiva.lugar}
                </span>
              )}
              {sesionActiva.sede && (
                <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-semibold uppercase text-xs">
                  {sesionActiva.sede}
                </span>
              )}
              {sesionActiva.tipo && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs capitalize">
                  {sesionActiva.tipo}
                </span>
              )}
            </div>

            {sesionActiva.descripcion && (
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {sesionActiva.descripcion}
              </p>
            )}
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Registrados", value: stats.totalAsistentes, color: "blue",   icon: Users },
              { label: "Confirmados", value: stats.confirmados,     color: "green",  icon: CheckCircle },
              { label: "Check-ins",   value: stats.checkIns,        color: "purple", icon: TrendingUp },
            ].map(card => (
              <div key={card.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-white mt-0.5">{card.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-${card.color}-100 dark:bg-${card.color}-900/30 text-${card.color}-600 dark:text-${card.color}-400`}>
                  <card.icon size={22} />
                </div>
              </div>
            ))}
          </div>

          {/* Lista de asistentes */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                Asistentes con check-in
                {loadingAs && <Loader2 size={14} className="animate-spin text-gray-400 ml-1" />}
              </h3>
              {asistentes.length > 0 && (
                <button onClick={downloadCSV}
                  className="flex items-center gap-2 text-sm bg-green-600 text-white px-3 py-1.5 rounded-xl hover:bg-green-700 transition font-semibold">
                  <Download size={15} /> CSV
                </button>
              )}
            </div>

            {asistentes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {loadingAs ? "Cargando asistentes..." : "Aún no hay asistentes registrados"}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop — tabla */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        {["Nombre", "Email", "Empresa", "Check-in"].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {asistentes.map((a, i) => (
                        <tr key={a.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                          <td className="px-5 py-3 font-semibold text-gray-900 dark:text-white">{a.nombre}</td>
                          <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{a.email}</td>
                          <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{a.empresa || "—"}</td>
                          <td className="px-5 py-3">
                            {a.checkin_at ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                                <CheckCircle size={11} />
                                {new Date(a.checkin_at).toLocaleTimeString("es", {hour:"2-digit",minute:"2-digit"})}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Pendiente</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile — tarjetas */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {asistentes.map((a, i) => (
                    <div key={a.id || i} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{a.nombre}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{a.email}</p>
                        {a.empresa && <p className="text-xs text-gray-400">{a.empresa}</p>}
                      </div>
                      {a.checkin_at ? (
                        <span className="text-green-600 text-xs font-semibold flex items-center gap-1">
                          <CheckCircle size={13} />
                          {new Date(a.checkin_at).toLocaleTimeString("es", {hour:"2-digit",minute:"2-digit"})}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Pendiente</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}