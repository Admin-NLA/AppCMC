// src/pages/Encuestas.jsx
// Sistema híbrido de encuestas CMC
//
// MODOS:
//   • Externa (iframe) — Zoho Forms, Zoho Survey, Microsoft Forms, Google Forms, Typeform
//     El admin pega la URL en el AdminPanel. El usuario la ve embebida en la app.
//   • Nativa — preguntas creadas directamente en la app, respuestas guardadas en DB.
//
// VISTAS POR ROL:
//   • Todos (autenticados) → ven sus encuestas disponibles y las responden
//   • Staff / Super Admin  → ven todas + pueden crear, editar, eliminar

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API from '../services/api';
import {
  ClipboardList, CheckCircle, Clock, Plus, Edit2, Trash2,
  X, Save, AlertCircle, Loader2, ExternalLink, Eye,
  RefreshCw, Globe, FileText, BarChart2, Send, ChevronDown
} from 'lucide-react';

// Para encuestas: solo super_admin ve la vista de gestión. Staff solo ve stats.
const ROLES_ADMIN = ['super_admin'];

// ── Plataformas externas soportadas ─────────────────────────
const PLATAFORMAS = [
  { id: 'zoho_forms',    label: 'Zoho Forms',       hint: 'https://forms.zohopublic.com/...' },
  { id: 'zoho_survey',   label: 'Zoho Survey',      hint: 'https://survey.zoho.com/...' },
  { id: 'google_forms',  label: 'Google Forms',     hint: 'https://docs.google.com/forms/...' },
  { id: 'ms_forms',      label: 'Microsoft Forms',  hint: 'https://forms.office.com/...' },
  { id: 'typeform',      label: 'Typeform',          hint: 'https://form.typeform.com/...' },
  { id: 'otro',          label: 'Otro (URL directa)', hint: 'https://...' },
];

const TIPOS_PASE = [
  { v:'todos',              l:'Todos los roles' },
  { v:'asistente_general',  l:'Asistente General' },
  { v:'asistente_curso',    l:'Asistente Curso' },
  { v:'asistente_sesiones', l:'Asistente Sesiones' },
  { v:'asistente_combo',    l:'Asistente Combo' },
  { v:'expositor',          l:'Expositor' },
  { v:'speaker',            l:'Speaker' },
  { v:'staff',              l:'Staff' },
];

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

