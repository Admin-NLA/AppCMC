// ============================================================
// FRONTEND: src/pages/AdminPanel.jsx (CORREGIDO)
// FIX: Carga speakers correctamente, notificaciones funcionan
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API from '../services/api';
import {
  Users, Calendar, Bell, Send, CheckCircle, AlertCircle,
  Loader, X, UserPlus, Edit, Trash2, Eye
} from 'lucide-react';

export default function AdminPanel() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('speakers'); // 'speakers' | 'notificaciones'
  
  // Speakers
  const [speakers, setSpeakers] = useState([]);
  const [loadingSpeakers, setLoadingSpeakers] = useState(false);
  
  // Notificaciones
  const [notificationForm, setNotificationForm] = useState({
    titulo: '',
    mensaje: '',
    usuarios: 'todos', // 'todos' | 'asistentes' | 'speakers' | 'expositores' | 'custom'
    usuariosCustom: []
  });
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationSuccess, setNotificationSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activeTab === 'speakers') {
      loadSpeakers();
    }
  }, [activeTab]);

  // ============================================================
  // SPEAKERS FUNCTIONS
  // ============================================================
  const loadSpeakers = async () => {
    try {
      setLoadingSpeakers(true);
      setError(null);
      console.log('🎤 [AdminPanel] Cargando speakers...');
      
      const res = await API.get('/speakers');
      console.log('📦 [AdminPanel] Respuesta speakers:', res.data);
      
      // FIX: Manejar diferentes formatos de respuesta
      const speakersData = Array.isArray(res.data) 
        ? res.data 
        : (res.data.speakers || []);
      
      setSpeakers(speakersData);
      console.log(`✅ [AdminPanel] ${speakersData.length} speakers cargados`);
    } catch (err) {
      console.error('❌ [AdminPanel] Error cargando speakers:', err);
      setError('Error al cargar speakers');
    } finally {
      setLoadingSpeakers(false);
    }
  };

  const handleDeleteSpeaker = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este speaker?')) return;
    
    try {
      console.log(`🗑️ [AdminPanel] Eliminando speaker: ${id}`);
      await API.delete(`/speakers/${id}`);
      console.log('✅ [AdminPanel] Speaker eliminado');
      loadSpeakers();
    } catch (err) {
      console.error('❌ [AdminPanel] Error eliminando speaker:', err);
      setError('Error al eliminar speaker');
    }
  };

  // ============================================================
  // NOTIFICACIONES FUNCTIONS
  // ============================================================
  const handleSendNotification = async (e) => {
    e.preventDefault();
    
    try {
      setSendingNotification(true);
      setError(null);
      setNotificationSuccess(false);
      
      console.log('📨 [AdminPanel] Enviando notificación...');
      
      // Validaciones
      if (!notificationForm.titulo || !notificationForm.titulo.trim()) {
        setError('El título es requerido');
        return;
      }
      
      if (!notificationForm.mensaje || !notificationForm.mensaje.trim()) {
        setError('El mensaje es requerido');
        return;
      }
      
      if (notificationForm.usuarios === 'custom' && notificationForm.usuariosCustom.length === 0) {
        setError('Debes seleccionar al menos un usuario');
        return;
      }
      
      // Preparar payload
      const payload = {
        titulo: notificationForm.titulo.trim(),
        mensaje: notificationForm.mensaje.trim(),
        tipo_destinatario: notificationForm.usuarios,
        usuarios_ids: notificationForm.usuarios === 'custom' 
          ? notificationForm.usuariosCustom 
          : []
      };
      
      console.log('📦 [AdminPanel] Payload notificación:', payload);
      
      // Enviar al backend
      await API.post('/notificaciones/broadcast', payload);
      
      console.log('✅ [AdminPanel] Notificación enviada');
      
      setNotificationSuccess(true);
      
      // Limpiar formulario
      setNotificationForm({
        titulo: '',
        mensaje: '',
        usuarios: 'todos',
        usuariosCustom: []
      });
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setNotificationSuccess(false), 3000);
    } catch (err) {
      console.error('❌ [AdminPanel] Error enviando notificación:', err);
      setError(err.response?.data?.error || 'Error al enviar notificación');
    } finally {
      setSendingNotification(false);
    }
  };

  // Verificar permisos
  if (!['super_admin', 'staff'].includes(userProfile?.rol)) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto mb-3 text-yellow-600" size={48} />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Acceso Restringido
          </h2>
          <p className="text-gray-700">
            Solo administradores y staff pueden acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ⚙️ Panel de Administración
        </h1>
        <p className="text-gray-600">
          Gestiona speakers, notificaciones y más
        </p>
      </div>

      {/* Mensajes globales */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
            <span className="text-red-800 font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('speakers')}
            className={`pb-3 px-1 font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'speakers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users size={20} />
            Speakers
          </button>
          <button
            onClick={() => setActiveTab('notificaciones')}
            className={`pb-3 px-1 font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'notificaciones'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bell size={20} />
            Notificaciones
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'speakers' && (
          <div>
            {/* Header de Speakers */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Lista de Speakers
              </h2>
              <button
                onClick={loadSpeakers}
                disabled={loadingSpeakers}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                {loadingSpeakers ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    Cargando...
                  </>
                ) : (
                  <>
                    <Users size={16} />
                    Recargar
                  </>
                )}
              </button>
            </div>

            {/* Lista de Speakers */}
            {loadingSpeakers && speakers.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <Loader className="animate-spin text-blue-600" size={48} />
              </div>
            ) : speakers.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Users className="mx-auto mb-4 text-gray-400" size={64} />
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  No hay speakers registrados
                </p>
                <p className="text-gray-500">
                  Agrega speakers desde la sección correspondiente
                </p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                        Nombre
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                        Email
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                        Organización
                      </th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {speakers.map((speaker) => (
                      <tr key={speaker.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {speaker.avatar && (
                              <img
                                src={speaker.avatar}
                                alt={speaker.nombre}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {speaker.nombre}
                              </p>
                              <p className="text-sm text-gray-500">
                                {speaker.cargo || 'Sin cargo'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {speaker.email || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {speaker.organizacion || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDeleteSpeaker(speaker.id)}
                              className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notificaciones' && (
          <div className="max-w-3xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Enviar Notificación
            </h2>

            {notificationSuccess && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="text-green-600" size={24} />
                <span className="text-green-800 font-medium">
                  ✅ Notificación enviada exitosamente
                </span>
              </div>
            )}

            <form onSubmit={handleSendNotification} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    required
                    value={notificationForm.titulo}
                    onChange={(e) => setNotificationForm({
                      ...notificationForm,
                      titulo: e.target.value
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Actualización importante del evento"
                    disabled={sendingNotification}
                  />
                </div>

                {/* Mensaje */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mensaje *
                  </label>
                  <textarea
                    required
                    rows="4"
                    value={notificationForm.mensaje}
                    onChange={(e) => setNotificationForm({
                      ...notificationForm,
                      mensaje: e.target.value
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Escribe el mensaje de la notificación..."
                    disabled={sendingNotification}
                  />
                </div>

                {/* Destinatarios */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Destinatarios
                  </label>
                  <select
                    value={notificationForm.usuarios}
                    onChange={(e) => setNotificationForm({
                      ...notificationForm,
                      usuarios: e.target.value
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={sendingNotification}
                  >
                    <option value="todos">Todos los usuarios</option>
                    <option value="asistentes">Solo asistentes</option>
                    <option value="speakers">Solo speakers</option>
                    <option value="expositores">Solo expositores</option>
                    <option value="staff">Solo staff</option>
                  </select>
                </div>

                {/* Botón enviar */}
                <button
                  type="submit"
                  disabled={sendingNotification}
                  className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sendingNotification ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      Enviar Notificación
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}