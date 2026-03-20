// src/pages/BrandingPanel.jsx
// Configuración visual de la app CMC
// Guarda en configuracion_evento.tipos_activos.__branding
// El Layout lee estos valores al iniciar y los aplica via style props

import { useState, useEffect } from "react";
import { useAuth }  from "../contexts/AuthContext.jsx";
import { useEvent } from "../contexts/EventContext.jsx";
import API from "../services/api";
import { Save, RefreshCw, Loader2, CheckCircle, AlertCircle, Eye } from "lucide-react";

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

// ── Campo de color ────────────────────────────────────────
function ColorField({ label, field, value, onChange, help }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value || "#000000"}
          onChange={e => onChange(field, e.target.value)}
          className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value || ""}
          onChange={e => onChange(field, e.target.value)}
          placeholder="#000000"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white font-mono"
        />
        {value && (
          <div
            className="w-10 h-10 rounded-lg border border-gray-200 shrink-0"
            style={{ backgroundColor: value }}
          />
        )}
      </div>
      {help && <p className="text-xs text-gray-400 mt-1">{help}</p>}
    </div>
  );
}

// ── Preview del sidebar ───────────────────────────────────
function SidebarPreview({ b }) {
  const menuColor  = b.colorMenu  || "#0d2240";
  const textColor  = b.colorTextoMenu || "#ffffff";
  const logoUrl    = b.logoUrl || "";

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700" style={{ width: 200 }}>
      <div style={{ backgroundColor: menuColor }} className="p-3">
        {logoUrl
          ? <img src={logoUrl} alt="logo" className="h-8 object-contain" onError={e => e.target.style.display='none'} />
          : <div className="text-white font-bold text-sm">CMC App</div>
        }
      </div>
      <div style={{ backgroundColor: menuColor }} className="p-2 space-y-1">
        {['Dashboard','Agenda','Speakers','Expositores','Perfil'].map(item => (
          <div key={item}
            style={{ color: textColor }}
            className="text-xs px-3 py-1.5 rounded-lg opacity-90 hover:opacity-100"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BrandingPanel() {
  const { userProfile } = useAuth();
  const { sedeActiva }  = useEvent();

  const SEDES = ["_global", "mexico", "chile", "colombia"];

  const [sede,    setSede]    = useState("_global");
  const [form,    setForm]    = useState({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState(null);

  // Defaults base
  const DEFAULTS = {
    colorMenu:       "#0d2240",
    colorTextoMenu:  "#ffffff",
    colorHeader:     "#ffffff",
    colorPrimario:   "#1a3a5c",
    colorSecundario: "#e8a020",
    colorBoton:      "#2563eb",
    colorFondo:      "#0a1628",
    colorTexto:      "#ffffff",
    logoUrl:         "",
    logoAlt:         "CMC Latam",
    appNombre:       "CMC App",
    tagline:         "Congreso de Mantenimiento y Confiabilidad",
  };

  // Cargar branding actual
  const load = async () => {
    try {
      setLoading(true);
      const r = await API.get("/branding");
      const map = r.data.branding || {};
      // Fusionar global + sede
      const merged = { ...DEFAULTS, ...(map._global || {}), ...(map[sede] || {}) };
      setForm(merged);
    } catch {
      setError("No se pudo cargar el branding");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [sede]);

  const setF = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const handleSave = async () => {
    try {
      setSaving(true); setError(null); setSuccess(false);
      await API.put(`/branding/${sede}`, form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      // Aplicar en tiempo real
      const root = document.documentElement;
      if (form.colorMenu)       root.style.setProperty('--color-menu',      form.colorMenu);
      if (form.colorPrimario)   root.style.setProperty('--color-primary',   form.colorPrimario);
      if (form.colorSecundario) root.style.setProperty('--color-secondary', form.colorSecundario);
      // Forzar recarga del sidebar
      window.dispatchEvent(new Event('branding-updated'));
    } catch (e) {
      setError(e.response?.data?.error || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(`¿Resetear el branding de "${sede}" a los valores por defecto?`)) return;
    try {
      await API.post(`/branding/reset/${sede}`);
      load();
    } catch { setError("Error al resetear"); }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">🎨 Branding</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Personaliza los colores y logos de la app por sede
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
            <RefreshCw size={18} />
          </button>
          <button onClick={handleReset} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            Reset defaults
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 font-semibold text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-xl text-sm">
          <CheckCircle size={16} /> Branding guardado correctamente. Recarga la página para ver los cambios en el menú.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Selector de sede */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Configurar branding para
        </label>
        <div className="flex flex-wrap gap-2">
          {[{ v:"_global", l:"🌎 Global (base para todas)" }, { v:"mexico", l:"🇲🇽 México" }, { v:"chile", l:"🇨🇱 Chile" }, { v:"colombia", l:"🇨🇴 Colombia" }].map(s => (
            <button key={s.v} onClick={() => setSede(s.v)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition
                ${sede === s.v
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400"}`}>
              {s.l}
            </button>
          ))}
        </div>
        {sede !== "_global" && (
          <p className="text-xs text-gray-400 mt-2">
            💡 Los valores de Global se usan como base. Solo necesitas cambiar lo que difiere por sede.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Editor */}
        <div className="xl:col-span-2 space-y-5">

          {/* Menú lateral */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              📱 Menú lateral (sidebar)
            </h3>
            <ColorField label="Color de fondo del menú" field="colorMenu"
              value={form.colorMenu} onChange={setF}
              help="Color principal del sidebar. Ej: azul marino CMC #0d2240" />
            <ColorField label="Color del texto del menú" field="colorTextoMenu"
              value={form.colorTextoMenu} onChange={setF}
              help="Color de los íconos y nombres del menú" />
          </div>

          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">🔝 Barra superior (header)</h3>
            <ColorField label="Color del header" field="colorHeader"
              value={form.colorHeader} onChange={setF}
              help="Fondo de la barra superior. Vacío = blanco" />
          </div>

          {/* Colores generales */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">🎨 Colores generales</h3>
            <ColorField label="Color primario" field="colorPrimario"
              value={form.colorPrimario} onChange={setF}
              help="Color principal de la marca" />
            <ColorField label="Color secundario / acento" field="colorSecundario"
              value={form.colorSecundario} onChange={setF}
              help="Color de acento. Ej: dorado CMC #e8a020" />
            <ColorField label="Color de botones" field="colorBoton"
              value={form.colorBoton} onChange={setF} />
          </div>

          {/* Login */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">🔐 Pantalla de Login</h3>
            <ColorField label="Color de fondo del login" field="colorFondo"
              value={form.colorFondo} onChange={setF}
              help="Fondo oscuro de la pantalla de inicio de sesión" />
            <ColorField label="Color del texto sobre fondo oscuro" field="colorTexto"
              value={form.colorTexto} onChange={setF} />
          </div>

          {/* Identidad */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">🖼️ Identidad</h3>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">URL del logo</label>
              <input className={inputCls} value={form.logoUrl || ""}
                onChange={e => setF("logoUrl", e.target.value)}
                placeholder="https://..." />
              {form.logoUrl && (
                <img src={form.logoUrl} alt="logo preview"
                  className="mt-2 h-10 object-contain"
                  onError={e => e.target.style.display='none'} />
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nombre del evento</label>
              <input className={inputCls} value={form.appNombre || ""}
                onChange={e => setF("appNombre", e.target.value)}
                placeholder="CMC Latam 2026" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tagline / subtítulo</label>
              <input className={inputCls} value={form.tagline || ""}
                onChange={e => setF("tagline", e.target.value)}
                placeholder="Congreso de Mantenimiento y Confiabilidad" />
            </div>
          </div>
        </div>

        {/* Preview sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 sticky top-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Eye size={16} /> Vista previa del menú
            </h3>
            <SidebarPreview b={form} />
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl text-xs text-blue-700 dark:text-blue-300">
              💡 <strong>Para ver los cambios:</strong> Guarda y recarga la página. El sidebar tomará los nuevos colores inmediatamente.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}