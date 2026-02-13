import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Upload,
  FileUp,
} from "lucide-react";

export default function AdminPanel() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

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

  // Estados para Gestión de Usuarios
  const [showUserForm, setShowUserForm] = useState(false);
  const [userFormData, setUserFormData] = useState({
    email: "",
    password: "",
    nombre: "",
    rol: "asistente",
    tipo_pase: "general",
    sede: "chile",
    empresa: "",
    movil: "",
  });
  const [allUsers, setAllUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState(null);

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
    } else if (activeTab === "usuarios") {
      loadAllUsers();
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
  // USUARIOS
  // ========================================================
  const loadAllUsers = async () => {
    try {
      setUserLoading(true);
      const res = await API.get("/users");
      setAllUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
      setUserError("No se pudieron cargar los usuarios");
    } finally {
      setUserLoading(false);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      setUserLoading(true);
      setUserError(null);

      console.log("👤 Creando usuario:", userFormData);

      if (!userFormData.email || !userFormData.password || !userFormData.nombre) {
        setUserError("Email, contraseña y nombre son requeridos");
        setUserLoading(false);
        return;
      }

      if (userFormData.password.length < 8) {
        setUserError("La contraseña debe tener al menos 8 caracteres");
        setUserLoading(false);
        return;
      }

      await API.post("/auth/register", userFormData);

      setSuccess(true);
      setShowUserForm(false);
      setUserFormData({
        email: "",
        password: "",
        nombre: "",
        rol: "asistente",
        tipo_pase: "general",
        sede: "chile",
        empresa: "",
        movil: "",
      });

      loadAllUsers();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setUserError(err.response?.data?.error || err.message);
      console.error("Error al crear usuario:", err);
    } finally {
      setUserLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      return;
    }

    try {
      // TODO: Crear endpoint para desactivar usuarios
      // await API.delete(`/users/${userId}`);
      alert("Función de eliminación no implementada aún");
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
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
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 rounded-lg">
      <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>

      {/* Mensajes de éxito/error */}
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
        <button
          onClick={() => setActiveTab("sesiones")}
          className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === "sesiones"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-200"
          }`}
        >
          📅 Sesiones
        </button>
        <button
          onClick={() => setActiveTab("expositores")}
          className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === "expositores"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-200"
          }`}
        >
          🏢 Expositores
        </button>
        <button
          onClick={() => setActiveTab("notificaciones")}
          className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === "notificaciones"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-200"
          }`}
        >
          🔔 Notificaciones
        </button>
        <button
          onClick={() => setActiveTab("usuarios")}
          className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "usuarios"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Users size={18} />
          Usuarios
        </button>
        <button
          onClick={() => navigate("/admin/import")}
          className="px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 whitespace-nowrap"
        >
          <FileUp size={18} />
          Importar Excel
        </button>
      </div>

      {/* Contenido de cada tab */}
      <div className="bg-white p-6 rounded-lg">
        {/* SESIONES */}
        {activeTab === "sesiones" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Sesiones</h2>
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

            <div className="mt-6 space-y-4">
              {sessions.length === 0 ? (
                <p className="text-gray-500">No hay sesiones registradas</p>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="border p-4 rounded-lg hover:shadow-lg transition">
                    <h3 className="font-bold text-lg">{session.titulo}</h3>
                    <p className="text-gray-600 text-sm">{session.descripcion}</p>
                    <div className="mt-2 text-sm text-gray-500">
                      {session.dia} | {session.horaInicio} - {session.horaFin} | {session.sala}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* EXPOSITORES */}
        {activeTab === "expositores" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Expositores</h2>
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

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {expositores.length === 0 ? (
                <p className="text-gray-500">No hay expositores registrados</p>
              ) : (
                expositores.map((expositor) => (
                  <div key={expositor.id} className="border p-4 rounded-lg hover:shadow-lg transition">
                    {expositor.logo_url && (
                      <img
                        src={expositor.logo_url}
                        alt={expositor.nombre}
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                    )}
                    <h3 className="font-bold text-lg">{expositor.nombre}</h3>
                    <p className="text-sm text-gray-600">{expositor.categoria}</p>
                    <p className="text-sm text-gray-500">{expositor.descripcion}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* NOTIFICACIONES */}
        {activeTab === "notificaciones" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Notificaciones</h2>
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
                onChange={(e) =>
                  setNotificationFormData({
                    ...notificationFormData,
                    [e.target.name]: e.target.value,
                  })
                }
                onUserSelect={(userId) => {
                  if (notificationFormData.usuarios.includes(userId)) {
                    setNotificationFormData({
                      ...notificationFormData,
                      usuarios: notificationFormData.usuarios.filter((id) => id !== userId),
                    });
                  } else {
                    setNotificationFormData({
                      ...notificationFormData,
                      usuarios: [...notificationFormData.usuarios, userId],
                    });
                  }
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

        {/* USUARIOS */}
        {activeTab === "usuarios" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
              <button
                onClick={() => setShowUserForm(!showUserForm)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus size={18} />
                Crear Usuario
              </button>
            </div>

            {showUserForm && (
              <UserForm
                formData={userFormData}
                onChange={(e) =>
                  setUserFormData({
                    ...userFormData,
                    [e.target.name]: e.target.value,
                  })
                }
                onSubmit={handleUserSubmit}
                onCancel={() => setShowUserForm(false)}
                loading={userLoading}
                error={userError}
              />
            )}

            {userError && (
              <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-lg text-red-800">
                ❌ {userError}
              </div>
            )}

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-4 py-2 text-left">Nombre</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Rol</th>
                    <th className="px-4 py-2 text-left">Tipo Pase</th>
                    <th className="px-4 py-2 text-left">Sede</th>
                    <th className="px-4 py-2 text-left">Empresa</th>
                    <th className="px-4 py-2 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {userLoading ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-2 text-center text-gray-500">
                        Cargando usuarios...
                      </td>
                    </tr>
                  ) : allUsers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-2 text-center text-gray-500">
                        No hay usuarios registrados
                      </td>
                    </tr>
                  ) : (
                    allUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-semibold">{user.nombre}</td>
                        <td className="px-4 py-2 text-blue-600">{user.email}</td>
                        <td className="px-4 py-2">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                            {user.rol}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                            {user.tipo_pase}
                          </span>
                        </td>
                        <td className="px-4 py-2">{user.sede}</td>
                        <td className="px-4 py-2">{user.empresa || "-"}</td>
                        <td className="px-4 py-2 text-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-800 text-lg">
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-800 text-lg"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTES DE FORMULARIO
// ========================================================

function SessionForm({ formData, onChange, onSubmit, onCancel, loading }) {
  return (
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4 mb-6">
      <h3 className="text-xl font-bold">Nueva Sesión</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          name="titulo"
          placeholder="Título"
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
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4 mb-6">
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
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4 mb-6">
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

function UserForm({ formData, onChange, onSubmit, onCancel, loading, error }) {
  return (
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4 mb-6">
      <h3 className="text-xl font-bold">Crear Nuevo Usuario</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={onChange}
          required
          className="px-4 py-2 border rounded-lg"
        />
        <input
          type="password"
          name="password"
          placeholder="Contraseña (min 8 caracteres)"
          value={formData.password}
          onChange={onChange}
          required
          minLength="8"
          className="px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          name="nombre"
          placeholder="Nombre completo"
          value={formData.nombre}
          onChange={onChange}
          required
          className="px-4 py-2 border rounded-lg"
        />
        <input
          type="tel"
          name="movil"
          placeholder="Teléfono celular"
          value={formData.movil}
          onChange={onChange}
          className="px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          name="empresa"
          placeholder="Empresa"
          value={formData.empresa}
          onChange={onChange}
          className="px-4 py-2 border rounded-lg"
        />
        <select name="rol" value={formData.rol} onChange={onChange} className="px-4 py-2 border rounded-lg">
          <option value="asistente">Asistente</option>
          <option value="expositor">Expositor</option>
          <option value="speaker">Speaker</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <select name="tipo_pase" value={formData.tipo_pase} onChange={onChange} className="px-4 py-2 border rounded-lg">
          <option value="general">General</option>
          <option value="vip">VIP</option>
          <option value="speaker">Speaker</option>
          <option value="expositor">Expositor</option>
          <option value="estudiante">Estudiante</option>
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
          <Plus size={18} />
          {loading ? "Creando..." : "Crear Usuario"}
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