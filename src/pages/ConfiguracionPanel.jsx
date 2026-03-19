// ============================================================
// FRONTEND: src/pages/ConfiguracionPanel.jsx (CORREGIDO)
// FIX: Ahora SÍ guarda y carga la configuración de sede
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API from '../services/api';
import { useEvent } from '../contexts/EventContext';
import { Save, RefreshCw, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function ConfiguracionPanel() {
  const { userProfile } = useAuth();
  const { refreshConfig } = useEvent();
  const [config, setConfig] = useState({
    sede_activa: 'colombia',
    edicion_activa: 2026
  });
  const [sedesDisponibles, setSedesDisponibles] = useState([]);
  const [edicionesDisponibles, setEdicionesDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadConfig();
    loadSedesYEdiciones();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📖 [ConfigPanel] Cargando configuración...');
      
      const res = await API.get('/config');
      console.log('📦 [ConfigPanel] Config recibida:', res.data);
      
      setConfig({
        sede_activa: res.data.sede_activa || 'mexico',
        edicion_activa: res.data.edicion_activa || 2025
      });
      
      console.log('✅ [ConfigPanel] Configuración cargada');
    } catch (err) {
      console.error('❌ [ConfigPanel] Error cargando config:', err);
      setError('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const loadSedesYEdiciones = async () => {
    try {
      // Cargar sedes disponibles
      const sedesRes = await API.get('/config/sedes');
      console.log('🌎 [ConfigPanel] Sedes disponibles:', sedesRes.data.sedes);
      setSedesDisponibles(sedesRes.data.sedes || ['mexico', 'colombia', 'peru', 'chile']);
      
      // Cargar ediciones disponibles
      const edicionesRes = await API.get('/config/ediciones');
      console.log('📅 [ConfigPanel] Ediciones disponibles:', edicionesRes.data.ediciones);
      const ediciones = edicionesRes.data.ediciones || [];
      
      // Si no hay ediciones, generar últimos 3 años
      if (ediciones.length === 0) {
        const currentYear = new Date().getFullYear();
        ediciones.push(currentYear, currentYear - 1, currentYear - 2);
      }
      
      setEdicionesDisponibles(ediciones);
    } catch (err) {
      console.error('⚠️ [ConfigPanel] Error cargando sedes/ediciones:', err);
      // Usar valores por defecto si falla
      setSedesDisponibles(['mexico', 'colombia', 'peru', 'chile']);
      const currentYear = new Date().getFullYear();
      setEdicionesDisponibles([currentYear, currentYear - 1, currentYear - 2]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      console.log('💾 [ConfigPanel] Guardando configuración:', config);
      
      // Validaciones
      if (!config.sede_activa) {
        setError('La sede es requerida');
        return;
      }
      
      if (!config.edicion_activa) {
        setError('La edición es requerida');
        return;
      }
      
      // Enviar al backend
      const res = await API.put('/config', {
        sede_activa: config.sede_activa.trim(),
        edicion_activa: parseInt(config.edicion_activa)
      });
      
      console.log('✅ [ConfigPanel] Configuración guardada:', res.data);
      
      setSuccess(true);
      // Propagar a toda la app
      if (typeof refreshConfig === 'function') await refreshConfig();
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('❌ [ConfigPanel] Error guardando:', err);
      setError(err.response?.data?.error || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleReload = () => {
    setSuccess(false);
    setError(null);
    loadConfig();
  };

  // Verificar permisos
  if (userProfile?.rol !== 'super_admin') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto mb-3 text-yellow-600" size={48} />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Acceso Restringido
          </h2>
          <p className="text-gray-700">
            Solo los super administradores pueden acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ⚙️ Configuración Global
        </h1>
        <p className="text-gray-600">
          Configura la sede y edición activa del sistema
        </p>
      </div>

      {/* Mensajes de estado */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="text-green-600" size={24} />
          <span className="text-green-800 font-medium">
            ✅ Configuración guardada exitosamente
          </span>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={24} />
          <span className="text-red-800 font-medium">{error}</span>
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="space-y-6">
          {/* Sede Activa */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sede Activa
            </label>
            <select
              value={config.sede_activa}
              onChange={(e) => setConfig({ ...config, sede_activa: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            >
              <option value="">Selecciona una sede</option>
              {sedesDisponibles.map((sede) => (
                <option key={sede} value={sede} className="capitalize">
                  {sede}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500">
              Esta es la sede que se usará por defecto en toda la aplicación
            </p>
          </div>

          {/* Edición Activa */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Edición Activa
            </label>
            <select
              value={config.edicion_activa}
              onChange={(e) => setConfig({ ...config, edicion_activa: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            >
              <option value="">Selecciona una edición</option>
              {edicionesDisponibles.map((edicion) => (
                <option key={edicion} value={edicion}>
                  {edicion}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500">
              Año de la edición actual del evento
            </p>
          </div>

          {/* Vista previa */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              📋 Configuración Actual
            </h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p>
                <strong>Sede:</strong>{' '}
                <span className="capitalize">{config.sede_activa || 'No configurada'}</span>
              </p>
              <p>
                <strong>Edición:</strong> {config.edicion_activa || 'No configurada'}
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !config.sede_activa || !config.edicion_activa}
              className="flex-1 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
            >
              {saving ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Guardar Configuración
                </>
              )}
            </button>

            <button
              onClick={handleReload}
              disabled={saving}
              className="bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2 transition"
            >
              <RefreshCw size={20} />
              Recargar
            </button>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">ℹ️ Información</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Esta configuración afecta a toda la aplicación</li>
          <li>• Los filtros de agenda y otros módulos usarán estos valores</li>
          <li>• Solo los super administradores pueden modificar esta configuración</li>
          <li>• Los cambios se aplican inmediatamente después de guardar</li>
        </ul>
      </div>
    </div>
  );
}