// src/pages/AdminPanel.jsx
// Panel de Administración CMC — Super Admin y Staff
//
// ACCESO:
//   • super_admin → acceso total: crear, editar, eliminar todo + notificaciones
//   • staff       → puede editar speakers/expositores, ver sesiones (solo lectura en sesiones)
//
// CONDICIONADO A:
//   • Sede activa (EventContext.sedeActiva) → filtra y pre-llena sede
//   • Edición activa (EventContext.edicionActiva)
//
// TABS: Sesiones | Speakers | Expositores | Notificaciones
//
// CAMPOS ALINEADOS CON NEONDB:
//   agenda:     id, title, description, start_at, end_at, room, sala, dia,
//               tipo, categoria, sede, edicion, activo, capacidad
//   speakers:   id, nombre, bio, company, photo_url, cargo, email, telefono,
//               linkedin_url, twitter_url, website_url, sede, edicion, activo
//   expositores: id, nombre, descripcion, stand, logo_url, contact(jsonb),
//                categoria, website_url, sede, edicion, activo
//   notificaciones: titulo, mensaje, tipo, tipo_usuario(array), sede, activa

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth }  from "../contexts/AuthContext.jsx";
import { useEvent } from "../contexts/EventContext.jsx";
import API from "../services/api";
import {
  Plus, Edit2, Trash2, Save, X, Bell, Users,
  FileUp, AlertCircle, CheckCircle, Loader2,
  Calendar, Mic, Building2, Map, ExternalLink, ChevronDown,
  RefreshCw, Wifi, WifiOff, Clock,
} from "lucide-react";

// ── Sedes del sistema ─────────────────────────────────────
const SEDES = ["mexico", "chile", "colombia"];

// ── Tipos de pase (para segmentar notificaciones) ────────
const TIPOS_PASE = [
  { id: "todos",              label: "Todos" },
  { id: "asistente_general",  label: "Asistente General" },
  { id: "asistente_curso",    label: "Asistente Curso" },
  { id: "asistente_sesiones", label: "Asistente Sesiones" },
  { id: "asistente_combo",    label: "Asistente Combo" },
  { id: "expositor",          label: "Expositor" },
  { id: "speaker",            label: "Speaker" },
  { id: "staff",              label: "Staff" },
];

// ────────────────────────────────────────────────────────────
// Campo de entrada reutilizable
// ────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{label}</label>}
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const btnPrimary = "flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 font-semibold text-sm disabled:opacity-50 transition";
const btnDanger  = "flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-xl hover:bg-red-600 text-sm transition";
const btnGhost   = "flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition";

// ────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ────────────────────────────────────────────────────────────

