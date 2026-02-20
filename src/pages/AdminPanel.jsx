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
} from "lucide-react";

export default function AdminPanel() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  // 🔥 HOTFIX: Si userProfile NO tiene rol, intentar desde localStorage
  const actualUserProfile = userProfile || JSON.parse(localStorage.getItem("userProfile") || localStorage.getItem("user") || "{}");

  console.log("📋 AdminPanel - actualUserProfile:", actualUserProfile);
  console.log("📋 AdminPanel - rol:", actualUserProfile.rol);

  // Tabs del panel
  const [activeTab, setActiveTab] = useState("sesiones");

  // ========================================================
  // SESIONES: Estados
  // ========================================================
  const [sessions, setSessions] = useState([]);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
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

  // ========================================================
  // EXPOSITORES: Estados
  // ========================================================
  const [expositores, setExpositores] = useState([]);
  const [showExpositorForm, setShowExpositorForm] = useState(false);
  const [editingExpositorId, setEditingExpositorId] = useState(null);
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
    usuarios: [],
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

  // ========================================================
  // NUEVOS ESTADOS: Editar y Eliminar Usuarios
  // ========================================================
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserData, setEditingUserData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
  // SESIONES: CARGAR
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

  // ========================================================
  // SESIONES: CREAR O ACTUALIZAR
  // ========================================================
  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      console.log("📝 Sesión:", sessionFormData);

      if (editingSessionId) {
        // ACTUALIZAR
        console.log("✏️ Actualizando sesión:", editingSessionId);
        await API.put(`/agenda/sessions/${editingSessionId}`, sessionFormData);
      } else {
        // CREAR
        console.log("📝 Creando sesión");
        await API.post("/agenda/sessions", sessionFormData);
      }

      setSuccess(true);
      setShowSessionForm(false);
      setEditingSessionId(null);
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
      console.error("Error en sesión:", err);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // SESIONES: EDITAR (abrir formulario)
  // ========================================================
  const handleEditSession = (session) => {
    setEditingSessionId(session.id);
    setSessionFormData({
      titulo: session.titulo || "",
      descripcion: session.descripcion || "",
      dia: session.dia || "",
      horaInicio: session.horaInicio || "",
      horaFin: session.horaFin || "",
      sala: session.sala || "",
      tipo: session.tipo || "conferencia",
      sede: session.sede || "chile",
      edicion: session.edicion || 2025,
    });
    setShowSessionForm(true);
    setError(null);
  };

  // ========================================================
  // SESIONES: ELIMINAR
  // ========================================================
  const handleDeleteSession = async (sessionId) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta sesión?")) return;

    try {
      setLoading(true);
      console.log("🗑️ Eliminando sesión:", sessionId);
      await API.delete(`/agenda/sessions/${sessionId}`);
      setSuccess(true);
      loadSessions();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error("Error eliminando sesión:", err);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // EXPOSITORES: CARGAR
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

  // ========================================================
  // EXPOSITORES: CREAR O ACTUALIZAR
  // ========================================================
  const handleExpositorSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      console.log("📝 Expositor:", expositorFormData);

      if (!expositorFormData.nombre || !expositorFormData.categoria) {
        setError("Nombre y categoría son requeridos");
        setLoading(false);
        return;
      }

      if (editingExpositorId) {
        // ACTUALIZAR
        console.log("✏️ Actualizando expositor:", editingExpositorId);
        await API.put(`/expositores/${editingExpositorId}`, expositorFormData);
      } else {
        // CREAR
        console.log("📝 Creando expositor");
        await API.post("/expositores", expositorFormData);
      }

      setSuccess(true);
      setShowExpositorForm(false);
      setEditingExpositorId(null);
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
      console.error("Error en expositor:", err);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // EXPOSITORES: EDITAR (abrir formulario)
  // ========================================================
  const handleEditExpositor = (expositor) => {
    setEditingExpositorId(expositor.id);
    setExpositorFormData({
      nombre: expositor.nombre || "",
      logo_url: expositor.logo_url || "",
      website: expositor.website || "",
      telefono: expositor.telefono || "",
      email: expositor.email || "",
      categoria: expositor.categoria || "",
      stand: expositor.stand || "",
      descripcion: expositor.descripcion || "",
      sede: expositor.sede || "chile",
    });
    setShowExpositorForm(true);
    setError(null);
  };

  // ========================================================
  // EXPOSITORES: ELIMINAR
  // ========================================================
  const handleDeleteExpositor = async (expositorId) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este expositor?")) return;

    try {
      setLoading(true);
      console.log("🗑️ Eliminando expositor:", expositorId);
      await API.delete(`/expositores/${expositorId}`);
      setSuccess(true);
      loadExpositores();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error("Error eliminando expositor:", err);
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
  // USUARIOS: Cargar lista
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

  // ========================================================
  // USUARIOS: Crear nuevo
  // ========================================================
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

  // ========================================================
  // USUARIOS: Abrir modal de edición
  // ========================================================
  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setEditingUserData({
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      tipo_pase: user.tipo_pase,
      sede: user.sede,
      empresa: user.empresa,
    });
    setShowEditModal(true);
    setUserError(null);
  };

  // ========================================================
  // USUARIOS: Guardar cambios (editar)
  // ========================================================
  const handleSaveEdit = async () => {
    try {
      setUserLoading(true);
      setUserError(null);

      console.log("✏️ Editando usuario:", editingUserId, editingUserData);

      if (!editingUserData.nombre || !editingUserData.email) {
        setUserError("Nombre y email son requeridos");
        setUserLoading(false);
        return;
      }

      await API.put(`/users/${editingUserId}`, editingUserData);

      setSuccess(true);
      setShowEditModal(false);
      setEditingUserId(null);
      setEditingUserData(null);

      loadAllUsers();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setUserError(err.response?.data?.error || err.message);
      console.error("Error al editar usuario:", err);
    } finally {
      setUserLoading(false);
    }
  };

  // ========================================================
  // USUARIOS: Eliminar (con confirmación)
  // ========================================================
  const handleDeleteClick = (user) => {
    setDeletingUserId(user.id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setUserLoading(true);
      setUserError(null);

      console.log("🗑️ Eliminando usuario:", deletingUserId);

      await API.delete(`/users/${deletingUserId}`);

      setSuccess(true);
      setShowDeleteConfirm(false);
      setDeletingUserId(null);

      loadAllUsers();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setUserError(err.response?.data?.error || err.message);
      console.error("Error al eliminar usuario:", err);
    } finally {
      setUserLoading(false);
    }
  };

  // ========================================================
  // RENDERIZADO
  // ========================================================
  if (!actualUserProfile) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Cargando...
      </div>
    );
  }

  if (actualUserProfile.rol !== "super_admin" && actualUserProfile.rol !== "admin") {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
        <AlertCircle className="inline mr-2 text-red-600" />
        <p className="text-red-800 font-semibold">
          No tienes permisos para acceder al panel de administración
        </p>
        <p className="text-red-600 text-sm mt-2">
          Tu rol es: <strong>{actualUserProfile.rol}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 rounded-lg">
      <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>
      <p className="text-sm text-gray-600 mb-4">Rol: <strong>{actualUserProfile.rol}</strong></p>

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
          onClick={() => {
            setActiveTab("sesiones");
            setShowSessionForm(false);
            setEditingSessionId(null);
          }}
          className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === "sesiones"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-200"
          }`}
        >
          📅 Sesiones
        </button>
        <button
          onClick={() => {
            setActiveTab("expositores");
            setShowExpositorForm(false);
            setEditingExpositorId(null);
          }}
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
        {/* ========================================================
            SESIONES
            ======================================================== */}
        {activeTab === "sesiones" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {editingSessionId ? "✏️ Editar Sesión" : "Sesiones"}
              </h2>
              <button
                onClick={() => {
                  if (editingSessionId) {
                    setEditingSessionId(null);
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
                  }
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
                onChange={(e) =>
                  setSessionFormData({
                    ...sessionFormData,
                    [e.target.name]: e.target.value,
                  })
                }
                onSubmit={handleSessionSubmit}
                onCancel={() => {
                  setShowSessionForm(false);
                  setEditingSessionId(null);
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
                }}
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
                      <div className="mt-2 text-sm text-gray-500">
                        {session.dia} | {session.horaInicio} - {session.horaFin} | {session.sala}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditSession(session)}
                        className="text-blue-600 hover:text-blue-800 p-2 transition"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="text-red-600 hover:text-red-800 p-2 transition"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            EXPOSITORES
            ======================================================== */}
        {activeTab === "expositores" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {editingExpositorId ? "✏️ Editar Expositor" : "Expositores"}
              </h2>
              <button
                onClick={() => {
                  if (editingExpositorId) {
                    setEditingExpositorId(null);
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
                  }
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
                onChange={(e) =>
                  setExpositorFormData({
                    ...expositorFormData,
                    [e.target.name]: e.target.value,
                  })
                }
                onSubmit={handleExpositorSubmit}
                onCancel={() => {
                  setShowExpositorForm(false);
                  setEditingExpositorId(null);
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
                }}
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
                    {expositor.logo_url && (
                      <img
                        src={expositor.logo_url}
                        alt={expositor.nombre}
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                    )}
                    <h3 className="font-bold text-lg">{expositor.nombre}</h3>
                    <p className="text-sm text-gray-600">{expositor.categoria}</p>
                    <p className="text-sm text-gray-500 line-clamp-2">{expositor.descripcion}</p>
                    
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleEditExpositor(expositor)}
                        className="flex-1 text-blue-600 hover:text-blue-800 p-2 transition flex items-center justify-center gap-1"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteExpositor(expositor.id)}
                        className="flex-1 text-red-600 hover:text-red-800 p-2 transition flex items-center justify-center gap-1"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            NOTIFICACIONES (igual que antes)
            ======================================================== */}
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

        {/* ========================================================
            USUARIOS (igual que antes, ya tiene edit/delete)
            ======================================================== */}
        {activeTab === "usuarios" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
              <button
                onClick={() => {
                  setShowUserForm(!showUserForm);
                  setUserError(null);
                }}
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
                onCancel={() => {
                  setShowUserForm(false);
                  setUserError(null);
                }}
                loading={userLoading}
                error={userError}
              />
            )}

            {userError && !showUserForm && (
              <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-lg text-red-800">
                ❌ {userError}
              </div>
            )}

            {/* TABLA DE USUARIOS */}
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
                          <button
                            onClick={() => handleEditClick(user)}
                            className="text-blue-600 hover:text-blue-800 transition inline-flex items-center gap-1"
                            title="Editar usuario"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="text-red-600 hover:text-red-800 transition inline-flex items-center gap-1"
                            title="Eliminar usuario"
                          >
                            <Trash2 size={18} />
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

      {/* ========================================================
          MODAL DE EDICIÓN DE USUARIO
          ======================================================== */}
      {showEditModal && editingUserData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Editar Usuario</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setUserError(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {userError && (
              <div className="mb-4 bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">
                {userError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={editingUserData.nombre}
                  onChange={(e) =>
                    setEditingUserData({
                      ...editingUserData,
                      nombre: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editingUserData.email}
                  onChange={(e) =>
                    setEditingUserData({
                      ...editingUserData,
                      email: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={editingUserData.rol}
                  onChange={(e) =>
                    setEditingUserData({
                      ...editingUserData,
                      rol: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="asistente">Asistente</option>
                  <option value="expositor">Expositor</option>
                  <option value="speaker">Speaker</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Pase
                </label>
                <select
                  value={editingUserData.tipo_pase}
                  onChange={(e) =>
                    setEditingUserData({
                      ...editingUserData,
                      tipo_pase: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="vip">VIP</option>
                  <option value="speaker">Speaker</option>
                  <option value="expositor">Expositor</option>
                  <option value="curso">Curso</option>
                  <option value="sesiones">Sesiones</option>
                  <option value="combo">Combo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sede
                </label>
                <select
                  value={editingUserData.sede}
                  onChange={(e) =>
                    setEditingUserData({
                      ...editingUserData,
                      sede: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="chile">Chile</option>
                  <option value="mexico">México</option>
                  <option value="colombia">Colombia</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <input
                  type="text"
                  value={editingUserData.empresa}
                  onChange={(e) =>
                    setEditingUserData({
                      ...editingUserData,
                      empresa: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveEdit}
                disabled={userLoading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {userLoading ? "Guardando..." : "Guardar Cambios"}
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setUserError(null);
                }}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DE CONFIRMACIÓN DE ELIMINACIÓN
          ======================================================== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <h2 className="text-xl font-bold">Confirmar Eliminación</h2>
            </div>

            <p className="text-gray-700 mb-6">
              ¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleConfirmDelete}
                disabled={userLoading}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
              >
                {userLoading ? "Eliminando..." : "Sí, Eliminar"}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingUserId(null);
                }}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================================
// FORMULARIOS
// ========================================================

function SessionForm({ formData, onChange, onSubmit, onCancel, loading, isEditing }) {
  return (
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4 mb-6 border-l-4 border-blue-600">
      <h3 className="text-xl font-bold">
        {isEditing ? "✏️ Editar Sesión" : "Nueva Sesión"}
      </h3>

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
          {loading ? "Guardando..." : isEditing ? "Guardar Cambios" : "Guardar"}
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

function ExpositorForm({ formData, onChange, onSubmit, onCancel, loading, isEditing }) {
  return (
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4 mb-6 border-l-4 border-green-600">
      <h3 className="text-xl font-bold">
        {isEditing ? "✏️ Editar Expositor" : "Nuevo Expositor"}
      </h3>

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
          {loading ? "Guardando..." : isEditing ? "Guardar Cambios" : "Guardar"}
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