// src/pages/Notificaciones.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Bell, AlertCircle, Info, CheckCircle, Trash2, Filter } from 'lucide-react';

const Notificaciones = () => {
  const { userData } = useAuth();
  const [notificaciones, setNotificaciones] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [loading, setLoading] = useState(true);

  // Datos de ejemplo (en producción vendrían de Firestore)
  const notificacionesData = [
    {
      id: 1,
      titulo: 'Sesión próxima a iniciar',
      mensaje: 'Tu sesión "Transformación Digital" inicia en 15 minutos en la Sala Plenaria',
      tipo: 'urgente',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      leida: false
    },
    {
      id: 2,
      titulo: 'Nuevo expositor registrado',
      mensaje: 'ABB Chile se ha sumado al área de exposición. Visita su stand B-05',
      tipo: 'info',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      leida: false
    },
    {
      id: 3,
      titulo: 'Encuesta disponible',
      mensaje: 'Completa la encuesta de satisfacción del curso RCM. Tu opinión es importante',
      tipo: 'normal',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      leida: true
    },
    {
      id: 4,
      titulo: 'Cambio en agenda',
      mensaje: 'La sesión de las 15:00 se movió de Sala A a Sala B. Por favor toma nota',
      tipo: 'importante',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      leida: true
    },
    {
      id: 5,
      titulo: 'Check-in exitoso',
      mensaje: 'Has registrado tu asistencia al curso de Gestión de Activos correctamente',
      tipo: 'success',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      leida: true
    },
    {
      id: 6,
      titulo: 'Recuerda tu próxima sesión',
      mensaje: 'Mañana a las 9:00 tienes agendada la sesión "Estrategias de Confiabilidad"',
      tipo: 'info',
      timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000),
      leida: true
    },
    {
      id: 7,
      titulo: 'Galería actualizada',
      mensaje: 'Se han subido nuevas fotos del día 1 del evento. ¡Revisa la galería!',
      tipo: 'normal',
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
      leida: true
    }
  ];

  useEffect(() => {
    // En producción, cargar desde Firestore
    setNotificaciones(notificacionesData);
    setLoading(false);
  }, [userData]);

  const getTipoConfig = (tipo) => {
    const configs = {
      urgente: {
        bg: 'bg-red-50',
        border: 'border-red-500',
        icon: AlertCircle,
        iconColor: 'text-red-600',
        badge: 'bg-red-100 text-red-800'
      },
      importante: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-500',
        icon: AlertCircle,
        iconColor: 'text-yellow-600',
        badge: 'bg-yellow-100 text-yellow-800'
      },
      info: {
        bg: 'bg-blue-50',
        border: 'border-blue-500',
        icon: Info,
        iconColor: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-800'
      },
      success: {
        bg: 'bg-green-50',
        border: 'border-green-500',
        icon: CheckCircle,
        iconColor: 'text-green-600',
        badge: 'bg-green-100 text-green-800'
      },
      normal: {
        bg: 'bg-gray-50',
        border: 'border-gray-400',
        icon: Bell,
        iconColor: 'text-gray-600',
        badge: 'bg-gray-100 text-gray-800'
      }
    };
    return configs[tipo] || configs.normal;
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Hace un momento';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} hora${Math.floor(seconds / 3600) > 1 ? 's' : ''}`;
    return `Hace ${Math.floor(seconds / 86400)} día${Math.floor(seconds / 86400) > 1 ? 's' : ''}`;
  };

  const filteredNotificaciones = filtroTipo === 'all'
    ? notificaciones
    : notificaciones.filter(n => n.tipo === filtroTipo);

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const marcarTodasLeidas = () => {
    setNotificaciones(notificaciones.map(n => ({ ...n, leida: true })));
  };

  const eliminarNotificacion = (id) => {
    setNotificaciones(notificaciones.filter(n => n.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Bell size={32} />
              Notificaciones
            </h1>
            <p className="text-purple-100">
              {noLeidas > 0 ? `${noLeidas} sin leer` : 'Todas leídas'}
            </p>
          </div>
          {noLeidas > 0 && (
            <button
              onClick={marcarTodasLeidas}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <Filter size={20} className="text-gray-600" />
          <h3 className="font-bold">Filtrar por tipo</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroTipo('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filtroTipo === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas ({notificaciones.length})
          </button>
          <button
            onClick={() => setFiltroTipo('urgente')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filtroTipo === 'urgente'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Urgentes
          </button>
          <button
            onClick={() => setFiltroTipo('importante')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filtroTipo === 'importante'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Importantes
          </button>
          <button
            onClick={() => setFiltroTipo('info')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filtroTipo === 'info'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Info
          </button>
        </div>
      </div>

      {/* Lista de Notificaciones */}
      <div className="space-y-3">
        {filteredNotificaciones.map(notif => {
          const config = getTipoConfig(notif.tipo);
          const Icon = config.icon;

          return (
            <div
              key={notif.id}
              className={`${config.bg} p-5 rounded-xl border-l-4 ${config.border} ${
                !notif.leida ? 'shadow-md' : 'shadow-sm opacity-75'
              } transition relative group`}
            >
              <div className="flex gap-4">
                {/* Icono */}
                <div className="flex-shrink-0">
                  <Icon className={config.iconColor} size={24} />
                </div>

                {/* Contenido */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800">{notif.titulo}</h3>
                    <div className="flex items-center gap-2">
                      {!notif.leida && (
                        <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                      )}
                      <button
                        onClick={() => eliminarNotificacion(notif.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mb-2">{notif.mensaje}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{formatTimeAgo(notif.timestamp)}</span>
                    <span className={`${config.badge} px-2 py-1 rounded-full text-xs font-semibold`}>
                      {notif.tipo.charAt(0).toUpperCase() + notif.tipo.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mensaje si no hay notificaciones */}
      {filteredNotificaciones.length === 0 && (
        <div className="bg-gray-50 p-12 rounded-xl text-center">
          <Bell size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600">No hay notificaciones de este tipo</p>
        </div>
      )}
    </div>
  );
};

export default Notificaciones;
