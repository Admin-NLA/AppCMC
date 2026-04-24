import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import API from "../services/api";
import {
  Plus, Edit2, Trash2, X, AlertCircle, Search, RefreshCw
} from "lucide-react";

// Roles reales del sistema
const ROLES = [
  { value: "asistente_general", label: "Asistente General" },
  { value: "asistente_curso", label: "Asistente Curso" },
  { value: "asistente_sesiones", label: "Asistente Sesiones" },
  { value: "asistente_combo", label: "Asistente Combo" },
  { value: "expositor", label: "Expositor" },
  { value: "speaker", label: "Speaker" },
  { value: "staff", label: "Staff" },
  { value: "super_admin", label: "Super Admin" },
];

const TIPOS_PASE = [
  { value: "general", label: "General" },
  { value: "curso", label: "Curso" },
  { value: "sesiones", label: "Sesiones" },
  { value: "combo", label: "Combo" },
  { value: "expositor", label: "Expositor" },
  { value: "speaker", label: "Speaker" },
  { value: "staff", label: "Staff" },
];

const SEDES = [
  { value: "chile", label: "Chile" },
  { value: "mexico", label: "México" },
  { value: "colombia", label: "Colombia" },
];

const ROL_COLORS = {
  super_admin: "bg-red-100 text-red-800",
  staff: "bg-purple-100 text-purple-800",
  speaker: "bg-yellow-100 text-yellow-800",
  expositor: "bg-blue-100 text-blue-800",
  asistente_combo: "bg-green-100 text-green-800",
  asistente_general: "bg-gray-100 text-gray-800",
  asistente_curso: "bg-orange-100 text-orange-800",
  asistente_sesiones: "bg-teal-100 text-teal-800",
};

const EMPTY_FORM = {
  email: "", password: "", nombre: "",
  rol: "asistente_general", tipo_pase: "general",
  sedes: ["colombia"],  // multi-sede: array de sedes
  sede: "colombia",     // sede principal (primera del array)
  edicion: 2026,
  empresa: "", telefono: "",
};