// ─────────────────────────────────────────────────────────────
// Componente: Iframe de encuesta externa
// ─────────────────────────────────────────────────────────────
function IframeEncuesta({ encuesta, user, onCompletada, onClose }) {
  const [cargando, setCargando] = useState(true);
  const [marcando, setMarcando] = useState(false);

  // Construir URL con parámetros del usuario pre-llenados
  const buildUrl = () => {
    const base = encuesta.form_url || encuesta.zoho_form_link_name || '';
    if (!base) return '';
    try {
      const url = new URL(base);
      if (user?.email)  url.searchParams.set('email', user.email);
      if (user?.nombre) url.searchParams.set('nombre', user.nombre);
      if (user?.sede)   url.searchParams.set('sede', user.sede);
      return url.toString();
    } catch {
      return base;
    }
  };

  const handleCompletar = async () => {
    setMarcando(true);
    try {
      await API.post(`/encuestas/${encuesta.id}/completada`);
      onCompletada();
    } catch (e) {
      console.error(e);
    } finally {
      setMarcando(false);
    }
  };

  const url = buildUrl();

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col">
      {/* Header del modal */}
      <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between gap-3 shadow">
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 dark:text-white truncate">{encuesta.nombre}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{url}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Abrir en nueva pestaña como alternativa */}
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
            <ExternalLink size={13} /> Abrir en nueva pestaña
          </a>
          {/* Botón "Ya completé la encuesta" */}
          <button
            onClick={handleCompletar}
            disabled={marcando}
            className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50">
            {marcando ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
            Ya la completé
          </button>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Iframe */}
      <div className="flex-1 relative bg-gray-100 dark:bg-gray-900">
        {cargando && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Loader2 className="animate-spin mx-auto mb-2" size={32} />
              <p className="text-sm">Cargando formulario...</p>
            </div>
          </div>
        )}
        {url ? (
          <iframe
            src={url}
            className="w-full h-full border-0"
            onLoad={() => setCargando(false)}
            title={encuesta.nombre}
            allow="camera; microphone"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <AlertCircle size={40} className="mx-auto mb-2 text-red-400" />
              <p className="font-semibold">URL del formulario no configurada</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Componente: Encuesta nativa (preguntas en la app)
// ─────────────────────────────────────────────────────────────
function EncuestaNativa({ encuesta, onCompletada, onClose }) {
  const preguntas = encuesta.preguntas || [];
  const [respuestas, setRespuestas] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const setR = (id, val) => setRespuestas(p => ({ ...p, [id]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const faltantes = preguntas.filter(p => p.requerida && !respuestas[p.id]);
    if (faltantes.length > 0) {
      setError(`Responde: ${faltantes.map(p => p.texto).join(', ')}`);
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await API.post(`/encuestas/${encuesta.id}/responder`, { respuestas });
      onCompletada();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b dark:border-gray-700 flex justify-between items-start">
          <div>
            <h2 className="font-bold text-lg dark:text-white">{encuesta.nombre}</h2>
            {encuesta.descripcion && <p className="text-sm text-gray-500 mt-0.5">{encuesta.descripcion}</p>}
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {preguntas.length === 0 ? (
            <p className="text-gray-500 text-center py-6">Esta encuesta no tiene preguntas configuradas aún.</p>
          ) : (
            preguntas.map(preg => (
              <div key={preg.id} className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {preg.texto}
                  {preg.requerida && <span className="text-red-500 ml-1">*</span>}
                </label>

                {preg.tipo === 'opcion_multiple' && (
                  <div className="space-y-1">
                    {(preg.opciones || []).map(op => (
                      <label key={op} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                        <input type="radio" name={preg.id} value={op}
                          checked={respuestas[preg.id] === op}
                          onChange={() => setR(preg.id, op)}
                          className="accent-blue-600" />
                        {op}
                      </label>
                    ))}
                  </div>
                )}

                {preg.tipo === 'escala' && (
                  <div className="flex gap-2 flex-wrap">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button"
                        onClick={() => setR(preg.id, n)}
                        className={`w-10 h-10 rounded-full text-sm font-bold border-2 transition
                          ${respuestas[preg.id] === n
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                        {n}
                      </button>
                    ))}
                    <span className="text-xs text-gray-400 self-center ml-1">1=Malo · 5=Excelente</span>
                  </div>
                )}

                {preg.tipo === 'si_no' && (
                  <div className="flex gap-3">
                    {['Sí','No'].map(op => (
                      <button key={op} type="button"
                        onClick={() => setR(preg.id, op)}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold border-2 transition
                          ${respuestas[preg.id] === op
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                        {op}
                      </button>
                    ))}
                  </div>
                )}

                {preg.tipo === 'texto_libre' && (
                  <textarea rows={3} value={respuestas[preg.id] || ''}
                    onChange={e => setR(preg.id, e.target.value)}
                    placeholder="Escribe tu respuesta..."
                    className={inputCls} />
                )}
              </div>
            ))
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-xl">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={enviando}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {enviando ? 'Enviando...' : 'Enviar respuesta'}
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
// Componente: Multi-select de roles (toggle de chips)
// ─────────────────────────────────────────────────────────────
function RolMultiSelect({ value, onChange }) {
  const arr = Array.isArray(value) ? value : (value ? value.split(',').map(s=>s.trim()) : ['todos']);

  const toggle = (v) => {
    if (v === 'todos') { onChange(['todos']); return; }
    let next = arr.filter(r => r !== 'todos');
    next = next.includes(v) ? next.filter(r => r !== v) : [...next, v];
    onChange(next.length === 0 ? ['todos'] : next);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {TIPOS_PASE.map(t => {
          const active = arr.includes(t.v) || (t.v === 'todos' && (arr.length === 0 || arr[0] === 'todos'));
          return (
            <button key={t.v} type="button" onClick={() => toggle(t.v)}
              className={`text-xs px-3 py-1.5 rounded-xl border-2 font-medium transition select-none
                ${active
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'}`}>
              {t.l}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-400">
        Seleccionado: <span className="font-medium">{arr.join(', ')}</span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Componente: Formulario admin para crear/editar encuesta
// ─────────────────────────────────────────────────────────────
function FormEncuesta({ encuesta, onSave, onCancel }) {
  const blank = {
    fuente: 'externa', nombre: '', descripcion: '',
    form_url: '', plataforma: 'zoho_forms',
    tipo: 'general', rol_permitido: ['todos'],
    sede: '', edicion: new Date().getFullYear(),
    activa: true, obligatoria: false,
    fecha_inicio: '', fecha_fin: '',
    entidad_id: '',   // UUID de sesión o curso específico
    // Nativa
    preguntas: [], tipo_pase: ['todos'],
  };

  const [form, setForm] = useState(encuesta ? {
    ...blank,
    fuente:        encuesta.fuente || 'externa',
    nombre:        encuesta.nombre || encuesta.titulo || '',
    descripcion:   encuesta.descripcion || '',
    form_url:      encuesta.form_url || encuesta.zoho_form_link_name || '',
    tipo:          encuesta.tipo || 'general',
    rol_permitido: Array.isArray(encuesta.rol_permitido)
      ? encuesta.rol_permitido
      : encuesta.rol_permitido ? encuesta.rol_permitido.split(',').map(s=>s.trim()) : ['todos'],
    sede:          encuesta.sede || '',
    edicion:       encuesta.edicion || new Date().getFullYear(),
    activa:        encuesta.activa !== false,
    obligatoria:   encuesta.obligatoria || false,
    preguntas:     encuesta.preguntas || [],
    tipo_pase: Array.isArray(encuesta.tipo_pase)
      ? encuesta.tipo_pase
      : encuesta.tipo_pase ? encuesta.tipo_pase.split(',').map(s=>s.trim()) : ['todos'],
    entidad_id: encuesta.entidad_id || '',
  } : blank);

  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);
  const [sesiones,  setSesiones]  = useState([]);

  // Cargar sesiones para el selector
  useEffect(() => {
    API.get('/agenda/sessions').then(r => {
      const list = Array.isArray(r.data.sessions) ? r.data.sessions : [];
      setSesiones(list);
    }).catch(() => {});
  }, []);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addPregunta = () => setForm(p => ({
    ...p,
    preguntas: [...p.preguntas, {
      id: `p_${Date.now()}`, texto: '', tipo: 'opcion_multiple',
      opciones: ['Excelente','Bueno','Regular','Malo'], requerida: true
    }]
  }));

  const updPregunta = (idx, key, val) => setForm(p => {
    const arr = [...p.preguntas];
    arr[idx] = { ...arr[idx], [key]: val };
    return { ...p, preguntas: arr };
  });

  const delPregunta = (idx) => setForm(p => ({
    ...p, preguntas: p.preguntas.filter((_, i) => i !== idx)
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre) { setError('El nombre es requerido'); return; }
    if (form.fuente === 'externa' && !form.form_url) { setError('La URL del formulario es requerida'); return; }
    setSaving(true); setError(null);
    try {
      // Convertir arrays de roles a string CSV para guardar en DB
      const toStr = v => Array.isArray(v) ? v.join(',') : (v || 'todos');
      const payload = { ...form, rol_permitido: toStr(form.rol_permitido), tipo_pase: toStr(form.tipo_pase) };
      if (encuesta?.id) {
        await API.put(`/encuestas/${encuesta.id}`, payload);
      } else {
        await API.post('/encuestas', payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const plataformaActual = PLATAFORMAS.find(p => p.id === form.plataforma) || PLATAFORMAS[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="font-bold text-lg dark:text-white">
            {encuesta ? 'Editar encuesta' : 'Nueva encuesta'}
          </h2>
          <button onClick={onCancel}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Tipo de encuesta */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
              Tipo de encuesta
            </label>
            <div className="flex gap-2">
              {[
                { v:'externa', l:'🔗 Externa (iframe)', desc:'Zoho, Google, Microsoft, etc.' },
                { v:'nativa',  l:'📝 Nativa (en la app)', desc:'Preguntas propias en CMC' },
              ].map(t => (
                <button key={t.v} type="button"
                  onClick={() => setF('fuente', t.v)}
                  className={`flex-1 p-3 rounded-xl border-2 text-left transition
                    ${form.fuente === t.v
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'}`}>
                  <p className={`text-sm font-semibold ${form.fuente===t.v ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>{t.l}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Nombre y descripción */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Nombre *</label>
              <input className={inputCls} value={form.nombre}
                onChange={e => setF('nombre', e.target.value)}
                placeholder="Ej: Encuesta post-sesión CMC 2026" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Descripción</label>
              <textarea className={inputCls} rows={2} value={form.descripcion}
                onChange={e => setF('descripcion', e.target.value)}
                placeholder="Breve descripción visible para el usuario..." />
            </div>
          </div>

          {/* ── CAMPOS EXTERNOS ── */}
          {form.fuente === 'externa' && (
            <div className="space-y-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                  Plataforma
                </label>
                <select className={inputCls} value={form.plataforma}
                  onChange={e => setF('plataforma', e.target.value)}>
                  {PLATAFORMAS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                  URL del formulario *
                </label>
                <input type="url" className={inputCls} value={form.form_url}
                  onChange={e => setF('form_url', e.target.value)}
                  placeholder={plataformaActual.hint} required={form.fuente === 'externa'} />
                <p className="text-xs text-gray-400 mt-1">
                  💡 La URL debe ser la URL de <strong>embed</strong> o <strong>publicación</strong> del formulario.
                  Asegúrate de que el formulario sea público/sin login.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Tipo</label>
                  <select className={inputCls} value={form.tipo}
                    onChange={e => { setF('tipo', e.target.value); setF('entidad_id', ''); }}>
                    {['general','sesion','curso','expositor'].map(t =>
                      <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>
                    )}
                  </select>
                </div>
                {/* Sesión o curso específico */}
                {(form.tipo === 'sesion' || form.tipo === 'curso') && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                      {form.tipo === 'sesion' ? '🎯 Sesión específica' : '🎯 Curso específico'}
                      <span className="text-gray-400 font-normal ml-1">(opcional)</span>
                    </label>
                    <select className={inputCls} value={form.entidad_id} onChange={e => setF('entidad_id', e.target.value)}>
                      <option value="">— Aplica a todas —</option>
                      {sesiones
                        .filter(s => form.tipo === 'curso' ? s.tipo === 'curso' : s.tipo !== 'curso')
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.titulo || s.title || 'Sin título'}
                            {s.dia ? ` · Día ${s.dia}` : ''}
                            {s.sala ? ` · ${s.sala}` : ''}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                    Visible para <span className="text-gray-400 font-normal">(puedes elegir varios)</span>
                  </label>
                  <RolMultiSelect
                    value={form.rol_permitido}
                    onChange={v => setF('rol_permitido', v)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Sede</label>
                  <input className={inputCls} value={form.sede} onChange={e => setF('sede', e.target.value)}
                    placeholder="mexico / colombia / todas" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Edición</label>
                  <input type="number" className={inputCls} value={form.edicion}
                    onChange={e => setF('edicion', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Fecha inicio</label>
                  <input type="datetime-local" className={inputCls} value={form.fecha_inicio}
                    onChange={e => setF('fecha_inicio', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Fecha fin</label>
                  <input type="datetime-local" className={inputCls} value={form.fecha_fin}
                    onChange={e => setF('fecha_fin', e.target.value)} />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={form.activa} onChange={e => setF('activa', e.target.checked)}
                    className="w-4 h-4 accent-blue-600" />
                  Activa
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={form.obligatoria} onChange={e => setF('obligatoria', e.target.checked)}
                    className="w-4 h-4 accent-red-500" />
                  Obligatoria
                </label>
              </div>
            </div>
          )}

          {/* ── CAMPOS NATIVOS ── */}
          {form.fuente === 'nativa' && (
            <div className="space-y-3 bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-100 dark:border-green-800">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                  Visible para <span className="text-gray-400 font-normal">(puedes elegir varios)</span>
                </label>
                <RolMultiSelect
                  value={form.tipo_pase}
                  onChange={v => setF('tipo_pase', v)}
                />
              </div>

              {/* Preguntas */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                    Preguntas ({form.preguntas.length})
                  </label>
                  <button type="button" onClick={addPregunta}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                    <Plus size={14} /> Agregar pregunta
                  </button>
                </div>
                <div className="space-y-3">
                  {form.preguntas.map((preg, idx) => (
                    <div key={preg.id} className="bg-white dark:bg-gray-700/50 rounded-xl p-3 border dark:border-gray-600">
                      <div className="flex gap-2 mb-2">
                        <input value={preg.texto}
                          onChange={e => updPregunta(idx, 'texto', e.target.value)}
                          placeholder={`Pregunta ${idx+1}`}
                          className="flex-1 px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-500 dark:text-white" />
                        <button type="button" onClick={() => delPregunta(idx)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="flex gap-2 flex-wrap items-center">
                        <select value={preg.tipo} onChange={e => updPregunta(idx,'tipo',e.target.value)}
                          className="px-2 py-1 text-xs border rounded-lg dark:bg-gray-700 dark:border-gray-500 dark:text-white">
                          <option value="opcion_multiple">Opción múltiple</option>
                          <option value="escala">Escala 1-5</option>
                          <option value="si_no">Sí / No</option>
                          <option value="texto_libre">Texto libre</option>
                        </select>
                        <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                          <input type="checkbox" checked={preg.requerida}
                            onChange={e => updPregunta(idx,'requerida',e.target.checked)} />
                          Requerida
                        </label>
                      </div>
                      {preg.tipo === 'opcion_multiple' && (
                        <div className="mt-2">
                          <input value={(preg.opciones||[]).join(', ')}
                            onChange={e => updPregunta(idx,'opciones',e.target.value.split(',').map(s=>s.trim()).filter(Boolean))}
                            placeholder="Opciones separadas por coma"
                            className="w-full px-2 py-1 text-xs border rounded-lg dark:bg-gray-700 dark:border-gray-500 dark:text-white" />
                          <p className="text-xs text-gray-400 mt-0.5">Ej: Excelente, Bueno, Regular, Malo</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {form.preguntas.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">
                      Agrega al menos una pregunta para la encuesta nativa
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-xl">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando...' : (encuesta ? 'Actualizar' : 'Crear encuesta')}
            </button>
            <button type="button" onClick={onCancel}
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
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function Encuestas() {
  const { userProfile } = useAuth();

  const [encuestas,   setEncuestas]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // Modales
  const [iframeEnc,   setIframeEnc]   = useState(null); // encuesta en iframe
  const [nativaEnc,   setNativaEnc]   = useState(null); // encuesta nativa
  const [editando,    setEditando]     = useState(null); // null | true | encuesta
  const [success,     setSuccess]     = useState(null);

  const esAdmin = ROLES_ADMIN.includes(userProfile?.rol);

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const endpoint = esAdmin ? '/encuestas/admin' : '/encuestas/disponibles';
      const r = await API.get(endpoint);
      setEncuestas(r.data.encuestas || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (userProfile) load(); }, [userProfile]);

  const handleAbrir = (enc) => {
    if (enc.fuente === 'nativa') {
      setNativaEnc(enc);
    } else {
      setIframeEnc(enc);
    }
  };

  const handleCompletada = (msg) => {
    setIframeEnc(null);
    setNativaEnc(null);
    setSuccess(msg || '¡Gracias por completar la encuesta!');
    setTimeout(() => setSuccess(null), 4000);
    load();
  };

  const handleDelete = async (enc) => {
    if (!confirm(`¿Eliminar "${enc.nombre}"?`)) return;
    try {
      await API.delete(`/encuestas/${enc.id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  // Separar pendientes y respondidas (para usuarios)
  const pendientes  = encuestas.filter(e => !e.ya_respondio);
  const respondidas = encuestas.filter(e =>  e.ya_respondio);

  // Badge de plataforma
  const badgePlataforma = (enc) => {
    const url = enc.form_url || enc.zoho_form_link_name || '';
    if (url.includes('zoho'))     return { label: 'Zoho', color: 'bg-orange-100 text-orange-700' };
    if (url.includes('google'))   return { label: 'Google Forms', color: 'bg-red-100 text-red-700' };
    if (url.includes('office') || url.includes('microsoft')) return { label: 'Microsoft Forms', color: 'bg-blue-100 text-blue-700' };
    if (url.includes('typeform')) return { label: 'Typeform', color: 'bg-purple-100 text-purple-700' };
    if (enc.fuente === 'nativa')  return { label: 'CMC Nativa', color: 'bg-green-100 text-green-700' };
    return { label: 'Externa', color: 'bg-gray-100 text-gray-600' };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="text-blue-600" size={26} />
            Encuestas
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {esAdmin
              ? `${encuestas.length} encuestas registradas`
              : `${pendientes.length} pendientes · ${respondidas.length} completadas`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
            <RefreshCw size={18} />
          </button>
          {userProfile?.rol === 'super_admin' && (
            <button onClick={() => setEditando(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 font-semibold text-sm transition">
              <Plus size={16} /> Nueva encuesta
            </button>
          )}
        </div>
      </div>

      {/* Success */}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-xl text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : encuestas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList size={52} className="mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-lg">
            {esAdmin ? 'No hay encuestas creadas' : 'No tienes encuestas disponibles'}
          </p>
          <p className="text-sm mt-1">
            {esAdmin
              ? 'Crea la primera con el botón "Nueva encuesta"'
              : 'Las encuestas aparecerán aquí conforme asistas al evento'}
          </p>
        </div>
      ) : esAdmin ? (
        // ── Vista Admin: tabla de todas las encuestas ──
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['Nombre','Tipo / Sesión','Plataforma','Rol','Estado','Resp.',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {encuestas.map(enc => {
                  const badge = badgePlataforma(enc);
                  return (
                    <tr key={enc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-white">{enc.nombre}</p>
                        {enc.descripcion && <p className="text-xs text-gray-400 truncate max-w-48">{enc.descripcion}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 capitalize">{enc.tipo || enc.tipo_pase || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs capitalize">
                        {enc.rol_permitido || enc.tipo_pase || 'todos'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          enc.activa !== false
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {enc.activa !== false ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-blue-600">{enc.total_respuestas || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => handleAbrir(enc)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition" title="Vista previa">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => setEditando(enc)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition" title="Editar">
                            <Edit2 size={15} />
                          </button>
                          {userProfile?.rol === 'super_admin' && (
                            <button onClick={() => handleDelete(enc)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Eliminar">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // ── Vista Usuario: pendientes primero, luego respondidas ──
        <div className="space-y-6">
          {pendientes.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock size={14} className="text-orange-500" /> Pendientes ({pendientes.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendientes.map(enc => <EncuestaCard key={enc.id} enc={enc} onAbrir={handleAbrir} badgeFn={badgePlataforma} />)}
              </div>
            </section>
          )}
          {respondidas.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" /> Completadas ({respondidas.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {respondidas.map(enc => <EncuestaCard key={enc.id} enc={enc} onAbrir={null} badgeFn={badgePlataforma} respondida />)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modales */}
      {iframeEnc && (
        <IframeEncuesta
          encuesta={iframeEnc}
          user={userProfile}
          onCompletada={() => handleCompletada()}
          onClose={() => setIframeEnc(null)}
        />
      )}
      {nativaEnc && (
        <EncuestaNativa
          encuesta={nativaEnc}
          onCompletada={() => handleCompletada()}
          onClose={() => setNativaEnc(null)}
        />
      )}
      {editando && (
        <FormEncuesta
          encuesta={editando === true ? null : editando}
          onSave={() => { setEditando(null); load(); setSuccess('Encuesta guardada correctamente'); setTimeout(()=>setSuccess(null),3000); }}
          onCancel={() => setEditando(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Componente: Card de encuesta (vista usuario)
// ─────────────────────────────────────────────────────────────
function EncuestaCard({ enc, onAbrir, badgeFn, respondida = false }) {
  const badge = badgeFn(enc);
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 transition hover:shadow-md ${respondida ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>{badge.label}</span>
        {enc.obligatoria && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Obligatoria</span>
        )}
        {respondida && (
          <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
            <CheckCircle size={12} /> Completada
          </span>
        )}
      </div>

      <h3 className="font-bold text-gray-900 dark:text-white mb-1">{enc.nombre}</h3>
      {enc.descripcion && <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{enc.descripcion}</p>}

      <div className="flex flex-wrap gap-2 text-xs text-gray-400 mb-4">
        {enc.tipo && <span className="capitalize">📋 {enc.tipo}</span>}
        {enc.sesion_titulo && (
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            🎯 {enc.sesion_titulo}{enc.sesion_dia ? ` · Día ${enc.sesion_dia}` : ''}
          </span>
        )}
        {enc.sede && <span>📍 {enc.sede}</span>}
        {enc.fecha_fin && <span>⏰ Vence: {new Date(enc.fecha_fin).toLocaleDateString('es')}</span>}
      </div>

      {!respondida && onAbrir && (
        <button onClick={() => onAbrir(enc)}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition text-sm">
          {enc.fuente === 'nativa' ? <FileText size={15} /> : <Globe size={15} />}
          {enc.fuente === 'nativa' ? 'Responder encuesta' : 'Abrir formulario'}
        </button>
      )}
    </div>
  );
}