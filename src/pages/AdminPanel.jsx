// src/pages/AdminPanel.jsx
// Panel de Administración CMC — Super Admin y Staff
//
// ESTRUCTURA (Fase 1):
//   📅 Evento          → Sesiones, Minuto a Minuto, Speakers, Expositores, Mapa Stands, Encuestas
//   👥 Usuarios        → Gestión de Usuarios, Notificaciones, Excel Import
//   🎨 Branding        → Branding (redirige a /branding)
//   ⚙️ Administración  → Configuración (redirige a /configuracion), Staff Panel

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth }  from "../contexts/AuthContext.jsx";
import { useEvent } from "../contexts/EventContext.jsx";
import API from "../services/api";
import {
  Plus, Edit2, Trash2, Save, X, Bell, Users,
  FileUp, AlertCircle, CheckCircle, Loader2,
  Calendar, Mic, Building2, ExternalLink, ChevronDown,
  RefreshCw, Wifi, WifiOff, Clock, Map, ChevronRight,
  Settings, Palette, BarChart2, User,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
// CONSTANTES DE MAPA (antes del componente para que sean accesibles)
// ────────────────────────────────────────────────────────────
const ESTADOS_STAND = {
  libre:         { label: "Libre",          bg: "#f0fdf4", border: "#86efac", text: "#16a34a", dot: "#22c55e" },
  solicitado:    { label: "Solicitado",     bg: "#fffbeb", border: "#fcd34d", text: "#d97706", dot: "#eab308" },
  ocupado:       { label: "Ocupado",        bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8", dot: "#3b82f6" },
  no_disponible: { label: "No disponible",  bg: "#f9fafb", border: "#d1d5db", text: "#6b7280", dot: "#9ca3af" },
};

const CATEGORIAS_POR_SEDE = {
  colombia: [
    { key:"diamante_plus", label:"Diamante Plus", ancho_m:6, alto_m:4, celdas_ancho:2, celdas_alto:2, color:"#7c3aed" },
    { key:"diamante",      label:"Diamante",      ancho_m:6, alto_m:4, celdas_ancho:2, celdas_alto:2, color:"#db2777" },
    { key:"esmeralda",     label:"Esmeralda",     ancho_m:6, alto_m:3, celdas_ancho:2, celdas_alto:1, color:"#059669" },
    { key:"platino",       label:"Platino",       ancho_m:6, alto_m:6, celdas_ancho:2, celdas_alto:2, color:"#ca8a04" },
    { key:"oro",           label:"Oro",           ancho_m:6, alto_m:3, celdas_ancho:2, celdas_alto:1, color:"#d97706" },
    { key:"plata",         label:"Plata",         ancho_m:3, alto_m:3, celdas_ancho:1, celdas_alto:1, color:"#64748b" },
  ],
  mexico: [
    { key:"platino", label:"Platino", ancho_m:6, alto_m:6, celdas_ancho:2, celdas_alto:2, color:"#ca8a04" },
    { key:"oro",     label:"Oro",     ancho_m:6, alto_m:3, celdas_ancho:2, celdas_alto:1, color:"#d97706" },
    { key:"plata",   label:"Plata",   ancho_m:3, alto_m:3, celdas_ancho:1, celdas_alto:1, color:"#64748b" },
  ],
  chile: [
    { key:"platino", label:"Platino", ancho_m:5, alto_m:2, celdas_ancho:2, celdas_alto:1, color:"#ca8a04" },
    { key:"oro",     label:"Oro",     ancho_m:3, alto_m:2, celdas_ancho:1, celdas_alto:1, color:"#d97706" },
    { key:"plata",   label:"Plata",   ancho_m:3, alto_m:2, celdas_ancho:1, celdas_alto:1, color:"#64748b" },
  ],
};

// ────────────────────────────────────────────────────────────
// Helpers de UI
// ────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{label}</label>}
      {children}
    </div>
  );
}

const inputCls  = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const btnPrimary = "flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 font-semibold text-sm disabled:opacity-50 transition";
const btnGhost   = "flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition";

const SEDES      = ["mexico", "chile", "colombia"];
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
// Definición de las 4 secciones y sus sub-tabs
// ────────────────────────────────────────────────────────────
const SECCIONES = [
  {
    id: "evento",
    label: "Evento",
    icon: Calendar,
    color: "blue",
    tabs: [
      { id: "sesiones",        label: "📅 Sesiones",        adminOnly: false },
      { id: "eventos",         label: "⏱ Minuto a Minuto",  adminOnly: false },
      { id: "speakers",        label: "🎤 Speakers",         adminOnly: false },
      { id: "expositores",     label: "🏢 Expositores",      adminOnly: false },
      { id: "mapa_stands",     label: "🗺 Mapa Stands",      adminOnly: true  },
      { id: "encuestas_admin", label: "📋 Encuestas",         adminOnly: true  },
    ],
  },
  {
    id: "usuarios",
    label: "Usuarios",
    icon: Users,
    color: "green",
    tabs: [
      { id: "gestion_usuarios",  label: "👤 Gestión de Usuarios",  adminOnly: false },
      { id: "permisos_staff",    label: "🔐 Permisos Staff",         adminOnly: true  },
      { id: "notificaciones",    label: "🔔 Notificaciones",         adminOnly: true  },
      { id: "excel_import",      label: "📥 Importar Excel",         adminOnly: true  },
    ],
  },
  {
    id: "branding",
    label: "Branding",
    icon: Palette,
    color: "purple",
    tabs: [
      { id: "branding_panel",  label: "🎨 Branding",        adminOnly: true },
    ],
  },
  {
    id: "administracion",
    label: "Administración",
    icon: Settings,
    color: "gray",
    tabs: [
      { id: "gestion_eventos", label: "🗓 Eventos & Ediciones", adminOnly: true  },
      { id: "sedes_config",    label: "🌎 Sedes & Calendarios", adminOnly: true  },
      { id: "configuracion",   label: "⚙️ Configuración",       adminOnly: true  },
      { id: "staff_panel",     label: "📊 Panel Estadístico",   adminOnly: false },
    ],
  },
];

const COLOR_MAP = {
  blue:   { active: "bg-blue-600 text-white",   hover: "hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600", header: "text-blue-600", border: "border-blue-200" },
  green:  { active: "bg-green-600 text-white",  hover: "hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600", header: "text-green-600", border: "border-green-200" },
  purple: { active: "bg-purple-600 text-white", hover: "hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600", header: "text-purple-600", border: "border-purple-200" },
  gray:   { active: "bg-gray-700 text-white",   hover: "hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700", header: "text-gray-600", border: "border-gray-200" },
};

