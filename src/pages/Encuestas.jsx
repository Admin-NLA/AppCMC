// ============================================================
// FRONTEND: src/pages/Encuestas.jsx
// Sistema híbrido de encuestas con Zoho Forms
// SIN iframes - abre en nueva pestaña con seguimiento
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API from '../services/api';
import { 
  CheckCircle, AlertCircle, Loader, ExternalLink, 
  Calendar, MapPin, Award, Users, FileText, Clock,
  Filter, X
} from 'lucide-react';

export default function Encuestas() {
  const { userProfile } = useAuth();
  const [encuestasDisponibles, setEncuestasDisponibles] = useState([]);
  const [encuestasCompletadas, setEncuestasCompletadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('todas');
  const [vistaActual, setVistaActual] = useState('disponibles'); // 'disponibles' | 'completadas'

  useEffect(() => {
    loadEncuestas();
  }, []);

  const loadEncuestas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar encuestas disponibles
      const disponiblesRes = await API.get('/encuestas/disponibles');
      setEncuestasDisponibles(disponiblesRes.data.encuestas || []);
      
      // Cargar encuestas completadas (opcional)
      // Puedes crear un endpoint para esto
      
    } catch (err) {
      console.error('Error cargando encuestas:', err);
      setError('No se pudieron cargar las encuestas');
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirEncuesta = (encuesta) => {
    // Construir URL de Zoho Forms con parámetros pre-llenados
    const baseUrl = `https://forms.zoho.com/form/${encuesta.zoho_form_link_name}`;
    
    // Agregar parámetros del usuario (Zoho Forms acepta query params)
    const params = new URLSearchParams({
      'Usuario_Email': userProfile.email || '',
      'Usuario_Nombre': userProfile.nombre || '',
      'Usuario_ID': userProfile.id || '',
      'Sede': userProfile.sede || '',
      'Edicion': userProfile.edicion || ''
    });
    
    const urlCompleta = `${baseUrl}?${params.toString()}`;
    
    // Abrir en nueva pestaña
    const ventana = window.open(urlCompleta, '_blank', 'noopener,noreferrer');
    
    if (ventana) {
      // Mostrar mensaje de seguimiento
      mostrarModalSeguimiento(encuesta);
    } else {
      setError('Por favor permite ventanas emergentes para completar la encuesta');
    }
  };

  const mostrarModalSeguimiento = (encuesta) => {
    // Mostrar modal de confirmación después de que el usuario termine
    setTimeout(() => {
      if (window.confirm(
        `¿Ya completaste la encuesta "${encuesta.nombre}"?\n\n` +
        'Si la completaste, haz click en OK para marcarla como completada.\n' +
        'Si aún no la completaste, haz click en Cancelar.'
      )) {
        marcarComoCompletada(encuesta.id);
      }
    }, 3000); // Esperar 3 segundos antes de preguntar
  };

  const marcarComoCompletada = async (encuestaId) => {
    try {
      setLoading(true);
      await API.post(`/encuestas/${encuestaId}/marcar-completada`, {
        zoho_response_id: null // Zoho puede enviar esto via webhook
      });
      
      setSuccess(true);
      
      // Recargar encuestas
      setTimeout(() => {
        loadEncuestas();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error marcando encuesta:', err);
      setError('Error al marcar la encuesta como completada');
    } finally {
      setLoading(false);
    }
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      'sesion': <Calendar className="w-5 h-5" />,
      'curso': <Award className="w-5 h-5" />,
      'expositor': <MapPin className="w-5 h-5" />,
      'general': <Users className="w-5 h-5" />
    };
    return icons[tipo] || <FileText className="w-5 h-5" />;
  };

  const getTipoBadge = (tipo) => {
    const badges = {
      'sesion': 'bg-blue-100 text-blue-700',
      'curso': 'bg-green-100 text-green-700',
      'expositor': 'bg-purple-100 text-purple-700',
      'general': 'bg-gray-100 text-gray-700'
    };
    return badges[tipo] || 'bg-gray-100 text-gray-700';
  };

  const encuestasFiltradas = filtroTipo === 'todas' 
    ? encuestasDisponibles 
    : encuestasDisponibles.filter(e => e.tipo === filtroTipo);

  if (loading && encuestasDisponibles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📋 Encuestas
        </h1>
        <p className="text-gray-600">
          Completa las encuestas para ayudarnos a mejorar el evento
        </p>
      </div>

      {/* Mensajes de estado */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 p-4 rounded-lg flex items-center gap-3 animate-fade-in">
          <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
          <span className="text-green-800 font-medium">
            ¡Encuesta completada exitosamente! Gracias por tu participación.
          </span>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
          <div className="flex-1">
            <span className="text-red-800 font-medium">{error}</span>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Tabs: Disponibles / Completadas */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setVistaActual('disponibles')}
            className={`pb-3 px-1 font-medium transition border-b-2 ${
              vistaActual === 'disponibles'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Pendientes ({encuestasDisponibles.length})
          </button>
          <button
            onClick={() => setVistaActual('completadas')}
            className={`pb-3 px-1 font-medium transition border-b-2 ${
              vistaActual === 'completadas'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Completadas
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Filter size={16} />
          <span className="font-medium">Filtrar:</span>
        </div>
        {['todas', 'sesion', 'curso', 'expositor', 'general'].map((tipo) => (
          <button
            key={tipo}
            onClick={() => setFiltroTipo(tipo)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filtroTipo === tipo
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tipo === 'todas' ? 'Todas' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
          </button>
        ))}
      </div>

      {/* Lista de encuestas */}
      {vistaActual === 'disponibles' && (
        <>
          {encuestasFiltradas.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <FileText className="mx-auto mb-4 text-gray-400" size={64} />
              <p className="text-xl font-semibold text-gray-700 mb-2">
                No tienes encuestas pendientes
              </p>
              <p className="text-gray-500">
                {filtroTipo !== 'todas' 
                  ? 'Intenta cambiar el filtro' 
                  : '¡Has completado todas las encuestas disponibles!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {encuestasFiltradas.map((encuesta) => (
                <EncuestaCard
                  key={encuesta.id}
                  encuesta={encuesta}
                  onAbrir={handleAbrirEncuesta}
                  getTipoIcon={getTipoIcon}
                  getTipoBadge={getTipoBadge}
                />
              ))}
            </div>
          )}
        </>
      )}

      {vistaActual === 'completadas' && (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <CheckCircle className="mx-auto mb-4 text-green-500" size={64} />
          <p className="text-xl font-semibold text-gray-700 mb-2">
            Encuestas completadas
          </p>
          <p className="text-gray-500">
            Funcionalidad en desarrollo
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Componente: Card de Encuesta
// ============================================================
function EncuestaCard({ encuesta, onAbrir, getTipoIcon, getTipoBadge }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      {/* Header con tipo */}
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${getTipoBadge(encuesta.tipo)}`}>
          {getTipoIcon(encuesta.tipo)}
        </div>
        {encuesta.obligatoria && (
          <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">
            Obligatoria
          </span>
        )}
      </div>

      {/* Título y descripción */}
      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
        {encuesta.nombre}
      </h3>
      
      {encuesta.descripcion && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
          {encuesta.descripcion}
        </p>
      )}

      {/* Metadata */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <FileText size={14} />
          <span className="capitalize">Tipo: {encuesta.tipo}</span>
        </div>
        
        {encuesta.fecha_fin && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock size={14} />
            <span>
              Vence: {new Date(encuesta.fecha_fin).toLocaleDateString('es-MX')}
            </span>
          </div>
        )}

        {encuesta.sede && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin size={14} />
            <span className="capitalize">{encuesta.sede} {encuesta.edicion}</span>
          </div>
        )}
      </div>

      {/* Botón de acción */}
      <button
        onClick={() => onAbrir(encuesta)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 group"
      >
        <span>Completar Encuesta</span>
        <ExternalLink 
          size={16} 
          className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" 
        />
      </button>
    </div>
  );
}

// ============================================================
// Componente: Panel Admin para gestionar encuestas
// ============================================================
export function EncuestasAdmin() {
  const [encuestas, setEncuestas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    zoho_form_link_name: '',
    zoho_form_id: '',
    tipo: 'general',
    rol_permitido: 'todos',
    sede: '',
    edicion: new Date().getFullYear(),
    activa: true,
    obligatoria: false
  });

  useEffect(() => {
    loadEncuestas();
  }, []);

  const loadEncuestas = async () => {
    try {
      setLoading(true);
      const res = await API.get('/encuestas');
      setEncuestas(res.data.encuestas || []);
    } catch (err) {
      console.error('Error cargando encuestas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await API.post('/encuestas', formData);
      setMostrarForm(false);
      setFormData({
        nombre: '',
        descripcion: '',
        zoho_form_link_name: '',
        zoho_form_id: '',
        tipo: 'general',
        rol_permitido: 'todos',
        sede: '',
        edicion: new Date().getFullYear(),
        activa: true,
        obligatoria: false
      });
      loadEncuestas();
    } catch (err) {
      console.error('Error creando encuesta:', err);
      alert('Error al crear encuesta');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta encuesta?')) return;
    
    try {
      await API.delete(`/encuestas/${id}`);
      loadEncuestas();
    } catch (err) {
      console.error('Error eliminando encuesta:', err);
      alert('Error al eliminar encuesta');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Encuestas</h1>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {mostrarForm ? 'Cancelar' : '+ Nueva Encuesta'}
        </button>
      </div>

      {/* Formulario de creación */}
      {mostrarForm && (
        <div className="bg-white border rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Nueva Encuesta de Zoho Forms</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ej: Encuesta Post-Sesión"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Zoho Form Link Name *</label>
                <input
                  type="text"
                  required
                  value={formData.zoho_form_link_name}
                  onChange={(e) => setFormData({...formData, zoho_form_link_name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ej: encuesta-cmc-2025"
                />
                <p className="text-xs text-gray-500 mt-1">
                  El link_name de tu formulario en Zoho Forms
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="general">General</option>
                  <option value="sesion">Sesión</option>
                  <option value="curso">Curso</option>
                  <option value="expositor">Expositor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Rol Permitido</label>
                <select
                  value={formData.rol_permitido}
                  onChange={(e) => setFormData({...formData, rol_permitido: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="todos">Todos</option>
                  <option value="asistente">Asistentes</option>
                  <option value="speaker">Speakers</option>
                  <option value="expositor">Expositores</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sede</label>
                <input
                  type="text"
                  value={formData.sede}
                  onChange={(e) => setFormData({...formData, sede: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="mexico, colombia, peru..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Edición</label>
                <input
                  type="number"
                  value={formData.edicion}
                  onChange={(e) => setFormData({...formData, edicion: parseInt(e.target.value)})}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
                rows="3"
                placeholder="Descripción de la encuesta..."
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.activa}
                  onChange={(e) => setFormData({...formData, activa: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="text-sm">Activa</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.obligatoria}
                  onChange={(e) => setFormData({...formData, obligatoria: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="text-sm">Obligatoria</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Encuesta'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de encuestas */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold">Nombre</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Tipo</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Rol</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Estado</th>
              <th className="text-right px-4 py-3 text-sm font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {encuestas.map((encuesta) => (
              <tr key={encuesta.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{encuesta.nombre}</p>
                    <p className="text-xs text-gray-500">{encuesta.sede} {encuesta.edicion}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm capitalize">{encuesta.tipo}</td>
                <td className="px-4 py-3 text-sm capitalize">{encuesta.rol_permitido}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    encuesta.activa 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {encuesta.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleEliminar(encuesta.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}