// ============================================================
// Componente: Configuración visual del mapa de stands
// ============================================================
function MapaStandsAdmin({ expositores, sedeActiva, edicionActiva, flash, loadExpositores }) {
  const [gridCols,  setGridCols]  = React.useState(20);
  const [gridFilas, setGridFilas] = React.useState(15);
  const [saving,    setSaving]    = React.useState(false);
  const [editMode,  setEditMode]  = React.useState(false); // modo asignar posición

  // Construir gridMap
  const gridMap = {};
  expositores.forEach(e => {
    if (e.grid_col != null && e.grid_fila != null) {
      for (let dc = 0; dc < (e.ancho_celdas||1); dc++) {
        for (let df = 0; df < (e.alto_celdas||1); df++) {
          gridMap[`${e.grid_col+dc}-${e.grid_fila+df}`] = { expo: e, isOrigin: dc===0 && df===0 };
        }
      }
    }
  });

  const ESTADOS = {
    libre:         { label:"Libre",          color:"#f0fdf4", border:"#86efac", text:"#16a34a" },
    solicitado:    { label:"Solicitado",      color:"#fffbeb", border:"#fcd34d", text:"#d97706" },
    ocupado:       { label:"Ocupado",         color:"#eff6ff", border:"#93c5fd", text:"#2563eb" },
    no_disponible: { label:"No disponible",   color:"#f9fafb", border:"#d1d5db", text:"#6b7280" },
  };

  const cambiarEstado = async (expo, nuevoEstado) => {
    try {
      await API.patch(`/expositores/${expo.id}/estado`, { estado_stand: nuevoEstado });
      flash(`✅ ${expo.nombre}: ${ESTADOS[nuevoEstado]?.label}`);
      loadExpositores();
    } catch { flash("Error al cambiar estado", true); }
  };

  const asignarPosicion = async (expo, col, fila) => {
    try {
      await API.patch(`/expositores/${expo.id}/posicion`, { grid_col: col, grid_fila: fila });
      flash(`✅ ${expo.nombre} → posición (${col},${fila})`);
      loadExpositores();
    } catch { flash("Error al asignar posición", true); }
  };

  const sinPosicion = expositores.filter(e => e.grid_col == null || e.grid_fila == null);
  const [standAcomodar, setStandAcomodar] = React.useState(null);

  return (
    <div className="space-y-5">
      {/* Config del grid */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Dimensiones del área de exposición</h3>
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Columnas</label>
            <input type="number" min="5" max="40" value={gridCols}
              onChange={e => setGridCols(parseInt(e.target.value)||20)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Filas</label>
            <input type="number" min="5" max="40" value={gridFilas}
              onChange={e => setGridFilas(parseInt(e.target.value)||15)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white" />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Grid {gridCols}×{gridFilas} = {gridCols*gridFilas} celdas totales
        </p>
      </div>

      {/* Stands sin posición */}
      {sinPosicion.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-700 rounded-2xl p-4">
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-3">
            ⚠️ {sinPosicion.length} expositores sin posición en el mapa
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sinPosicion.map(expo => (
              <div key={expo.id}
                className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl p-2.5 border border-orange-100 dark:border-orange-700">
                {expo.logo_url && <img src={expo.logo_url} className="w-8 h-8 object-contain rounded" onError={e=>e.target.style.display='none'} />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{expo.nombre}</p>
                  <p className="text-xs text-gray-400">Stand: {expo.stand || "sin número"}</p>
                </div>
                <button
                  onClick={() => setStandAcomodar(standAcomodar?.id === expo.id ? null : expo)}
                  className={`text-xs px-2 py-1 rounded-lg font-semibold transition ${
                    standAcomodar?.id === expo.id
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 border border-blue-200"
                  }`}>
                  {standAcomodar?.id === expo.id ? "Cancelar" : "Ubicar →"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {standAcomodar && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700 rounded-2xl p-4">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">
            Ubicando: <strong>{standAcomodar.nombre}</strong>
          </p>
          <p className="text-xs text-blue-500 mb-3">Haz clic en una celda vacía del grid para posicionar el stand</p>
        </div>
      )}

      {/* Grid visual de administración */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Vista del plano ({gridCols}×{gridFilas})
          </span>
          <div className="flex gap-2">
            {Object.entries(ESTADOS).map(([k,v]) => (
              <span key={k} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: v.color, color: v.text, border: `1px solid ${v.border}` }}>
                {v.label}
              </span>
            ))}
          </div>
        </div>
        <div className="overflow-auto p-3" style={{ maxHeight: 480 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            gap: "2px",
            background: "#e2e8f0",
            padding: "2px",
            borderRadius: "8px",
          }}>
            {Array.from({ length: gridCols * gridFilas }, (_, i) => {
              const col  = (i % gridCols) + 1;
              const fila = Math.floor(i / gridCols) + 1;
              const cell = gridMap[`${col}-${fila}`];
              if (cell && !cell.isOrigin) return null;

              const expo  = cell?.expo;
              const estado = ESTADOS[expo?.estado_stand || "libre"];
              const ancho  = expo?.ancho_celdas || 1;
              const alto   = expo?.alto_celdas  || 1;

              return (
                <div key={`${col}-${fila}`}
                  onClick={() => {
                    if (standAcomodar && !expo) {
                      asignarPosicion(standAcomodar, col, fila);
                      setStandAcomodar(null);
                    }
                  }}
                  style={{
                    gridColumn: `span ${ancho}`,
                    gridRow:    `span ${alto}`,
                    backgroundColor: expo ? estado.color : (standAcomodar ? "#f0f9ff" : "#ffffff"),
                    border: `2px solid ${expo ? estado.border : (standAcomodar ? "#7dd3fc" : "#f3f4f6")}`,
                    borderRadius: "4px",
                    minHeight: "44px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "3px",
                    cursor: expo ? "pointer" : (standAcomodar ? "crosshair" : "default"),
                    position: "relative",
                  }}
                  title={expo ? expo.nombre : `Celda (${col},${fila}) — clic para ubicar`}
                >
                  {expo ? (
                    <>
                      {expo.logo_url
                        ? <img src={expo.logo_url} style={{width:24,height:24}} className="object-contain" onError={e=>e.target.style.display='none'} />
                        : <span style={{ fontSize:"0.6rem", color: estado.text, fontWeight: 700 }}>
                            {expo.stand || expo.nombre?.charAt(0)}
                          </span>
                      }
                      {/* Botón de estado en hover */}
                      <div className="absolute inset-0 opacity-0 hover:opacity-100 bg-white/90 dark:bg-gray-800/90 rounded flex flex-col items-center justify-center gap-0.5 transition-opacity p-1">
                        <span style={{ fontSize:"0.5rem", fontWeight:700, color:"#1e293b", textAlign:"center", lineHeight:1.2 }}>
                          {expo.nombre?.split(" ")[0]}
                        </span>
                        <div className="flex gap-0.5">
                          {Object.entries(ESTADOS).map(([k,v]) => (
                            <button key={k}
                              onClick={e => { e.stopPropagation(); cambiarEstado(expo, k); }}
                              className="w-3 h-3 rounded-full border hover:scale-125 transition-transform"
                              style={{ backgroundColor: v.color, borderColor: v.border }}
                              title={v.label}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize:"0.45rem", color:"#cbd5e1" }}>{col},{fila}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabla de expositores con estado */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Estado de todos los stands</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-gray-500">Empresa</th>
                <th className="px-3 py-2 text-left text-gray-500">Stand</th>
                <th className="px-3 py-2 text-left text-gray-500">Posición</th>
                <th className="px-3 py-2 text-left text-gray-500">Estado</th>
                <th className="px-3 py-2 text-left text-gray-500">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {expositores.map(expo => {
                const estado = ESTADOS[expo.estado_stand || "libre"];
                return (
                  <tr key={expo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{expo.nombre}</td>
                    <td className="px-3 py-2 text-gray-500">{expo.stand || "—"}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {expo.grid_col != null ? `(${expo.grid_col},${expo.grid_fila})` : <span className="text-orange-500">Sin posición</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: estado.color, color: estado.text, border: `1px solid ${estado.border}` }}>
                        {estado.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={expo.estado_stand || "libre"}
                        onChange={e => cambiarEstado(expo, e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white">
                        {Object.entries(ESTADOS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { userProfile } = useAuth();
  const { sedeActiva, edicionActiva } = useEvent();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("sesiones");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(null);

  // Sede usada en formularios — inicia desde la sede activa del evento
  const [sedeForm, setSedeForm] = useState(sedeActiva || "colombia");

  useEffect(() => {
    if (sedeActiva) setSedeForm(sedeActiva);
  }, [sedeActiva]);

  // ── Sesiones ────────────────────────────────────────────
  const [sessions,        setSessions]        = useState([]);
  const [eventos,         setEventos]         = useState([]);
  const [showEventoForm,  setShowEventoForm]  = useState(false);
  const [editingEventoId, setEditingEventoId] = useState(null);
  const [eventoForm,      setEventoForm]      = useState({ titulo:"", dia:1, horaInicio:"", horaFin:"", tipo:"registro", sala:"" });

  const [filtroSede,      setFiltroSede]      = useState("");
  const [sinTitulo,       setSinTitulo]       = useState([]);
  const [syncing,         setSyncing]         = useState(false);
  const [wpConfig,        setWpConfig]        = useState(null);
  const [wpStatus,        setWpStatus]        = useState(null); // null|'ok'|'error'
  const [showWpPanel,     setShowWpPanel]     = useState(false);
  const [wpForm,          setWpForm]          = useState({ wp_api_url:'', wp_username:'', wp_app_password:'' });
  const [testingWp,       setTestingWp]       = useState(false);
  const [wpTestResult,    setWpTestResult]    = useState(null);

  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [sessionForm,     setSessionForm]     = useState(blankSession(sedeForm, edicionActiva));

  function blankSession(sede, edicion) {
    return {
      title: "", description: "", start_at: "", end_at: "", speakerId: "",
      room: "", sala: "", dia: 1, tipo: "sesion", categoria: "brujula",
      sede: sede || "colombia", edicion: edicion || 2026,
      capacidad: "", activo: true,
    };
  }

  // ── Speakers ────────────────────────────────────────────
  const [speakers,        setSpeakers]        = useState([]);
  const [showSpeakerForm, setShowSpeakerForm] = useState(false);
  const [editingSpeakerId, setEditingSpeakerId] = useState(null);
  const [speakerForm,     setSpeakerForm]     = useState(blankSpeaker(sedeForm, edicionActiva));

  function blankSpeaker(sede, edicion) {
    return {
      nombre: "", bio: "", company: "", photo_url: "", cargo: "",
      email: "", telefono: "", linkedin_url: "", twitter_url: "",
      website_url: "", sede: sede || "colombia", edicion: edicion || 2026,
      activo: true,
    };
  }

  // ── Expositores ─────────────────────────────────────────
  const [expositores,        setExpositores]        = useState([]);
  const [showExpositorForm,  setShowExpositorForm]  = useState(false);
  const [editingExpositorId, setEditingExpositorId] = useState(null);
  const [expositorForm,      setExpositorForm]      = useState(blankExpositor(sedeForm, edicionActiva));

  function blankExpositor(sede, edicion) {
    return {
      nombre: "", descripcion: "", stand: "", logo_url: "",
      categoria: "", website_url: "",
      contact_email: "", contact_telefono: "", contact_nombre: "",
      posicion_x: "", posicion_y: "",
      sede: sede || "colombia", edicion: edicion || 2026, activo: true,
    };
  }

  // ── Notificaciones ──────────────────────────────────────
  const [showNotiForm,   setShowNotiForm]   = useState(false);
  const [notiForm,       setNotiForm]       = useState(blankNoti());
  const [users,          setUsers]          = useState([]);
  const [notiLoading,    setNotiLoading]    = useState(false);
  const [notiError,      setNotiError]      = useState(null);

  function blankNoti() {
    return {
      titulo: "", mensaje: "", tipo: "info",
      tipo_usuario: ["todos"], sede: "todos",
    };
  }

  // ────────────────────────────────────────────────────────
  // CARGA POR TAB
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userProfile) return;
    if (activeTab === "sesiones")       loadSessions();
    if (activeTab === "eventos")        loadEventos();
    loadSpeakers(); // para el selector en form de sesiones
    loadWpConfig();
    loadSinTitulo();

    if (activeTab === "speakers")       loadSpeakers();
    if (activeTab === "expositores")    loadExpositores();
    if (activeTab === "notificaciones") loadUsers();
  }, [activeTab, userProfile]);

  const flash = (msg, isError = false) => {
    if (isError) setError(msg);
    else         { setSuccess(msg); setTimeout(() => setSuccess(null), 3500); }
  };

  // ────────────────────────────────────────────────────────
  // SESIONES
  // ────────────────────────────────────────────────────────
  const loadWpConfig = async () => {
    try {
      const r = await API.get('/config/wp-config');
      setWpConfig(r.data);
      setWpForm(f => ({
        wp_api_url: r.data.wp_config?.wp_api_url || '',
        wp_username: r.data.wp_config?.wp_username || '',
        wp_app_password: '',
      }));
    } catch { /* silencioso */ }
  };

  const loadSinTitulo = async () => {
    try {
      const r = await API.get('/agenda/sessions/sin-titulo');
      setSinTitulo(r.data.sesiones || []);
    } catch { setSinTitulo([]); }
  };

  const handleSyncWp = async (forzar = false) => {
    if (!confirm(forzar
      ? '¿Re-sincronizar TODAS las sesiones desde WordPress? Esto recuperará las que quedaron sin título.'
      : '¿Sincronizar sesiones desde WordPress ahora?'
    )) return;
    setSyncing(true);
    try {
      const r = await API.post('/agenda/sessions/sync-wp', {
        sede: filtroSede || null,
        forzar_limpiar: forzar,
      });
      flash(`✅ ${r.data.message} — ${r.data.reparadas} sesiones recuperadas`);
      loadSessions();
      loadSinTitulo();
    } catch (e) {
      flash(e.response?.data?.error || 'Error al sincronizar', true);
    } finally { setSyncing(false); }
  };

  const handleTestWp = async () => {
    setTestingWp(true); setWpTestResult(null);
    try {
      const r = await API.post('/config/test-wp', wpForm);
      setWpTestResult(r.data);
    } catch { setWpTestResult({ ok: false, mensaje: 'Error de conexión' }); }
    finally { setTestingWp(false); }
  };

  const handleSaveWpConfig = async () => {
    try {
      await API.put('/config/wp-config', wpForm);
      flash('Configuración de WordPress guardada');
      setShowWpPanel(false);
      loadWpConfig();
    } catch (e) { flash(e.response?.data?.error || 'Error', true); }
  };

  const sessionsFiltradas = filtroSede
    ? sessions.filter(s => (s.sede || '').toLowerCase() === filtroSede.toLowerCase())
    : sessions;

  const loadEventos = async () => {
    try {
      const tiposL = ["registro","recepcion","expo_abierta","keynote","coffee_break","almuerzo","networking","clausura","otro"];
      const r = await API.get(`/agenda/sessions?sede=${sedeForm || sedeActiva}`);
      const all = r.data?.sessions || [];
      setEventos(all.filter(s => tiposL.includes(s.tipo) || s.categoria === "logistica"));
    } catch { setEventos([]); }
  };

  const submitEvento = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const p = {
        titulo: eventoForm.titulo, horaInicio: eventoForm.horaInicio || null,
        horaFin: eventoForm.horaFin || null, dia: parseInt(eventoForm.dia) || 1,
        tipo: eventoForm.tipo, categoria: "logistica",
        sala: eventoForm.sala, sede: sedeForm || sedeActiva,
        edicion: parseInt(edicionActiva) || 2026, activo: true,
      };
      if (editingEventoId) { await API.put(`/agenda/sessions/${editingEventoId}`, p); flash("Evento actualizado"); }
      else                 { await API.post("/agenda/sessions", p);                   flash("Evento creado"); }
      setShowEventoForm(false); setEditingEventoId(null);
      setEventoForm({ titulo:"", dia:1, horaInicio:"", horaFin:"", tipo:"registro", sala:"" });
      loadEventos();
    } catch(err) { flash(err.response?.data?.error || err.message, true); }
    finally { setLoading(false); }
  };

  const loadSessions = async () => {


    try {
      setLoading(true);
      const res = await API.get("/agenda/sessions");
      // La API devuelve { sessions: [...] }
      const list = Array.isArray(res.data.sessions)
        ? res.data.sessions
        : Array.isArray(res.data) ? res.data : [];
      setSessions(list);
    } catch (e) {
      flash("No se pudieron cargar las sesiones", true);
    } finally { setLoading(false); }
  };

  const submitSession = async (e) => {
    e.preventDefault();
    try {
      setLoading(true); setError(null);
      // FIX: el backend PUT/POST espera titulo/horaInicio/horaFin (no title/start_at/end_at)
      const payload = {
        titulo:      sessionForm.title,
        descripcion: sessionForm.description,
        horaInicio:  sessionForm.start_at || null,
        horaFin:     sessionForm.end_at   || null,
        sala:        sessionForm.sala || sessionForm.room,
        dia:         parseInt(sessionForm.dia) || 1,
        tipo:        sessionForm.tipo,
        categoria:   sessionForm.categoria,
        sede:        sessionForm.sede,
        edicion:     parseInt(sessionForm.edicion) || edicionActiva || 2026,
        capacidad:   sessionForm.capacidad ? parseInt(sessionForm.capacidad) : null,
        activo:      sessionForm.activo !== false,
        speakerId:   sessionForm.speakerId || null,
      };
      if (editingSessionId) {
        await API.put(`/agenda/sessions/${editingSessionId}`, payload);
        flash("Sesión actualizada correctamente");
      } else {
        await API.post("/agenda/sessions", payload);
        flash("Sesión creada correctamente");
      }
      resetSessionForm();
      loadSessions();
    } catch (e) {
      flash(e.response?.data?.error || e.message, true);
    } finally { setLoading(false); }
  };

  const deleteSession = async (id) => {
    if (!confirm("¿Eliminar esta sesión?")) return;
    try {
      await API.delete(`/agenda/sessions/${id}`);
      setSessions(s => s.filter(x => x.id !== id));
      flash("Sesión eliminada");
    } catch (e) { flash(e.response?.data?.error || e.message, true); }
  };

  const editSession = (s) => {
    setEditingSessionId(s.id);
    setSessionForm({
      title:       s.title       || s.titulo      || "",
      description: s.description || s.descripcion || "",
      start_at:    s.start_at    ? String(s.start_at).slice(0,16)
                 : s.horaInicio  ? String(s.horaInicio).slice(0,16) : "",
      end_at:      s.end_at      ? String(s.end_at).slice(0,16)
                 : s.horaFin     ? String(s.horaFin).slice(0,16)   : "",
      room:        s.room        || s.sala  || "",
      sala:        s.sala        || s.room  || "",
      dia:         s.dia         || s.day_number || 1,
      tipo:        s.tipo        || "sesion",
      categoria:   s.categoria   || "brujula",
      sede:        s.sede        || sedeForm,
      edicion:     s.edicion     || edicionActiva || 2026,
      capacidad:   s.capacidad   || "",
      speakerId:   (s.speakers && s.speakers[0]) ? s.speakers[0] : "",
      activo:      s.activo !== false,
    });
    setShowSessionForm(true);
  };

  const resetSessionForm = () => {
    setEditingSessionId(null);
    setSessionForm(blankSession(sedeForm, edicionActiva));
    setShowSessionForm(false);
  };

  // ────────────────────────────────────────────────────────
  // SPEAKERS
  // ────────────────────────────────────────────────────────
  const loadSpeakers = async () => {
    try {
      setLoading(true);
      const res = await API.get("/speakers");
      // GET /speakers devuelve array directo
      const list = Array.isArray(res.data) ? res.data
        : Array.isArray(res.data.speakers) ? res.data.speakers : [];
      setSpeakers(list);
    } catch (e) {
      flash("No se pudieron cargar los speakers", true);
    } finally { setLoading(false); }
  };

  const submitSpeaker = async (e) => {
    e.preventDefault();
    try {
      setLoading(true); setError(null);
      const payload = { ...speakerForm, edicion: parseInt(speakerForm.edicion) || edicionActiva || 2026 };
      if (editingSpeakerId) {
        await API.put(`/speakers/${editingSpeakerId}`, payload);
        flash("Speaker actualizado");
      } else {
        await API.post("/speakers", payload);
        flash("Speaker creado");
      }
      resetSpeakerForm();
      loadSpeakers();
    } catch (e) {
      flash(e.response?.data?.error || e.message, true);
    } finally { setLoading(false); }
  };

  const deleteSpeaker = async (id) => {
    if (!confirm("¿Eliminar este speaker?")) return;
    try {
      await API.delete(`/speakers/${id}`);
      setSpeakers(s => s.filter(x => x.id !== id));
      flash("Speaker eliminado");
    } catch (e) { flash(e.response?.data?.error || e.message, true); }
  };

  const editSpeaker = (s) => {
    setEditingSpeakerId(s.id);
    setSpeakerForm({
      nombre:       s.nombre       || "",
      bio:          s.bio          || "",
      company:      s.company      || "",
      photo_url:    s.photo_url    || "",
      cargo:        s.cargo        || "",
      email:        s.email        || "",
      telefono:     s.telefono     || "",
      linkedin_url: s.linkedin_url || "",
      twitter_url:  s.twitter_url  || "",
      website_url:  s.website_url  || "",
      sede:         s.sede         || sedeForm,
      edicion:      s.edicion      || edicionActiva || 2026,
      activo:       s.activo !== false,
    });
    setShowSpeakerForm(true);
  };

  const resetSpeakerForm = () => {
    setEditingSpeakerId(null);
    setSpeakerForm(blankSpeaker(sedeForm, edicionActiva));
    setShowSpeakerForm(false);
  };

  // ────────────────────────────────────────────────────────
  // EXPOSITORES
  // ────────────────────────────────────────────────────────
  const loadExpositores = async () => {
    try {
      setLoading(true);
      const res = await API.get("/expositores");
      const list = Array.isArray(res.data) ? res.data
        : Array.isArray(res.data.expositores) ? res.data.expositores : [];
      setExpositores(list);
    } catch (e) {
      flash("No se pudieron cargar los expositores", true);
    } finally { setLoading(false); }
  };

  const submitExpositor = async (e) => {
    e.preventDefault();
    try {
      setLoading(true); setError(null);
      // contact es JSONB en la DB
      const contact = {
        email:    expositorForm.contact_email    || "",
        telefono: expositorForm.contact_telefono || "",
        nombre:   expositorForm.contact_nombre   || "",
      };
      const payload = {
        nombre:      expositorForm.nombre,
        descripcion: expositorForm.descripcion,
        stand:       expositorForm.stand,
        logo_url:    expositorForm.logo_url,
        categoria:   expositorForm.categoria,
        website_url: expositorForm.website_url,
        contact,
        posicion_x:  expositorForm.posicion_x !== "" ? parseFloat(expositorForm.posicion_x) : null,
        posicion_y:  expositorForm.posicion_y !== "" ? parseFloat(expositorForm.posicion_y) : null,
        sede:        expositorForm.sede,
        edicion:     parseInt(expositorForm.edicion) || edicionActiva || 2026,
        activo:      expositorForm.activo !== false,
      };
      if (editingExpositorId) {
        await API.put(`/expositores/${editingExpositorId}`, payload);
        flash("Expositor actualizado");
      } else {
        await API.post("/expositores", payload);
        flash("Expositor creado");
      }
      resetExpositorForm();
      loadExpositores();
    } catch (e) {
      flash(e.response?.data?.error || e.message, true);
    } finally { setLoading(false); }
  };

  const deleteExpositor = async (id) => {
    if (!confirm("¿Eliminar este expositor?")) return;
    try {
      await API.delete(`/expositores/${id}`);
      setExpositores(s => s.filter(x => x.id !== id));
      flash("Expositor eliminado");
    } catch (e) { flash(e.response?.data?.error || e.message, true); }
  };

  const editExpositor = (ex) => {
    setEditingExpositorId(ex.id);
    const c = ex.contact || {};
    setExpositorForm({
      nombre:           ex.nombre      || "",
      descripcion:      ex.descripcion || "",
      stand:            ex.stand       || "",
      logo_url:         ex.logo_url    || "",
      categoria:        ex.categoria   || "",
      website_url:      ex.website_url || "",
      contact_email:    c.email        || "",
      posicion_x:       ex.posicion_x  != null ? String(ex.posicion_x) : "",
      posicion_y:       ex.posicion_y  != null ? String(ex.posicion_y) : "",
      contact_telefono: c.telefono     || "",
      contact_nombre:   c.nombre       || "",
      sede:             ex.sede        || sedeForm,
      edicion:          ex.edicion     || edicionActiva || 2026,
      activo:           ex.activo !== false,
    });
    setShowExpositorForm(true);
  };

  const resetExpositorForm = () => {
    setEditingExpositorId(null);
    setExpositorForm(blankExpositor(sedeForm, edicionActiva));
    setShowExpositorForm(false);
  };

  // ────────────────────────────────────────────────────────
  // NOTIFICACIONES
  // ────────────────────────────────────────────────────────
  const loadUsers = async () => {
    try {
      const res = await API.get("/users");
      // GET /users devuelve array directo según el backend
      setUsers(Array.isArray(res.data) ? res.data
        : Array.isArray(res.data.users) ? res.data.users : []);
    } catch (e) { console.error("Error cargando usuarios:", e); }
  };

  const submitNoti = async (e) => {
    e.preventDefault();
    if (!notiForm.titulo?.trim() || !notiForm.mensaje?.trim()) {
      setNotiError("Título y mensaje son requeridos"); return;
    }
    try {
      setNotiLoading(true); setNotiError(null);
      await API.post("/notificaciones", {
        titulo:       notiForm.titulo.trim(),
        mensaje:      notiForm.mensaje.trim(),
        tipo:         notiForm.tipo || "info",
        tipo_usuario: notiForm.tipo_usuario?.length > 0 ? notiForm.tipo_usuario : ["todos"],
        sede:         notiForm.sede || "todos",
        activa:       true,
      });
      flash("Notificación enviada correctamente");
      setShowNotiForm(false);
      setNotiForm(blankNoti());
    } catch (e) {
      setNotiError(e.response?.data?.error || e.message);
    } finally { setNotiLoading(false); }
  };

  const toggleTipoUsuario = (tipo) => {
    setNotiForm(prev => ({
      ...prev,
      tipo_usuario: prev.tipo_usuario.includes(tipo)
        ? prev.tipo_usuario.filter(t => t !== tipo)
        : [...prev.tipo_usuario.filter(t => t !== "todos"), tipo],
    }));
  };

  // ────────────────────────────────────────────────────────
  // GUARD
  // ────────────────────────────────────────────────────────
  if (!userProfile) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  }

  const isAdmin = userProfile.rol === "super_admin";
  const isStaff = userProfile.rol === "staff";

  if (!isAdmin && !isStaff) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-6 rounded-2xl flex items-center gap-3">
        <AlertCircle className="text-red-500 shrink-0" size={24} />
        <div>
          <p className="font-bold text-red-800 dark:text-red-300">Acceso restringido</p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">Solo Super Admin y Staff pueden acceder a este panel.</p>
        </div>
      </div>
    );
  }

  // Tabs disponibles según rol
  const TABS = [
    { id: "sesiones",       label: "📅 Sesiones",        icon: Calendar  },
    { id: "eventos",        label: "⏱ Minuto a Minuto",  icon: Clock     },
    { id: "speakers",       label: "🎤 Speakers",         icon: Mic       },
    { id: "expositores",    label: "🏢 Expositores",      icon: Building2 },
    ...(isAdmin ? [{ id: "mapa_stands",    label: "🗺️ Mapa Stands",     icon: Map }] : []),
    ...(isAdmin ? [{ id: "notificaciones", label: "🔔 Notificaciones", icon: Bell }] : []),
  ];

  const TIPOS_EVENTO = [
    { v: 'registro',     l: '📋 Registro / Check-in' },
    { v: 'recepcion',    l: '🤝 Recepción' },
    { v: 'expo_abierta', l: '🏢 Expo Abierta' },
    { v: 'keynote',      l: '🎙 Keynote' },
    { v: 'coffee_break', l: '☕ Coffee Break' },
    { v: 'almuerzo',     l: '🍽 Almuerzo' },
    { v: 'networking',   l: '🤝 Networking' },
    { v: 'clausura',     l: '🏁 Clausura' },
    { v: 'otro',         l: '📌 Otro' },
  ];

  // ────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            Panel de Administración
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isAdmin ? "Super Admin" : "Staff"} ·{" "}
            Sede: <span className="font-semibold capitalize">{sedeActiva || "todas"}</span> ·{" "}
            Edición: <span className="font-semibold">{edicionActiva || 2026}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/usuarios")} className={btnGhost}>
            <Users size={16} /> Usuarios <ExternalLink size={12} />
          </button>
          {isAdmin && (
            <button onClick={() => navigate("/admin/import")} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 font-semibold text-sm transition">
              <FileUp size={16} /> Importar Excel
            </button>
          )}
        </div>
      </div>

      {/* Alertas */}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300 px-4 py-3 rounded-xl text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition border-2
              ${activeTab === tab.id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════
          TAB: SESIONES
      ═══════════════════════════════════════════════════ */}
      {activeTab === "sesiones" && (
        <div className="space-y-4">
          {/* Barra de control de sesiones */}
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold dark:text-white flex-1">Sesiones ({sessionsFiltradas.length}{filtroSede ? ` de ${sessions.length}` : ""})</h2>
            {/* Filtro por sede */}
            <select
              value={filtroSede}
              onChange={e => setFiltroSede(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="">Todas las sedes</option>
              {[...new Set(sessions.map(s => {
                  // Normalizar abreviaturas a nombres completos
                  const norm = { cl:'chile', mx:'mexico', co:'colombia', pe:'peru', ar:'argentina' };
                  return norm[(s.sede||'').toLowerCase()] || (s.sede||'').toLowerCase();
                }).filter(Boolean))].sort().map(s => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>
              ))}
            </select>
            {/* Botón sync WP */}
            <button onClick={() => handleSyncWp(false)} disabled={syncing}
              title="Sincronizar sesiones desde WordPress"
              className="flex items-center gap-2 border border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-xl text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 transition font-semibold">
              <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Sincronizando..." : "Sincronizar WP"}
            </button>
            {/* Config WP */}
            {isAdmin && (
              <button onClick={() => setShowWpPanel(p => !p)}
                className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <Wifi size={15} /> Config WP
              </button>
            )}
            {isAdmin && (
              <button onClick={() => { resetSessionForm(); setShowSessionForm(true); }} className={btnPrimary}>
                <Plus size={16} /> Nueva Sesión
              </button>
            )}
          </div>

          {/* Panel configuración WordPress */}
          {showWpPanel && (
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2"><Wifi size={16} /> Conexión con WordPress</h3>
                {wpConfig?.ultima_sync_wp && (
                  <span className="text-xs text-gray-500">Última sync: {new Date(wpConfig.ultima_sync_wp).toLocaleString("es")}</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">URL de la API WordPress</label>
                  <input className={inputCls} value={wpForm.wp_api_url}
                    onChange={e => setWpForm(p=>({...p,wp_api_url:e.target.value}))}
                    placeholder="https://mi-sitio.com/wp-json/wp/v2" />
                  <p className="text-xs text-gray-400 mt-0.5">Cambia esto si migraste tu sitio WordPress a otro dominio.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Usuario WordPress</label>
                  <input className={inputCls} value={wpForm.wp_username}
                    onChange={e => setWpForm(p=>({...p,wp_username:e.target.value}))}
                    placeholder="admin" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Contraseña de aplicación</label>
                  <input type="password" className={inputCls} value={wpForm.wp_app_password}
                    onChange={e => setWpForm(p=>({...p,wp_app_password:e.target.value}))}
                    placeholder="xxxx xxxx xxxx xxxx (Application Password de WP)" />
                </div>
              </div>
              {wpTestResult && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
                  wpTestResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  {wpTestResult.ok ? <Wifi size={14}/> : <WifiOff size={14}/>}
                  {wpTestResult.mensaje}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={handleTestWp} disabled={testingWp}
                  className="flex items-center gap-2 border border-blue-400 text-blue-600 px-4 py-2 rounded-xl text-sm hover:bg-blue-50 disabled:opacity-50 font-semibold transition">
                  <Wifi size={15}/> {testingWp ? "Probando..." : "Probar conexión"}
                </button>
                <button onClick={handleSaveWpConfig}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 font-semibold transition">
                  <Save size={15}/> Guardar y aplicar
                </button>
                <button onClick={() => handleSyncWp(true)} disabled={syncing}
                  className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-orange-600 disabled:opacity-50 font-semibold transition">
                  <RefreshCw size={15} className={syncing?"animate-spin":""}/> Re-sync completo
                </button>
              </div>
            </div>
          )}

          {/* Sesiones sin título — panel de recuperación */}
          {sinTitulo.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-600 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  ⚠️ {sinTitulo.length} sesión(es) sin título detectada(s)
                </p>
                <button onClick={() => handleSyncWp(true)} disabled={syncing}
                  className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 font-semibold transition">
                  Recuperar desde WP
                </button>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Estas sesiones fueron editadas y perdieron su título. Usa "Recuperar desde WP" para restaurar los datos originales desde WordPress.
              </p>
            </div>
          )}


          {showSessionForm && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border-l-4 border-blue-500 border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <h3 className="font-bold text-lg dark:text-white">{editingSessionId ? "✏️ Editar Sesión" : "Nueva Sesión"}</h3>
              <form onSubmit={submitSession} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Título *">
                    <input className={inputCls} placeholder="Título de la sesión" value={sessionForm.title}
                      onChange={e => setSessionForm(p => ({...p, title: e.target.value}))} required />
                  </Field>
                  <Field label="Sala / Room">
                    <input className={inputCls} placeholder="Sala o Auditorio" value={sessionForm.sala}
                      onChange={e => setSessionForm(p => ({...p, sala: e.target.value, room: e.target.value}))} />
                  </Field>
                  <Field label="Inicio">
                    <input type="datetime-local" className={inputCls} value={sessionForm.start_at}
                      onChange={e => setSessionForm(p => ({...p, start_at: e.target.value}))} />
                  </Field>
                  <Field label="Fin">
                    <input type="datetime-local" className={inputCls} value={sessionForm.end_at}
                      onChange={e => setSessionForm(p => ({...p, end_at: e.target.value}))} />
                  </Field>
                  <Field label="Descripción">
                    <textarea className={inputCls} rows={2} placeholder="Descripción" value={sessionForm.description}
                      onChange={e => setSessionForm(p => ({...p, description: e.target.value}))} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Día (1-4)">
                      <select className={inputCls} value={sessionForm.dia}
                        onChange={e => setSessionForm(p => ({...p, dia: parseInt(e.target.value)}))}>
                        {[1,2,3,4].map(d => <option key={d} value={d}>Día {d}</option>)}
                      </select>
                    </Field>
                    <Field label="Capacidad">
                      <input type="number" className={inputCls} placeholder="Máx. asistentes" value={sessionForm.capacidad}
                        onChange={e => setSessionForm(p => ({...p, capacidad: e.target.value}))} />
                    </Field>
                  </div>
                  <Field label="Tipo">
                    <select className={inputCls} value={sessionForm.tipo}
                      onChange={e => setSessionForm(p => ({...p, tipo: e.target.value}))}>
                      {["sesion","curso","keynote","taller","panel","networking"].map(t =>
                        <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>
                      )}
                    </select>
                  </Field>
                  <Field label="Categoría">
                    <select className={inputCls} value={sessionForm.categoria}
                      onChange={e => setSessionForm(p => ({...p, categoria: e.target.value}))}>
                      {["brujula","toolbox","spark","orion","tracker","curso","general"].map(c =>
                        <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                      )}
                    </select>
                  </Field>
                  <Field label="Sede">
                    <select className={inputCls} value={sessionForm.sede}
                      onChange={e => setSessionForm(p => ({...p, sede: e.target.value}))}>
                      {SEDES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                    </select>
                  </Field>
                  <Field label="Edición (año)">
                    <input type="number" className={inputCls} value={sessionForm.edicion}
                      onChange={e => setSessionForm(p => ({...p, edicion: e.target.value}))} />
                  </Field>
                  <Field label="Speaker / Instructor">
                    <select className={inputCls} value={sessionForm.speakerId}
                      onChange={e => setSessionForm(p => ({...p, speakerId: e.target.value}))}>
                      <option value="">Sin speaker asignado</option>
                      {speakers.map(sp => (
                        <option key={sp.id} value={sp.id}>
                          {sp.nombre}{sp.cargo ? ` — ${sp.cargo}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loading} className={btnPrimary}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {editingSessionId ? "Guardar Cambios" : "Crear Sesión"}
                  </button>
                  <button type="button" onClick={resetSessionForm} className={btnGhost}><X size={16} />Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {loading && !sessions.length ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" size={28} /></div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Calendar size={40} className="mx-auto mb-2 opacity-30" />
              <p>No hay sesiones registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessionsFiltradas.map(s => (
                <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start justify-between gap-4 hover:shadow-sm transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-bold text-gray-900 dark:text-white truncate">{s.titulo || s.title || "(sin título)"}</span>
                      {/* Indicador de origen */}
                      {s.source === "wordpress" && !s.isOverride && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-semibold shrink-0">WP</span>
                      )}
                      {s.isOverride && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 font-semibold shrink-0">WP editada</span>
                      )}
                      {s.source === "local" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-semibold shrink-0">Local</span>
                      )}

                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize">{s.tipo}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 capitalize">{s.categoria}</span>
                      {!s.activo && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactiva</span>}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{s.descripcion || s.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                      {s.sala && <span>📍 {s.sala}</span>}
                      {s.dia && <span>Día {s.dia}</span>}
                      {s.start_at && <span>🕐 {new Date(s.start_at).toLocaleTimeString("es", {hour:"2-digit",minute:"2-digit"})}</span>}
                      <span className="capitalize">{s.sede}</span>
                      {s.speakers && s.speakers.length > 0 && speakers.find(sp => sp.id === s.speakers[0]) && (
                        <span className="text-blue-600 dark:text-blue-400">
                          👤 {speakers.find(sp => sp.id === s.speakers[0])?.nombre}
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => editSession(s)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"><Edit2 size={16} /></button>
                      <button onClick={() => deleteSession(s.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB: SPEAKERS
      ═══════════════════════════════════════════════════ */}
      {activeTab === "speakers" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold dark:text-white flex-1">Speakers ({speakers.length})</h2>
            <button onClick={async () => {
              if (!confirm('¿Sincronizar speakers desde WordPress? Esto importará todos los speakers del sitio a la DB local.')) return;
              setLoading(true);
              try {
                const r = await API.post('/speakers/sync-from-wp');
                flash(`✅ ${r.data.message}`);
                loadSpeakers();
              } catch(e) { flash(e.response?.data?.error || 'Error al sincronizar', true); }
              finally { setLoading(false); }
            }}
              className="flex items-center gap-2 border border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-xl text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold transition">
              <RefreshCw size={14} /> Sync desde WP
            </button>
            <button onClick={() => { resetSpeakerForm(); setShowSpeakerForm(true); }} className={btnPrimary}>
              <Plus size={16} /> Nuevo Speaker
            </button>
          </div>

          {showSpeakerForm && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border-l-4 border-green-500 border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-bold text-lg dark:text-white mb-4">{editingSpeakerId ? "✏️ Editar Speaker" : "Nuevo Speaker"}</h3>
              <form onSubmit={submitSpeaker} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Nombre *">
                    <input className={inputCls} placeholder="Nombre completo" value={speakerForm.nombre}
                      onChange={e => setSpeakerForm(p => ({...p, nombre: e.target.value}))} required />
                  </Field>
                  <Field label="Cargo">
                    <input className={inputCls} placeholder="Director / Gerente..." value={speakerForm.cargo}
                      onChange={e => setSpeakerForm(p => ({...p, cargo: e.target.value}))} />
                  </Field>
                  <Field label="Empresa / Company">
                    <input className={inputCls} placeholder="Empresa" value={speakerForm.company}
                      onChange={e => setSpeakerForm(p => ({...p, company: e.target.value}))} />
                  </Field>
                  <Field label="Email">
                    <input type="email" className={inputCls} placeholder="email@empresa.com" value={speakerForm.email}
                      onChange={e => setSpeakerForm(p => ({...p, email: e.target.value}))} />
                  </Field>
                  <Field label="Teléfono">
                    <input type="tel" className={inputCls} placeholder="+52 55 0000 0000" value={speakerForm.telefono}
                      onChange={e => setSpeakerForm(p => ({...p, telefono: e.target.value}))} />
                  </Field>
                  <Field label="URL Foto (photo_url)">
                    <input type="url" className={inputCls} placeholder="https://..." value={speakerForm.photo_url}
                      onChange={e => setSpeakerForm(p => ({...p, photo_url: e.target.value}))} />
                  </Field>
                  <Field label="LinkedIn">
                    <input type="url" className={inputCls} placeholder="https://linkedin.com/in/..." value={speakerForm.linkedin_url}
                      onChange={e => setSpeakerForm(p => ({...p, linkedin_url: e.target.value}))} />
                  </Field>
                  <Field label="Twitter / X">
                    <input type="url" className={inputCls} placeholder="https://twitter.com/..." value={speakerForm.twitter_url}
                      onChange={e => setSpeakerForm(p => ({...p, twitter_url: e.target.value}))} />
                  </Field>
                  <Field label="Website">
                    <input type="url" className={inputCls} placeholder="https://..." value={speakerForm.website_url}
                      onChange={e => setSpeakerForm(p => ({...p, website_url: e.target.value}))} />
                  </Field>
                  <Field label="Sede">
                    <select className={inputCls} value={speakerForm.sede}
                      onChange={e => setSpeakerForm(p => ({...p, sede: e.target.value}))}>
                      {SEDES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                    </select>
                  </Field>
                  <Field label="Biografía">
                    <textarea className={inputCls} rows={3} placeholder="Breve descripción del speaker..." value={speakerForm.bio}
                      onChange={e => setSpeakerForm(p => ({...p, bio: e.target.value}))} />
                  </Field>
                  <Field label="Edición">
                    <input type="number" className={inputCls} value={speakerForm.edicion}
                      onChange={e => setSpeakerForm(p => ({...p, edicion: e.target.value}))} />
                  </Field>
                </div>
                {speakerForm.photo_url && (
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <img src={speakerForm.photo_url} alt="" className="w-14 h-14 rounded-full object-cover border"
                      onError={e => e.target.style.display="none"} />
                    <span>Vista previa de foto</span>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loading} className={btnPrimary}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {editingSpeakerId ? "Guardar Cambios" : "Crear Speaker"}
                  </button>
                  <button type="button" onClick={resetSpeakerForm} className={btnGhost}><X size={16} />Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {loading && !speakers.length ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" size={28} /></div>
          ) : speakers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Mic size={40} className="mx-auto mb-2 opacity-30" />
              <p>No hay speakers registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {speakers.map(s => (
                <div key={s.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.nombre)}&background=1a3a5c&color=fff`}
                      alt={s.nombre} className="w-12 h-12 rounded-full object-cover border shrink-0"
                      onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.nombre)}&background=1a3a5c&color=fff`; }} />
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{s.nombre}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.cargo}</p>
                      <p className="text-xs text-gray-400 truncate">{s.company}</p>
                    </div>
                  </div>
                  {s.bio && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{s.bio}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 capitalize">{s.sede}</span>
                    <div className="flex gap-1">
                      <button onClick={() => editSpeaker(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"><Edit2 size={14} /></button>
                      <button onClick={() => deleteSpeaker(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB: EXPOSITORES
      ═══════════════════════════════════════════════════ */}
      {activeTab === "expositores" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold dark:text-white">Expositores ({expositores.length})</h2>
            <button onClick={() => { resetExpositorForm(); setShowExpositorForm(true); }} className={btnPrimary}>
              <Plus size={16} /> Nuevo Expositor
            </button>
          </div>

          {showExpositorForm && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border-l-4 border-purple-500 border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-bold text-lg dark:text-white mb-4">{editingExpositorId ? "✏️ Editar Expositor" : "Nuevo Expositor"}</h3>
              <form onSubmit={submitExpositor} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Nombre empresa *">
                    <input className={inputCls} placeholder="Nombre de la empresa" value={expositorForm.nombre}
                      onChange={e => setExpositorForm(p => ({...p, nombre: e.target.value}))} required />
                  </Field>
                  <Field label="Categoría">
                    <input className={inputCls} placeholder="Tecnología / Servicios..." value={expositorForm.categoria}
                      onChange={e => setExpositorForm(p => ({...p, categoria: e.target.value}))} />
                  </Field>
                  <Field label="Stand #">
                    <input className={inputCls} placeholder="A-01" value={expositorForm.stand}
                      onChange={e => setExpositorForm(p => ({...p, stand: e.target.value}))} />
                  </Field>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                      Posición en el Mapa de Expo <span className="text-gray-400 font-normal">(0–100 %)</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Posición X (horizontal %)</label>
                        <input type="number" min="0" max="100" step="0.5" className={inputCls}
                          placeholder="ej. 25.5"
                          value={expositorForm.posicion_x}
                          onChange={e => setExpositorForm(p => ({...p, posicion_x: e.target.value}))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Posición Y (vertical %)</label>
                        <input type="number" min="0" max="100" step="0.5" className={inputCls}
                          placeholder="ej. 40.0"
                          value={expositorForm.posicion_y}
                          onChange={e => setExpositorForm(p => ({...p, posicion_y: e.target.value}))} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      💡 0,0 = esquina superior izquierda · 100,100 = esquina inferior derecha. 
                      Ejemplo: stand en el centro = X:50, Y:50
                    </p>
                  </div>
                  <Field label="Website">
                    <input type="url" className={inputCls} placeholder="https://empresa.com" value={expositorForm.website_url}
                      onChange={e => setExpositorForm(p => ({...p, website_url: e.target.value}))} />
                  </Field>
                  <Field label="Logo URL">
                    <input type="url" className={inputCls} placeholder="https://..." value={expositorForm.logo_url}
                      onChange={e => setExpositorForm(p => ({...p, logo_url: e.target.value}))} />
                  </Field>
                  <Field label="Sede">
                    <select className={inputCls} value={expositorForm.sede}
                      onChange={e => setExpositorForm(p => ({...p, sede: e.target.value}))}>
                      {SEDES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                    </select>
                  </Field>
                  <Field label="Descripción">
                    <textarea className={inputCls} rows={2} placeholder="Descripción breve..." value={expositorForm.descripcion}
                      onChange={e => setExpositorForm(p => ({...p, descripcion: e.target.value}))} />
                  </Field>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Contacto</p>
                    <input className={inputCls} placeholder="Nombre del contacto" value={expositorForm.contact_nombre}
                      onChange={e => setExpositorForm(p => ({...p, contact_nombre: e.target.value}))} />
                    <input type="email" className={inputCls} placeholder="email@empresa.com" value={expositorForm.contact_email}
                      onChange={e => setExpositorForm(p => ({...p, contact_email: e.target.value}))} />
                    <input type="tel" className={inputCls} placeholder="Teléfono de contacto" value={expositorForm.contact_telefono}
                      onChange={e => setExpositorForm(p => ({...p, contact_telefono: e.target.value}))} />
                  </div>
                </div>
                {expositorForm.logo_url && (
                  <img src={expositorForm.logo_url} alt="" className="h-14 object-contain border rounded-lg p-1"
                    onError={e => e.target.style.display="none"} />
                )}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loading} className={btnPrimary}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {editingExpositorId ? "Guardar Cambios" : "Crear Expositor"}
                  </button>
                  <button type="button" onClick={resetExpositorForm} className={btnGhost}><X size={16} />Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {loading && !expositores.length ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" size={28} /></div>
          ) : expositores.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Building2 size={40} className="mx-auto mb-2 opacity-30" />
              <p>No hay expositores registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {expositores.map(ex => (
                <div key={ex.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition">
                  {ex.logo_url && (
                    <img src={ex.logo_url} alt={ex.nombre} className="w-full h-20 object-contain rounded-xl mb-3 bg-gray-50 dark:bg-gray-700 p-2"
                      onError={e => e.target.style.display="none"} />
                  )}
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">{ex.nombre}</h3>
                  {ex.categoria && <p className="text-xs text-gray-500 dark:text-gray-400">{ex.categoria}</p>}
                  {ex.stand && <p className="text-xs text-gray-400">Stand: {ex.stand}</p>}
                  {ex.descripcion && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{ex.descripcion}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-400 capitalize">{ex.sede}</span>
                    <div className="flex gap-1">
                      <button onClick={() => editExpositor(ex)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"><Edit2 size={14} /></button>
                      <button onClick={() => deleteExpositor(ex.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ TAB: MAPA DE STANDS ═══════ */}
      {activeTab === "mapa_stands" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold dark:text-white">🗺️ Configuración del Mapa de Stands</h2>
          <MapaStandsAdmin
            expositores={expositores}
            sedeActiva={sedeForm}
            edicionActiva={edicionActiva}
            flash={flash}
            loadExpositores={loadExpositores}
          />
        </div>
      )}


      {/* ═══════════════════════════════════════════════════
          TAB: MINUTO A MINUTO (EVENTOS LOGÍSTICA)
      ═══════════════════════════════════════════════════ */}
      {activeTab === "eventos" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold dark:text-white">Minuto a Minuto</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Espacios logísticos del evento: registro, recepción, breaks, etc.</p>
            </div>
            {isAdmin && (
              <button onClick={() => { setEditingEventoId(null); setShowEventoForm(true); }} className={btnPrimary}>
                <Plus size={16} /> Agregar Espacio
              </button>
            )}
          </div>

          {/* Formulario */}
          {showEventoForm && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border-l-4 border-purple-500 border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-bold text-lg dark:text-white mb-4">{editingEventoId ? "✏️ Editar Espacio" : "Nuevo Espacio"}</h3>
              <form onSubmit={submitEvento} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nombre del espacio *">
                  <input className={inputCls} required value={eventoForm.titulo}
                    placeholder="Ej: Registro de asistentes, Coffee Break"
                    onChange={e => setEventoForm(p => ({...p, titulo: e.target.value}))} />
                </Field>
                <Field label="Tipo">
                  <select className={inputCls} value={eventoForm.tipo}
                    onChange={e => setEventoForm(p => ({...p, tipo: e.target.value}))}>
                    {TIPOS_EVENTO.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </Field>
                <Field label="Día">
                  <select className={inputCls} value={eventoForm.dia}
                    onChange={e => setEventoForm(p => ({...p, dia: e.target.value}))}>
                    {[1,2,3,4].map(d => <option key={d} value={d}>Día {d}</option>)}
                  </select>
                </Field>
                <Field label="Sala / Ubicación">
                  <input className={inputCls} value={eventoForm.sala}
                    placeholder="Ej: Lobby, Hall Principal"
                    onChange={e => setEventoForm(p => ({...p, sala: e.target.value}))} />
                </Field>
                <Field label="Hora inicio">
                  <input type="datetime-local" className={inputCls} value={eventoForm.horaInicio}
                    onChange={e => setEventoForm(p => ({...p, horaInicio: e.target.value}))} />
                </Field>
                <Field label="Hora fin">
                  <input type="datetime-local" className={inputCls} value={eventoForm.horaFin}
                    onChange={e => setEventoForm(p => ({...p, horaFin: e.target.value}))} />
                </Field>
                <div className="md:col-span-2 flex gap-3 pt-2">
                  <button type="submit" disabled={loading} className={btnPrimary}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {editingEventoId ? "Guardar Cambios" : "Crear Espacio"}
                  </button>
                  <button type="button" onClick={() => setShowEventoForm(false)} className={btnGhost}>
                    <X size={16} /> Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista por día */}
          {[1,2,3,4].map(dia => {
            const del_dia = eventos.filter(e => parseInt(e.dia) === dia);
            if (del_dia.length === 0) return null;
            return (
              <div key={dia}>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  <Clock size={13} className="inline mr-1" /> Día {dia}
                </h3>
                <div className="space-y-2">
                  {del_dia.sort((a,b) => (a.horaInicio||'') < (b.horaInicio||'') ? -1 : 1).map(ev => {
                    const tipoLabel = TIPOS_EVENTO.find(t => t.v === ev.tipo)?.l || ev.tipo;
                    return (
                      <div key={ev.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-2xl">{tipoLabel.split(' ')[0]}</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{ev.titulo || ev.title}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-0.5">
                              {ev.horaInicio && <span>🕐 {new Date(ev.horaInicio).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}{ev.horaFin ? ` – ${new Date(ev.horaFin).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}` : ''}</span>}
                              {ev.sala && <span>📍 {ev.sala}</span>}
                              <span className="capitalize text-purple-600 dark:text-purple-400">{tipoLabel.slice(3)}</span>
                            </div>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => { setEditingEventoId(ev.id); setEventoForm({ titulo: ev.titulo||ev.title||'', dia: ev.dia||1, horaInicio: ev.horaInicio?String(ev.horaInicio).slice(0,16):'', horaFin: ev.horaFin?String(ev.horaFin).slice(0,16):'', tipo: ev.tipo||'registro', sala: ev.sala||'' }); setShowEventoForm(true); }}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={async () => { if(confirm('¿Eliminar este espacio?')) { await API.delete(`/agenda/sessions/${ev.id}`); loadEventos(); } }}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {eventos.length === 0 && !showEventoForm && (
            <div className="text-center py-12 text-gray-400">
              <Clock size={40} className="mx-auto mb-2 opacity-30" />
              <p>No hay espacios logísticos registrados</p>
              <p className="text-sm mt-1">Agrega el registro, recepción, breaks, etc.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB: NOTIFICACIONES (solo super_admin)
      ═══════════════════════════════════════════════════ */}
      {activeTab === "notificaciones" && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold dark:text-white">Notificaciones</h2>
            <button onClick={() => setShowNotiForm(!showNotiForm)} className={btnPrimary}>
              <Plus size={16} /> Nueva Notificación
            </button>
          </div>

          {showNotiForm && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border-l-4 border-yellow-500 border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <h3 className="font-bold text-lg dark:text-white">Nueva Notificación</h3>
              {notiError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-xl">
                  <AlertCircle size={14} /> {notiError}
                </div>
              )}
              <form onSubmit={submitNoti} className="space-y-4">
                <Field label="Título *">
                  <input className={inputCls} placeholder="Título de la notificación" value={notiForm.titulo}
                    onChange={e => setNotiForm(p => ({...p, titulo: e.target.value}))} required />
                </Field>
                <Field label="Mensaje *">
                  <textarea className={inputCls} rows={3} placeholder="Contenido del mensaje..." value={notiForm.mensaje}
                    onChange={e => setNotiForm(p => ({...p, mensaje: e.target.value}))} required />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Tipo">
                    <select className={inputCls} value={notiForm.tipo}
                      onChange={e => setNotiForm(p => ({...p, tipo: e.target.value}))}>
                      <option value="info">ℹ️ Información</option>
                      <option value="success">✅ Éxito</option>
                      <option value="warning">⚠️ Advertencia</option>
                      <option value="error">❌ Error/Urgente</option>
                    </select>
                  </Field>
                  <Field label="Sede destino">
                    <select className={inputCls} value={notiForm.sede}
                      onChange={e => setNotiForm(p => ({...p, sede: e.target.value}))}>
                      <option value="todos">Todas las sedes</option>
                      {SEDES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                    </select>
                  </Field>
                </div>

                {/* Segmentación por tipo de pase */}
                <Field label="Enviar a">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {TIPOS_PASE.map(tp => (
                      <button key={tp.id} type="button"
                        onClick={() => {
                          if (tp.id === "todos") {
                            setNotiForm(p => ({...p, tipo_usuario: ["todos"]}));
                          } else {
                            toggleTipoUsuario(tp.id);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition
                          ${(notiForm.tipo_usuario.includes(tp.id) || (tp.id === "todos" && notiForm.tipo_usuario.includes("todos")))
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                            : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400"}`}
                      >
                        {tp.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Destinatarios: <strong>{notiForm.tipo_usuario.join(", ")}</strong>
                  </p>
                </Field>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={notiLoading} className={btnPrimary}>
                    {notiLoading ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                    {notiLoading ? "Enviando..." : "Enviar Notificación"}
                  </button>
                  <button type="button" onClick={() => { setShowNotiForm(false); setNotiForm(blankNoti()); }} className={btnGhost}>
                    <X size={16} /> Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-400">
            <Bell size={36} className="mx-auto mb-2 opacity-30" />
            <p className="font-semibold">Panel de notificaciones</p>
            <p className="text-sm mt-1">Crea una notificación arriba para enviarla a los usuarios según sede y tipo de pase.</p>
          </div>
        </div>
      )}
    </div>
  );
}