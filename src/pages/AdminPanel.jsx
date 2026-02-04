import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API from '../services/api';
import { Bell } from 'lucide-react';
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Calendar,
  Building2,
  FileText,
  Save,
  X
} from 'lucide-react';

export default function AdminPanel() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessions, setSessions] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [exhibitors, setExhibitors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.rol !== 'super_admin') {
      setLoading(false);
      return;
    }
    loadData();
  }, [activeTab, userProfile]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'sessions') {
        // ✅ CORREGIDO: Se eliminó la letra "v" suelta
        const res = await API.get('/agenda/sessions');
        console.log('📊 Admin Panel - Sesiones:', res.data);
        
        setSessions(res.data.sessions || res.data || []);

        // También cargar speakers para el formulario
        const sp = await API.get('/speakers');
        setSpeakers(sp.data || []);
      }

      if (activeTab === 'speakers') {
        const res = await API.get('/speakers');
        setSpeakers(res.data || []);
      }

      if (activeTab === 'exhibitors') {
        const res = await API.get('/expositores');
        setExhibitors(res.data || []);
      }

    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
      alert(`Error al cargar datos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'sessions', label: 'Sesiones', icon: Calendar },
    { id: 'speakers', label: 'Speakers', icon: Users },
    { id: 'exhibitors', label: 'Expositores', icon: Building2 },
    { id: 'surveys', label: 'Encuestas', icon: FileText },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell }
  ];

  if (!userProfile) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-600">
        Cargando perfil...
      </div>
    );
  }

  if (userProfile.rol !== 'super_admin') {
    return (
      <div className="p-8 bg-red-50 text-red-600 rounded-xl shadow-sm text-center">
        <h2 className="text-2xl font-bold mb-2">Acceso restringido</h2>
        <p>Solo los administradores pueden acceder al Panel de Administración.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Panel de Administración</h1>
        <p className="text-gray-600 mt-1">Bienvenido, {userProfile?.nombre}</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setShowForm(false);
                setEditingItem(null);
              }}
              className={`px-6 py-2 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando datos...</p>
          </div>
        ) : (
          <>
            {activeTab === 'sessions' && (
              <SessionsManager
                sessions={sessions}
                speakers={speakers}
                showForm={showForm}
                setShowForm={setShowForm}
                editingItem={editingItem}
                setEditingItem={setEditingItem}
                onReload={loadData}
              />
            )}
            {activeTab === 'speakers' && (
              <SpeakersManager
                speakers={speakers}
                showForm={showForm}
                setShowForm={setShowForm}
                editingItem={editingItem}
                setEditingItem={setEditingItem}
                onReload={loadData}
              />
            )}
            {activeTab === 'exhibitors' && (
              <ExhibitorsManager 
                exhibitors={exhibitors}
                showForm={showForm}
                setShowForm={setShowForm}
                onReload={loadData}
              />
            )}
            {activeTab === 'surveys' && (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-bold mb-2">Gestor de Encuestas</h3>
                <p className="text-gray-600">Sección en desarrollo</p>
              </div>
            )}

            {activeTab === 'notificaciones' && (
              <AdminNotifications />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===== SESSIONS MANAGER =====
function SessionsManager({ sessions, speakers, showForm, setShowForm, editingItem, setEditingItem, onReload }) {
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    dia: 'lunes',
    horaInicio: '',
    horaFin: '',
    sala: '',
    tipo: 'spark',
    sede: 'chile',
    edicion: 2025,
    speakerId: '',
    speakerNombre: ''
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        titulo: editingItem.titulo || '',
        descripcion: editingItem.descripcion || '',
        dia: editingItem.dia || 'lunes',
        horaInicio: editingItem.horaInicio || '',
        horaFin: editingItem.horaFin || '',
        sala: editingItem.sala || '',
        tipo: editingItem.tipo || 'spark',
        sede: editingItem.sede || 'chile',
        edicion: editingItem.edicion || 2025,
        speakerId: editingItem.speakerId || '',
        speakerNombre: editingItem.speakerNombre || ''
      });
      setShowForm(true);
    }
  }, [editingItem, setShowForm]);

  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      dia: 'lunes',
      horaInicio: '',
      horaFin: '',
      sala: '',
      tipo: 'spark',
      sede: 'chile',
      edicion: 2025,
      speakerId: '',
      speakerNombre: ''
    });
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingItem?.id) {
        await API.put(`/agenda/sessions/${editingItem.id}`, formData);
        alert('✅ Sesión actualizada');
      } else {
        await API.post('/agenda/sessions', formData);
        alert('✅ Sesión creada');
      }

      resetForm();
      setShowForm(false);
      onReload();

    } catch (error) {
      console.error('Error guardando sesión:', error);
      alert(`❌ Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta sesión?')) return;
    
    try {
      await API.delete(`/agenda/sessions/${id}`);
      alert('✅ Sesión eliminada');
      onReload();
    } catch (error) {
      console.error('Error:', error);
      alert(`❌ Error: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Sesiones ({sessions.length})</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            resetForm();
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          {showForm ? <X size={20} /> : <Plus size={20} />}
          {showForm ? 'Cancelar' : 'Nueva Sesión'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Título *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.titulo}
                onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo *</label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.tipo}
                onChange={e => setFormData({ ...formData, tipo: e.target.value })}
              >
                <option value="spark">Spark</option>
                <option value="toolbox">Toolbox</option>
                <option value="brujula">Brújula</option>
                <option value="orion">Orión</option>
                <option value="curso">Curso</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sede *</label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.sede}
                onChange={e => setFormData({ ...formData, sede: e.target.value })}
              >
                <option value="chile">Chile</option>
                <option value="mexico">México</option>
                <option value="colombia">Colombia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Edición *</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.edicion}
                onChange={e => setFormData({ ...formData, edicion: parseInt(e.target.value) })}
                min="2020"
                max="2030"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                value={formData.descripcion}
                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Día</label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.dia}
                onChange={e => setFormData({ ...formData, dia: e.target.value })}
              >
                <option value="">Sin asignar</option>
                <option value="lunes">Lunes</option>
                <option value="martes">Martes</option>
                <option value="miercoles">Miércoles</option>
                <option value="jueves">Jueves</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sala</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.sala}
                onChange={e => setFormData({ ...formData, sala: e.target.value })}
                placeholder="Ej: Sala Principal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Hora Inicio</label>
              <input
                type="time"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.horaInicio}
                onChange={e => setFormData({ ...formData, horaInicio: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Hora Fin</label>
              <input
                type="time"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.horaFin}
                onChange={e => setFormData({ ...formData, horaFin: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Speaker</label>
              <select
                value={formData.speakerId}
                onChange={e => {
                  const selected = speakers.find(s => s.id === parseInt(e.target.value));
                  setFormData({
                    ...formData,
                    speakerId: selected?.id || '',
                    speakerNombre: selected?.nombre || ''
                  });
                }}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">-- Sin speaker asignado --</option>
                {speakers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button 
              type="submit" 
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Save size={20} /> {editingItem ? 'Actualizar' : 'Guardar'}
            </button>
            <button 
              type="button" 
              onClick={() => { setShowForm(false); resetForm(); }} 
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No hay sesiones creadas</p>
        ) : (
          sessions.map(s => (
            <div key={s.id} className="flex justify-between items-center border p-4 rounded-lg hover:bg-gray-50">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded font-medium">
                    {s.tipo?.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    {s.sede} {s.edicion}
                  </span>
                </div>
                <h3 className="font-bold text-lg">{s.titulo}</h3>
                {s.speakerNombre && (
                  <p className="text-sm text-gray-600 mt-1">
                    <Users size={14} className="inline mr-1" />
                    Speaker: {s.speakerNombre}
                  </p>
                )}
                {(s.dia || s.sala || s.horaInicio) && (
                  <p className="text-sm text-gray-500 mt-1">
                    {s.dia && `${s.dia} • `}
                    {s.horaInicio && `${s.horaInicio} - ${s.horaFin} • `}
                    {s.sala}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingItem(s)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
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
  );
}

// ===== SPEAKERS MANAGER =====
function SpeakersManager({ speakers, showForm, setShowForm, editingItem, setEditingItem, onReload }) {
  const [form, setForm] = useState({
    nombre: '',
    empresa: '',
    puesto: '',
    bio: '',
    foto: ''
  });

  useEffect(() => {
    if (editingItem) {
      setForm({
        nombre: editingItem.nombre || '',
        empresa: editingItem.empresa || '',
        puesto: editingItem.puesto || '',
        bio: editingItem.bio || '',
        foto: editingItem.foto || ''
      });
      setShowForm(true);
    }
  }, [editingItem, setShowForm]);

  const resetForm = () => {
    setForm({ nombre: '', empresa: '', puesto: '', bio: '', foto: '' });
    setEditingItem(null);
  };

  const handleSubmit = async e => {
    e.preventDefault();

    try {
      if (editingItem?.id) {
        await API.put(`/speakers/${editingItem.id}`, form);
        alert('✅ Speaker actualizado');
      } else {
        await API.post('/speakers', form);
        alert('✅ Speaker creado');
      }
      resetForm();
      setShowForm(false);
      onReload();
    } catch (e) {
      console.error(e);
      alert(`❌ Error: ${e.response?.data?.error || e.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar speaker?')) return;
    try {
      await API.delete(`/speakers/${id}`);
      alert('✅ Speaker eliminado');
      onReload();
    } catch (e) {
      console.error(e);
      alert(`❌ Error: ${e.response?.data?.error || e.message}`);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Speakers ({speakers.length})</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            resetForm();
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          {showForm ? <X size={20} /> : <Plus size={20} />}
          {showForm ? 'Cancelar' : 'Nuevo Speaker'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Empresa</label>
              <input
                type="text"
                value={form.empresa}
                onChange={e => setForm({ ...form, empresa: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Puesto</label>
              <input
                type="text"
                value={form.puesto}
                onChange={e => setForm({ ...form, puesto: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Foto (URL)</label>
              <input
                type="url"
                value={form.foto}
                onChange={e => setForm({ ...form, foto: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Bio</label>
              <textarea
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg flex items-center gap-2">
              <Save size={20} /> Guardar
            </button>
            <button
              type="button"
              onClick={() => { resetForm(); setShowForm(false); }}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {speakers.length === 0 && (
          <p className="text-gray-500 text-center py-8">No hay speakers</p>
        )}
        {speakers.map(s => (
          <div key={s.id} className="flex justify-between items-center border p-4 rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                {s.foto ? (
                  <img src={s.foto} alt={s.nombre} className="w-full h-full object-cover" />
                ) : (
                  <Users size={28} className="text-gray-300" />
                )}
              </div>
              <div>
                <h3 className="font-bold">{s.nombre}</h3>
                <p className="text-sm text-gray-600">{s.puesto} — {s.empresa}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingItem(s)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== EXHIBITORS MANAGER =====
function ExhibitorsManager({ exhibitors }) {
  return (
    <div className="text-center py-12">
      <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
      <h3 className="text-xl font-bold mb-2">Gestor de Expositores</h3>
      <p className="text-gray-600">En desarrollo ({exhibitors.length} expositores)</p>
    </div>
  );
}

// ===== ADMIN NOTIFICATIONS =====
function AdminNotifications() {
  const [form, setForm] = useState({
    titulo: '',
    mensaje: '',
    tipo: 'info',
    rol: 'asistente',
    sede: '',
    enviarAhora: true,
  });

  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSending(true);

      await API.post('/notificaciones/admin', form);

      alert('✅ Notificación enviada');
      setForm({
        titulo: '',
        mensaje: '',
        tipo: 'info',
        rol: 'asistente',
        sede: '',
        enviarAhora: true,
      });

    } catch (err) {
      console.error(err);
      alert('❌ Error enviando notificación');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Bell /> Enviar notificación
      </h2>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-50 p-6 rounded-lg space-y-4"
      >
        <div>
          <label className="block text-sm mb-1">Título *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-lg"
            value={form.titulo}
            onChange={(e) =>
              setForm({ ...form, titulo: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Mensaje *</label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 border rounded-lg"
            value={form.mensaje}
            onChange={(e) =>
              setForm({ ...form, mensaje: e.target.value })
            }
            required
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Tipo</label>
            <select
              className="w-full px-3 py-2 border rounded-lg"
              value={form.tipo}
              onChange={(e) =>
                setForm({ ...form, tipo: e.target.value })
              }
            >
              <option value="info">Info</option>
              <option value="alerta">Alerta</option>
              <option value="sistema">Sistema</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Rol destino</label>
            <select
              className="w-full px-3 py-2 border rounded-lg"
              value={form.rol}
              onChange={(e) =>
                setForm({ ...form, rol: e.target.value })
              }
            >
              <option value="asistente">Asistentes</option>
              <option value="staff">Staff</option>
              <option value="speaker">Speakers</option>
              <option value="expositor">Expositores</option>
              <option value="super_admin">Admins</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">
              Sede (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. CDMX"
              className="w-full px-3 py-2 border rounded-lg"
              value={form.sede}
              onChange={(e) =>
                setForm({ ...form, sede: e.target.value })
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="submit"
            disabled={sending}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Bell size={18} />
            {sending ? 'Enviando...' : 'Enviar notificación'}
          </button>
        </div>
      </form>
    </div>
  );
}