export default function UsuariosPanel() {
  const { userProfile } = useAuth();
  const rol = userProfile?.rol;
  const esSuperAdmin = rol === "super_admin";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroSede, setFiltroSede] = useState("");
  const [filtroRol, setFiltroRol] = useState("");

  // Crear
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  // Editar
  const [editingUser, setEditingUser] = useState(null);
  const [editData, setEditData] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  // Eliminar
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Papelera
  const [papelera, setPapelera] = useState([]);
  const [showPapelera, setShowPapelera] = useState(false);
  const [loadingPapelera, setLoadingPapelera] = useState(false);

  // --------------------------------------------------------
  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get("/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudieron cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  // --------------------------------------------------------
  // CREAR
  // --------------------------------------------------------
  const handleCreate = async () => {
    if (!formData.email || !formData.password || !formData.nombre) {
      setFormError("Email, contraseña y nombre son requeridos");
      return;
    }
    if (formData.password.length < 8) {
      setFormError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    try {
      setFormLoading(true);
      setFormError(null);
      await API.post("/users", formData);
      setShowForm(false);
      setFormData(EMPTY_FORM);
      showSuccess("Usuario creado correctamente ✅");
      loadUsers();
    } catch (err) {
      setFormError(err.response?.data?.error || err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // --------------------------------------------------------
  // EDITAR
  // --------------------------------------------------------
  const openEdit = (user) => {
    setEditingUser(user);
    setEditData({
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      tipo_pase: user.tipo_pase,
      sede: user.sede || user.sedes?.[0] || "colombia",
      sedes: user.sedes || [user.sede || "colombia"],
      edicion: user.edicion || 2026,
      empresa: user.empresa || "",
    });
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editData.nombre || !editData.email) {
      setEditError("Nombre y email son requeridos");
      return;
    }
    try {
      setEditLoading(true);
      setEditError(null);
      await API.put(`/users/${editingUser.id}`, editData);
      setEditingUser(null);
      showSuccess("Usuario actualizado correctamente ✅");
      loadUsers();
    } catch (err) {
      setEditError(err.response?.data?.error || err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // --------------------------------------------------------
  // ELIMINAR
  // --------------------------------------------------------
  const handleRestaurar = async (user) => {
    if (!confirm(`¿Restaurar a ${user.nombre}? Volverá a estar activo en la app.`)) return;
    try {
      await API.post(`/users/${user.id}/restaurar`);
      showSuccess(`${user.nombre} restaurado ✅`);
      loadUsers(); loadPapelera();
    } catch (err) { setError(err.response?.data?.error || 'Error al restaurar'); }
  };

  const handleEliminarPermanente = async (user) => {
    if (!confirm(`⚠️ ELIMINAR PERMANENTEMENTE a ${user.nombre}?\n\nSe borrarán TODOS sus datos. Esta acción NO se puede deshacer.`)) return;
    if (!confirm('Última confirmación: ¿estás seguro?')) return;
    try {
      await API.delete(`/users/${user.id}/permanente`);
      showSuccess(`${user.nombre} eliminado permanentemente`);
      loadPapelera();
    } catch (err) { setError(err.response?.data?.error || 'Error al eliminar'); }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      await API.delete(`/users/${deletingUser.id}`);
      setDeletingUser(null);
      showSuccess("Usuario eliminado correctamente ✅");
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // --------------------------------------------------------
  // FILTROS
  // --------------------------------------------------------
  const usuariosFiltrados = users.filter((u) => {
    const texto = busqueda.toLowerCase();
    const coincideTexto =
      !texto ||
      u.nombre?.toLowerCase().includes(texto) ||
      u.email?.toLowerCase().includes(texto) ||
      u.empresa?.toLowerCase().includes(texto);
    const coincideSede = !filtroSede || u.sede === filtroSede;
    const coincideRol = !filtroRol || u.rol === filtroRol;
    return coincideTexto && coincideSede && coincideRol;
  });

  // --------------------------------------------------------
  // GUARD: solo super_admin y staff pueden entrar
  // --------------------------------------------------------
  if (rol !== "super_admin" && rol !== "staff") {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg m-6">
        <AlertCircle className="inline mr-2 text-red-600" />
        <span className="text-red-800 font-semibold">Sin permisos para ver esta sección</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">
            {users.length} usuario{users.length !== 1 ? "s" : ""} registrado{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadUsers}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
            title="Recargar"
          >
            <RefreshCw size={18} />
          </button>
          {esSuperAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => { setShowPapelera(p => !p); loadPapelera(); }}
                className="flex items-center gap-2 border border-red-200 text-red-500 px-4 py-2 rounded-lg hover:bg-red-50 transition font-semibold"
              >
                <Trash2 size={18} />
                Papelera
                {papelera.length > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-bold ml-1">
                    {papelera.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setShowForm(true); setFormError(null); }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={18} />
                Crear Usuario
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mensajes */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 p-3 rounded-lg text-green-800 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 p-3 rounded-lg text-red-800 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o empresa..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={filtroSede}
          onChange={(e) => setFiltroSede(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todas las sedes</option>
          {SEDES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todos los roles</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-600 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Rol</th>
                <th className="px-4 py-3 text-left">Tipo Pase</th>
                <th className="px-4 py-3 text-left">Sede</th>
                <th className="px-4 py-3 text-left">Empresa</th>
                {esSuperAdmin && <th className="px-4 py-3 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={esSuperAdmin ? 7 : 6} className="px-4 py-8 text-center text-gray-400">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={esSuperAdmin ? 7 : 6} className="px-4 py-8 text-center text-gray-400">
                    {busqueda || filtroSede || filtroRol ? "No hay usuarios con esos filtros" : "No hay usuarios registrados"}
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium">{user.nombre}</td>
                    <td className="px-4 py-3 text-blue-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${ROL_COLORS[user.rol] || "bg-gray-100 text-gray-700"}`}>
                        {user.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.tipo_pase}</td>
                    <td className="px-4 py-3 capitalize">{user.sede}</td>
                    <td className="px-4 py-3 text-gray-500">{user.empresa || "—"}</td>
                    {esSuperAdmin && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEdit(user)}
                            className="text-blue-600 hover:text-blue-800 p-1 transition"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeletingUser(user)}
                            className="text-red-500 hover:text-red-700 p-1 transition"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {usuariosFiltrados.length > 0 && (
          <div className="px-4 py-2 border-t text-xs text-gray-400">
            Mostrando {usuariosFiltrados.length} de {users.length} usuarios
          </div>
        )}
      </div>

      {/* ======================================================
          MODAL: CREAR USUARIO
          ====================================================== */}
      {showForm && (
        <Modal title="Crear Nuevo Usuario" onClose={() => setShowForm(false)}>
          {formError && <ErrorBox msg={formError} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre completo *">
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className={inputCls}
                placeholder="Ej: María González"
              />
            </Field>
            <Field label="Email *">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputCls}
                placeholder="usuario@email.com"
              />
            </Field>
            <Field label="Contraseña * (mín. 8 caracteres)">
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={inputCls}
                placeholder="••••••••"
              />
            </Field>
            <Field label="Teléfono">
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className={inputCls}
                placeholder="+56 9 1234 5678"
              />
            </Field>
            <Field label="Empresa">
              <input
                type="text"
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                className={inputCls}
                placeholder="Nombre de la empresa"
              />
            </Field>
            <Field label="Sedes (puede seleccionar varias)">
              <div className="flex flex-wrap gap-2 mt-1">
                {SEDES.map((s) => {
                  const checked = (formData.sedes || [formData.sede]).includes(s.value);
                  return (
                    <label key={s.value} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 cursor-pointer text-sm font-semibold transition ${checked ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                      <input type="checkbox" className="hidden" checked={checked} onChange={() => {
                        const curr = formData.sedes || [formData.sede];
                        const next = checked ? curr.filter(x => x !== s.value) : [...curr, s.value];
                        setFormData({ ...formData, sedes: next.length ? next : [s.value], sede: next[0] || s.value });
                      }} />
                      {s.label}
                    </label>
                  );
                })}
              </div>
            </Field>
            <Field label="Edición (año)">
              <input type="number" value={formData.edicion || 2026} min="2020" max="2035"
                onChange={(e) => setFormData({ ...formData, edicion: parseInt(e.target.value) || 2026 })}
                className={inputCls} placeholder="2026" />
            </Field>
            <Field label="Rol">
              <select value={formData.rol} onChange={(e) => setFormData({ ...formData, rol: e.target.value })} className={inputCls}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Tipo de Pase">
              <select value={formData.tipo_pase} onChange={(e) => setFormData({ ...formData, tipo_pase: e.target.value })} className={inputCls}>
                {TIPOS_PASE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleCreate}
              disabled={formLoading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-semibold"
            >
              {formLoading ? "Creando..." : "Crear Usuario"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {/* ======================================================
          MODAL: EDITAR USUARIO
          ====================================================== */}
      {editingUser && editData && (
        <Modal title="Editar Usuario" onClose={() => setEditingUser(null)}>
          {editError && <ErrorBox msg={editError} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre *">
              <input
                type="text"
                value={editData.nombre}
                onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Email *">
              <input
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Empresa">
              <input
                type="text"
                value={editData.empresa}
                onChange={(e) => setEditData({ ...editData, empresa: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Sede">
              <div className="flex flex-wrap gap-2 mt-1">
                {SEDES.map((s) => {
                  const curr = editData.sedes || [editData.sede];
                  const checked = curr.includes(s.value);
                  return (
                    <label key={s.value} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 cursor-pointer text-sm font-semibold transition ${checked ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                      <input type="checkbox" className="hidden" checked={checked} onChange={() => {
                        const next = checked ? curr.filter(x => x !== s.value) : [...curr, s.value];
                        setEditData({ ...editData, sedes: next.length ? next : [s.value], sede: next[0] || s.value });
                      }} />
                      {s.label}
                    </label>
                  );
                })}
              </div>
            </Field>
            <Field label="Rol">
              <select value={editData.rol} onChange={(e) => setEditData({ ...editData, rol: e.target.value })} className={inputCls}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Tipo de Pase">
              <select value={editData.tipo_pase} onChange={(e) => setEditData({ ...editData, tipo_pase: e.target.value })} className={inputCls}>
                {TIPOS_PASE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSaveEdit}
              disabled={editLoading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-semibold"
            >
              {editLoading ? "Guardando..." : "Guardar Cambios"}
            </button>
            <button
              onClick={() => setEditingUser(null)}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {/* ======================================================
          MODAL: CONFIRMAR ELIMINACIÓN
          ====================================================== */}
      {deletingUser && (
        <Modal title="Confirmar Eliminación" onClose={() => setDeletingUser(null)}>
          <div className="flex items-start gap-3 mb-6">
            <div className="bg-red-100 p-2 rounded-full shrink-0">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="font-semibold text-gray-800">¿Eliminar a {deletingUser.nombre}?</p>
              <p className="text-sm text-gray-500 mt-1">
                {deletingUser.email} · {deletingUser.rol} · {deletingUser.sede}
              </p>
              <p className="text-sm text-red-600 mt-2">
                Esta acción desactivará la cuenta. No podrá iniciar sesión.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition font-semibold"
            >
              {deleteLoading ? "Eliminando..." : "Sí, eliminar"}
            </button>
            <button
              onClick={() => setDeletingUser(null)}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════
          PAPELERA DE USUARIOS
          ══════════════════════════════════════════════════ */}
      {showPapelera && esSuperAdmin && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-red-200 dark:border-red-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-100 dark:border-red-800 flex items-center justify-between bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-2">
              <Trash2 size={18} className="text-red-500" />
              <h3 className="font-bold text-red-800 dark:text-red-300">
                Papelera de Usuarios ({papelera.length})
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <Clock size={13} />
              Los usuarios se eliminan permanentemente tras 30 días
            </div>
          </div>

          {loadingPapelera ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-red-400" size={24} />
            </div>
          ) : papelera.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Trash2 size={36} className="mx-auto mb-2 opacity-30" />
              <p className="font-semibold">Papelera vacía</p>
              <p className="text-sm mt-1">No hay usuarios eliminados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {["Nombre", "Email", "Rol", "Sede", "Eliminado el", "Acciones"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {papelera.map(user => {
                    const diasRestantes = user.fecha_eliminado
                      ? Math.max(0, 30 - Math.floor((Date.now() - new Date(user.fecha_eliminado)) / (1000 * 60 * 60 * 24)))
                      : null;
                    return (
                      <tr key={user.id} className="hover:bg-red-50/50 dark:hover:bg-red-900/10 transition">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.nombre}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full capitalize">
                            {user.rol}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 capitalize">{user.sede || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-500">
                            {user.fecha_eliminado
                              ? new Date(user.fecha_eliminado).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })
                              : "—"}
                          </div>
                          {diasRestantes !== null && (
                            <div className={`text-xs font-semibold mt-0.5 ${diasRestantes <= 7 ? "text-red-500" : "text-gray-400"}`}>
                              {diasRestantes > 0 ? `Se elimina en ${diasRestantes} día${diasRestantes !== 1 ? "s" : ""}` : "Pendiente de eliminar"}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRestaurar(user)}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 font-semibold transition"
                              title="Restaurar usuario"
                            >
                              <RotateCcw size={13} /> Restaurar
                            </button>
                            <button
                              onClick={() => handleEliminarPermanente(user)}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-semibold transition"
                              title="Eliminar permanentemente"
                            >
                              <Trash2 size={13} /> Eliminar definitivo
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Componentes auxiliares
// ============================================================

const inputCls = "w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div className="mb-4 bg-red-50 border border-red-200 p-3 rounded-lg text-sm text-red-800">
      ❌ {msg}
    </div>
  );
}