// ════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const { userProfile } = useAuth();
  const { sedeActiva, edicionActiva } = useEvent();
  const navigate = useNavigate();

  const [activeSeccion, setActiveSeccion] = useState("evento");
  const [activeTab,     setActiveTab]     = useState("sesiones");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(null);

  const [sedeForm, setSedeForm] = useState(sedeActiva || "colombia");
  useEffect(() => { if (sedeActiva) setSedeForm(sedeActiva); }, [sedeActiva]);

  // ── Datos ───────────────────────────────────────────────
  const [sessions,    setSessions]    = useState([]);
  const [eventos,     setEventos]     = useState([]);
  const [speakers,    setSpeakers]    = useState([]);
  const [expositores, setExpositores] = useState([]);
  const [users,       setUsers]       = useState([]);
  const [eventosDB,   setEventosDB]   = useState([]);
  const [loadingEvt,  setLoadingEvt]  = useState(false);
  const [sinTitulo,   setSinTitulo]   = useState([]);
  const [syncing,     setSyncing]     = useState(false);
  const [filtroSede,  setFiltroSede]  = useState("");
  const [wpConfig,    setWpConfig]    = useState(null);
  const [showWpPanel, setShowWpPanel] = useState(false);
  const [wpForm,      setWpForm]      = useState({ wp_api_url:'', wp_username:'', wp_app_password:'' });
  const [testingWp,   setTestingWp]   = useState(false);
  const [wpTestResult,setWpTestResult]= useState(null);

  // ── Formularios ─────────────────────────────────────────
  const [showSessionForm,    setShowSessionForm]    = useState(false);
  const [editingSessionId,   setEditingSessionId]   = useState(null);
  const [sessionForm,        setSessionForm]        = useState(blankSession(sedeForm, edicionActiva));

  const [showSpeakerForm,    setShowSpeakerForm]    = useState(false);
  const [editingSpeakerId,   setEditingSpeakerId]   = useState(null);
  const [speakerForm,        setSpeakerForm]        = useState(blankSpeaker(sedeForm, edicionActiva));

  const [showExpositorForm,  setShowExpositorForm]  = useState(false);
  const [editingExpositorId, setEditingExpositorId] = useState(null);
  const [expositorForm,      setExpositorForm]      = useState(blankExpositor(sedeForm, edicionActiva));

  const [showEventoForm,  setShowEventoForm]  = useState(false);
  const [editingEventoId, setEditingEventoId] = useState(null);
  const [eventoForm,      setEventoForm]      = useState({ titulo:"", dia:1, horaInicio:"", horaFin:"", tipo:"registro", sala:"" });

  const [showNotiForm,  setShowNotiForm]  = useState(false);
  const [notiForm,      setNotiForm]      = useState(blankNoti());
  const [notiLoading,   setNotiLoading]   = useState(false);
  const [notiError,     setNotiError]     = useState(null);

  function blankSession(sede, edicion) {
    return { title:"", description:"", start_at:"", end_at:"", speakerId:"", room:"", sala:"", dia:1, tipo:"sesion", categoria:"brujula", sede:sede||"colombia", edicion:edicion||2026, capacidad:"", activo:true };
  }
  function blankSpeaker(sede, edicion) {
    return { nombre:"", bio:"", company:"", photo_url:"", cargo:"", email:"", telefono:"", linkedin_url:"", twitter_url:"", website_url:"", sede:sede||"colombia", edicion:edicion||2026, activo:true };
  }
  function blankExpositor(sede, edicion) {
    return { nombre:"", descripcion:"", stand:"", logo_url:"", categoria:"", website_url:"", contact_email:"", contact_telefono:"", contact_nombre:"", sede:sede||"colombia", edicion:edicion||2026, activo:true };
  }
  function blankNoti() {
    return { titulo:"", mensaje:"", tipo:"info", tipo_usuario:["todos"], sede:"todos" };
  }

  // ── Carga por tab ────────────────────────────────────────
  useEffect(() => {
    if (!userProfile) return;
    loadWpConfig(); loadSinTitulo();
    loadSpeakers();
    if (activeTab === "sesiones")        loadSessions();
    if (activeTab === "eventos")         loadEventos();
    if (activeTab === "speakers")        loadSpeakers();
    if (activeTab === "expositores")     loadExpositores();
    if (activeTab === "mapa_stands")     loadExpositores();
    if (activeTab === "gestion_usuarios") loadUsers();
    if (activeTab === "notificaciones")  loadUsers();
    if (activeTab === "gestion_eventos")  loadEventosDB();
    if (activeTab === "sedes_config")     loadSedesCalendario();
    if (activeTab === "encuestas_admin")  loadEncuestasAdmin();
    if (activeTab === "permisos_staff")   loadStaffUsers();
  }, [activeTab, userProfile]);

  const flash = (msg, isError = false) => {
    if (isError) setError(msg);
    else { setSuccess(msg); setTimeout(() => setSuccess(null), 3500); }
  };

  // ── Loaders ──────────────────────────────────────────────
  const loadWpConfig = async () => {
    try {
      const r = await API.get('/config/wp-config');
      setWpConfig(r.data);
      setWpForm(f => ({ wp_api_url: r.data.wp_config?.wp_api_url||'', wp_username: r.data.wp_config?.wp_username||'', wp_app_password:'' }));
    } catch {}
  };
  const loadSinTitulo = async () => {
    try { const r = await API.get('/agenda/sessions/sin-titulo'); setSinTitulo(r.data.sesiones||[]); } catch { setSinTitulo([]); }
  };
  const loadSessions = async () => {
    try { setLoading(true); const r = await API.get("/agenda/sessions"); setSessions(Array.isArray(r.data.sessions)?r.data.sessions:Array.isArray(r.data)?r.data:[]); } catch { flash("No se pudieron cargar las sesiones",true); } finally { setLoading(false); }
  };
  const loadEventos = async () => {
    try { const tiposL=["registro","recepcion","expo_abierta","keynote","coffee_break","almuerzo","networking","clausura","otro"]; const r=await API.get(`/agenda/sessions?sede=${sedeForm||sedeActiva}`); const all=r.data?.sessions||[]; setEventos(all.filter(s=>tiposL.includes(s.tipo)||s.categoria==="logistica")); } catch { setEventos([]); }
  };
  const loadSpeakers = async () => {
    try { setLoading(true); const r=await API.get("/speakers"); setSpeakers(Array.isArray(r.data)?r.data:Array.isArray(r.data.speakers)?r.data.speakers:[]); } catch { flash("No se pudieron cargar los speakers",true); } finally { setLoading(false); }
  };
  const loadExpositores = async () => {
    try { setLoading(true); const r=await API.get("/expositores"); setExpositores(Array.isArray(r.data)?r.data:Array.isArray(r.data.expositores)?r.data.expositores:[]); } catch { flash("No se pudieron cargar los expositores",true); } finally { setLoading(false); }
  };
  const loadEventosDB = async () => {
    try { setLoadingEvt(true); const r=await API.get("/eventos"); setEventosDB(r.data?.eventos||[]); }
    catch { flash("No se pudieron cargar los eventos",true); }
    finally { setLoadingEvt(false); }
  };
  const [sedesCalendario, setSedesCalendario] = useState([]);
  const loadSedesCalendario = async () => {
    try { const r=await API.get("/eventos/sedes-calendario"); setSedesCalendario(r.data?.sedes||[]); }
    catch { setSedesCalendario([]); }
  };

  // Fase 3 — Encuestas admin
  const [encuestasAdmin, setEncuestasAdmin] = useState([]);
  const [loadingEnc,     setLoadingEnc]     = useState(false);
  const loadEncuestasAdmin = async () => {
    try { setLoadingEnc(true); const r=await API.get("/encuestas/admin"); setEncuestasAdmin(r.data?.encuestas||r.data||[]); }
    catch { flash("No se pudieron cargar las encuestas",true); }
    finally { setLoadingEnc(false); }
  };

  // Fase 3 — Staff con permisos
  const [staffUsers,     setStaffUsers]     = useState([]);
  const [loadingStaff,   setLoadingStaff]   = useState(false);
  const loadStaffUsers = async () => {
    try { setLoadingStaff(true); const r=await API.get("/users"); const all=Array.isArray(r.data)?r.data:r.data?.users||[]; setStaffUsers(all.filter(u=>u.rol==="staff")); }
    catch { flash("No se pudieron cargar usuarios staff",true); }
    finally { setLoadingStaff(false); }
  };

  const loadUsers = async () => {
    try { const r=await API.get("/users"); setUsers(Array.isArray(r.data)?r.data:Array.isArray(r.data.users)?r.data.users:[]); } catch {}
  };

  // ── WP ───────────────────────────────────────────────────
  const handleSyncWp = async (forzar=false) => {
    if (!confirm(forzar?'¿Re-sincronizar TODAS las sesiones desde WordPress?':'¿Sincronizar sesiones desde WordPress?')) return;
    setSyncing(true);
    try { const r=await API.post('/agenda/sessions/sync-wp',{sede:filtroSede||null,forzar_limpiar:forzar}); flash(`✅ ${r.data.message}`); loadSessions(); loadSinTitulo(); }
    catch(e) { flash(e.response?.data?.error||'Error al sincronizar',true); }
    finally { setSyncing(false); }
  };
  const handleTestWp = async () => { setTestingWp(true); setWpTestResult(null); try { const r=await API.post('/config/test-wp',wpForm); setWpTestResult(r.data); } catch { setWpTestResult({ok:false,mensaje:'Error de conexión'}); } finally { setTestingWp(false); } };
  const handleSaveWpConfig = async () => { try { await API.put('/config/wp-config',wpForm); flash('Configuración de WordPress guardada'); setShowWpPanel(false); loadWpConfig(); } catch(e) { flash(e.response?.data?.error||'Error',true); } };

  // ── Sesiones CRUD ────────────────────────────────────────
  const sessionsFiltradas = filtroSede ? sessions.filter(s=>(s.sede||'').toLowerCase()===filtroSede.toLowerCase()) : sessions;
  const submitSession = async (e) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const payload = { titulo:sessionForm.title, descripcion:sessionForm.description, horaInicio:sessionForm.start_at||null, horaFin:sessionForm.end_at||null, sala:sessionForm.sala||sessionForm.room, dia:parseInt(sessionForm.dia)||1, tipo:sessionForm.tipo, categoria:sessionForm.categoria, sede:sessionForm.sede, edicion:parseInt(sessionForm.edicion)||edicionActiva||2026, capacidad:sessionForm.capacidad?parseInt(sessionForm.capacidad):null, activo:sessionForm.activo!==false, speakerId:sessionForm.speakerId||null };
      if (editingSessionId) { await API.put(`/agenda/sessions/${editingSessionId}`,payload); flash("Sesión actualizada"); }
      else { await API.post("/agenda/sessions",payload); flash("Sesión creada"); }
      resetSessionForm(); loadSessions();
    } catch(e) { flash(e.response?.data?.error||e.message,true); } finally { setLoading(false); }
  };
  const deleteSession = async(id) => { if(!confirm("¿Eliminar sesión?"))return; try { await API.delete(`/agenda/sessions/${id}`); setSessions(s=>s.filter(x=>x.id!==id)); flash("Sesión eliminada"); } catch(e) { flash(e.response?.data?.error||e.message,true); } };
  const editSession = (s) => { setEditingSessionId(s.id); setSessionForm({ title:s.title||s.titulo||"", description:s.description||s.descripcion||"", start_at:s.start_at?String(s.start_at).slice(0,16):s.horaInicio?String(s.horaInicio).slice(0,16):"", end_at:s.end_at?String(s.end_at).slice(0,16):s.horaFin?String(s.horaFin).slice(0,16):"", room:s.room||s.sala||"", sala:s.sala||s.room||"", dia:s.dia||1, tipo:s.tipo||"sesion", categoria:s.categoria||"brujula", sede:s.sede||sedeForm, edicion:s.edicion||edicionActiva||2026, capacidad:s.capacidad||"", speakerId:(s.speakers&&s.speakers[0])?s.speakers[0]:"", activo:s.activo!==false }); setShowSessionForm(true); };
  const resetSessionForm = () => { setEditingSessionId(null); setSessionForm(blankSession(sedeForm,edicionActiva)); setShowSessionForm(false); };

  // ── Eventos logísticos CRUD ──────────────────────────────
  const submitEvento = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const p = { titulo:eventoForm.titulo, horaInicio:eventoForm.horaInicio||null, horaFin:eventoForm.horaFin||null, dia:parseInt(eventoForm.dia)||1, tipo:eventoForm.tipo, categoria:"logistica", sala:eventoForm.sala, sede:sedeForm||sedeActiva, edicion:parseInt(edicionActiva)||2026, activo:true };
      if (editingEventoId) { await API.put(`/agenda/sessions/${editingEventoId}`,p); flash("Evento actualizado"); }
      else { await API.post("/agenda/sessions",p); flash("Evento creado"); }
      setShowEventoForm(false); setEditingEventoId(null); setEventoForm({titulo:"",dia:1,horaInicio:"",horaFin:"",tipo:"registro",sala:""}); loadEventos();
    } catch(err) { flash(err.response?.data?.error||err.message,true); } finally { setLoading(false); }
  };

  // ── Speakers CRUD ─────────────────────────────────────────
  const submitSpeaker = async (e) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const payload = {...speakerForm, edicion:parseInt(speakerForm.edicion)||edicionActiva||2026};
      if (editingSpeakerId) { await API.put(`/speakers/${editingSpeakerId}`,payload); flash("Speaker actualizado"); }
      else { await API.post("/speakers",payload); flash("Speaker creado"); }
      resetSpeakerForm(); loadSpeakers();
    } catch(e) { flash(e.response?.data?.error||e.message,true); } finally { setLoading(false); }
  };
  const deleteSpeaker = async(id) => { if(!confirm("¿Eliminar speaker?"))return; try { await API.delete(`/speakers/${id}`); setSpeakers(s=>s.filter(x=>x.id!==id)); flash("Speaker eliminado"); } catch(e) { flash(e.response?.data?.error||e.message,true); } };
  const editSpeaker = (s) => { setEditingSpeakerId(s.id); setSpeakerForm({ nombre:s.nombre||"", bio:s.bio||"", company:s.company||"", photo_url:s.photo_url||"", cargo:s.cargo||"", email:s.email||"", telefono:s.telefono||"", linkedin_url:s.linkedin_url||"", twitter_url:s.twitter_url||"", website_url:s.website_url||"", sede:s.sede||sedeForm, edicion:s.edicion||edicionActiva||2026, activo:s.activo!==false }); setShowSpeakerForm(true); };
  const resetSpeakerForm = () => { setEditingSpeakerId(null); setSpeakerForm(blankSpeaker(sedeForm,edicionActiva)); setShowSpeakerForm(false); };

  // ── Expositores CRUD ──────────────────────────────────────
  const submitExpositor = async (e) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const contact = { email:expositorForm.contact_email||"", telefono:expositorForm.contact_telefono||"", nombre:expositorForm.contact_nombre||"" };
      const payload = { nombre:expositorForm.nombre, descripcion:expositorForm.descripcion, stand:expositorForm.stand, logo_url:expositorForm.logo_url, categoria:expositorForm.categoria, website_url:expositorForm.website_url, contact, sede:expositorForm.sede, edicion:parseInt(expositorForm.edicion)||edicionActiva||2026, activo:expositorForm.activo!==false };
      if (editingExpositorId) { await API.put(`/expositores/${editingExpositorId}`,payload); flash("Expositor actualizado"); }
      else { await API.post("/expositores",payload); flash("Expositor creado"); }
      resetExpositorForm(); loadExpositores();
    } catch(e) { flash(e.response?.data?.error||e.message,true); } finally { setLoading(false); }
  };
  const deleteExpositor = async(id) => { if(!confirm("¿Eliminar expositor?"))return; try { await API.delete(`/expositores/${id}`); setExpositores(s=>s.filter(x=>x.id!==id)); flash("Expositor eliminado"); } catch(e) { flash(e.response?.data?.error||e.message,true); } };
  const editExpositor = (ex) => { setEditingExpositorId(ex.id); const c=ex.contact||{}; setExpositorForm({ nombre:ex.nombre||"", descripcion:ex.descripcion||"", stand:ex.stand||"", logo_url:ex.logo_url||"", categoria:ex.categoria||"", website_url:ex.website_url||"", contact_email:c.email||"", contact_telefono:c.telefono||"", contact_nombre:c.nombre||"", sede:ex.sede||sedeForm, edicion:ex.edicion||edicionActiva||2026, activo:ex.activo!==false }); setShowExpositorForm(true); };
  const resetExpositorForm = () => { setEditingExpositorId(null); setExpositorForm(blankExpositor(sedeForm,edicionActiva)); setShowExpositorForm(false); };

  // ── Notificaciones ────────────────────────────────────────
  const submitNoti = async (e) => {
    e.preventDefault();
    if (!notiForm.titulo?.trim()||!notiForm.mensaje?.trim()) { setNotiError("Título y mensaje son requeridos"); return; }
    try {
      setNotiLoading(true); setNotiError(null);
      await API.post("/notificaciones",{ titulo:notiForm.titulo.trim(), mensaje:notiForm.mensaje.trim(), tipo:notiForm.tipo||"info", tipo_usuario:notiForm.tipo_usuario?.length>0?notiForm.tipo_usuario:["todos"], sede:notiForm.sede||"todos", activa:true });
      flash("Notificación enviada"); setShowNotiForm(false); setNotiForm(blankNoti());
    } catch(e) { setNotiError(e.response?.data?.error||e.message); } finally { setNotiLoading(false); }
  };
  const toggleTipoUsuario = (tipo) => { setNotiForm(prev=>({ ...prev, tipo_usuario: prev.tipo_usuario.includes(tipo)?prev.tipo_usuario.filter(t=>t!==tipo):[...prev.tipo_usuario.filter(t=>t!=="todos"),tipo] })); };

  // ── Guard ────────────────────────────────────────────────
  if (!userProfile) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  const isAdmin = userProfile.rol === "super_admin";
  const isStaff = userProfile.rol === "staff";
  if (!isAdmin && !isStaff) return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 p-6 rounded-2xl flex items-center gap-3">
      <AlertCircle className="text-red-500" size={24} />
      <div><p className="font-bold text-red-800">Acceso restringido</p><p className="text-sm text-red-600 mt-1">Solo Super Admin y Staff pueden acceder.</p></div>
    </div>
  );

  const TIPOS_EVENTO = [
    { v:'registro',l:'📋 Registro' },{ v:'recepcion',l:'🤝 Recepción' },
    { v:'expo_abierta',l:'🏢 Expo Abierta' },{ v:'keynote',l:'🎙 Keynote' },
    { v:'coffee_break',l:'☕ Coffee Break' },{ v:'almuerzo',l:'🍽 Almuerzo' },
    { v:'networking',l:'🤝 Networking' },{ v:'clausura',l:'🏁 Clausura' },{ v:'otro',l:'📌 Otro' },
  ];

  // Tabs disponibles para la sección activa, filtradas por rol
  const seccionActual   = SECCIONES.find(s => s.id === activeSeccion);
  const tabsDisponibles = seccionActual?.tabs.filter(t => !t.adminOnly || isAdmin) || [];
  const colors          = COLOR_MAP[seccionActual?.color || "blue"];

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-0">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Panel de Administración</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isAdmin ? "Super Admin" : "Staff"} · Sede: <span className="font-semibold capitalize">{sedeActiva||"todas"}</span> · Edición: <span className="font-semibold">{edicionActiva||2026}</span>
          </p>
        </div>
      </div>

      {/* ── Alertas globales ── */}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300 px-4 py-3 rounded-xl text-sm mb-4">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300 px-4 py-3 rounded-xl text-sm mb-4">
          <AlertCircle size={16} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* ── Layout principal: sidebar izquierdo + contenido ── */}
      <div className="flex gap-5 min-h-[calc(100vh-200px)]">

        {/* ── Sidebar de navegación ── */}
        <div className="w-56 shrink-0">
          <nav className="space-y-1.5">
            {SECCIONES.filter(s => {
              // Staff no ve Branding ni Administración
              if (!isAdmin && (s.id === "branding" || s.id === "administracion")) return false;
              return true;
            }).map(sec => {
              const Icon   = sec.icon;
              const col    = COLOR_MAP[sec.color];
              const isAct  = activeSeccion === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => {
                    setActiveSeccion(sec.id);
                    const firstTab = sec.tabs.find(t => !t.adminOnly || isAdmin);
                    if (firstTab) setActiveTab(firstTab.id);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                    isAct
                      ? `${col.active} border-transparent shadow-md`
                      : `bg-white dark:bg-gray-800 border-transparent hover:border-current ${col.hover} text-gray-600 dark:text-gray-300`
                  }`}
                >
                  <Icon size={18} className={isAct ? "" : col.header} />
                  {sec.label}
                </button>
              );
            })}
          </nav>

          {/* Info de sección */}
          {seccionActual && (
            <div className={`mt-4 p-3 rounded-xl border ${colors.border} bg-white dark:bg-gray-800`}>
              <p className={`text-xs font-bold ${colors.header} uppercase tracking-wide mb-2`}>{seccionActual.label}</p>
              <div className="space-y-0.5">
                {tabsDisponibles.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition ${
                      activeTab === tab.id
                        ? `${colors.active} font-semibold`
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Área de contenido ── */}
        <div className="flex-1 min-w-0">

          {/* Breadcrumb + título del tab */}
          <div className={`flex items-center gap-2 mb-5 px-4 py-3 rounded-xl border ${colors.border} bg-white dark:bg-gray-800`}>
            <span className={`text-xs font-bold ${colors.header} uppercase`}>{seccionActual?.label}</span>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {tabsDisponibles.find(t => t.id === activeTab)?.label || activeTab}
            </span>
          </div>

          {/* ═══════════════════════════════════════════════
              CONTENIDO DE CADA TAB
          ═══════════════════════════════════════════════ */}

          {/* ─── SESIONES ─── */}
          {activeTab === "sesiones" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-bold dark:text-white flex-1">Sesiones ({sessionsFiltradas.length}{filtroSede?` de ${sessions.length}`:""})</h2>
                <select value={filtroSede} onChange={e=>setFiltroSede(e.target.value)} className="text-sm border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 bg-white dark:bg-gray-700 dark:text-white">
                  <option value="">Todas las sedes</option>
                  {[...new Set(sessions.map(s=>{const norm={cl:'chile',mx:'mexico',co:'colombia',pe:'peru',ar:'argentina'};return norm[(s.sede||'').toLowerCase()]||(s.sede||'').toLowerCase();}).filter(Boolean))].sort().map(s=>(<option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>))}
                </select>
                <button onClick={()=>handleSyncWp(false)} disabled={syncing} className="flex items-center gap-2 border border-blue-300 dark:border-blue-600 text-blue-600 px-3 py-1.5 rounded-xl text-sm hover:bg-blue-50 disabled:opacity-50 font-semibold transition">
                  <RefreshCw size={15} className={syncing?"animate-spin":""} />{syncing?"Sincronizando...":"Sync WP"}
                </button>
                {isAdmin && <button onClick={()=>setShowWpPanel(p=>!p)} className="flex items-center gap-1.5 border border-gray-300 px-3 py-1.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"><Wifi size={15}/> Config WP</button>}
                {isAdmin && <button onClick={()=>{resetSessionForm();setShowSessionForm(true);}} className={btnPrimary}><Plus size={16}/>Nueva Sesión</button>}
              </div>

              {showWpPanel && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between"><h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2"><Wifi size={16}/>Conexión WordPress</h3>{wpConfig?.ultima_sync_wp&&<span className="text-xs text-gray-500">Última sync: {new Date(wpConfig.ultima_sync_wp).toLocaleString("es")}</span>}</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-3"><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">URL API WordPress</label><input className={inputCls} value={wpForm.wp_api_url} onChange={e=>setWpForm(p=>({...p,wp_api_url:e.target.value}))} placeholder="https://mi-sitio.com/wp-json/wp/v2"/></div>
                    <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Usuario</label><input className={inputCls} value={wpForm.wp_username} onChange={e=>setWpForm(p=>({...p,wp_username:e.target.value}))} placeholder="admin"/></div>
                    <div className="md:col-span-2"><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">App Password</label><input type="password" className={inputCls} value={wpForm.wp_app_password} onChange={e=>setWpForm(p=>({...p,wp_app_password:e.target.value}))} placeholder="xxxx xxxx xxxx xxxx"/></div>
                  </div>
                  {wpTestResult && <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${wpTestResult.ok?"bg-green-50 text-green-700":"bg-red-50 text-red-700"}`}>{wpTestResult.ok?<Wifi size={14}/>:<WifiOff size={14}/>}{wpTestResult.mensaje}</div>}
                  <div className="flex gap-2">
                    <button onClick={handleTestWp} disabled={testingWp} className="flex items-center gap-2 border border-blue-400 text-blue-600 px-4 py-2 rounded-xl text-sm hover:bg-blue-50 disabled:opacity-50 font-semibold transition"><Wifi size={15}/>{testingWp?"Probando...":"Probar"}</button>
                    <button onClick={handleSaveWpConfig} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 font-semibold transition"><Save size={15}/>Guardar</button>
                    <button onClick={()=>handleSyncWp(true)} disabled={syncing} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-orange-600 disabled:opacity-50 font-semibold transition"><RefreshCw size={15} className={syncing?"animate-spin":""}/>Re-sync completo</button>
                  </div>
                </div>
              )}

              {sinTitulo.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-amber-700">⚠️ {sinTitulo.length} sesión(es) sin título</p>
                    <button onClick={()=>handleSyncWp(true)} disabled={syncing} className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 font-semibold">Recuperar desde WP</button>
                  </div>
                </div>
              )}

              {showSessionForm && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border-l-4 border-blue-500 border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                  <h3 className="font-bold text-lg dark:text-white">{editingSessionId?"✏️ Editar Sesión":"Nueva Sesión"}</h3>
                  <form onSubmit={submitSession} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Título *"><input className={inputCls} value={sessionForm.title} onChange={e=>setSessionForm(p=>({...p,title:e.target.value}))} required/></Field>
                      <Field label="Sala"><input className={inputCls} value={sessionForm.sala} onChange={e=>setSessionForm(p=>({...p,sala:e.target.value,room:e.target.value}))}/></Field>
                      <Field label="Inicio"><input type="datetime-local" className={inputCls} value={sessionForm.start_at} onChange={e=>setSessionForm(p=>({...p,start_at:e.target.value}))}/></Field>
                      <Field label="Fin"><input type="datetime-local" className={inputCls} value={sessionForm.end_at} onChange={e=>setSessionForm(p=>({...p,end_at:e.target.value}))}/></Field>
                      <Field label="Descripción"><textarea className={inputCls} rows={2} value={sessionForm.description} onChange={e=>setSessionForm(p=>({...p,description:e.target.value}))}/></Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Día"><select className={inputCls} value={sessionForm.dia} onChange={e=>setSessionForm(p=>({...p,dia:parseInt(e.target.value)}))}>{[1,2,3,4].map(d=><option key={d} value={d}>Día {d}</option>)}</select></Field>
                        <Field label="Capacidad"><input type="number" className={inputCls} value={sessionForm.capacidad} onChange={e=>setSessionForm(p=>({...p,capacidad:e.target.value}))}/></Field>
                      </div>
                      <Field label="Tipo"><select className={inputCls} value={sessionForm.tipo} onChange={e=>setSessionForm(p=>({...p,tipo:e.target.value}))}>{["sesion","curso","keynote","taller","panel","networking"].map(t=><option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}</select></Field>
                      <Field label="Categoría"><select className={inputCls} value={sessionForm.categoria} onChange={e=>setSessionForm(p=>({...p,categoria:e.target.value}))}>{["brujula","toolbox","spark","orion","tracker","curso","general"].map(c=><option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></Field>
                      <Field label="Sede"><select className={inputCls} value={sessionForm.sede} onChange={e=>setSessionForm(p=>({...p,sede:e.target.value}))}>{SEDES.map(s=><option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></Field>
                      <Field label="Edición"><input type="number" className={inputCls} value={sessionForm.edicion} onChange={e=>setSessionForm(p=>({...p,edicion:e.target.value}))}/></Field>
                      <Field label="Speaker"><select className={inputCls} value={sessionForm.speakerId} onChange={e=>setSessionForm(p=>({...p,speakerId:e.target.value}))}><option value="">Sin speaker</option>{speakers.map(sp=><option key={sp.id} value={sp.id}>{sp.nombre}{sp.cargo?` — ${sp.cargo}`:""}</option>)}</select></Field>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" disabled={loading} className={btnPrimary}>{loading?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>}{editingSessionId?"Guardar":"Crear"}</button>
                      <button type="button" onClick={resetSessionForm} className={btnGhost}><X size={16}/>Cancelar</button>
                    </div>
                  </form>
                </div>
              )}

              {loading && !sessions.length ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" size={28}/></div>
              : sessions.length === 0 ? <div className="text-center py-12 text-gray-400"><Calendar size={40} className="mx-auto mb-2 opacity-30"/><p>No hay sesiones</p></div>
              : <div className="space-y-2">{sessionsFiltradas.map(s=>(
                  <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start justify-between gap-4 hover:shadow-sm transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="font-bold text-gray-900 dark:text-white truncate">{s.titulo||s.title||"(sin título)"}</span>
                        {s.source==="wordpress"&&!s.isOverride&&<span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-semibold">WP</span>}
                        {s.isOverride&&<span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">WP editada</span>}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">{s.tipo}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 capitalize">{s.categoria}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                        {s.sala&&<span>📍 {s.sala}</span>}{s.dia&&<span>Día {s.dia}</span>}
                        {s.start_at&&<span>🕐 {new Date(s.start_at).toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"})}</span>}
                        <span className="capitalize">{s.sede}</span>
                      </div>
                    </div>
                    {isAdmin&&<div className="flex gap-1 shrink-0"><button onClick={()=>editSession(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button><button onClick={()=>deleteSession(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div>}
                  </div>
                ))}</div>}
            </div>
          )}

          {/* ─── MINUTO A MINUTO ─── */}
          {activeTab === "eventos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div><h2 className="text-lg font-bold dark:text-white">Minuto a Minuto</h2><p className="text-sm text-gray-500">Registro, breaks, networking, etc.</p></div>
                {isAdmin&&<button onClick={()=>{setEditingEventoId(null);setShowEventoForm(true);}} className={btnPrimary}><Plus size={16}/>Agregar</button>}
              </div>
              {showEventoForm && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border-l-4 border-purple-500 border border-gray-200 p-6">
                  <h3 className="font-bold text-lg dark:text-white mb-4">{editingEventoId?"✏️ Editar":"Nuevo Espacio"}</h3>
                  <form onSubmit={submitEvento} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Nombre *"><input className={inputCls} required value={eventoForm.titulo} onChange={e=>setEventoForm(p=>({...p,titulo:e.target.value}))}/></Field>
                    <Field label="Tipo"><select className={inputCls} value={eventoForm.tipo} onChange={e=>setEventoForm(p=>({...p,tipo:e.target.value}))}>{TIPOS_EVENTO.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</select></Field>
                    <Field label="Día"><select className={inputCls} value={eventoForm.dia} onChange={e=>setEventoForm(p=>({...p,dia:e.target.value}))}>{[1,2,3,4].map(d=><option key={d} value={d}>Día {d}</option>)}</select></Field>
                    <Field label="Sala"><input className={inputCls} value={eventoForm.sala} onChange={e=>setEventoForm(p=>({...p,sala:e.target.value}))}/></Field>
                    <Field label="Hora inicio"><input type="datetime-local" className={inputCls} value={eventoForm.horaInicio} onChange={e=>setEventoForm(p=>({...p,horaInicio:e.target.value}))}/></Field>
                    <Field label="Hora fin"><input type="datetime-local" className={inputCls} value={eventoForm.horaFin} onChange={e=>setEventoForm(p=>({...p,horaFin:e.target.value}))}/></Field>
                    <div className="md:col-span-2 flex gap-3 pt-2">
                      <button type="submit" disabled={loading} className={btnPrimary}>{loading?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>}{editingEventoId?"Guardar":"Crear"}</button>
                      <button type="button" onClick={()=>setShowEventoForm(false)} className={btnGhost}><X size={16}/>Cancelar</button>
                    </div>
                  </form>
                </div>
              )}
              {[1,2,3,4].map(dia=>{
                const del_dia=eventos.filter(e=>parseInt(e.dia)===dia);
                if(!del_dia.length) return null;
                return (<div key={dia}><h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"><Clock size={13} className="inline mr-1"/>Día {dia}</h3><div className="space-y-2">{del_dia.sort((a,b)=>(a.horaInicio||'')<(b.horaInicio||'')?-1:1).map(ev=>{const tipoLabel=TIPOS_EVENTO.find(t=>t.v===ev.tipo)?.l||ev.tipo;return(<div key={ev.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4"><div className="flex items-center gap-3 flex-1 min-w-0"><span className="text-2xl">{tipoLabel.split(' ')[0]}</span><div className="min-w-0"><p className="font-semibold text-gray-900 dark:text-white truncate">{ev.titulo||ev.title}</p><div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-0.5">{ev.horaInicio&&<span>🕐 {new Date(ev.horaInicio).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}</span>}{ev.sala&&<span>📍 {ev.sala}</span>}</div></div></div>{isAdmin&&<div className="flex gap-1 shrink-0"><button onClick={()=>{setEditingEventoId(ev.id);setEventoForm({titulo:ev.titulo||ev.title||'',dia:ev.dia||1,horaInicio:ev.horaInicio?String(ev.horaInicio).slice(0,16):'',horaFin:ev.horaFin?String(ev.horaFin).slice(0,16):'',tipo:ev.tipo||'registro',sala:ev.sala||''});setShowEventoForm(true);}} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit2 size={14}/></button><button onClick={async()=>{if(confirm('¿Eliminar?')){await API.delete(`/agenda/sessions/${ev.id}`);loadEventos();}}} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button></div>}</div>);})}</div></div>);
              })}
              {eventos.length===0&&!showEventoForm&&<div className="text-center py-12 text-gray-400"><Clock size={40} className="mx-auto mb-2 opacity-30"/><p>No hay espacios logísticos</p></div>}
            </div>
          )}

          {/* ─── SPEAKERS ─── */}
          {activeTab === "speakers" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-bold dark:text-white flex-1">Speakers ({speakers.length})</h2>
                <button onClick={async()=>{if(!confirm('¿Sincronizar speakers desde WordPress?'))return;setLoading(true);try{const r=await API.post('/speakers/sync-from-wp');flash(`✅ ${r.data.message}`);loadSpeakers();}catch(e){flash(e.response?.data?.error||'Error',true);}finally{setLoading(false);}}} className="flex items-center gap-2 border border-blue-300 text-blue-600 px-3 py-1.5 rounded-xl text-sm hover:bg-blue-50 font-semibold transition"><RefreshCw size={14}/>Sync WP</button>
                <button onClick={()=>{resetSpeakerForm();setShowSpeakerForm(true);}} className={btnPrimary}><Plus size={16}/>Nuevo Speaker</button>
              </div>
              {showSpeakerForm && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border-l-4 border-green-500 border border-gray-200 p-6">
                  <h3 className="font-bold text-lg dark:text-white mb-4">{editingSpeakerId?"✏️ Editar":"Nuevo Speaker"}</h3>
                  <form onSubmit={submitSpeaker} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Nombre *"><input className={inputCls} value={speakerForm.nombre} onChange={e=>setSpeakerForm(p=>({...p,nombre:e.target.value}))} required/></Field>
                      <Field label="Cargo"><input className={inputCls} value={speakerForm.cargo} onChange={e=>setSpeakerForm(p=>({...p,cargo:e.target.value}))}/></Field>
                      <Field label="Empresa"><input className={inputCls} value={speakerForm.company} onChange={e=>setSpeakerForm(p=>({...p,company:e.target.value}))}/></Field>
                      <Field label="Email"><input type="email" className={inputCls} value={speakerForm.email} onChange={e=>setSpeakerForm(p=>({...p,email:e.target.value}))}/></Field>
                      <Field label="Teléfono"><input type="tel" className={inputCls} value={speakerForm.telefono} onChange={e=>setSpeakerForm(p=>({...p,telefono:e.target.value}))}/></Field>
                      <Field label="URL Foto"><input type="url" className={inputCls} value={speakerForm.photo_url} onChange={e=>setSpeakerForm(p=>({...p,photo_url:e.target.value}))}/></Field>
                      <Field label="LinkedIn"><input type="url" className={inputCls} value={speakerForm.linkedin_url} onChange={e=>setSpeakerForm(p=>({...p,linkedin_url:e.target.value}))}/></Field>
                      <Field label="Website"><input type="url" className={inputCls} value={speakerForm.website_url} onChange={e=>setSpeakerForm(p=>({...p,website_url:e.target.value}))}/></Field>
                      <Field label="Sede"><select className={inputCls} value={speakerForm.sede} onChange={e=>setSpeakerForm(p=>({...p,sede:e.target.value}))}>{SEDES.map(s=><option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></Field>
                      <Field label="Edición"><input type="number" className={inputCls} value={speakerForm.edicion} onChange={e=>setSpeakerForm(p=>({...p,edicion:e.target.value}))}/></Field>
                      <Field label="Biografía"><textarea className={inputCls} rows={3} value={speakerForm.bio} onChange={e=>setSpeakerForm(p=>({...p,bio:e.target.value}))}/></Field>
                    </div>
                    {speakerForm.photo_url&&<div className="flex items-center gap-3 text-sm text-gray-500"><img src={speakerForm.photo_url} alt="" className="w-14 h-14 rounded-full object-cover border" onError={e=>e.target.style.display="none"}/><span>Vista previa</span></div>}
                    <div className="flex gap-3 pt-2"><button type="submit" disabled={loading} className={btnPrimary}>{loading?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>}{editingSpeakerId?"Guardar":"Crear"}</button><button type="button" onClick={resetSpeakerForm} className={btnGhost}><X size={16}/>Cancelar</button></div>
                  </form>
                </div>
              )}
              {loading&&!speakers.length?<div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" size={28}/></div>
              :speakers.length===0?<div className="text-center py-12 text-gray-400"><Mic size={40} className="mx-auto mb-2 opacity-30"/><p>No hay speakers</p></div>
              :<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{speakers.map(s=>(<div key={s.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 p-4 hover:shadow-md transition"><div className="flex items-center gap-3 mb-3"><img src={s.photo_url||`https://ui-avatars.com/api/?name=${encodeURIComponent(s.nombre)}&background=1a3a5c&color=fff`} alt={s.nombre} className="w-12 h-12 rounded-full object-cover border shrink-0" onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(s.nombre)}&background=1a3a5c&color=fff`;}} /><div className="min-w-0"><p className="font-bold text-gray-900 dark:text-white text-sm truncate">{s.nombre}</p><p className="text-xs text-gray-500 truncate">{s.cargo}</p><p className="text-xs text-gray-400 truncate">{s.company}</p></div></div>{s.bio&&<p className="text-xs text-gray-500 line-clamp-2 mb-3">{s.bio}</p>}<div className="flex items-center justify-between"><span className="text-xs text-gray-400 capitalize">{s.sede}</span><div className="flex gap-1"><button onClick={()=>editSpeaker(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14}/></button><button onClick={()=>deleteSpeaker(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button></div></div></div>))}</div>}
            </div>
          )}

          {/* ─── EXPOSITORES ─── */}
          {activeTab === "expositores" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold dark:text-white">Expositores ({expositores.length})</h2>
                <button onClick={()=>{resetExpositorForm();setShowExpositorForm(true);}} className={btnPrimary}><Plus size={16}/>Nuevo Expositor</button>
              </div>
              {showExpositorForm && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border-l-4 border-purple-500 border border-gray-200 p-6">
                  <h3 className="font-bold text-lg dark:text-white mb-4">{editingExpositorId?"✏️ Editar":"Nuevo Expositor"}</h3>
                  <form onSubmit={submitExpositor} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Nombre empresa *"><input className={inputCls} value={expositorForm.nombre} onChange={e=>setExpositorForm(p=>({...p,nombre:e.target.value}))} required/></Field>
                      <Field label="Tipo de Stand / Categoría">
                        <select className={inputCls} value={expositorForm.categoria} onChange={e=>setExpositorForm(p=>({...p,categoria:e.target.value}))}>
                          <option value="">— Seleccionar tipo —</option>
                          {(CATEGORIAS_POR_SEDE[(expositorForm.sede||sedeForm||"colombia").toLowerCase()]||CATEGORIAS_POR_SEDE.colombia).map(cat=>(
                            <option key={cat.key} value={cat.key}>{cat.label} — {cat.ancho_m}×{cat.alto_m}m ({cat.celdas_ancho}×{cat.celdas_alto} celdas)</option>
                          ))}
                        </select>
                        {expositorForm.categoria&&(()=>{const cats=CATEGORIAS_POR_SEDE[(expositorForm.sede||sedeForm||"colombia").toLowerCase()]||CATEGORIAS_POR_SEDE.colombia;const cat=cats.find(c=>c.key===expositorForm.categoria);return cat?(<p className="text-xs mt-1 font-semibold" style={{color:cat.color}}>● {cat.label} · {cat.ancho_m}×{cat.alto_m}m · {cat.celdas_ancho}×{cat.celdas_alto} celdas</p>):null;})()}
                      </Field>
                      <Field label="Stand #"><input className={inputCls} value={expositorForm.stand} onChange={e=>setExpositorForm(p=>({...p,stand:e.target.value}))}/></Field>
                      <Field label="Website"><input type="url" className={inputCls} value={expositorForm.website_url} onChange={e=>setExpositorForm(p=>({...p,website_url:e.target.value}))}/></Field>
                      <Field label="Logo URL"><input type="url" className={inputCls} value={expositorForm.logo_url} onChange={e=>setExpositorForm(p=>({...p,logo_url:e.target.value}))}/></Field>
                      <Field label="Sede"><select className={inputCls} value={expositorForm.sede} onChange={e=>setExpositorForm(p=>({...p,sede:e.target.value}))}>{SEDES.map(s=><option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></Field>
                      <Field label="Descripción"><textarea className={inputCls} rows={2} value={expositorForm.descripcion} onChange={e=>setExpositorForm(p=>({...p,descripcion:e.target.value}))}/></Field>
                      <div className="space-y-2"><p className="text-xs font-semibold text-gray-600 uppercase">Contacto</p><input className={inputCls} placeholder="Nombre contacto" value={expositorForm.contact_nombre} onChange={e=>setExpositorForm(p=>({...p,contact_nombre:e.target.value}))}/><input type="email" className={inputCls} placeholder="email@empresa.com" value={expositorForm.contact_email} onChange={e=>setExpositorForm(p=>({...p,contact_email:e.target.value}))}/><input type="tel" className={inputCls} placeholder="Teléfono" value={expositorForm.contact_telefono} onChange={e=>setExpositorForm(p=>({...p,contact_telefono:e.target.value}))}/></div>
                    </div>
                    {expositorForm.logo_url&&<img src={expositorForm.logo_url} alt="" className="h-14 object-contain border rounded-lg p-1" onError={e=>e.target.style.display="none"}/>}
                    <div className="flex gap-3 pt-2"><button type="submit" disabled={loading} className={btnPrimary}>{loading?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>}{editingExpositorId?"Guardar":"Crear"}</button><button type="button" onClick={resetExpositorForm} className={btnGhost}><X size={16}/>Cancelar</button></div>
                  </form>
                </div>
              )}
              {loading&&!expositores.length?<div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" size={28}/></div>
              :expositores.length===0?<div className="text-center py-12 text-gray-400"><Building2 size={40} className="mx-auto mb-2 opacity-30"/><p>No hay expositores</p></div>
              :<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{expositores.map(ex=>{const cats=CATEGORIAS_POR_SEDE[(ex.sede||"colombia").toLowerCase()]||CATEGORIAS_POR_SEDE.colombia;const cat=cats.find(c=>c.key===ex.categoria);return(<div key={ex.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 p-4 hover:shadow-md transition">{ex.logo_url&&<img src={ex.logo_url} alt={ex.nombre} className="w-full h-20 object-contain rounded-xl mb-3 bg-gray-50 p-2" onError={e=>e.target.style.display="none"}/>}<h3 className="font-bold text-gray-900 dark:text-white text-sm">{ex.nombre}</h3>{cat?<p className="text-xs font-semibold mt-0.5" style={{color:cat.color}}>● {cat.label} · {cat.ancho_m}×{cat.alto_m}m</p>:ex.categoria&&<p className="text-xs text-gray-500">{ex.categoria}</p>}{ex.stand&&<p className="text-xs text-gray-400">Stand: {ex.stand}</p>}{ex.descripcion&&<p className="text-xs text-gray-400 mt-1 line-clamp-2">{ex.descripcion}</p>}<div className="flex items-center justify-between mt-3"><span className="text-xs text-gray-400 capitalize">{ex.sede}</span><div className="flex gap-1"><button onClick={()=>editExpositor(ex)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14}/></button><button onClick={()=>deleteExpositor(ex.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button></div></div></div>);})}</div>}
            </div>
          )}

          {/* ─── ENCUESTAS ADMIN ─── */}
          {activeTab === "encuestas_admin" && isAdmin && (
            <EncuestasAdmin
              encuestas={encuestasAdmin}
              loading={loadingEnc}
              reload={loadEncuestasAdmin}
              flash={flash}
              sedeForm={sedeForm}
              edicionActiva={edicionActiva}
            />
          )}

          {/* ─── PERMISOS STAFF ─── */}
          {activeTab === "permisos_staff" && isAdmin && (
            <PermisosStaff
              staffUsers={staffUsers}
              loading={loadingStaff}
              reload={loadStaffUsers}
              flash={flash}
            />
          )}

          {/* ─── MAPA STANDS ─── */}
          {activeTab === "mapa_stands" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold dark:text-white flex items-center gap-2"><Map size={20} className="text-blue-600"/>Mapa de Stands</h2>
              <MapaStandsAdmin expositores={expositores} sedeActiva={sedeForm} flash={flash} loadExpositores={loadExpositores}/>
            </div>
          )}

          {/* ─── GESTIÓN DE USUARIOS ─── */}
          {activeTab === "gestion_usuarios" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold dark:text-white">Gestión de Usuarios</h2>
                <button onClick={()=>navigate("/usuarios")} className={btnPrimary}><ExternalLink size={16}/>Abrir panel completo</button>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 p-6 text-center text-gray-400">
                <Users size={36} className="mx-auto mb-2 opacity-30"/>
                <p className="font-semibold">Panel de Usuarios</p>
                <p className="text-sm mt-1">Usa el botón para abrir el panel completo de gestión de usuarios.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                  <button onClick={()=>navigate("/usuarios")} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 text-sm font-semibold hover:bg-blue-100 transition"><Users size={20} className="mx-auto mb-1"/>Ver Usuarios</button>
                  {isAdmin&&<button onClick={()=>navigate("/admin/import")} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 text-sm font-semibold hover:bg-green-100 transition"><FileUp size={20} className="mx-auto mb-1"/>Importar Excel</button>}
                  <button onClick={()=>setActiveTab("notificaciones")} className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-yellow-600 text-sm font-semibold hover:bg-yellow-100 transition"><Bell size={20} className="mx-auto mb-1"/>Notificaciones</button>
                </div>
              </div>
            </div>
          )}

          {/* ─── NOTIFICACIONES ─── */}
          {activeTab === "notificaciones" && isAdmin && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold dark:text-white">Notificaciones</h2>
                <button onClick={()=>setShowNotiForm(!showNotiForm)} className={btnPrimary}><Plus size={16}/>Nueva Notificación</button>
              </div>
              {showNotiForm && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border-l-4 border-yellow-500 border border-gray-200 p-6 space-y-4">
                  <h3 className="font-bold text-lg dark:text-white">Nueva Notificación</h3>
                  {notiError&&<div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl"><AlertCircle size={14}/>{notiError}</div>}
                  <form onSubmit={submitNoti} className="space-y-4">
                    <Field label="Título *"><input className={inputCls} value={notiForm.titulo} onChange={e=>setNotiForm(p=>({...p,titulo:e.target.value}))} required/></Field>
                    <Field label="Mensaje *"><textarea className={inputCls} rows={3} value={notiForm.mensaje} onChange={e=>setNotiForm(p=>({...p,mensaje:e.target.value}))} required/></Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Tipo"><select className={inputCls} value={notiForm.tipo} onChange={e=>setNotiForm(p=>({...p,tipo:e.target.value}))}><option value="info">ℹ️ Información</option><option value="success">✅ Éxito</option><option value="warning">⚠️ Advertencia</option><option value="error">❌ Urgente</option></select></Field>
                      <Field label="Sede destino"><select className={inputCls} value={notiForm.sede} onChange={e=>setNotiForm(p=>({...p,sede:e.target.value}))}><option value="todos">Todas</option>{SEDES.map(s=><option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></Field>
                    </div>
                    <Field label="Enviar a">
                      <div className="flex flex-wrap gap-2 mt-1">
                        {TIPOS_PASE.map(tp=>(<button key={tp.id} type="button" onClick={()=>{if(tp.id==="todos"){setNotiForm(p=>({...p,tipo_usuario:["todos"]}));}else{toggleTipoUsuario(tp.id);}}} className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition ${(notiForm.tipo_usuario.includes(tp.id)||(tp.id==="todos"&&notiForm.tipo_usuario.includes("todos")))?"border-blue-600 bg-blue-50 text-blue-700":"border-gray-200 text-gray-600 hover:border-gray-400"}`}>{tp.label}</button>))}
                      </div>
                    </Field>
                    <div className="flex gap-3 pt-2"><button type="submit" disabled={notiLoading} className={btnPrimary}>{notiLoading?<Loader2 size={16} className="animate-spin"/>:<Bell size={16}/>}{notiLoading?"Enviando...":"Enviar"}</button><button type="button" onClick={()=>{setShowNotiForm(false);setNotiForm(blankNoti());}} className={btnGhost}><X size={16}/>Cancelar</button></div>
                  </form>
                </div>
              )}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 p-6 text-center text-gray-400"><Bell size={36} className="mx-auto mb-2 opacity-30"/><p className="font-semibold">Historial de notificaciones</p><p className="text-sm mt-1">Crea una notificación usando el botón de arriba.</p></div>
            </div>
          )}

          {/* ─── EXCEL IMPORT ─── */}
          {activeTab === "excel_import" && isAdmin && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold dark:text-white">Importar Excel</h2>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 p-6 text-center text-gray-400">
                <FileUp size={36} className="mx-auto mb-2 opacity-30"/>
                <p className="font-semibold">Importación masiva de datos</p>
                <p className="text-sm mt-1">Importa usuarios, sesiones y expositores desde archivos Excel.</p>
                <button onClick={()=>navigate("/admin/import")} className={`${btnPrimary} mx-auto mt-4`}><FileUp size={16}/>Abrir importador</button>
              </div>
            </div>
          )}

          {/* ─── BRANDING ─── */}
          {activeTab === "branding_panel" && isAdmin && (
            <BrandingInline flash={flash} />
          )}

          {/* ─── GESTIÓN DE EVENTOS ─── */}
          {activeTab === "gestion_eventos" && isAdmin && (
            <GestionEventos
              eventos={eventosDB}
              loading={loadingEvt}
              reload={loadEventosDB}
              flash={flash}
              sedeForm={sedeForm}
              edicionActiva={edicionActiva}
              isAdmin={isAdmin}
            />
          )}

          {/* ─── SEDES Y CALENDARIOS ─── */}
          {activeTab === "sedes_config" && isAdmin && (
            <SedesCalendario
              sedes={sedesCalendario}
              reload={loadSedesCalendario}
              flash={flash}
            />
          )}

          {/* ─── CONFIGURACIÓN ─── */}
          {activeTab === "configuracion" && isAdmin && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold dark:text-white">Configuración</h2>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 p-6 text-center text-gray-400">
                <Settings size={36} className="mx-auto mb-2 opacity-30"/>
                <p className="font-semibold">Configuración avanzada del sistema</p>
                <p className="text-sm mt-1">Gestión de sedes, ediciones y parámetros del sistema.</p>
                <button onClick={()=>navigate("/configuracion")} className={`${btnPrimary} mx-auto mt-4`}><Settings size={16}/>Abrir configuración</button>
              </div>
            </div>
          )}

          {/* ─── PANEL ESTADÍSTICO ─── */}
          {activeTab === "staff_panel" && (
            <StatsInline flash={flash} isAdmin={isAdmin} />
          )}

        </div>{/* fin área contenido */}
      </div>{/* fin layout */}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAPA STANDS ADMIN — componente de posicionamiento
// ════════════════════════════════════════════════════════════
function MapaStandsAdmin({ expositores, sedeActiva, flash, loadExpositores }) {
  const sede      = (sedeActiva || "colombia").toLowerCase();
  const categorias = CATEGORIAS_POR_SEDE[sede] || CATEGORIAS_POR_SEDE.colombia;

  const [gridCols,      setGridCols]      = useState(46);
  const [gridFilas,     setGridFilas]     = useState(22);
  const [standAColocar, setStandAColocar] = useState(null);
  const [hoverCell,     setHoverCell]     = useState(null);
  const [savingId,      setSavingId]      = useState(null);
  const [zoom,          setZoom]          = useState(1);
  const [savingConfig,  setSavingConfig]  = useState(false);

  useEffect(() => {
    const lsKey = `mapa_config_${sede}`;
    try { const cached = JSON.parse(localStorage.getItem(lsKey)||'null'); if(cached?.grid_cols){setGridCols(cached.grid_cols);setGridFilas(cached.grid_filas);} } catch {}
    API.get(`/expositores/mapa-config/${sede}`).then(r=>{if(r.data?.config?.grid_cols){setGridCols(r.data.config.grid_cols);setGridFilas(r.data.config.grid_filas||22);localStorage.setItem(`mapa_config_${sede}`,JSON.stringify(r.data.config));}}).catch(()=>{});
  }, [sede]);

  const guardarConfig = async (cols, filas) => {
    localStorage.setItem(`mapa_config_${sede}`, JSON.stringify({ grid_cols:cols, grid_filas:filas }));
    setSavingConfig(true);
    try { await API.put(`/expositores/mapa-config/${sede}`, { grid_cols:cols, grid_filas:filas, edicion:2026 }); }
    catch {}
    finally { setSavingConfig(false); }
  };

  const gridMap = {};
  expositores.forEach(e => {
    if (e.grid_col == null) return;
    const w=e.ancho_celdas||1, h=e.alto_celdas||1;
    for(let dc=0;dc<w;dc++) for(let df=0;df<h;df++) gridMap[`${e.grid_col+dc}-${e.grid_fila+df}`]={expo:e,isOrigin:dc===0&&df===0};
  });

  const sinPosicion = expositores.filter(e=>e.grid_col==null);
  const conPosicion = expositores.filter(e=>e.grid_col!=null);

  const getPreviewCells = (col, fila) => {
    if (!standAColocar) return { cells:new Set(), canPlace:true };
    const cat=categorias.find(c=>c.key===(standAColocar.categoria||"").toLowerCase());
    const w=cat?.celdas_ancho||1, h=cat?.celdas_alto||1;
    const cells=new Set(); let canPlace=true;
    for(let dc=0;dc<w;dc++) for(let df=0;df<h;df++) { const key=`${col+dc}-${fila+df}`; cells.add(key); if(gridMap[key])canPlace=false; if(col+dc>gridCols||fila+df>gridFilas)canPlace=false; }
    return { cells, canPlace };
  };
  const preview = hoverCell ? getPreviewCells(hoverCell.col, hoverCell.fila) : null;

  const cambiarEstado = async (expo, nuevoEstado) => {
    setSavingId(expo.id);
    try { await API.patch(`/expositores/${expo.id}/estado`,{estado_stand:nuevoEstado}); flash(`✅ ${expo.nombre}: ${ESTADOS_STAND[nuevoEstado]?.label}`); await loadExpositores(); }
    catch(err) { flash(err.response?.data?.error||"Error",true); }
    finally { setSavingId(null); }
  };

  const handleCeldaClick = async (col, fila) => {
    if(!standAColocar) return;
    const cat=categorias.find(c=>c.key===(standAColocar.categoria||"").toLowerCase());
    const ancho=cat?.celdas_ancho||1, alto=cat?.celdas_alto||1;
    for(let dc=0;dc<ancho;dc++) for(let df=0;df<alto;df++) {
      if(gridMap[`${col+dc}-${fila+df}`]){flash(`⚠️ Celda (${col+dc},${fila+df}) ocupada`,true);return;}
      if(col+dc>gridCols||fila+df>gridFilas){flash("⚠️ Se sale del área",true);return;}
    }
    try { await API.patch(`/expositores/${standAColocar.id}/posicion`,{grid_col:col,grid_fila:fila,ancho_celdas:ancho,alto_celdas:alto}); flash(`✅ ${standAColocar.nombre} → (${col},${fila})`); setStandAColocar(null); setHoverCell(null); await loadExpositores(); }
    catch { flash("Error al posicionar",true); }
  };

  const quitarPosicion = async (expo) => {
    try { await API.patch(`/expositores/${expo.id}/posicion`,{grid_col:null,grid_fila:null}); flash(`Posición eliminada`); await loadExpositores(); }
    catch { flash("Error",true); }
  };

  const inputClsS = "px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white";

  return (
    <div className="space-y-5">
      {/* Tipos de stand */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 p-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Tipos de stand — {sede.charAt(0).toUpperCase()+sede.slice(1)}</h3>
        <div className="flex flex-wrap gap-2">
          {categorias.map(cat=>(
            <div key={cat.key} className="rounded-xl px-3 py-2 border-2 text-center min-w-[90px]" style={{backgroundColor:cat.color+"15",borderColor:cat.color}}>
              <p className="font-bold text-xs" style={{color:cat.color}}>{cat.label}</p>
              <p className="text-xs text-gray-500">{cat.ancho_m}×{cat.alto_m}m · {cat.celdas_ancho}×{cat.celdas_alto}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dimensiones */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 p-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Dimensiones ({sede})</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div><label className="text-xs text-gray-500 mb-1 block">Columnas</label><input type="number" min="10" max="80" value={gridCols} onChange={e=>setGridCols(Math.max(10,parseInt(e.target.value)||46))} onBlur={e=>guardarConfig(Math.max(10,parseInt(e.target.value)||46),gridFilas)} className={inputClsS} style={{width:80}}/></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Filas</label><input type="number" min="5" max="50" value={gridFilas} onChange={e=>setGridFilas(Math.max(5,parseInt(e.target.value)||22))} onBlur={e=>guardarConfig(gridCols,Math.max(5,parseInt(e.target.value)||22))} className={inputClsS} style={{width:80}}/></div>
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-2 py-1">
            <button onClick={()=>setZoom(z=>Math.max(z-0.1,0.3))} className="px-2 py-0.5 text-gray-500">−</button>
            <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom*100)}%</span>
            <button onClick={()=>setZoom(z=>Math.min(z+0.1,1.5))} className="px-2 py-0.5 text-gray-500">+</button>
            <button onClick={()=>setZoom(1)} className="text-xs text-gray-400 px-1">↺</button>
          </div>
          <button onClick={()=>guardarConfig(gridCols,gridFilas)} disabled={savingConfig} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
            {savingConfig?<Loader2 size={12} className="animate-spin"/>:<Save size={12}/>}{savingConfig?"Guardando...":"Guardar dimensiones"}
          </button>
          <p className="text-xs text-gray-400">{conPosicion.length}/{expositores.length} posicionados</p>
        </div>
      </div>

      {/* Sin posición */}
      {sinPosicion.length>0&&(
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-amber-700 mb-3">⚠️ {sinPosicion.length} sin posición</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {sinPosicion.map(expo=>{const cat=categorias.find(c=>c.key===(expo.categoria||"").toLowerCase());return(
              <div key={expo.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl p-2.5 border border-amber-100">
                {expo.logo_url&&<img src={expo.logo_url} className="w-7 h-7 object-contain rounded" onError={e=>e.target.style.display='none'}/>}
                <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{expo.nombre}</p><p className="text-xs text-gray-400">{expo.stand?`Stand ${expo.stand}`:"Sin #"}{cat?` · ${cat.label}`:""}</p></div>
                <button onClick={()=>{setStandAColocar(standAColocar?.id===expo.id?null:expo);setHoverCell(null);}} className={`shrink-0 text-xs px-2.5 py-1.5 rounded-xl font-semibold transition ${standAColocar?.id===expo.id?"bg-blue-600 text-white":"bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"}`}>{standAColocar?.id===expo.id?"✕":"📌 Ubicar"}</button>
              </div>
            );})}
          </div>
        </div>
      )}

      {/* Banner modo ubicar */}
      {standAColocar&&(()=>{const cat=categorias.find(ct=>ct.key===(standAColocar.categoria||"").toLowerCase());const canPlace=preview?.canPlace??true;return(
        <div className={`border-2 rounded-2xl p-4 flex items-center gap-3 transition-colors ${canPlace?"bg-blue-50 border-blue-400":"bg-red-50 border-red-400"}`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-lg shrink-0 ${canPlace?"bg-blue-600":"bg-red-500"}`}>{canPlace?"📌":"⛔"}</div>
          <div className="flex-1"><p className={`text-sm font-bold ${canPlace?"text-blue-700":"text-red-700"}`}>Posicionando: <strong>{standAColocar.nombre}</strong>{cat&&<span className="font-normal text-xs ml-2 opacity-70">({cat.label} · {cat.ancho_m}×{cat.alto_m}m · {cat.celdas_ancho}×{cat.celdas_alto} celdas)</span>}</p><p className={`text-xs mt-0.5 ${canPlace?"text-blue-500":"text-red-500"}`}>{canPlace?"Mueve el cursor para previsualizar. Clic para confirmar.":"Posición no válida. Mueve el cursor."}</p></div>
          <button onClick={()=>{setStandAColocar(null);setHoverCell(null);}} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
      );})()}

      {/* Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">Plano {gridCols}×{gridFilas} — {sede}</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ESTADOS_STAND).map(([k,v])=>(
              <span key={k} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{backgroundColor:v.bg,color:v.text,border:`1px solid ${v.border}`}}>
                <span className="w-2 h-2 rounded-full" style={{backgroundColor:v.dot}}/>{v.label}
              </span>
            ))}
          </div>
        </div>
        <div className="overflow-auto p-2 bg-gray-50 dark:bg-gray-900" style={{maxHeight:520}}>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${gridCols}, minmax(40px, 1fr))`,gap:"2px",transform:`scale(${zoom})`,transformOrigin:"top left",width:`${100/zoom}%`}}>
            {Array.from({length:gridCols*gridFilas},(_,i)=>{
              const col=(i%gridCols)+1, fila=Math.floor(i/gridCols)+1;
              const cell=gridMap[`${col}-${fila}`];
              if(cell&&!cell.isOrigin) return null;
              const expo=cell?.expo, estado=ESTADOS_STAND[expo?.estado_stand||"libre"];
              const ancho=expo?.ancho_celdas||1, alto=expo?.alto_celdas||1;
              const inPreview=preview?.cells.has(`${col}-${fila}`), canDrop=preview?.canPlace??true;
              return(
                <div key={`${col}-${fila}`}
                  onClick={()=>!expo&&handleCeldaClick(col,fila)}
                  onMouseEnter={()=>standAColocar&&!expo&&setHoverCell({col,fila})}
                  onMouseLeave={()=>standAColocar&&setHoverCell(null)}
                  title={expo?`${expo.nombre}${expo.stand?" · Stand "+expo.stand:""} · ${estado.label}`:standAColocar?`(${col},${fila})`:`Vacío`}
                  style={{gridColumn:`span ${ancho}`,gridRow:`span ${alto}`,backgroundColor:inPreview?(canDrop?"#dbeafe":"#fee2e2"):expo?estado.bg:(standAColocar?"#f0f9ff":"#fff"),border:`2px solid ${inPreview?(canDrop?"#2563eb":"#dc2626"):expo?estado.border:(standAColocar?"#bae6fd":"#e2e8f0")}`,outline:inPreview&&canDrop?"2px solid #93c5fd":"none",outlineOffset:1,borderRadius:"5px",minHeight:"48px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"3px",cursor:expo?"default":(standAColocar?"crosshair":"default"),position:"relative",transition:"all 0.1s"}}>
                  {expo?(
                    <>
                      {expo.logo_url?<img src={expo.logo_url} style={{width:24,height:24}} className="object-contain" onError={e=>e.target.style.display='none'}/>:<Building2 size={13} style={{color:estado.text}}/>}
                      <span style={{fontSize:"0.5rem",fontWeight:700,color:estado.text,textAlign:"center",lineHeight:1.2,marginTop:2,maxWidth:"100%",overflow:"hidden"}}>{expo.stand||expo.nombre?.split(" ")[0]}</span>
                      <span style={{position:"absolute",top:3,right:3,width:8,height:8,borderRadius:"50%",backgroundColor:estado.dot}}/>
                      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity" style={{backgroundColor:"rgba(255,255,255,0.95)",borderRadius:"3px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,padding:4}}>
                        {savingId===expo.id?<Loader2 size={12} className="animate-spin text-blue-500"/>:<>
                          <span style={{fontSize:"0.48rem",fontWeight:700,color:"#1e293b",textAlign:"center"}}>{expo.nombre?.split(" ").slice(0,2).join(" ")}</span>
                          <div style={{display:"flex",gap:3}}>
                            {Object.entries(ESTADOS_STAND).map(([k,v])=>(
                              <button key={k} onClick={e=>{e.stopPropagation();cambiarEstado(expo,k);}} title={v.label} style={{width:13,height:13,borderRadius:"50%",backgroundColor:v.bg,border:`2px solid ${v.border}`,cursor:"pointer",outline:(expo.estado_stand||"libre")===k?"2px solid #2563eb":"none",outlineOffset:1}}/>
                            ))}
                          </div>
                          <button onClick={e=>{e.stopPropagation();quitarPosicion(expo);}} style={{fontSize:"0.42rem",color:"#ef4444",cursor:"pointer"}}>quitar posición</button>
                        </>}
                      </div>
                    </>
                  ):(
                    <span style={{fontSize:"0.42rem",color:standAColocar?"#0ea5e9":"#d1d5db"}}>{standAColocar?"＋":`${col},${fila}`}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabla de estados */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-900 dark:text-white">Todos los stands ({expositores.length})</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700"><tr>{["Empresa","Stand","Categoría","Posición","Estado","Cambiar"].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {expositores.map(expo=>{
                const est=ESTADOS_STAND[expo.estado_stand||"libre"];
                const cat=categorias.find(c=>c.key===(expo.categoria||"").toLowerCase());
                return(<tr key={expo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                  <td className="px-3 py-2.5"><div className="flex items-center gap-2">{expo.logo_url&&<img src={expo.logo_url} className="w-6 h-6 object-contain rounded" onError={e=>e.target.style.display='none'}/>}<span className="text-sm font-medium text-gray-900 dark:text-white">{expo.nombre}</span></div></td>
                  <td className="px-3 py-2.5 text-sm text-gray-500">{expo.stand||"—"}</td>
                  <td className="px-3 py-2.5">{cat?<span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{backgroundColor:cat.color+"18",color:cat.color,border:`1px solid ${cat.color}`}}>{cat.label}</span>:<span className="text-xs text-gray-400">{expo.categoria||"—"}</span>}</td>
                  <td className="px-3 py-2.5 text-sm">{expo.grid_col!=null?<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">({expo.grid_col},{expo.grid_fila}) {expo.ancho_celdas>1||expo.alto_celdas>1?`${expo.ancho_celdas}×${expo.alto_celdas}`:""}</code>:<button onClick={()=>{setStandAColocar(standAColocar?.id===expo.id?null:expo);setHoverCell(null);}} className="text-xs text-amber-600 hover:text-amber-700 font-medium underline">Asignar →</button>}</td>
                  <td className="px-3 py-2.5"><span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{backgroundColor:est.bg,color:est.text,border:`1px solid ${est.border}`}}>{est.label}</span></td>
                  <td className="px-3 py-2.5"><select value={expo.estado_stand||"libre"} onChange={e=>cambiarEstado(expo,e.target.value)} disabled={savingId===expo.id} className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50">{Object.entries(ESTADOS_STAND).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FASE 2 — GESTIÓN DE EVENTOS
// ════════════════════════════════════════════════════════════

const ESTADO_EVENTO = {
  borrador:   { label:"Borrador",   bg:"#f1f5f9", text:"#475569", border:"#cbd5e1", dot:"#94a3b8" },
  activo:     { label:"Activo",     bg:"#f0fdf4", text:"#16a34a", border:"#86efac", dot:"#22c55e" },
  suspendido: { label:"Suspendido", bg:"#fffbeb", text:"#d97706", border:"#fcd34d", dot:"#eab308" },
  concluido:  { label:"Concluido",  bg:"#eff6ff", text:"#1d4ed8", border:"#93c5fd", dot:"#3b82f6" },
  cancelado:  { label:"Cancelado",  bg:"#fef2f2", text:"#dc2626", border:"#fca5a5", dot:"#ef4444" },
};

const SEDES_CMC  = ["colombia","mexico","chile"];
const ROLES_VISIBILIDAD = [
  { id:"todos",              label:"Todos los usuarios" },
  { id:"super_admin",        label:"Solo Super Admin" },
  { id:"staff",              label:"Staff" },
  { id:"asistente_general",  label:"Asistente General" },
  { id:"asistente_curso",    label:"Asistente Curso" },
  { id:"asistente_sesiones", label:"Asistente Sesiones" },
  { id:"asistente_combo",    label:"Asistente Combo" },
  { id:"expositor",          label:"Expositor" },
  { id:"speaker",            label:"Speaker" },
];

function blankEvento() {
  return { nombre:"", sede:"colombia", edicion:2026, fecha_inicio:"", fecha_fin:"", estado:"borrador", visible_roles:["todos"], descripcion:"", imagen_url:"" };
}

function GestionEventos({ eventos, loading, reload, flash, sedeForm, edicionActiva, isAdmin }) {
  const [showForm,    setShowForm]    = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [form,        setForm]        = useState(blankEvento());
  const [saving,      setSaving]      = useState(false);
  const [filtroEstado,setFiltroEstado]= useState("");

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  const filtered = filtroEstado ? eventos.filter(e=>e.estado===filtroEstado) : eventos;

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, edicion: parseInt(form.edicion)||2026 };
      if (editingId) { await API.put(`/eventos/${editingId}`, payload); flash("✅ Evento actualizado"); }
      else           { await API.post("/eventos", payload);              flash("✅ Evento creado"); }
      setShowForm(false); setEditingId(null); setForm(blankEvento()); reload();
    } catch(err) { flash(err.response?.data?.error||"Error al guardar",true); }
    finally { setSaving(false); }
  };

  const handleEstado = async (id, estado) => {
    try { await API.patch(`/eventos/${id}/estado`,{estado}); flash(`Estado → ${ESTADO_EVENTO[estado]?.label}`); reload(); }
    catch(err) { flash(err.response?.data?.error||"Error",true); }
  };

  const handleActivar = async (id, nombre) => {
    if (!confirm(`¿Activar "${nombre}" como evento global? La app mostrará este evento a todos los usuarios.`)) return;
    try { const r=await API.patch(`/eventos/${id}/activar`); flash(`🎉 ${r.data.mensaje}`); reload(); }
    catch(err) { flash(err.response?.data?.error||"Error al activar",true); }
  };

  const handleEliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try { await API.delete(`/eventos/${id}`); flash("Evento eliminado"); reload(); }
    catch(err) { flash(err.response?.data?.error||"Error",true); }
  };

  const startEdit = (ev) => {
    setEditingId(ev.id);
    setForm({ nombre:ev.nombre, sede:ev.sede, edicion:ev.edicion, fecha_inicio:ev.fecha_inicio?.slice(0,10)||"", fecha_fin:ev.fecha_fin?.slice(0,10)||"", estado:ev.estado, visible_roles:ev.visible_roles||["todos"], descripcion:ev.descripcion||"", imagen_url:ev.imagen_url||"" });
    setShowForm(true);
  };

  const toggleRol = (rol) => {
    setForm(prev => {
      const roles = prev.visible_roles;
      if (rol === "todos") return { ...prev, visible_roles: ["todos"] };
      const sin_todos = roles.filter(r=>r!=="todos");
      return { ...prev, visible_roles: sin_todos.includes(rol) ? sin_todos.filter(r=>r!==rol) : [...sin_todos, rol] };
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold dark:text-white flex-1">Eventos & Ediciones ({eventos.length})</h2>
        <div className="flex gap-2 flex-wrap">
          <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)} className="text-sm border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 bg-white dark:bg-gray-700 dark:text-white">
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_EVENTO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={()=>{setEditingId(null);setForm(blankEvento());setShowForm(true);}} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-semibold transition">
            <Plus size={16}/>Nuevo Evento
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-l-4 border-blue-500 border border-gray-200 p-6 space-y-5">
          <h3 className="font-bold text-lg dark:text-white">{editingId?"✏️ Editar Evento":"Nuevo Evento"}</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Nombre del evento *</label>
                <input className={inputCls} placeholder="CMC Colombia 2026" value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} required/>
              </div>
              {/* Sede */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Sede *</label>
                <select className={inputCls} value={form.sede} onChange={e=>setForm(p=>({...p,sede:e.target.value}))}>
                  {SEDES_CMC.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
              {/* Edición */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Edición (año) *</label>
                <input type="number" className={inputCls} value={form.edicion} onChange={e=>setForm(p=>({...p,edicion:e.target.value}))} min="2020" max="2035" required/>
              </div>
              {/* Fechas */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Fecha inicio</label>
                <input type="date" className={inputCls} value={form.fecha_inicio} onChange={e=>setForm(p=>({...p,fecha_inicio:e.target.value}))}/>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Fecha fin</label>
                <input type="date" className={inputCls} value={form.fecha_fin} onChange={e=>setForm(p=>({...p,fecha_fin:e.target.value}))}/>
              </div>
              {/* Estado */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Estado</label>
                <select className={inputCls} value={form.estado} onChange={e=>setForm(p=>({...p,estado:e.target.value}))}>
                  {Object.entries(ESTADO_EVENTO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {/* URL imagen */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Imagen URL</label>
                <input type="url" className={inputCls} placeholder="https://..." value={form.imagen_url} onChange={e=>setForm(p=>({...p,imagen_url:e.target.value}))}/>
              </div>
              {/* Descripción */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Descripción</label>
                <textarea className={inputCls} rows={2} value={form.descripcion} onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))}/>
              </div>
            </div>

            {/* Visibilidad por roles */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase">Visible para</label>
              <div className="flex flex-wrap gap-2">
                {ROLES_VISIBILIDAD.map(r=>{
                  const active = form.visible_roles.includes(r.id) || (r.id==="todos"&&form.visible_roles.includes("todos"));
                  return(
                    <button key={r.id} type="button" onClick={()=>toggleRol(r.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition ${active?"border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700":"border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400"}`}>
                      {r.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400">
                Seleccionado: <strong className="text-gray-600">{(form.visible_roles||[]).join(", ")||"ninguno"}</strong>
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-semibold disabled:opacity-50 transition">
                {saving?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>}{saving?"Guardando...":(editingId?"Guardar cambios":"Crear evento")}
              </button>
              <button type="button" onClick={()=>{setShowForm(false);setEditingId(null);}} className="flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 text-sm transition">
                <X size={16}/>Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de eventos */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" size={28}/></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Calendar size={40} className="mx-auto mb-2 opacity-30"/>
          <p className="font-semibold">No hay eventos</p>
          <p className="text-sm mt-1">Crea el primer evento con el botón de arriba.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ev => {
            const est = ESTADO_EVENTO[ev.estado] || ESTADO_EVENTO.borrador;
            const rolesTexto = (ev.visible_roles||[]).includes("todos") ? "Todos los usuarios" : (ev.visible_roles||[]).join(", ");
            return (
              <div key={ev.id} className={`bg-white dark:bg-gray-800 rounded-2xl border-2 overflow-hidden transition ${ev.es_activo?"border-green-400 shadow-md shadow-green-100":"border-gray-200 dark:border-gray-700"}`}>
                {/* Banner evento activo */}
                {ev.es_activo && (
                  <div className="bg-green-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-2">
                    <CheckCircle size={14}/> EVENTO ACTIVO GLOBAL — Los usuarios ven este evento
                  </div>
                )}
                <div className="p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    {/* Imagen */}
                    {ev.imagen_url && (
                      <img src={ev.imagen_url} alt={ev.nombre} className="w-16 h-16 rounded-xl object-cover border shrink-0" onError={e=>e.target.style.display="none"}/>
                    )}
                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">{ev.nombre}</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{backgroundColor:est.bg,color:est.text,border:`1px solid ${est.border}`}}>
                          <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{backgroundColor:est.dot}}/>
                          {est.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
                        <span className="capitalize font-medium">📍 {ev.sede}</span>
                        <span>📅 Edición {ev.edicion}</span>
                        {ev.fecha_inicio && <span>🗓 {new Date(ev.fecha_inicio+'T12:00').toLocaleDateString("es",{day:"numeric",month:"short"})} – {ev.fecha_fin?new Date(ev.fecha_fin+'T12:00').toLocaleDateString("es",{day:"numeric",month:"short",year:"numeric"}):"?"}</span>}
                        <span>👁 {rolesTexto}</span>
                      </div>
                      {ev.descripcion && <p className="text-xs text-gray-400 line-clamp-1">{ev.descripcion}</p>}
                    </div>
                    {/* Acciones */}
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {/* Botón Activar — solo si no está activo */}
                      {!ev.es_activo && (
                        <button onClick={()=>handleActivar(ev.id,ev.nombre)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700 transition">
                          ⚡ Activar
                        </button>
                      )}
                      {/* Cambiar estado */}
                      <select value={ev.estado} onChange={e=>handleEstado(ev.id,e.target.value)}
                        className="text-xs border border-gray-200 dark:border-gray-600 rounded-xl px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-white">
                        {Object.entries(ESTADO_EVENTO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                      </select>
                      {/* Editar */}
                      <button onClick={()=>startEdit(ev)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition"><Edit2 size={15}/></button>
                      {/* Eliminar */}
                      {!ev.es_activo && (
                        <button onClick={()=>handleEliminar(ev.id,ev.nombre)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"><Trash2 size={15}/></button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FASE 2 — SEDES Y CALENDARIOS
// ════════════════════════════════════════════════════════════
function SedesCalendario({ sedes, reload, flash }) {
  const [editando,  setEditando]  = useState(null); // { sede, edicion }
  const [form,      setForm]      = useState({});
  const [saving,    setSaving]    = useState(false);
  const [nuevaSede, setNuevaSede] = useState({ sede:"colombia", edicion:2026, fecha_inicio:"", fecha_fin:"", activo:true });
  const [showNueva, setShowNueva] = useState(false);

  const inputClsS = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500";

  // Agrupar por edición
  const porEdicion = sedes.reduce((acc,s)=>{ (acc[s.edicion]=acc[s.edicion]||[]).push(s); return acc; },{});

  const handleGuardar = async (sede, edicion) => {
    setSaving(true);
    try {
      await API.put(`/eventos/sedes-calendario/${sede}/${edicion}`, form);
      flash(`✅ ${sede} ${edicion} actualizado`); setEditando(null); reload();
    } catch(err) { flash(err.response?.data?.error||"Error",true); }
    finally { setSaving(false); }
  };

  const handleNueva = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await API.put(`/eventos/sedes-calendario/${nuevaSede.sede}/${nuevaSede.edicion}`, nuevaSede);
      flash(`✅ ${nuevaSede.sede} ${nuevaSede.edicion} agregado`); setShowNueva(false); reload();
    } catch(err) { flash(err.response?.data?.error||"Error",true); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Sedes & Calendarios</h2>
        <button onClick={()=>setShowNueva(!showNueva)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          <Plus size={16}/>Agregar sede/edición
        </button>
      </div>

      {/* Formulario nueva entrada */}
      {showNueva && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-l-4 border-blue-400 border border-gray-200 p-5">
          <h3 className="font-bold dark:text-white mb-4">Nueva Sede + Edición</h3>
          <form onSubmit={handleNueva} className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Sede</label>
              <select className={inputClsS} value={nuevaSede.sede} onChange={e=>setNuevaSede(p=>({...p,sede:e.target.value}))}>
                {["colombia","mexico","chile","peru","argentina"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Edición</label><input type="number" className={inputClsS} value={nuevaSede.edicion} onChange={e=>setNuevaSede(p=>({...p,edicion:e.target.value}))} min="2020" max="2035"/></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Fecha inicio</label><input type="date" className={inputClsS} value={nuevaSede.fecha_inicio} onChange={e=>setNuevaSede(p=>({...p,fecha_inicio:e.target.value}))}/></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Fecha fin</label><input type="date" className={inputClsS} value={nuevaSede.fecha_fin} onChange={e=>setNuevaSede(p=>({...p,fecha_fin:e.target.value}))}/></div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition">
                {saving?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>}Guardar
              </button>
              <button type="button" onClick={()=>setShowNueva(false)} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition"><X size={14}/></button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de sedes por edición */}
      {Object.keys(porEdicion).length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Building2 size={40} className="mx-auto mb-2 opacity-30"/><p>No hay sedes configuradas</p></div>
      ) : (
        Object.entries(porEdicion).sort((a,b)=>b[0]-a[0]).map(([edicion, items])=>(
          <div key={edicion} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Edición {edicion}</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map(item => {
                const isEdit = editando?.sede===item.sede && editando?.edicion===item.edicion;
                return (
                  <div key={`${item.sede}-${item.edicion}`} className="p-4">
                    {isEdit ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                        <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Sede</label><p className="text-sm font-bold text-gray-900 dark:text-white capitalize pt-2">{item.sede}</p></div>
                        <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Inicio</label><input type="date" className={inputClsS} defaultValue={item.fecha_inicio?.slice(0,10)||""} onChange={e=>setForm(f=>({...f,fecha_inicio:e.target.value}))}/></div>
                        <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Fin</label><input type="date" className={inputClsS} defaultValue={item.fecha_fin?.slice(0,10)||""} onChange={e=>setForm(f=>({...f,fecha_fin:e.target.value}))}/></div>
                        <div className="flex gap-2">
                          <button onClick={()=>handleGuardar(item.sede,item.edicion)} disabled={saving} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 hover:bg-blue-700 transition">
                            {saving?<Loader2 size={12} className="animate-spin"/>:<Save size={12}/>}Guardar
                          </button>
                          <button onClick={()=>setEditando(null)} className="px-3 py-2 border border-gray-300 text-gray-600 rounded-xl text-xs hover:bg-gray-50 transition"><X size={12}/></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.activo?"bg-green-500":"bg-gray-300"}`}/>
                          <span className="font-semibold text-gray-900 dark:text-white text-sm capitalize">{item.sede}</span>
                        </div>
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-500">
                          <span>📅 Inicio: <strong>{item.fecha_inicio?new Date(item.fecha_inicio+'T12:00').toLocaleDateString("es",{day:"numeric",month:"short",year:"numeric"}):"No definida"}</strong></span>
                          <span>🏁 Fin: <strong>{item.fecha_fin?new Date(item.fecha_fin+'T12:00').toLocaleDateString("es",{day:"numeric",month:"short",year:"numeric"}):"No definida"}</strong></span>
                          <span>Estado: <strong className={item.activo?"text-green-600":"text-gray-400"}>{item.activo?"Activo":"Inactivo"}</strong></span>
                        </div>
                        <button onClick={()=>{setEditando({sede:item.sede,edicion:item.edicion});setForm({fecha_inicio:item.fecha_inicio?.slice(0,10)||"",fecha_fin:item.fecha_fin?.slice(0,10)||"",activo:item.activo});}}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition shrink-0">
                          <Edit2 size={15}/>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FASE 3A — GESTIÓN DE ENCUESTAS (Admin)
// ════════════════════════════════════════════════════════════

const TIPOS_PASE_ENC = [
  { v:"todos",              l:"Todos" },
  { v:"asistente_general",  l:"Asistente General" },
  { v:"asistente_curso",    l:"Asistente Curso" },
  { v:"asistente_sesiones", l:"Asistente Sesiones" },
  { v:"asistente_combo",    l:"Asistente Combo" },
  { v:"expositor",          l:"Expositor" },
  { v:"speaker",            l:"Speaker" },
  { v:"staff",              l:"Staff" },
];

function blankEncuesta() {
  return { titulo:"", descripcion:"", tipo_fuente:"externa", url_externa:"", tipo_pase:"todos", sede:"", edicion:"", estado:"activa", preguntas:[] };
}

function EncuestasAdmin({ encuestas, loading, reload, flash, sedeForm, edicionActiva }) {
  const [showForm,   setShowForm]   = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [form,       setForm]       = useState(blankEncuesta());
  const [saving,     setSaving]     = useState(false);
  const [statsId,    setStatsId]    = useState(null);
  const [stats,      setStats]      = useState(null);
  const [pregunta,   setPregunta]   = useState({ texto:"", tipo:"texto" });

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500";

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, edicion: form.edicion?parseInt(form.edicion):null };
      if (editingId) { await API.put(`/encuestas/${editingId}`, payload); flash("✅ Encuesta actualizada"); }
      else           { await API.post("/encuestas", payload);             flash("✅ Encuesta creada"); }
      setShowForm(false); setEditingId(null); setForm(blankEncuesta()); reload();
    } catch(err) { flash(err.response?.data?.error||"Error al guardar",true); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, titulo) => {
    if (!confirm(`¿Eliminar "${titulo}"?`)) return;
    try { await API.delete(`/encuestas/${id}`); flash("Encuesta eliminada"); reload(); }
    catch(err) { flash(err.response?.data?.error||"Error",true); }
  };

  const handleStats = async (id) => {
    if (statsId === id) { setStatsId(null); setStats(null); return; }
    try { const r = await API.get(`/encuestas/${id}/stats`); setStats(r.data); setStatsId(id); }
    catch { flash("No se pudieron cargar estadísticas",true); }
  };

  const startEdit = (enc) => {
    setEditingId(enc.id);
    setForm({ titulo:enc.titulo||"", descripcion:enc.descripcion||"", tipo_fuente:enc.tipo_fuente||"externa", url_externa:enc.url_externa||"", tipo_pase:enc.tipo_pase||"todos", sede:enc.sede||"", edicion:enc.edicion||"", estado:enc.estado||"activa", preguntas:enc.preguntas||[] });
    setShowForm(true);
  };

  const addPregunta = () => {
    if (!pregunta.texto.trim()) return;
    setForm(f => ({ ...f, preguntas: [...(f.preguntas||[]), { ...pregunta, id: Date.now() }] }));
    setPregunta({ texto:"", tipo:"texto" });
  };

  const removePregunta = (idx) => setForm(f => ({ ...f, preguntas: f.preguntas.filter((_,i)=>i!==idx) }));

  const ESTADO_ENC = {
    activa:   { bg:"#f0fdf4", text:"#16a34a", border:"#86efac", dot:"#22c55e" },
    inactiva: { bg:"#f9fafb", text:"#6b7280", border:"#d1d5db", dot:"#9ca3af" },
    borrador: { bg:"#fffbeb", text:"#d97706", border:"#fcd34d", dot:"#eab308" },
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold dark:text-white flex-1">Encuestas ({encuestas.length})</h2>
        <button onClick={()=>{setEditingId(null);setForm(blankEncuesta());setShowForm(!showForm);}} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          <Plus size={16}/>{showForm?"Cancelar":"Nueva Encuesta"}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-l-4 border-blue-500 border border-gray-200 p-6 space-y-5">
          <h3 className="font-bold text-lg dark:text-white">{editingId?"✏️ Editar":"Nueva Encuesta"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Título *</label>
                <input className={inputCls} value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} required placeholder="Encuesta de satisfacción — Día 1"/>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Tipo</label>
                <select className={inputCls} value={form.tipo_fuente} onChange={e=>setForm(p=>({...p,tipo_fuente:e.target.value}))}>
                  <option value="externa">🔗 Externa (URL / Zoho)</option>
                  <option value="nativa">📝 Nativa (preguntas en la app)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Estado</label>
                <select className={inputCls} value={form.estado} onChange={e=>setForm(p=>({...p,estado:e.target.value}))}>
                  <option value="activa">Activa</option>
                  <option value="borrador">Borrador</option>
                  <option value="inactiva">Inactiva</option>
                </select>
              </div>
              {form.tipo_fuente === "externa" && (
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase">URL del formulario</label>
                  <input type="url" className={inputCls} value={form.url_externa} onChange={e=>setForm(p=>({...p,url_externa:e.target.value}))} placeholder="https://forms.zohopublic.com/..."/>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Visible para</label>
                <select className={inputCls} value={form.tipo_pase} onChange={e=>setForm(p=>({...p,tipo_pase:e.target.value}))}>
                  {TIPOS_PASE_ENC.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Sede (opcional)</label>
                <select className={inputCls} value={form.sede} onChange={e=>setForm(p=>({...p,sede:e.target.value}))}>
                  <option value="">Todas las sedes</option>
                  {["colombia","mexico","chile"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Edición (opcional)</label>
                <input type="number" className={inputCls} value={form.edicion} onChange={e=>setForm(p=>({...p,edicion:e.target.value}))} placeholder="2026" min="2020" max="2035"/>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Descripción</label>
                <textarea className={inputCls} rows={2} value={form.descripcion} onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))} placeholder="Descripción breve de la encuesta"/>
              </div>
            </div>

            {/* Preguntas nativas */}
            {form.tipo_fuente === "nativa" && (
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Preguntas ({form.preguntas?.length||0})</p>
                {(form.preguntas||[]).map((p,i)=>(
                  <div key={i} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200">
                    <span className="text-xs w-5 text-gray-400 font-bold">{i+1}.</span>
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{p.texto}</span>
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{p.tipo}</span>
                    <button type="button" onClick={()=>removePregunta(i)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white" placeholder="Texto de la pregunta" value={pregunta.texto} onChange={e=>setPregunta(p=>({...p,texto:e.target.value}))}/>
                  <select className="px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:text-white" value={pregunta.tipo} onChange={e=>setPregunta(p=>({...p,tipo:e.target.value}))}>
                    <option value="texto">Texto libre</option>
                    <option value="opcion">Opción única</option>
                    <option value="multiple">Múltiple</option>
                    <option value="escala">Escala 1-5</option>
                  </select>
                  <button type="button" onClick={addPregunta} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><Plus size={14}/></button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition">
                {saving?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>}{saving?"Guardando...":(editingId?"Guardar":"Crear")}
              </button>
              <button type="button" onClick={()=>{setShowForm(false);setEditingId(null);}} className="flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition"><X size={16}/>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de encuestas */}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" size={28}/></div>
      : encuestas.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Calendar size={40} className="mx-auto mb-2 opacity-30"/><p className="font-semibold">No hay encuestas</p><p className="text-sm mt-1">Crea tu primera encuesta arriba.</p></div>
      ) : (
        <div className="space-y-3">
          {encuestas.map(enc => {
            const est = ESTADO_ENC[enc.estado||"activa"] || ESTADO_ENC.activa;
            const isShowingStats = statsId === enc.id;
            return (
              <div key={enc.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 dark:text-white">{enc.titulo}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{backgroundColor:est.bg,color:est.text,border:`1px solid ${est.border}`}}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{backgroundColor:est.dot}}/>{enc.estado||"activa"}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs">{enc.tipo_fuente==="nativa"?"📝 Nativa":"🔗 Externa"}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {enc.tipo_pase && enc.tipo_pase!=="todos" && <span>👥 {enc.tipo_pase}</span>}
                      {enc.sede && <span>📍 {enc.sede}</span>}
                      {enc.edicion && <span>📅 {enc.edicion}</span>}
                      {enc.tipo_fuente==="nativa" && <span>❓ {enc.preguntas?.length||0} preguntas</span>}
                    </div>
                    {enc.descripcion && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{enc.descripcion}</p>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={()=>handleStats(enc.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${isShowingStats?"bg-blue-600 text-white":"border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      <BarChart2 size={13}/>{isShowingStats?"Ocultar":"Stats"}
                    </button>
                    <button onClick={()=>startEdit(enc)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl"><Edit2 size={14}/></button>
                    <button onClick={()=>handleDelete(enc.id,enc.titulo)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"><Trash2 size={14}/></button>
                  </div>
                </div>
                {/* Panel de estadísticas */}
                {isShowingStats && stats && (
                  <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-700">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="text-center"><p className="text-2xl font-black text-blue-600">{stats.total_respuestas||0}</p><p className="text-xs text-gray-500">Respuestas</p></div>
                      <div className="text-center"><p className="text-2xl font-black text-green-600">{stats.completadas||0}</p><p className="text-xs text-gray-500">Completadas</p></div>
                      {stats.tasa_completado && <div className="text-center"><p className="text-2xl font-black text-purple-600">{stats.tasa_completado}%</p><p className="text-xs text-gray-500">Tasa</p></div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FASE 3B — PERMISOS STAFF
// ════════════════════════════════════════════════════════════

const PERMISOS_DEFINICION = [
  { key:"verEncuestasAdmin",    label:"Ver y gestionar Encuestas",    grupo:"Evento" },
  { key:"verMapaStandsAdmin",   label:"Ver Mapa de Stands (admin)",    grupo:"Evento" },
  { key:"verSesionesAdmin",     label:"Ver y editar Sesiones",         grupo:"Evento" },
  { key:"verSpeakersAdmin",     label:"Ver y editar Speakers",         grupo:"Evento" },
  { key:"verExpositoresAdmin",  label:"Ver y editar Expositores",      grupo:"Evento" },
  { key:"verGestionUsuarios",   label:"Ver Gestión de Usuarios",       grupo:"Usuarios" },
  { key:"verNotificaciones",    label:"Enviar Notificaciones",          grupo:"Usuarios" },
  { key:"verStatsCompleto",     label:"Ver Panel Estadístico completo", grupo:"Administración" },
  { key:"verEventosAdmin",      label:"Ver Eventos & Ediciones",        grupo:"Administración" },
  { key:"verSedesAdmin",        label:"Ver Sedes & Calendarios",        grupo:"Administración" },
];

function PermisosStaff({ staffUsers, loading, reload, flash }) {
  const [selectedUser, setSelectedUser]   = useState(null);
  const [permisos,     setPermisos]       = useState({});
  const [saving,       setSaving]         = useState(false);
  const [loadingPerms, setLoadingPerms]   = useState(false);

  const loadPermisos = async (userId) => {
    setLoadingPerms(true);
    try {
      const r = await API.get(`/users/${userId}`);
      const p = r.data?.permisos_extra || r.data?.user?.permisos_extra || {};
      setPermisos(typeof p === "object" ? p : {});
    } catch { setPermisos({}); }
    finally { setLoadingPerms(false); }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    loadPermisos(user.id);
  };

  const togglePermiso = (key) => {
    setPermisos(p => ({ ...p, [key]: !p[key] }));
  };

  const handleGuardar = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await API.put(`/users/${selectedUser.id}`, { permisos_extra: permisos });
      flash(`✅ Permisos de ${selectedUser.nombre} actualizados`);
      reload();
    } catch(err) { flash(err.response?.data?.error||"Error al guardar",true); }
    finally { setSaving(false); }
  };

  const grupos = [...new Set(PERMISOS_DEFINICION.map(p=>p.grupo))];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold dark:text-white">Permisos Staff</h2>
        <p className="text-sm text-gray-500 mt-0.5">Define qué secciones del panel puede ver cada miembro de Staff.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Lista de staff */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-bold text-gray-500 uppercase">Staff ({staffUsers.length})</p>
          </div>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" size={24}/></div>
          : staffUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-400"><Users size={32} className="mx-auto mb-2 opacity-30"/><p className="text-sm">No hay usuarios Staff</p></div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {staffUsers.map(u=>(
                <button key={u.id} onClick={()=>handleSelectUser(u)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${selectedUser?.id===u.id?"bg-blue-50 dark:bg-blue-900/20":"hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                  <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-purple-600">{u.nombre?.charAt(0)?.toUpperCase()||"S"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${selectedUser?.id===u.id?"text-blue-700 dark:text-blue-300":"text-gray-900 dark:text-white"}`}>{u.nombre}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  {u.permisos_extra && Object.keys(u.permisos_extra).length>0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full shrink-0">{Object.values(u.permisos_extra).filter(Boolean).length} permisos</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Panel de permisos */}
        <div className="lg:col-span-2">
          {!selectedUser ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400 h-full flex flex-col items-center justify-center">
              <User size={40} className="mb-3 opacity-20"/>
              <p className="font-semibold">Selecciona un miembro de Staff</p>
              <p className="text-sm mt-1">Haz clic en un usuario de la lista para ver y editar sus permisos.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-200 dark:border-blue-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedUser.nombre}</p>
                  <p className="text-xs text-gray-500">{selectedUser.email} · Staff</p>
                </div>
                <button onClick={handleGuardar} disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition">
                  {saving?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>}{saving?"Guardando...":"Guardar permisos"}
                </button>
              </div>
              {loadingPerms ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" size={24}/></div>
              ) : (
                <div className="p-5 space-y-5">
                  <p className="text-xs text-gray-400">Los Staff ya tienen acceso a ver Agenda, Mapa Expo, Speakers, Expositores, Encuestas y Notificaciones. Aquí defines permisos adicionales de administración.</p>
                  {grupos.map(grupo => (
                    <div key={grupo}>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{grupo}</p>
                      <div className="space-y-2">
                        {PERMISOS_DEFINICION.filter(p=>p.grupo===grupo).map(perm=>(
                          <label key={perm.key} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition">
                            <div onClick={()=>togglePermiso(perm.key)}
                              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${permisos[perm.key]?"bg-blue-600":"bg-gray-200 dark:bg-gray-600"}`}>
                              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${permisos[perm.key]?"translate-x-5":"translate-x-0.5"}`}/>
                            </div>
                            <span className={`text-sm ${permisos[perm.key]?"text-gray-900 dark:text-white font-medium":"text-gray-500 dark:text-gray-400"}`}>{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FASE 4A — BRANDING INLINE
// ════════════════════════════════════════════════════════════

const SEDES_BRANDING = [
  { id:"_global",  label:"🌐 Global",   color:"#6366f1" },
  { id:"colombia", label:"🇨🇴 Colombia", color:"#f59e0b" },
  { id:"mexico",   label:"🇲🇽 México",   color:"#ef4444" },
  { id:"chile",    label:"🇨🇱 Chile",    color:"#3b82f6" },
];

function BrandingInline({ flash }) {
  const [sedeSel, setSedeSel]   = useState("_global");
  const [branding, setBranding] = useState({});
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { loadBranding(sedeSel); }, [sedeSel]);

  const loadBranding = async (sede) => {
    setLoading(true);
    try { const r=await API.get(`/branding/${sede}`); setBranding(r.data?.branding||{}); }
    catch { setBranding({}); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try { await API.put(`/branding/${sedeSel}`, branding); flash(`✅ Branding de ${sedeSel} guardado`); }
    catch(err) { flash(err.response?.data?.error||"Error al guardar",true); }
    finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!confirm(`¿Restablecer branding de ${sedeSel} a valores por defecto?`)) return;
    try { await API.post(`/branding/reset/${sedeSel}`); flash("Branding restablecido"); loadBranding(sedeSel); }
    catch(err) { flash(err.response?.data?.error||"Error",true); }
  };

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500";

  const ColorPicker = ({ label, field }) => (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={branding[field]||"#000000"} onChange={e=>setBranding(b=>({...b,[field]:e.target.value}))}
          className="w-10 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5"/>
        <input className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white font-mono" value={branding[field]||""} onChange={e=>setBranding(b=>({...b,[field]:e.target.value}))} placeholder="#000000"/>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold dark:text-white">Branding</h2>
        <div className="flex gap-2">
          <button onClick={handleReset} className="flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition"><RefreshCw size={14}/>Restablecer</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-purple-700 transition">
            {saving?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>}{saving?"Guardando...":"Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Selector de sede */}
      <div className="flex flex-wrap gap-2">
        {SEDES_BRANDING.map(s=>(
          <button key={s.id} onClick={()=>setSedeSel(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${sedeSel===s.id?"text-white border-transparent":"bg-white dark:bg-gray-800 border-gray-200 text-gray-600 hover:border-gray-400"}`}
            style={sedeSel===s.id?{backgroundColor:s.color,borderColor:s.color}:{}}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-purple-600" size={28}/></div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Identidad */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Identidad</h3>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Nombre de la app</label>
              <input className={inputCls} value={branding.appNombre||""} onChange={e=>setBranding(b=>({...b,appNombre:e.target.value}))} placeholder="CMC App"/>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">URL del Logo</label>
              <input type="url" className={inputCls} value={branding.logoUrl||""} onChange={e=>setBranding(b=>({...b,logoUrl:e.target.value}))} placeholder="https://..."/>
              {branding.logoUrl && <img src={branding.logoUrl} alt="Logo preview" className="h-12 object-contain mt-2 rounded border" onError={e=>e.target.style.display="none"}/>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Texto alt del logo</label>
              <input className={inputCls} value={branding.logoAlt||""} onChange={e=>setBranding(b=>({...b,logoAlt:e.target.value}))} placeholder="CMC Latinoamérica"/>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Tagline / Slogan</label>
              <input className={inputCls} value={branding.tagline||""} onChange={e=>setBranding(b=>({...b,tagline:e.target.value}))} placeholder="Congreso de Mantenimiento"/>
            </div>
          </div>

          {/* Colores */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Colores</h3>
            <ColorPicker label="Color primario" field="colorPrimario"/>
            <ColorPicker label="Color secundario" field="colorSecundario"/>
            <ColorPicker label="Color de fondo" field="colorFondo"/>
            <ColorPicker label="Color del menú lateral" field="colorMenu"/>
            <ColorPicker label="Texto del menú" field="colorTextoMenu"/>
          </div>

          {/* Banners / Promoción */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 lg:col-span-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Espacios de Promoción</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Banner principal (URL imagen)</label>
                <input type="url" className={inputCls} value={branding.bannerPrincipal||""} onChange={e=>setBranding(b=>({...b,bannerPrincipal:e.target.value}))} placeholder="https://..."/>
                {branding.bannerPrincipal && <img src={branding.bannerPrincipal} alt="" className="w-full h-20 object-cover rounded-xl mt-1 border" onError={e=>e.target.style.display="none"}/>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Banner secundario (URL imagen)</label>
                <input type="url" className={inputCls} value={branding.bannerSecundario||""} onChange={e=>setBranding(b=>({...b,bannerSecundario:e.target.value}))} placeholder="https://..."/>
                {branding.bannerSecundario && <img src={branding.bannerSecundario} alt="" className="w-full h-20 object-cover rounded-xl mt-1 border" onError={e=>e.target.style.display="none"}/>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Logo patrocinador 1</label>
                <input type="url" className={inputCls} value={branding.logoSponsor1||""} onChange={e=>setBranding(b=>({...b,logoSponsor1:e.target.value}))} placeholder="https://..."/>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Logo patrocinador 2</label>
                <input type="url" className={inputCls} value={branding.logoSponsor2||""} onChange={e=>setBranding(b=>({...b,logoSponsor2:e.target.value}))} placeholder="https://..."/>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 lg:col-span-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Vista previa del menú</h3>
            <div className="w-48 rounded-2xl overflow-hidden shadow-lg" style={{backgroundColor:branding.colorMenu||"#1e293b"}}>
              <div className="p-3 border-b border-white/10 flex items-center gap-2">
                {branding.logoUrl
                  ? <img src={branding.logoUrl} className="h-7 object-contain max-w-[100px]" onError={e=>e.target.style.display="none"}/>
                  : <span className="font-bold text-sm" style={{color:branding.colorTextoMenu||"#fff"}}>{branding.appNombre||"CMC App"}</span>}
              </div>
              <div className="p-2 space-y-1">
                {["Dashboard","Agenda","Speakers","Admin"].map(item=>(
                  <div key={item} className="px-2 py-1.5 rounded-lg text-xs font-medium" style={{color:branding.colorTextoMenu||"#fff",opacity:0.8}}>{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FASE 4B — PANEL ESTADÍSTICO INLINE
// ════════════════════════════════════════════════════════════

function StatsInline({ flash, isAdmin }) {
  const [stats,        setStats]        = useState(null);
  const [resumen,      setResumen]      = useState(null);
  const [checkins,     setCheckins]     = useState([]);
  const [sessionStats, setSessionStats] = useState([]);
  const [cursoStats,   setCursoStats]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState("resumen");
  const [filtroSede,   setFiltroSede]   = useState("");

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [sR,rR,cR,ssR,csR] = await Promise.all([
        API.get("/staff/stats").catch(()=>null),
        API.get("/staff/resumen-diario").catch(()=>null),
        API.get("/staff/checkins-recientes").catch(()=>null),
        API.get("/staff/sessions-stats").catch(()=>null),
        API.get("/staff/cursos-stats").catch(()=>null),
      ]);
      if(sR)  setStats(sR.data);
      if(rR)  setResumen(rR.data);
      if(cR)  setCheckins(cR.data?.checkins||[]);
      if(ssR) setSessionStats(ssR.data?.sessions||ssR.data||[]);
      if(csR) setCursoStats(csR.data?.cursos||csR.data||[]);
    } catch(err) { flash("Error al cargar estadísticas",true); }
    finally { setLoading(false); }
  };

  const TABS_STATS = [
    { id:"resumen",   label:"📊 Resumen" },
    { id:"asistencia",label:"✅ Asistencia" },
    { id:"sesiones",  label:"🎤 Sesiones" },
    { id:"cursos",    label:"📚 Cursos" },
  ];

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-600" size={32}/></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold dark:text-white flex-1">Panel Estadístico</h2>
        <button onClick={loadStats} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"><RefreshCw size={16}/></button>
        {isAdmin && (
          <select value={filtroSede} onChange={e=>setFiltroSede(e.target.value)} className="text-sm border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 bg-white dark:bg-gray-700 dark:text-white">
            <option value="">Todas las sedes</option>
            {["colombia","mexico","chile"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
        )}
      </div>

      {/* KPIs principales */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:"Asistentes registrados", value:stats.total_usuarios||0,    color:"blue"  },
            { label:"Entradas hoy",            value:stats.entradas_hoy||0,      color:"green" },
            { label:"Sesiones activas",        value:stats.sesiones_activas||0,  color:"purple"},
            { label:"Stands visitados",        value:stats.stands_visitados||0,  color:"amber" },
          ].map(k=>(
            <div key={k.label} className={`bg-${k.color}-50 dark:bg-${k.color}-900/20 border border-${k.color}-200 dark:border-${k.color}-700 rounded-2xl p-4 text-center`}>
              <p className={`text-3xl font-black text-${k.color}-600`}>{k.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS_STATS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition border-2 ${activeTab===t.id?"bg-blue-600 text-white border-blue-600":"bg-white dark:bg-gray-800 border-gray-200 text-gray-600 hover:border-blue-400"}`}>{t.label}</button>
        ))}
      </div>

      {/* Resumen diario */}
      {activeTab==="resumen" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700"><p className="text-sm font-semibold dark:text-white">Resumen por día</p></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700"><tr>{["Día","Entradas","Sesiones","Cursos"].map(h=><th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[1,2,3,4].map(dia=>{
                  const d = resumen?.dias?.find(x=>x.dia===dia) || {};
                  return(<tr key={dia} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white">Día {dia}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300">{d.entradas||0}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300">{d.sesiones||0}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300">{d.cursos||0}</td>
                  </tr>);
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Asistencia */}
      {activeTab==="asistencia" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm font-semibold dark:text-white">Check-ins recientes</p>
            <span className="text-xs text-gray-400">{checkins.length} registros</span>
          </div>
          <div className="overflow-auto" style={{maxHeight:400}}>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0"><tr>{["Usuario","Tipo","Sede","Fecha"].map(h=><th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {checkins.filter(c=>!filtroSede||c.sede===filtroSede).slice(0,50).map((c,i)=>(
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{c.nombre||c.email||c.user_id}</td>
                    <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full capitalize">{c.tipo||"entrada"}</span></td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 capitalize">{c.sede||"—"}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{c.fecha?new Date(c.fecha).toLocaleString("es",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"—"}</td>
                  </tr>
                ))}
                {checkins.length===0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">Sin registros</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sesiones */}
      {activeTab==="sesiones" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700"><p className="text-sm font-semibold dark:text-white">Participación por sesión</p></div>
          <div className="overflow-auto" style={{maxHeight:450}}>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0"><tr>{["Sesión","Sala","Asistentes","Día"].map(h=><th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sessionStats.filter(s=>!filtroSede||s.sede===filtroSede).map((s,i)=>(
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate">{s.titulo||s.title||"—"}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{s.sala||s.room||"—"}</td>
                    <td className="px-4 py-2.5"><span className="text-sm font-bold text-blue-600">{s.asistentes||s.count||0}</span></td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">Día {s.dia||"—"}</td>
                  </tr>
                ))}
                {sessionStats.length===0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">Sin datos de sesiones</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cursos */}
      {activeTab==="cursos" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700"><p className="text-sm font-semibold dark:text-white">Participación por curso</p></div>
          <div className="overflow-auto" style={{maxHeight:450}}>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0"><tr>{["Curso","Inscritos","Asistencias","Día"].map(h=><th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {cursoStats.filter(c=>!filtroSede||c.sede===filtroSede).map((c,i)=>(
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate">{c.titulo||c.title||"—"}</td>
                    <td className="px-4 py-2.5"><span className="text-sm font-bold text-green-600">{c.inscritos||c.inscriptions||0}</span></td>
                    <td className="px-4 py-2.5"><span className="text-sm font-bold text-blue-600">{c.asistencias||c.attendances||0}</span></td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">Día {c.dia||"—"}</td>
                  </tr>
                ))}
                {cursoStats.length===0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">Sin datos de cursos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}