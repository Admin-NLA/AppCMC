// src/pages/Networking.jsx
// Networking CMC — Sistema de citas Expositor ↔ Asistente
//
// FLUJO:
//   Asistente → ve directorio de expositores → elige uno → elige fecha/hora → solicita cita
//   Expositor → ve sus citas pendientes → confirma o rechaza → agrega ubicación (stand)
//   Ambos     → ven su agenda de citas del evento
//   Staff/Admin → ven todas las citas, pueden filtrar

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useEvent } from '../contexts/EventContext.jsx';
import API from '../services/api';
import {
  Calendar, Clock, Building2, User, CheckCircle, XCircle,
  AlertCircle, Plus, Loader2, RefreshCw, ChevronRight,
  MapPin, Phone, Globe, X, Send, ClipboardList, Info
} from 'lucide-react';

// ── Constantes ───────────────────────────────────────────────
const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  confirmada: { label: 'Confirmada', color: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300' },
  rechazada: { label: 'Rechazada', color: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-300' },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100   text-gray-600   dark:bg-gray-700      dark:text-gray-400' },
};

// Horarios disponibles del evento (bloques de 30 min)
const HORARIOS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00',
];

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

const fmtFecha = (d) => {
  if (!d) return '';
  try {
    // Normalizar: si ya tiene hora/timezone, extraer solo la fecha
    const fechaStr = typeof d === 'string'
      ? d.includes('T') ? d.split('T')[0] : d
      : new Date(d).toISOString().split('T')[0];
    return new Date(fechaStr + 'T12:00:00').toLocaleDateString('es', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  } catch { return String(d); }
};

// ─────────────────────────────────────────────────────────────
// Modal: Solicitar cita con un expositor
// ─────────────────────────────────────────────────────────────
function ModalSolicitarCita({ expositor, onSave, onClose }) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [notas, setNotas] = useState('');
  const [ocupados, setOcupados] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Cargar horarios ocupados cuando cambia la fecha
  useEffect(() => {
    if (!fecha || !expositor?.id) return;
    API.get(`/networking/disponibilidad/${expositor.id}?fecha=${fecha}`)
      .then(r => setOcupados(r.data.ocupados || []))
      .catch(() => setOcupados([]));
  }, [fecha, expositor?.id]);

  const slotOcupado = (h) =>
    ocupados.some(o => o.hora === h + ':00' || o.hora === h);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fecha || !hora) { setError('Selecciona fecha y hora'); return; }
    setSaving(true); setError(null);
    try {
      await API.post('/networking', {
        expositor_id: expositor.id,
        fecha, hora,
        hora_fin: horaFin || null,
        notas,
      });
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b dark:border-gray-700 flex justify-between items-start">
          <div>
            <h2 className="font-bold text-lg dark:text-white">Solicitar cita</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              con <span className="font-semibold text-blue-600">{expositor.nombre}</span>
              {expositor.stand && <span className="ml-1 text-gray-400">· Stand {expositor.stand}</span>}
            </p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Fecha */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
              Fecha *
            </label>
            <input type="date" className={inputCls} value={fecha}
              onChange={e => { setFecha(e.target.value); setHora(''); }}
              min={new Date().toISOString().split('T')[0]} required />
          </div>

          {/* Hora */}
          {fecha && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                Horario *
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {HORARIOS.map(h => {
                  const ocupado = slotOcupado(h);
                  const sel = hora === h;
                  return (
                    <button key={h} type="button"
                      disabled={ocupado}
                      onClick={() => { setHora(h); setHoraFin(''); }}
                      className={`py-1.5 rounded-lg text-xs font-medium border-2 transition
                        ${ocupado ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-600 cursor-not-allowed line-through'
                          : sel ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400'}`}>
                      {h}
                    </button>
                  );
                })}
              </div>
              {hora && (
                <p className="text-xs text-blue-600 mt-1 font-medium">Seleccionado: {hora}</p>
              )}
            </div>
          )}

          {/* Hora fin (opcional) */}
          {hora && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                Hora de fin <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <select className={inputCls} value={horaFin} onChange={e => setHoraFin(e.target.value)}>
                <option value="">Sin hora de fin</option>
                {HORARIOS.filter(h => h > hora).slice(0, 6).map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
              Motivo / Notas <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea className={inputCls} rows={3} value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej: Quiero conocer más sobre sus soluciones de mantenimiento predictivo..." />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={saving || !hora}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {saving ? 'Enviando...' : 'Solicitar cita'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal: Gestionar cita (expositor confirma/rechaza)
// ─────────────────────────────────────────────────────────────
function ModalGestionarCita({ cita, onSave, onClose }) {
  const [ubicacion, setUbicacion] = useState(cita.ubicacion || '');
  const [notas, setNotas] = useState(cita.notas || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleAction = async (status) => {
    setSaving(true); setError(null);
    try {
      await API.put(`/networking/${cita.id}`, { status, ubicacion: ubicacion || null, notas: notas || null });
      onSave(status);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b dark:border-gray-700 flex justify-between items-start">
          <div>
            <h2 className="font-bold text-lg dark:text-white">Gestionar cita</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {cita.solicitante_nombre} · {fmtFecha(cita.fecha)} {cita.hora?.slice(0, 5)}
            </p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Info del solicitante */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-1">
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{cita.solicitante_nombre}</p>
            <p className="text-xs text-gray-500">{cita.solicitante_email}</p>
            {cita.solicitante_empresa && <p className="text-xs text-gray-500">{cita.solicitante_empresa}</p>}
            {cita.solicitante_movil && (
              <a href={`tel:${cita.solicitante_movil}`}
                className="text-xs text-blue-600 flex items-center gap-1">
                <Phone size={11} /> {cita.solicitante_movil}
              </a>
            )}
            {cita.notas && (
              <p className="text-xs text-gray-600 dark:text-gray-300 italic mt-2 bg-white dark:bg-gray-700 p-2 rounded-lg">
                "{cita.notas}"
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
              Ubicación del encuentro <span className="text-gray-400 font-normal">(stand, sala, etc.)</span>
            </label>
            <input className={inputCls} value={ubicacion}
              onChange={e => setUbicacion(e.target.value)}
              placeholder="Ej: Stand B12 · Hall Principal" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
              Notas para el asistente
            </label>
            <textarea className={inputCls} rows={2} value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej: Por favor llegar 5 minutos antes..." />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => handleAction('confirmada')} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition text-sm">
              <CheckCircle size={15} /> Confirmar
            </button>
            <button onClick={() => handleAction('rechazada')} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white py-2.5 rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 transition text-sm">
              <XCircle size={15} /> Rechazar
            </button>
            <button onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition">
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Componente: Card de cita
// ─────────────────────────────────────────────────────────────
function CitaCard({ cita, vistaExpositor, onGestionar, onCancelar }) {
  const sc = STATUS_CONFIG[cita.status] || STATUS_CONFIG.pendiente;
  const nombre = vistaExpositor ? cita.solicitante_nombre : cita.expositor_nombre;
  const sub = vistaExpositor ? cita.solicitante_empresa : `Stand ${cita.expositor_stand || '—'}`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white truncate">{nombre}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${sc.color}`}>
          {sc.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400 mb-3">
        <span className="flex items-center gap-1.5">
          <Calendar size={14} className="text-blue-500" />
          {fmtFecha(cita.fecha)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={14} className="text-green-500" />
          {cita.hora?.slice(0, 5)}{cita.hora_fin ? ` – ${cita.hora_fin.slice(0, 5)}` : ''}
        </span>
        {cita.ubicacion && (
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-orange-500" />
            {cita.ubicacion}
          </span>
        )}
      </div>

      {cita.notas && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg mb-3">
          "{cita.notas}"
        </p>
      )}

      <div className="flex gap-2">
        {/* Expositor: gestionar si está pendiente */}
        {vistaExpositor && cita.status === 'pendiente' && onGestionar && (
          <button onClick={() => onGestionar(cita)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700 transition font-semibold">
            <ClipboardList size={13} /> Gestionar
          </button>
        )}
        {/* Asistente: cancelar si está pendiente */}
        {!vistaExpositor && ['pendiente', 'confirmada'].includes(cita.status) && onCancelar && (
          <button onClick={() => onCancelar(cita)}
            className="flex items-center gap-1.5 text-xs text-red-600 border border-red-200 dark:border-red-700 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition font-semibold">
            <X size={13} /> Cancelar cita
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function Networking() {
  const { userProfile, permisos } = useAuth();
  const { sedeActiva } = useEvent();

  const [tab, setTab] = useState('citas');   // 'citas' | 'directorio'
  const [expositores, setExpositores] = useState([]);
  const [citas, setCitas] = useState([]);
  const [citasAdmin, setCitasAdmin] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modales
  const [modalSolicitar, setModalSolicitar] = useState(null); // expositor seleccionado
  const [modalGestionar, setModalGestionar] = useState(null); // cita seleccionada

  // Filtro admin
  const [filtroStatus, setFiltroStatus] = useState('todas');

  // Búsqueda directorio
  const [busqueda, setBusqueda] = useState('');

  const rol = userProfile?.rol;
  const esAdmin = ['super_admin', 'staff'].includes(rol);
  const esExpositor = rol === 'expositor';
  const esAsistente = !esAdmin && !esExpositor;

  // Si el expositor está vinculado, mostrar su vista de citas recibidas
  const vistaExpositor = esExpositor;

  useEffect(() => {
    if (userProfile) load();
  }, [userProfile]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const params = sedeActiva ? `?sede=${sedeActiva}` : '';

      const [expoRes, citasRes] = await Promise.all([
        API.get(`/networking/expositores${params}`),
        API.get('/networking/mis-citas'),
      ]);

      setExpositores(expoRes.data.expositores || []);
      setCitas(citasRes.data.citas || []);

      // Admin carga todas
      if (esAdmin) {
        const adminRes = await API.get(`/networking/admin${params}`);
        setCitasAdmin(adminRes.data.citas || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async (cita) => {
    if (!confirm('¿Cancelar esta cita?')) return;
    try {
      await API.delete(`/networking/${cita.id}`);
      setSuccess('Cita cancelada');
      setTimeout(() => setSuccess(null), 3000);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const expoFiltrados = expositores.filter(e => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return e.nombre?.toLowerCase().includes(q) ||
      e.stand?.toLowerCase().includes(q) ||
      e.categoria?.toLowerCase().includes(q);
  });

  // Separar citas por status
  const citasPendientes = citas.filter(c => c.status === 'pendiente');
  const citasConfirmadas = citas.filter(c => c.status === 'confirmada');
  const citasPasadas = citas.filter(c => ['rechazada', 'cancelada'].includes(c.status));

  const citasAdminFiltradas = filtroStatus === 'todas'
    ? citasAdmin
    : citasAdmin.filter(c => c.status === filtroStatus);

  if (!permisos?.verNetworking) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 p-6 rounded-2xl flex items-start gap-3 max-w-lg">
        <AlertCircle className="text-yellow-500 shrink-0 mt-0.5" size={22} />
        <div>
          <p className="font-bold text-yellow-800 dark:text-yellow-300">Sin acceso al Networking</p>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
            Tu tipo de pase no incluye la funcionalidad de citas con expositores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="text-blue-600" size={26} />
            Networking — Citas
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {esExpositor
              ? `${citasPendientes.length} cita${citasPendientes.length !== 1 ? 's' : ''} pendiente${citasPendientes.length !== 1 ? 's' : ''} de confirmar`
              : esAdmin
                ? `${citasAdmin.length} citas registradas en total`
                : `Agenda reuniones con expositores del CMC`}
          </p>
        </div>
        <button onClick={load} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Mensajes */}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-xl text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl w-fit">
        {[
          { id: 'citas', label: `Mis citas (${citas.filter(c => !['cancelada', 'rechazada'].includes(c.status)).length})` },
          { id: 'directorio', label: `Expositores (${expositores.length})` },
          ...(esAdmin ? [{ id: 'admin', label: `Todas las citas (${citasAdmin.length})` }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition
              ${tab === t.id
                ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <>

          {/* ══════════ TAB: MIS CITAS ══════════ */}
          {tab === 'citas' && (
            <div className="space-y-5">

              {/* Banner informativo para asistentes */}
              {esAsistente && expositores.length > 0 && citas.length === 0 && (
                <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-4 rounded-2xl text-sm text-blue-700 dark:text-blue-300">
                  <Info size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">¿Cómo funciona?</p>
                    <p className="text-xs mt-0.5 opacity-80">
                      Ve al directorio de Expositores, elige con quién quieres reunirte, selecciona
                      fecha y hora disponible, y envía tu solicitud. El expositor la confirmará desde su app.
                    </p>
                    <button onClick={() => setTab('directorio')}
                      className="mt-2 flex items-center gap-1 text-xs font-semibold underline">
                      Ver expositores <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}

              {citas.length === 0 ? (
                <div className="text-center py-14 text-gray-400">
                  <Calendar size={48} className="mx-auto mb-3 opacity-20" />
                  <p className="font-semibold">No tienes citas agendadas</p>
                  {esAsistente && (
                    <button onClick={() => setTab('directorio')}
                      className="mt-3 flex items-center gap-2 mx-auto text-sm text-blue-600 font-semibold hover:underline">
                      <Plus size={15} /> Agendar con un expositor
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pendientes */}
                  {citasPendientes.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Clock size={13} /> Pendientes de confirmar ({citasPendientes.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {citasPendientes.map(c => (
                          <CitaCard key={c.id} cita={c} vistaExpositor={vistaExpositor}
                            onGestionar={vistaExpositor ? setModalGestionar : null}
                            onCancelar={!vistaExpositor ? handleCancelar : null} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirmadas */}
                  {citasConfirmadas.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <CheckCircle size={13} /> Confirmadas ({citasConfirmadas.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {citasConfirmadas.map(c => (
                          <CitaCard key={c.id} cita={c} vistaExpositor={vistaExpositor}
                            onGestionar={vistaExpositor ? setModalGestionar : null}
                            onCancelar={!vistaExpositor ? handleCancelar : null} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Historial */}
                  {citasPasadas.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Historial ({citasPasadas.length})
                        </h3>
                        <button
                          onClick={async () => {
                            if (window.confirm('¿Limpiar el historial de citas canceladas y rechazadas? Se eliminarán permanentemente.')) {
                              const aEliminar = citas.filter(ct => ['cancelada', 'rechazada'].includes(ct.status));
                              try {
                                await Promise.all(aEliminar.map(ct => API.delete(`/networking/${ct.id}`)));
                                setCitas(prev => prev.filter(ct => !['cancelada', 'rechazada'].includes(ct.status)));
                              } catch (err) {
                                // Si falla el DELETE, al menos limpiar visualmente y recargar
                                setCitas(prev => prev.filter(ct => !['cancelada', 'rechazada'].includes(ct.status)));
                              }
                            }
                          }}
                          className="text-xs text-red-400 hover:text-red-600 font-medium transition"
                        >
                          Limpiar historial
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {citasPasadas.map(c => (
                          <CitaCard key={c.id} cita={c} vistaExpositor={vistaExpositor} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════ TAB: DIRECTORIO EXPOSITORES ══════════ */}
          {tab === 'directorio' && (
            <div className="space-y-4">
              {/* Buscador */}
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar expositor, stand o categoría..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {expoFiltrados.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Building2 size={40} className="mx-auto mb-2 opacity-20" />
                  <p>{busqueda ? 'Sin resultados' : 'No hay expositores disponibles'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {expoFiltrados.map(expo => (
                    <div key={expo.id}
                      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition">
                      {/* Logo */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 shrink-0 flex items-center justify-center overflow-hidden">
                          {expo.logo_url ? (
                            <img src={expo.logo_url} alt={expo.nombre}
                              className="w-full h-full object-contain p-1"
                              onError={e => { e.target.style.display = 'none'; }} />
                          ) : (
                            <Building2 size={22} className="text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white truncate">{expo.nombre}</p>
                          {expo.stand && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">Stand {expo.stand}</p>
                          )}
                          {expo.categoria && (
                            <p className="text-xs text-gray-400">{expo.categoria}</p>
                          )}
                        </div>
                      </div>

                      {expo.descripcion && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                          {expo.descripcion}
                        </p>
                      )}

                      {expo.website_url && (
                        <a href={expo.website_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline mb-3">
                          <Globe size={12} /> {expo.website_url.replace(/^https?:\/\//, '')}
                        </a>
                      )}

                      {/* Acción */}
                      {(esAsistente || esAdmin) && (
                        <button onClick={() => setModalSolicitar(expo)}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 transition font-semibold text-sm">
                          <Plus size={15} /> Agendar cita
                        </button>
                      )}
                      {esExpositor && (
                        <div className="text-center text-xs text-gray-400 py-1">
                          Este es tu stand
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════ TAB: ADMIN — TODAS LAS CITAS ══════════ */}
          {tab === 'admin' && esAdmin && (
            <div className="space-y-4">
              {/* Filtros */}
              <div className="flex flex-wrap gap-2">
                {['todas', 'pendiente', 'confirmada', 'rechazada', 'cancelada'].map(s => (
                  <button key={s} onClick={() => setFiltroStatus(s)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-semibold border-2 transition capitalize
                      ${filtroStatus === s
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'}`}>
                    {s === 'todas' ? `Todas (${citasAdmin.length})` : `${s} (${citasAdmin.filter(c => c.status === s).length})`}
                  </button>
                ))}
              </div>

              {/* Tabla */}
              {citasAdminFiltradas.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Calendar size={36} className="mx-auto mb-2 opacity-20" />
                  <p>No hay citas con este filtro</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          {['Asistente', 'Expositor', 'Fecha', 'Hora', 'Status', 'Ubicación'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {citasAdminFiltradas.map(c => {
                          const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.pendiente;
                          return (
                            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                              <td className="px-4 py-3">
                                <p className="font-semibold text-gray-900 dark:text-white">{c.solicitante_nombre}</p>
                                <p className="text-xs text-gray-400">{c.solicitante_empresa}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-800 dark:text-gray-200">{c.expositor_nombre}</p>
                                {c.expositor_stand && <p className="text-xs text-orange-500">Stand {c.expositor_stand}</p>}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                {fmtFecha(c.fecha)}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                {c.hora?.slice(0, 5)}{c.hora_fin ? `–${c.hora_fin.slice(0, 5)}` : ''}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sc.color}`}>
                                  {sc.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                                {c.ubicacion || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modales */}
      {modalSolicitar && (
        <ModalSolicitarCita
          expositor={modalSolicitar}
          onSave={() => {
            setModalSolicitar(null);
            setSuccess('¡Cita solicitada! El expositor la confirmará pronto.');
            setTimeout(() => setSuccess(null), 4000);
            setTab('citas');
            load();
          }}
          onClose={() => setModalSolicitar(null)}
        />
      )}
      {modalGestionar && (
        <ModalGestionarCita
          cita={modalGestionar}
          onSave={(status) => {
            setModalGestionar(null);
            setSuccess(status === 'confirmada' ? 'Cita confirmada correctamente' : 'Cita rechazada');
            setTimeout(() => setSuccess(null), 3000);
            load();
          }}
          onClose={() => setModalGestionar(null)}
        />
      )}
    </div>
  );
}