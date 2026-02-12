import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import API from "../services/api";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Bell,
  Users,
  Building2,
  BarChart3,
  Save,
} from "lucide-react";

export default function AdminPanel() {
  const { userProfile } = useAuth();

  // Tabs del panel
  const [activeTab, setActiveTab] = useState("sesiones");

  // Estados para Sesiones
  const [sessions, setSessions] = useState([]);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({
    titulo: "",
    descripcion: "",
    dia: "",
    horaInicio: "",
    horaFin: "",
    sala: "",
    tipo: "conferencia",
    sede: "chile",
    edicion: 2025,
  });

  // Estados para Expositores
  const [expositores, setExpositores] = useState([]);
  const [showExpositorForm, setShowExpositorForm] = useState(false);
  const [expositorFormData, setExpositorFormData] = useState({
    nombre: "",
    logo_url: "",
    website: "",
    telefono: "",
    email: "",
    categoria: "",
    stand: "",
    descripcion: "",
    sede: "chile",
  });

  // Estados para Notificaciones
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [notificationFormData, setNotificationFormData] = useState({
    titulo: "",
    mensaje: "",
    tipo: "info",
    usuarios: [], // IDs de usuarios
  });
  const [users, setUsers] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // ========================================================
  // Cargar datos iniciales
  // ========================================================
  useEffect(() => {
    if (activeTab === "sesiones") {
      loadSessions();
    } else if (activeTab === "expositores") {
      loadExpositores();
    } else if (activeTab === "notificaciones") {
      loadUsers();
    }
  }, [activeTab]);

  // ========================================================
  // SESIONES
  // ========================================================
  const loadSessions = async () => {
    try {
      const res = await API.get("/agenda/sessions");
      const data = Array.isArray(res.data.sessions) ? res.data.sessions : [];
      setSessions(data);
    } catch (err) {
      console.error("Error al cargar sesiones:", err);
    }
  };

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      console.log("📝 Creando sesión:", sessionFormData);

      await API.post("/agenda/sessions", sessionFormData);

      setSuccess(true);
      setShowSessionForm(false);
      setSessionFormData({
        titulo: "",
        descripcion: "",
        dia: "",
        horaInicio: "",
        horaFin: "",
        sala: "",
        tipo: "conferencia",
        sede: "chile",
        edicion: 2025,
      });

      loadSessions();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error("Error al crear sesión:", err);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // EXPOSITORES
  // ========================================================
  const loadExpositores = async () => {
    try {
      const res = await API.get("/expositores");
      const data = Array.isArray(res.data) ? res.data : [];
      setExpositores(data);
    } catch (err) {
      console.error("Error al cargar expositores:", err);
    }
  };

  const handleExpositorSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      console.log("📝 Creando expositor:", expositorFormData);

      if (!expositorFormData.nombre || !expositorFormData.categoria) {
        setError("Nombre y categoría son requeridos");
        setLoading(false);
        return;
      }

      await API.post("/expositores", expositorFormData);

      setSuccess(true);
      setShowExpositorForm(false);
      setExpositorFormData({
        nombre: "",
        logo_url: "",
        website: "",
        telefono: "",
        email: "",
        categoria: "",
        stand: "",
        descripcion: "",
        sede: "chile",
      });

      loadExpositores();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error("Error al crear expositor:", err);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // NOTIFICACIONES
  // ========================================================
  const loadUsers = async () => {
    try {
      const res = await API.get("/users"); // Endpoint para obtener usuarios
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
      // Si falla, continuar sin usuarios
    }
  };

  const handleNotificationSubmit = async (e) => {
    e.preventDefault();
    try {
      setNotificationLoading(true);
      setNotificationError(null);

      console.log("📢 Enviando notificación:", notificationFormData);

      if (!notificationFormData.titulo || !notificationFormData.mensaje) {
        setNotificationError("Título y mensaje son requeridos");
        setNotificationLoading(false);
        return;
      }

      if (notificationFormData.usuarios.length === 0) {
        setNotificationError("Selecciona al menos un usuario");
        setNotificationLoading(false);
        return;
      }

      // ✅ USAR ENDPOINT CORRECTO: /api/notificaciones/broadcast
      await API.post("/notificaciones/broadcast", {
        usuarios: notificationFormData.usuarios,
        titulo: notificationFormData.titulo,
        mensaje: notificationFormData.mensaje,
        tipo: notificationFormData.tipo,
      });

      setSuccess(true);
      setShowNotificationForm(false);
      setNotificationFormData({
        titulo: "",
        mensaje: "",
        tipo: "info",
        usuarios: [],
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setNotificationError(err.response?.data?.error || err.message);
      console.error("Error al enviar notificación:", err);
    } finally {
      setNotificationLoading(false);
    }
  };

  // ========================================================
  // RENDERIZADO
  // ========================================================
  if (!userProfile) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Cargando...
      </div>
    );
  }

  if (userProfile.rol !== "super_admin" && userProfile.rol !== "admin") {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
        <AlertCircle className="inline mr-2 text-red-600" />
        <p className="text-red-800 font-semibold">
          No tienes permisos para acceder al panel de administración
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>

      {/* Mensajes de estado */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6 flex items-center gap-3">
          <AlertCircle size={20} className="text-green-600" />
          <p className="text-green-800 font-semibold">✅ Operación completada exitosamente</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("sesiones")}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === "sesiones"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Sesiones
        </button>
        <button
          onClick={() => setActiveTab("expositores")}
          className={`px-6 py-3 font-semibold transition flex items-center gap-2 ${
            activeTab === "expositores"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Building2 size={18} />
          Expositores
        </button>
        <button
          onClick={() => setActiveTab("notificaciones")}
          className={`px-6 py-3 font-semibold transition flex items-center gap-2 ${
            activeTab === "notificaciones"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Bell size={18} />
          Notificaciones
        </button>
      </div>

      {/* SESIONES */}
      {activeTab === "sesiones" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Gestionar Sesiones</h2>
            <button
              onClick={() => setShowSessionForm(!showSessionForm)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={18} />
              Nueva Sesión
            </button>
          </div>

          {showSessionForm && (
            <SessionForm
              formData={sessionFormData}
              onChange={(e) =>
                setSessionFormData({
                  ...sessionFormData,
                  [e.target.name]: e.target.value,
                })
              }
              onSubmit={handleSessionSubmit}
              onCancel={() => setShowSessionForm(false)}
              loading={loading}
            />
          )}

          <div className="grid grid-cols-1 gap-4">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-bold text-lg">{session.titulo}</h3>
                <p className="text-gray-600 text-sm mb-2">{session.descripcion}</p>
                <div className="flex gap-2 text-sm text-gray-500">
                  <span>📅 {session.dia}</span>
                  <span>⏰ {session.horaInicio}</span>
                  <span>📍 {session.sala}</span>
                  <span>🏢 {session.sede}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXPOSITORES */}
      {activeTab === "expositores" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Gestionar Expositores</h2>
            <button
              onClick={() => setShowExpositorForm(!showExpositorForm)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={18} />
              Nuevo Expositor
            </button>
          </div>

          {showExpositorForm && (
            <ExpositorForm
              formData={expositorFormData}
              onChange={(e) =>
                setExpositorFormData({
                  ...expositorFormData,
                  [e.target.name]: e.target.value,
                })
              }
              onSubmit={handleExpositorSubmit}
              onCancel={() => setShowExpositorForm(false)}
              loading={loading}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expositores.map((exp) => (
              <div key={exp.id} className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-bold text-lg">{exp.nombre}</h3>
                <p className="text-blue-600 text-sm font-semibold">{exp.categoria}</p>
                <p className="text-gray-600 text-sm mb-2">{exp.descripcion}</p>
                <div className="flex gap-2 text-sm text-gray-500">
                  <span>📌 Stand: {exp.stand}</span>
                  <span>🏢 {exp.sede}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOTIFICACIONES */}
      {activeTab === "notificaciones" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Enviar Notificaciones</h2>
            <button
              onClick={() => setShowNotificationForm(!showNotificationForm)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={18} />
              Nueva Notificación
            </button>
          </div>

          {showNotificationForm && (
            <NotificationForm
              formData={notificationFormData}
              onChange={(e) => {
                const { name, value } = e.target;
                setNotificationFormData({
                  ...notificationFormData,
                  [name]: value,
                });
              }}
              onUserSelect={(userId) => {
                setNotificationFormData({
                  ...notificationFormData,
                  usuarios: notificationFormData.usuarios.includes(userId)
                    ? notificationFormData.usuarios.filter(id => id !== userId)
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

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-blue-800">
              <strong>💡 Nota:</strong> Las notificaciones se envían a través del sistema de notificaciones
              de la aplicación. Los usuarios recibirán un mensaje en su panel de notificaciones.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================================
// COMPONENTES DEL FORMULARIO
// ========================================================

function SessionForm({ formData, onChange, onSubmit, onCancel, loading }) {
  return (
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <h3 className="text-xl font-bold">Nueva Sesión</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          name="titulo"
          placeholder="Título de la sesión"
          value={formData.titulo}
          onChange={onChange}
          required
          className="px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          name="sala"
          placeholder="Sala"
          value={formData.sala}
          onChange={onChange}
          className="px-4 py-2 border rounded-lg"
        />
        <textarea
          name="descripcion"
          placeholder="Descripción"
          value={formData.descripcion}
          onChange={onChange}
          className="px-4 py-2 border rounded-lg md:col-span-2"
        />
        <select name="dia" value={formData.dia} onChange={onChange} className="px-4 py-2 border rounded-lg">
          <option value="">Selecciona día</option>
          <option value="lunes">Lunes</option>
          <option value="martes">Martes</option>
          <option value="miercoles">Miércoles</option>
          <option value="jueves">Jueves</option>
          <option value="viernes">Viernes</option>
        </select>
        <input
          type="time"
          name="horaInicio"
          value={formData.horaInicio}
          onChange={onChange}
          className="px-4 py-2 border rounded-lg"
        />
        <input
          type="time"
          name="horaFin"
          value={formData.horaFin}
          onChange={onChange}
          className="px-4 py-2 border rounded-lg"
        />
        <select name="tipo" value={formData.tipo} onChange={onChange} className="px-4 py-2 border rounded-lg">
          <option value="conferencia">Conferencia</option>
          <option value="taller">Taller</option>
          <option value="networking">Networking</option>
          <option value="curso">Curso</option>
        </select>
        <select name="sede" value={formData.sede} onChange={onChange} className="px-4 py-2 border rounded-lg">
          <option value="chile">Chile</option>
          <option value="mexico">México</option>
          <option value="colombia">Colombia</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <Save size={18} />
          {loading ? "Guardando..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ExpositorForm({ formData, onChange, onSubmit, onCancel, loading }) {
  return (
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <h3 className="text-xl font-bold">Nuevo Expositor</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          name="nombre"
          placeholder="Nombre de la empresa"
          value={formData.nombre}
          onChange={onChange}
          required
          className="px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          name="categoria"
          placeholder="Categoría"
          value={formData.categoria}
          onChange={onChange}
          required
          className="px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          name="stand"
          placeholder="Stand #"
          value={formData.stand}
          onChange={onChange}
          className="px-4 py-2 border rounded-lg"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={onChange}
          className="px-4 py-2 border rounded-lg"
        />
        <input
          type="tel"
          name="telefono"
          placeholder="Teléfono"
          value={formData.telefono}
          onChange={onChange}
          className="px-4 py-2 border rounded-lg"
        />
        <input
          type="url"
          name="website"
          placeholder="Website"
          value={formData.website}
          onChange={onChange}
          className="px-4 py-2 border rounded-lg"
        />
        <input
          type="url"
          name="logo_url"
          placeholder="URL del logo"
          value={formData.logo_url}
          onChange={onChange}
          className="px-4 py-2 border rounded-lg md:col-span-2"
        />
        <textarea
          name="descripcion"
          placeholder="Descripción de la empresa"
          value={formData.descripcion}
          onChange={onChange}
          className="px-4 py-2 border rounded-lg md:col-span-2"
        />
        <select name="sede" value={formData.sede} onChange={onChange} className="px-4 py-2 border rounded-lg">
          <option value="chile">Chile</option>
          <option value="mexico">México</option>
          <option value="colombia">Colombia</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <Save size={18} />
          {loading ? "Guardando..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function NotificationForm({
  formData,
  onChange,
  onUserSelect,
  onSubmit,
  onCancel,
  users,
  loading,
  error,
}) {
  return (
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <h3 className="text-xl font-bold">Nueva Notificación</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <input
          type="text"
          name="titulo"
          placeholder="Título de la notificación"
          value={formData.titulo}
          onChange={onChange}
          required
          className="w-full px-4 py-2 border rounded-lg"
        />
        <textarea
          name="mensaje"
          placeholder="Mensaje"
          value={formData.mensaje}
          onChange={onChange}
          required
          className="w-full px-4 py-2 border rounded-lg"
        />
        <select
          name="tipo"
          value={formData.tipo}
          onChange={onChange}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="info">Información</option>
          <option value="success">Éxito</option>
          <option value="warning">Advertencia</option>
          <option value="error">Error</option>
        </select>

        {/* Selección de usuarios */}
        <div className="border rounded-lg p-4">
          <p className="font-semibold mb-2">Enviar a:</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {users.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay usuarios disponibles</p>
            ) : (
              users.map((user) => (
                <label key={user.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.usuarios.includes(user.id)}
                    onChange={() => onUserSelect(user.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">
                    {user.nombre} ({user.email})
                  </span>
                </label>
              ))
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Seleccionados: {formData.usuarios.length}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <Bell size={18} />
          {loading ? "Enviando..." : "Enviar Notificación"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}