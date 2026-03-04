// src/pages/ConfiguracionPanel.jsx
//
// FIX: Era una página vacía de 12 líneas con "en construcción".
//      Ahora es un panel completo de configuración del evento que lee
//      y escribe la tabla configuracion_evento vía GET/PUT /api/config/evento-activo
//      y la tabla calendario_sedes vía GET /api/config/calendario.

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import API from "../services/api";
import {
  Settings,
  Save,
  RefreshCw,
  Calendar,
  MapPin,
  Globe,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
} from "lucide-react";

// ============================================================
// Tipos de sesión disponibles en el sistema
// ============================================================
const TIPOS_SESION = [
  { id: "brujula",  label: "Brújula" },
  { id: "toolbox",  label: "Toolbox" },
  { id: "spark",    label: "Spark" },
  { id: "orion",    label: "Orion" },
  { id: "tracker",  label: "Tracker" },
  { id: "curso",    label: "Curso" },
];

const SEDES_DISPONIBLES = [
  "MX", "CL", "CO", "PE", "AR", "EC", "UY", "BO", "PY", "VE",
];

export default function ConfiguracionPanel() {
  const { userProfile, permisos } = useAuth();

  // ── Estado general ──
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);
  const [success, setSuccess]       = useState(null);

  // ── Datos del evento activo ──
  const [config, setConfig] = useState({
    sede_activa:    "MX",
    edicion_activa: 2025,
    fecha_inicio:   "",
    fecha_fin:      "",
    tipos_activos:  ["brujula", "toolbox", "spark", "orion", "tracker", "curso"],
  });

  // ── Calendario de sedes ──
  const [calendario, setCalendario] = useState([]);
  const [showCalendario, setShowCalendario] = useState(false);

  // ============================================================
  // CARGAR CONFIGURACIÓN
  // ============================================================
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const [cfgRes, calRes] = await Promise.all([
        API.get("/config/evento-activo"),
        API.get("/config/calendario"),
      ]);

      const data = cfgRes.data?.data || cfgRes.data;
      if (data) {
        setConfig({
          sede_activa:    data.sede_activa    || "MX",
          edicion_activa: data.edicion_activa || 2025,
          fecha_inicio:   data.fecha_inicio   ? data.fecha_inicio.split("T")[0] : "",
          fecha_fin:      data.fecha_fin      ? data.fecha_fin.split("T")[0]    : "",
          tipos_activos:  Array.isArray(data.tipos_activos)
            ? data.tipos_activos
            : ["brujula", "toolbox", "spark", "orion", "tracker", "curso"],
        });
      }

      const calData = calRes.data?.data || calRes.data;
      if (Array.isArray(calData)) {
        setCalendario(calData);
      }
    } catch (err) {
      console.error("Error cargando configuración:", err);
      setError("No se pudo cargar la configuración del evento.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // GUARDAR CONFIGURACIÓN
  // ============================================================
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await API.put("/config/evento-activo", {
        sede_activa:    config.sede_activa,
        edicion_activa: Number(config.edicion_activa),
        fecha_inicio:   config.fecha_inicio || null,
        fecha_fin:      config.fecha_fin    || null,
        tipos_activos:  config.tipos_activos,
      });

      setSuccess("Configuración guardada correctamente.");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      console.error("Error guardando configuración:", err);
      setError("Error al guardar. Verifica los datos e intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // TOGGLE TIPO ACTIVO
  // ============================================================
  const toggleTipo = (tipo) => {
    setConfig((prev) => ({
      ...prev,
      tipos_activos: prev.tipos_activos.includes(tipo)
        ? prev.tipos_activos.filter((t) => t !== tipo)
        : [...prev.tipos_activos, tipo],
    }));
  };

  // ============================================================
  // GUARD — solo super_admin
  // ============================================================
  if (!permisos?.puedeEditar && !loading) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex gap-3">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-semibold text-red-800">Acceso restringido</p>
            <p className="text-sm text-red-700 mt-1">
              Solo el Super Admin puede acceder a la configuración del evento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando configuración…</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings size={26} className="text-blue-600" />
            Configuración del Evento
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestiona la sede activa, edición y tipos de sesión visibles
          </p>
        </div>
        <button
          onClick={loadConfig}
          className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500"
          title="Recargar"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Alertas */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
          <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={20} />
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* ── Bloque 1: Sede y Edición ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <Globe size={18} className="text-blue-500" />
          Sede y Edición Activa
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Sede activa */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sede Activa
            </label>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-gray-400" />
              <select
                value={config.sede_activa}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, sede_activa: e.target.value }))
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {SEDES_DISPONIBLES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Edición activa */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Edición (Año)
            </label>
            <input
              type="number"
              min="2020"
              max="2040"
              value={config.edicion_activa}
              onChange={(e) =>
                setConfig((p) => ({ ...p, edicion_activa: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* ── Bloque 2: Fechas del evento ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <Calendar size={18} className="text-green-500" />
          Fechas del Evento
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fecha de Inicio (Día 1)
            </label>
            <input
              type="date"
              value={config.fecha_inicio}
              onChange={(e) =>
                setConfig((p) => ({ ...p, fecha_inicio: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fecha de Fin (Día 4)
            </label>
            <input
              type="date"
              value={config.fecha_fin}
              onChange={(e) =>
                setConfig((p) => ({ ...p, fecha_fin: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Preview días */}
        {config.fecha_inicio && config.fecha_fin && (() => {
          const d1 = new Date(config.fecha_inicio + "T12:00:00");
          const d4 = new Date(config.fecha_fin   + "T12:00:00");
          const days = [];
          for (let i = 0; i < 4; i++) {
            const d = new Date(d1);
            d.setDate(d1.getDate() + i);
            if (d <= d4) {
              days.push(d.toLocaleDateString("es-MX", {
                weekday: "long", day: "numeric", month: "long",
              }));
            }
          }
          return days.length > 0 ? (
            <div className="mt-3 bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Días del evento
              </p>
              <div className="space-y-1">
                {days.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="capitalize">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}
      </div>

      {/* ── Bloque 3: Tipos de sesión activos ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <Tag size={18} className="text-purple-500" />
          Tipos de Sesión Visibles
        </h2>
        <p className="text-sm text-gray-500">
          Solo los tipos marcados aparecerán en la Agenda para los asistentes.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TIPOS_SESION.map(({ id, label }) => {
            const active = config.tipos_activos.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggleTipo(id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition ${
                  active
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${active ? "bg-blue-500" : "bg-gray-300"}`} />
                {label}
              </button>
            );
          })}
        </div>

        {config.tipos_activos.length === 0 && (
          <p className="text-sm text-orange-600 bg-orange-50 rounded-lg px-4 py-2">
            ⚠️ No hay tipos activos. La agenda aparecerá vacía para los asistentes.
          </p>
        )}
      </div>

      {/* ── Bloque 4: Calendario de sedes (solo lectura) ── */}
      {calendario.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowCalendario((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
          >
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Clock size={18} className="text-orange-500" />
              Calendario de Sedes ({calendario.length})
            </h2>
            {showCalendario ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showCalendario && (
            <div className="px-6 pb-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-semibold text-gray-600">Sede</th>
                    <th className="text-left py-2 font-semibold text-gray-600">Edición</th>
                    <th className="text-left py-2 font-semibold text-gray-600">Inicio</th>
                    <th className="text-left py-2 font-semibold text-gray-600">Fin</th>
                    <th className="text-left py-2 font-semibold text-gray-600">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {calendario.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 font-bold text-blue-700 uppercase">{c.sede}</td>
                      <td className="py-2 text-gray-700">{c.edicion}</td>
                      <td className="py-2 text-gray-600">
                        {c.fecha_inicio
                          ? new Date(c.fecha_inicio + "T12:00:00").toLocaleDateString("es-MX", {
                              day: "numeric", month: "short", year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="py-2 text-gray-600">
                        {c.fecha_fin
                          ? new Date(c.fecha_fin + "T12:00:00").toLocaleDateString("es-MX", {
                              day: "numeric", month: "short", year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            c.activo
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {c.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Botón Guardar ── */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-semibold shadow-sm"
        >
          {saving ? (
            <><RefreshCw size={18} className="animate-spin" /> Guardando…</>
          ) : (
            <><Save size={18} /> Guardar Configuración</>
          )}
        </button>
      </div>

    </div>
  );
}