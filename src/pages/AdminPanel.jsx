import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import API from "../services/api";
import {
  Plus,
  AlertCircle,
  Bell,
  Users,
  Save,
  FileUp,
  Edit2,
  Trash2,
  X,
  ExternalLink,
} from "lucide-react";

export default function AdminPanel() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const actualUserProfile =
    userProfile ||
    JSON.parse(
      localStorage.getItem("userProfile") ||
        localStorage.getItem("user") ||
        "{}"
    );

  const [activeTab, setActiveTab] = useState("sesiones");

  // ── Speakers ──────────────────────────────────────────────
  const [speakers, setSpeakers] = useState([]);
  const [showSpeakerForm, setShowSpeakerForm] = useState(false);
  const [editingSpeakerId, setEditingSpeakerId] = useState(null);
  const [speakerFormData, setSpeakerFormData] = useState({
    nombre: "", email: "", telefono: "", bio: "",
    imagen: "", empresa: "", cargo: "", sesiones: [], sede: "chile",
  });

  // ── Sesiones ──────────────────────────────────────────────
  const [sessions, setSessions] = useState([]);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [sessionFormData, setSessionFormData] = useState({
    titulo: "", descripcion: "", dia: "", horaInicio: "", horaFin: "",
    sala: "", tipo: "conferencia", sede: "chile", edicion: 2025, estado_edicion: "abierta",
  });

  // ── Expositores ───────────────────────────────────────────
  const [expositores, setExpositores] = useState([]);
  const [showExpositorForm, setShowExpositorForm] = useState(false);
  const [editingExpositorId, setEditingExpositorId] = useState(null);
  const [expositorFormData, setExpositorFormData] = useState({
    nombre: "", logo_url: "", website: "", telefono: "", email: "",
    categoria: "", stand: "", descripcion: "", sede: "chile", estado_edicion: "abierto",
  });

  // ── Notificaciones ────────────────────────────────────────
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [notificationFormData, setNotificationFormData] = useState({
    titulo: "", mensaje: "", tipo: "info", tipo_usuario: ["todos"], sede: "todos", usuarios: [],
  });
  const [users, setUsers] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState(null);

  // ── Global ─────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // ── Carga inicial por tab ─────────────────────────────────
  useEffect(() => {
    if (activeTab === "sesiones")       loadSessions();
    else if (activeTab === "expositores")  loadExpositores();
    else if (activeTab === "notificaciones") loadUsers();
    // FIX: faltaba llamar loadSpeakers al cambiar al tab de speakers
    else if (activeTab === "speakers")    loadSpeakers();
  }, [activeTab]);

  // ── SPEAKERS ──────────────────────────────────────────────
  // FIX: no existía esta función — el tab mostraba siempre "No hay speakers"
  const loadSpeakers = async () => {
    try {
      // Solo speakers locales (editables). Los de WordPress no son editables.
      const res = await API.get("/speakers");
      // La API devuelve un array directo. Filtrar solo los editables (source=local).
      const allSpeakers = Array.isArray(res.data) ? res.data : [];
      setSpeakers(allSpeakers.filter(s => s.canEdit !== false));
    } catch (err) {
      console.error("Error al cargar speakers:", err);
    }
  };

  // ── SESIONES ──────────────────────────────────────────────
  const loadSessions = async () => {
    try {
      const res = await API.get("/agenda/sessions");
      setSessions(Array.isArray(res.data.sessions) ? res.data.sessions : []);
    } catch (err) {
      console.error("Error al cargar sesiones:", err);
    }
  };

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      if (editingSessionId) {
        await API.put(`/agenda/sessions/${editingSessionId}`, sessionFormData);
      } else {
        await API.post("/agenda/sessions", sessionFormData);
      }
      setSuccess(true);
      setShowSessionForm(false);
      setEditingSessionId(null);
      setSessionFormData({ titulo: "", descripcion: "", dia: "", horaInicio: "", horaFin: "", sala: "", tipo: "conferencia", sede: "chile", edicion: 2025 });
      loadSessions();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSession = (session) => {
    setEditingSessionId(session.id);
    setSessionFormData({
      titulo: session.titulo || "", descripcion: session.descripcion || "",
      dia: session.dia || "", horaInicio: session.horaInicio || "",
      horaFin: session.horaFin || "", sala: session.sala || "",
      tipo: session.tipo || "conferencia", sede: session.sede || "chile", edicion: session.edicion || 2025,
    });
    setShowSessionForm(true);
    setError(null);
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm("¿Eliminar esta sesión?")) return;
    try {
      setLoading(true);
      await API.delete(`/agenda/sessions/${sessionId}`);
      setSuccess(true);
      loadSessions();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── EXPOSITORES ───────────────────────────────────────────
  const loadExpositores = async () => {
    try {
      const res = await API.get("/expositores");
      setExpositores(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error al cargar expositores:", err);
    }
  };

  const handleExpositorSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      if (!expositorFormData.nombre || !expositorFormData.categoria) {
        setError("Nombre y categoría son requeridos");
        return;
      }
      if (editingExpositorId) {
        await API.put(`/expositores/${editingExpositorId}`, expositorFormData);
      } else {
        await API.post("/expositores", expositorFormData);
      }
      setSuccess(true);
      setShowExpositorForm(false);
      setEditingExpositorId(null);
      setExpositorFormData({ nombre: "", logo_url: "", website: "", telefono: "", email: "", categoria: "", stand: "", descripcion: "", sede: "chile" });
      loadExpositores();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditExpositor = (expositor) => {
    setEditingExpositorId(expositor.id);
    setExpositorFormData({
      nombre: expositor.nombre || "", logo_url: expositor.logo_url || "",
      website: expositor.website || "", telefono: expositor.telefono || "",
      email: expositor.email || "", categoria: expositor.categoria || "",
      stand: expositor.stand || "", descripcion: expositor.descripcion || "", sede: expositor.sede || "chile",
    });
    setShowExpositorForm(true);
    setError(null);
  };

  const handleDeleteExpositor = async (expositorId) => {
    if (!confirm("¿Eliminar este expositor?")) return;
    try {
      setLoading(true);
      await API.delete(`/expositores/${expositorId}`);
      setSuccess(true);
      loadExpositores();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── NOTIFICACIONES ────────────────────────────────────────
  const loadUsers = async () => {
    try {
      const res = await API.get("/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
    }
  };

  const handleNotificationSubmit = async (e) => {
    e.preventDefault();
    try {
      setNotificationLoading(true);
      setNotificationError(null);
      if (!notificationFormData.titulo || !notificationFormData.mensaje) {
        setNotificationError("Título y mensaje son requeridos");
        return;
      }
      // FIX: broadcast requería array de usuarios → causaba error si no había seleccionados.
      // Ahora usa POST /notificaciones con tipo_usuario=['todos'] por defecto,
      // o los roles/usuarios seleccionados si los hay.
      const tipo_usuario = notificationFormData.tipo_usuario?.length > 0
        ? notificationFormData.tipo_usuario
        : ['todos'];
      await API.post("/notificaciones", {
        titulo: notificationFormData.titulo,
        mensaje: notificationFormData.mensaje,
        tipo: notificationFormData.tipo,
        tipo_usuario,
        sede: notificationFormData.sede || 'todos',
      });
      setSuccess(true);
      setShowNotificationForm(false);
      setNotificationFormData({ titulo: "", mensaje: "", tipo: "info", usuarios: [] });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setNotificationError(err.response?.data?.error || err.message);
    } finally {
      setNotificationLoading(false);
    }
  };

  // ── GUARD ─────────────────────────────────────────────────
  if (!actualUserProfile) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Cargando...</div>;
  }

  if (actualUserProfile.rol !== "super_admin" && actualUserProfile.rol !== "staff") {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
        <AlertCircle className="inline mr-2 text-red-600" />
        <span className="text-red-800 font-semibold">No tienes permisos para acceder al panel de administración</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 rounded-lg">
      <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 p-4 rounded-lg text-green-800">
          ✅ Operación realizada con éxito
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-lg text-red-800">
          ❌ {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap overflow-x-auto">
        {["sesiones", "expositores", "notificaciones", "speakers"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap capitalize ${
              activeTab === tab ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-200"
            }`}
          >
            {{ sesiones: "📅 Sesiones", expositores: "🏢 Expositores", notificaciones: "🔔 Notificaciones", speakers: "🎤 Speakers" }[tab]}
          </button>
        ))}

        {/* Botón especial: ir a Usuarios */}
        <button
          onClick={() => navigate("/usuarios")}
          className="px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap bg-white text-gray-700 hover:bg-gray-200"
        >
          <Users size={18} />
          Usuarios
          <ExternalLink size={14} className="text-gray-400" />
        </button>

        <button
          onClick={() => navigate("/admin/import")}
          className="px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 whitespace-nowrap"
        >
          <FileUp size={18} />
          Importar Excel
        </button>
      </div>

      {/* Contenido */}
      <div className="bg-white p-6 rounded-lg">

        {/* ── SESIONES ── */}
        {activeTab === "sesiones" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{editingSessionId ? "✏️ Editar Sesión" : "Sesiones"}</h2>
              <button
                onClick={() => {
                  if (editingSessionId) { setEditingSessionId(null); setSessionFormData({ titulo: "", descripcion: "", dia: "", horaInicio: "", horaFin: "", sala: "", tipo: "conferencia", sede: "chile", edicion: 2025 }); }
                  setShowSessionForm(!showSessionForm);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus size={18} />
                {editingSessionId ? "Cancelar Edición" : "Nueva Sesión"}
              </button>
            </div>

            {showSessionForm && (
              <SessionForm
                formData={sessionFormData}
                onChange={(e) => setSessionFormData({ ...sessionFormData, [e.target.name]: e.target.value })}
                onSubmit={handleSessionSubmit}
                onCancel={() => { setShowSessionForm(false); setEditingSessionId(null); setSessionFormData({ titulo: "", descripcion: "", dia: "", horaInicio: "", horaFin: "", sala: "", tipo: "conferencia", sede: "chile", edicion: 2025 }); }}
                loading={loading}
                isEditing={!!editingSessionId}
              />
            )}

            <div className="mt-6 space-y-4">
              {sessions.length === 0 ? (
                <p className="text-gray-500">No hay sesiones registradas</p>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="border p-4 rounded-lg hover:shadow-lg transition flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{session.titulo}</h3>
                      <p className="text-gray-600 text-sm">{session.descripcion}</p>
                      <div className="mt-2 text-sm text-gray-500">{session.dia} | {session.horaInicio} - {session.horaFin} | {session.sala}</div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button onClick={() => handleEditSession(session)} className="text-blue-600 hover:text-blue-800 p-2 transition"><Edit2 size={18} /></button>
                      <button onClick={() => handleDeleteSession(session.id)} className="text-red-600 hover:text-red-800 p-2 transition"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── EXPOSITORES ── */}
        {activeTab === "expositores" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{editingExpositorId ? "✏️ Editar Expositor" : "Expositores"}</h2>
              <button
                onClick={() => {
                  if (editingExpositorId) { setEditingExpositorId(null); setExpositorFormData({ nombre: "", logo_url: "", website: "", telefono: "", email: "", categoria: "", stand: "", descripcion: "", sede: "chile" }); }
                  setShowExpositorForm(!showExpositorForm);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus size={18} />
                {editingExpositorId ? "Cancelar Edición" : "Nuevo Expositor"}
              </button>
            </div>

            {showExpositorForm && (
              <ExpositorForm
                formData={expositorFormData}
                onChange={(e) => setExpositorFormData({ ...expositorFormData, [e.target.name]: e.target.value })}
                onSubmit={handleExpositorSubmit}
                onCancel={() => { setShowExpositorForm(false); setEditingExpositorId(null); setExpositorFormData({ nombre: "", logo_url: "", website: "", telefono: "", email: "", categoria: "", stand: "", descripcion: "", sede: "chile" }); }}
                loading={loading}
                isEditing={!!editingExpositorId}
              />
            )}

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {expositores.length === 0 ? (
                <p className="text-gray-500">No hay expositores registrados</p>
              ) : (
                expositores.map((expositor) => (
                  <div key={expositor.id} className="border p-4 rounded-lg hover:shadow-lg transition">
                    {expositor.logo_url && <img src={expositor.logo_url} alt={expositor.nombre} className="w-full h-24 object-cover rounded mb-2" />}
                    <h3 className="font-bold text-lg">{expositor.nombre}</h3>
                    <p className="text-sm text-gray-600">{expositor.categoria}</p>
                    <p className="text-sm text-gray-500 line-clamp-2">{expositor.descripcion}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleEditExpositor(expositor)} className="flex-1 text-blue-600 hover:text-blue-800 p-2 transition flex items-center justify-center gap-1"><Edit2 size={16} />Editar</button>
                      <button onClick={() => handleDeleteExpositor(expositor.id)} className="flex-1 text-red-600 hover:text-red-800 p-2 transition flex items-center justify-center gap-1"><Trash2 size={16} />Eliminar</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── NOTIFICACIONES ── */}
        {activeTab === "notificaciones" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Notificaciones</h2>
              <button onClick={() => setShowNotificationForm(!showNotificationForm)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                <Plus size={18} />Nueva Notificación
              </button>
            </div>
            {showNotificationForm && (
              <NotificationForm
                formData={notificationFormData}
                onChange={(e) => setNotificationFormData({ ...notificationFormData, [e.target.name]: e.target.value })}
                onUserSelect={(userId) => {
                  setNotificationFormData({
                    ...notificationFormData,
                    usuarios: notificationFormData.usuarios.includes(userId)
                      ? notificationFormData.usuarios.filter((id) => id !== userId)
                      : [...notificationFormData.usuarios, userId],
                  });
                }}
                onSubmit={handleNotificationSubmit}
                onCancel={() => setShowNotificationForm(false)}
                users={users}
                loading={notificationLoading}
                error={notificationError}
              />
            )}
          </div>
        )}

        {/* ── SPEAKERS ── */}
        {activeTab === "speakers" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Gestión de Speakers</h2>
              <button onClick={() => setShowSpeakerForm(!showSpeakerForm)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                <Plus size={18} />Nuevo Speaker
              </button>
            </div>

            {showSpeakerForm && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    setLoading(true);
                    if (editingSpeakerId) {
                      await API.put(`/speakers/${editingSpeakerId}`, speakerFormData);
                    } else {
                      await API.post("/speakers", speakerFormData);
                    }
                    setSuccess(true);
                    setShowSpeakerForm(false);
                    setSpeakerFormData({ nombre: "", email: "", telefono: "", bio: "", imagen: "", empresa: "", cargo: "", sesiones: [], sede: "chile" });
                    setEditingSpeakerId(null);
                    setTimeout(() => setSuccess(false), 3000);
                  } catch (err) {
                    setError(err.response?.data?.error || err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="bg-white p-6 rounded-lg shadow-md space-y-4 mb-6 border-l-4 border-purple-600"
              >
                <h3 className="text-xl font-bold">{editingSpeakerId ? "✏️ Editar Speaker" : "Nuevo Speaker"}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Nombre completo" value={speakerFormData.nombre} onChange={(e) => setSpeakerFormData({ ...speakerFormData, nombre: e.target.value })} required className="px-4 py-2 border rounded-lg" />
                  <input type="email" placeholder="Email" value={speakerFormData.email} onChange={(e) => setSpeakerFormData({ ...speakerFormData, email: e.target.value })} className="px-4 py-2 border rounded-lg" />
                  <input type="tel" placeholder="Teléfono" value={speakerFormData.telefono} onChange={(e) => setSpeakerFormData({ ...speakerFormData, telefono: e.target.value })} className="px-4 py-2 border rounded-lg" />
                  <input type="text" placeholder="Cargo" value={speakerFormData.cargo} onChange={(e) => setSpeakerFormData({ ...speakerFormData, cargo: e.target.value })} className="px-4 py-2 border rounded-lg" />
                  <input type="text" placeholder="Empresa" value={speakerFormData.empresa} onChange={(e) => setSpeakerFormData({ ...speakerFormData, empresa: e.target.value })} className="px-4 py-2 border rounded-lg" />
                  <input type="url" placeholder="URL Imagen" value={speakerFormData.imagen} onChange={(e) => setSpeakerFormData({ ...speakerFormData, imagen: e.target.value })} className="px-4 py-2 border rounded-lg" />
                  <textarea placeholder="Biografía" value={speakerFormData.bio} onChange={(e) => setSpeakerFormData({ ...speakerFormData, bio: e.target.value })} className="px-4 py-2 border rounded-lg md:col-span-2" />
                  <select value={speakerFormData.sede} onChange={(e) => setSpeakerFormData({ ...speakerFormData, sede: e.target.value })} className="px-4 py-2 border rounded-lg">
                    <option value="chile">Chile</option>
                    <option value="mexico">México</option>
                    <option value="colombia">Colombia</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"><Save size={18} />{loading ? "Guardando..." : "Guardar"}</button>
                  <button type="button" onClick={() => setShowSpeakerForm(false)} className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500">Cancelar</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {speakers.length === 0 ? (
                <p className="text-gray-500">No hay speakers registrados</p>
              ) : (
                speakers.map((speaker) => (
                  <div key={speaker.id} className="border p-4 rounded-lg hover:shadow-lg transition">
                    {speaker.imagen && <img src={speaker.imagen} alt={speaker.nombre} className="w-full h-32 object-cover rounded mb-2" />}
                    <h3 className="font-bold">{speaker.nombre}</h3>
                    <p className="text-sm text-gray-600">{speaker.cargo}</p>
                    <p className="text-sm text-gray-500">{speaker.empresa}</p>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">{speaker.bio}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => { setEditingSpeakerId(speaker.id); setSpeakerFormData(speaker); setShowSpeakerForm(true); }} className="flex-1 text-blue-600 hover:text-blue-800 p-2 flex items-center justify-center gap-1"><Edit2 size={16} />Editar</button>
                      <button
                        onClick={async () => {
                          if (confirm("¿Eliminar este speaker?")) {
                            try {
                              await API.delete(`/speakers/${speaker.id}`);
                              setSpeakers(speakers.filter((s) => s.id !== speaker.id));
                              setSuccess(true);
                              setTimeout(() => setSuccess(false), 3000);
                            } catch (err) {
                              setError(err.message);
                            }
                          }
                        }}
                        className="flex-1 text-red-600 hover:text-red-800 p-2 flex items-center justify-center gap-1"
                      >
                        <Trash2 size={16} />Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Formularios auxiliares
// ────────────────────────────────────────────────────────────

function SessionForm({ formData, onChange, onSubmit, onCancel, loading, isEditing }) {
  return (
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4 mb-6 border-l-4 border-blue-600">
      <h3 className="text-xl font-bold">{isEditing ? "✏️ Editar Sesión" : "Nueva Sesión"}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" name="titulo" placeholder="Título" value={formData.titulo} onChange={onChange} required className="px-4 py-2 border rounded-lg" />
        <input type="text" name="sala" placeholder="Sala" value={formData.sala} onChange={onChange} className="px-4 py-2 border rounded-lg" />
        <textarea name="descripcion" placeholder="Descripción" value={formData.descripcion} onChange={onChange} className="px-4 py-2 border rounded-lg md:col-span-2" />
        <select name="dia" value={formData.dia} onChange={onChange} className="px-4 py-2 border rounded-lg">
          <option value="">Selecciona día</option>
          {["lunes","martes","miercoles","jueves","viernes"].map((d) => <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
        </select>
        <input type="time" name="horaInicio" value={formData.horaInicio} onChange={onChange} className="px-4 py-2 border rounded-lg" />
        <input type="time" name="horaFin" value={formData.horaFin} onChange={onChange} className="px-4 py-2 border rounded-lg" />
        <select name="tipo" value={formData.tipo} onChange={onChange} className="px-4 py-2 border rounded-lg">
          {["conferencia","taller","networking","curso"].map((t) => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select name="sede" value={formData.sede} onChange={onChange} className="px-4 py-2 border rounded-lg">
          <option value="chile">Chile</option><option value="mexico">México</option><option value="colombia">Colombia</option>
        </select>
        <select name="estado_edicion" value={formData.estado_edicion} onChange={onChange} className="px-4 py-2 border rounded-lg">
          <option value="abierta">Abierta</option><option value="cerrada">Cerrada</option><option value="cancelada">Cancelada</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"><Save size={18} />{loading ? "Guardando..." : isEditing ? "Guardar Cambios" : "Guardar"}</button>
        <button type="button" onClick={onCancel} className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500">Cancelar</button>
      </div>
    </form>
  );
}

function ExpositorForm({ formData, onChange, onSubmit, onCancel, loading, isEditing }) {
  return (
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4 mb-6 border-l-4 border-green-600">
      <h3 className="text-xl font-bold">{isEditing ? "✏️ Editar Expositor" : "Nuevo Expositor"}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" name="nombre" placeholder="Nombre de la empresa" value={formData.nombre} onChange={onChange} required className="px-4 py-2 border rounded-lg" />
        <input type="text" name="categoria" placeholder="Categoría" value={formData.categoria} onChange={onChange} required className="px-4 py-2 border rounded-lg" />
        <input type="text" name="stand" placeholder="Stand #" value={formData.stand} onChange={onChange} className="px-4 py-2 border rounded-lg" />
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={onChange} className="px-4 py-2 border rounded-lg" />
        <input type="tel" name="telefono" placeholder="Teléfono" value={formData.telefono} onChange={onChange} className="px-4 py-2 border rounded-lg" />
        <input type="url" name="website" placeholder="Website" value={formData.website} onChange={onChange} className="px-4 py-2 border rounded-lg" />
        <input type="url" name="logo_url" placeholder="URL del logo" value={formData.logo_url} onChange={onChange} className="px-4 py-2 border rounded-lg md:col-span-2" />
        <textarea name="descripcion" placeholder="Descripción" value={formData.descripcion} onChange={onChange} className="px-4 py-2 border rounded-lg md:col-span-2" />
        <select name="sede" value={formData.sede} onChange={onChange} className="px-4 py-2 border rounded-lg">
          <option value="chile">Chile</option><option value="mexico">México</option><option value="colombia">Colombia</option>
        </select>
        <select name="estado_edicion" value={formData.estado_edicion} onChange={onChange} className="px-4 py-2 border rounded-lg">
          <option value="abierto">Abierto</option><option value="cerrado">Cerrado</option><option value="pausado">Pausado</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"><Save size={18} />{loading ? "Guardando..." : isEditing ? "Guardar Cambios" : "Guardar"}</button>
        <button type="button" onClick={onCancel} className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500">Cancelar</button>
      </div>
    </form>
  );
}

function NotificationForm({ formData, onChange, onUserSelect, onSubmit, onCancel, users, loading, error }) {
  return (
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4 mb-6">
      <h3 className="text-xl font-bold">Nueva Notificación</h3>
      {error && <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">{error}</div>}
      <div className="space-y-4">
        <input type="text" name="titulo" placeholder="Título" value={formData.titulo} onChange={onChange} required className="w-full px-4 py-2 border rounded-lg" />
        <textarea name="mensaje" placeholder="Mensaje" value={formData.mensaje} onChange={onChange} required className="w-full px-4 py-2 border rounded-lg" />
        <select name="tipo" value={formData.tipo} onChange={onChange} className="w-full px-4 py-2 border rounded-lg">
          <option value="info">Información</option><option value="success">Éxito</option><option value="warning">Advertencia</option><option value="error">Error</option>
        </select>
        <div className="border rounded-lg p-4">
          <p className="font-semibold mb-2">Enviar a:</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {users.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay usuarios disponibles</p>
            ) : (
              users.map((user) => (
                <label key={user.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.usuarios.includes(user.id)} onChange={() => onUserSelect(user.id)} className="w-4 h-4" />
                  <span className="text-sm">{user.nombre} ({user.email})</span>
                </label>
              ))
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">Seleccionados: {formData.usuarios.length}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"><Bell size={18} />{loading ? "Enviando..." : "Enviar Notificación"}</button>
        <button type="button" onClick={onCancel} className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500">Cancelar</button>
      </div>
    </form>
  );
}