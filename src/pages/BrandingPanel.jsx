// src/pages/BrandingPanel.jsx
// Panel de personalización visual — estilo Wix/WordPress
// Solo accesible para super_admin
// Permite personalizar: colores, logo, textos, fuente, bordes
// por sede (_global, mexico, chile, colombia)

import { useState, useEffect, useRef } from "react";
import API from "../services/api";
import {
  Palette, Image, Type, Globe, RotateCcw, Save,
  Eye, ChevronDown, CheckCircle, AlertCircle, Loader2,
  Monitor, Smartphone, Sun
} from "lucide-react";

// ── Sedes disponibles ────────────────────────────────────
const SEDES = [
  { id: "_global",  label: "🌐 Global (todas las sedes)", color: "#6366f1" },
  { id: "mexico",   label: "🇲🇽 México",                  color: "#ef4444" },
  { id: "chile",    label: "🇨🇱 Chile",                   color: "#3b82f6" },
  { id: "colombia", label: "🇨🇴 Colombia",                 color: "#f59e0b" },
];

const FUENTES = ["Inter", "Roboto", "Poppins", "Montserrat", "Open Sans", "Lato"];
const RADIOS  = [
  { id: "sm",  label: "Cuadrado" },
  { id: "md",  label: "Suave" },
  { id: "lg",  label: "Redondeado" },
  { id: "xl",  label: "Muy redondeado" },
  { id: "2xl", label: "Circular" },
];

// ── Campo de color con preview ───────────────────────────
function ColorField({ label, value, onChange, help }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value || "#000000"}
            onChange={e => onChange(e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer p-0.5"
          />
        </div>
        <input
          type="text"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono"
        />
      </div>
      {help && <p className="text-xs text-gray-400 mt-1">{help}</p>}
    </div>
  );
}

// ── Preview de la app ─────────────────────────────────────
function AppPreview({ branding, device }) {
  const b = branding || {};
  const isMobile = device === "mobile";

  const styles = {
    "--color-primario":   b.colorPrimario   || "#1a3a5c",
    "--color-secundario": b.colorSecundario || "#e8a020",
    "--color-fondo":      b.colorFondo      || "#0a1628",
    "--color-menu":       b.colorMenu       || "#0d2240",
    "--color-texto":      b.colorTexto      || "#ffffff",
    "--color-texto-menu": b.colorTextoMenu  || "#ffffff",
  };

  return (
    <div
      className={`border-4 border-gray-800 rounded-2xl overflow-hidden shadow-2xl mx-auto transition-all duration-300
        ${isMobile ? "w-[280px]" : "w-full max-w-[520px]"}`}
      style={{ fontFamily: b.fuente || "Inter" }}
    >
      {/* Login preview */}
      <div
        className="p-6 flex flex-col items-center"
        style={{ background: `linear-gradient(135deg, ${b.colorFondo||"#0a1628"}, ${b.colorPrimario||"#1a3a5c"})` }}
      >
        {b.logoUrl ? (
          <img
            src={b.logoUrl}
            alt={b.logoAlt || "Logo"}
            className="h-10 object-contain mb-2"
            onError={e => { e.target.style.display="none"; }}
          />
        ) : (
          <div className="h-10 flex items-center mb-2">
            <span className="text-2xl font-black" style={{ color: b.colorTexto||"#fff" }}>
              {b.appNombre || "CMC App"}
            </span>
          </div>
        )}
        <p className="text-xs text-center mb-4 opacity-70" style={{ color: b.colorTexto||"#fff" }}>
          {b.tagline || "Congreso de Mantenimiento"}
        </p>
        <div className="w-full bg-white/10 backdrop-blur rounded-xl p-4 space-y-2 border border-white/20">
          <p className="text-xs font-bold text-center mb-3" style={{ color: b.colorTexto||"#fff" }}>
            Acceso a la App
          </p>
          <div className="h-7 bg-white/10 rounded-lg" />
          <div className="h-7 bg-white/10 rounded-lg" />
          <div
            className="h-8 rounded-lg flex items-center justify-center text-xs font-bold mt-1"
            style={{
              background: b.colorSecundario || "#e8a020",
              color: "#fff",
              borderRadius: { sm:"4px", md:"8px", lg:"12px", xl:"16px", "2xl":"24px" }[b.borderRadius||"xl"]
            }}
          >
            Ingresar
          </div>
        </div>
      </div>

      {/* Sidebar preview */}
      <div className="flex" style={{ background: "#f3f4f6", minHeight: "100px" }}>
        <div
          className="flex flex-col gap-1 p-2"
          style={{ background: b.colorMenu || "#0d2240", width: "80px" }}
        >
          {b.logoUrl && (
            <img src={b.logoUrl} alt="logo"
              className="w-full h-6 object-contain mb-1"
              onError={e => e.target.style.display='none'} />
          )}
          {["☰","📅","👥","🗺️","🔔"].map((ic,i) => (
            <div key={i}
              className="h-7 rounded flex items-center justify-center text-xs"
              style={{
                background: i === 0 ? b.colorSecundario || "#e8a020" : "rgba(255,255,255,0.1)",
                color: b.colorTextoMenu || "#fff"
              }}
            >
              {ic}
            </div>
          ))}
        </div>
        <div className="flex-1 p-3 space-y-2">
          <div className="h-4 bg-gray-300 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-12 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full" style={{ background: b.colorPrimario||"#1a3a5c", opacity: 0.6 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────
export default function BrandingPanel() {
  const [sedeActiva, setSedeActiva]   = useState("_global");
  const [brandingMap, setBrandingMap] = useState({});
  const [form, setForm]               = useState({});
  const [loading, setLoading]         = useState(true);
  const [saving,  setSaving]          = useState(false);
  const [error,   setError]           = useState(null);
  const [success, setSuccess]         = useState(false);
  const [device,  setDevice]          = useState("desktop");
  const [tab,     setTab]             = useState("colores"); // colores | identidad | tipografia | avanzado

  // Cargar branding actual
  const load = async () => {
    try {
      setLoading(true);
      const r = await API.get("/branding");
      const map = r.data.branding || {};
      setBrandingMap(map);
      setForm(map[sedeActiva] || map._global || {});
    } catch (err) {
      setError("No se pudo cargar la configuración de branding");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    // Al cambiar sede, cargar su branding fusionado con global
    if (Object.keys(brandingMap).length > 0) {
      const global = brandingMap._global || {};
      const sedes  = brandingMap[sedeActiva] || {};
      setForm({ ...global, ...sedes });
    }
  }, [sedeActiva, brandingMap]);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await API.put(`/branding/${sedeActiva}`, form);
      setSuccess(true);
      // Actualizar mapa local
      setBrandingMap(p => ({ ...p, [sedeActiva]: form }));
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(`¿Resetear el branding de ${sedeActiva} a los valores por defecto?`)) return;
    try {
      setSaving(true);
      await API.post(`/branding/reset/${sedeActiva}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Palette className="text-purple-600" size={26} />
            Branding & Personalización
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Personaliza la apariencia de la app por sede o evento
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RotateCcw size={16} /> Resetear
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 text-sm bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 disabled:opacity-50 font-semibold"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
          <AlertCircle size={16} />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 p-4 rounded-xl text-sm">
          <CheckCircle size={16} />¡Branding guardado correctamente!
        </div>
      )}

      {/* Selector de sede */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Globe size={14} /> Sede a personalizar
        </p>
        <div className="flex flex-wrap gap-2">
          {SEDES.map(s => (
            <button
              key={s.id}
              onClick={() => setSedeActiva(s.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition
                ${sedeActiva === s.id
                  ? "text-white border-transparent"
                  : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400"}`}
              style={sedeActiva === s.id ? { background: s.color, borderColor: s.color } : {}}
            >
              {s.label}
            </button>
          ))}
        </div>
        {sedeActiva !== "_global" && (
          <p className="text-xs text-gray-400 mt-2">
            💡 Los valores de <strong>Global</strong> se usan como base. Solo necesitas sobreescribir lo que cambia por sede.
          </p>
        )}
      </div>

      {/* Main layout: editor + preview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── Editor ── */}
        <div className="space-y-4">

          {/* Tabs del editor */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {[
                { id:"colores",    label:"🎨 Colores" },
                { id:"identidad",  label:"🖼️ Identidad" },
                { id:"app",        label:"📱 App" },
                { id:"tipografia", label:"✏️ Tipografía" },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 py-3 text-sm font-semibold transition
                    ${tab === t.id
                      ? "border-b-2 border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">

              {/* ── Tab: Colores ── */}
              {tab === "colores" && (
                <>
                  <ColorField label="Color primario (fondo, header)"
                    value={form.colorPrimario}
                    onChange={v => setF("colorPrimario", v)}
                    help="Color principal de la app. Ej: azul marino CMC" />
                  <ColorField label="Color secundario (botones, acento)"
                    value={form.colorSecundario}
                    onChange={v => setF("colorSecundario", v)}
                    help="Color de botones y elementos destacados. Ej: dorado CMC" />
                  <ColorField label="Color de fondo (login)"
                    value={form.colorFondo}
                    onChange={v => setF("colorFondo", v)}
                    help="Fondo oscuro de la pantalla de login" />
                  <ColorField label="Color del menú lateral"
                    value={form.colorMenu}
                    onChange={v => setF("colorMenu", v)}
                    help="Fondo del sidebar de navegación" />
                  <ColorField label="Color del texto del menú"
                    value={form.colorTextoMenu}
                    onChange={v => setF("colorTextoMenu", v)}
                    help="Color de los ítems del menú. Usa blanco (#ffffff) sobre fondos oscuros, negro (#000000) sobre fondos claros" />
                  <ColorField label="Color de texto (sobre fondo oscuro)"
                    value={form.colorTexto}
                    onChange={v => setF("colorTexto", v)}
                    help="Texto sobre fondos oscuros. Generalmente blanco." />

                  {/* Paletas preset */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Paletas rápidas</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label:"CMC Original", colors:{ colorPrimario:"#1a3a5c", colorSecundario:"#e8a020", colorFondo:"#0a1628", colorMenu:"#0d2240" } },
                        { label:"Azul Noche",   colors:{ colorPrimario:"#1e3a8a", colorSecundario:"#60a5fa", colorFondo:"#0f172a", colorMenu:"#1e3a8a" } },
                        { label:"Verde Bosque", colors:{ colorPrimario:"#14532d", colorSecundario:"#4ade80", colorFondo:"#052e16", colorMenu:"#166534" } },
                        { label:"Rojo Corp",    colors:{ colorPrimario:"#ffffff", colorSecundario:"#f87171", colorFondo:"#450a0a", colorMenu:"#991b1b" } },
                        { label:"Morado Tech",  colors:{ colorPrimario:"#3b0764", colorSecundario:"#a855f7", colorFondo:"#1a0332", colorMenu:"#581c87" } },
                        { label:"Gris Oscuro",  colors:{ colorPrimario:"#1f2937", colorSecundario:"#6b7280", colorFondo:"#111827", colorMenu:"#374151" } },
                      ].map(preset => (
                        <button key={preset.label}
                          onClick={() => setForm(p => ({ ...p, ...preset.colors }))}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <span className="flex gap-0.5">
                            {Object.values(preset.colors).slice(0,3).map((c,i) => (
                              <span key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
                            ))}
                          </span>
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Tab: Identidad ── */}
              {/* ── Tab: App (colores de la interfaz completa) ── */}
              {tab === "app" && (
                <>
                  <ColorField label="Color del sidebar / menú"
                    value={form.colorMenu}
                    onChange={v => setF("colorMenu", v)}
                    help="Fondo del menú lateral de la app" />
                  <ColorField label="Color de texto del menú"
                    value={form.colorTextoMenu}
                    onChange={v => setF("colorTextoMenu", v)}
                    help="Color del texto de las opciones del menú" />
                  <ColorField label="Color del header"
                    value={form.colorHeader}
                    onChange={v => setF("colorHeader", v)}
                    help="Barra superior de la app" />
                  <ColorField label="Color de fondo de la app"
                    value={form.colorFondoApp}
                    onChange={v => setF("colorFondoApp", v)}
                    help="Fondo principal de las páginas internas" />
                  <ColorField label="Color de botones primarios"
                    value={form.colorBoton}
                    onChange={v => setF("colorBoton", v)}
                    help="Color de los botones de acción principales" />
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Nombre del evento en la app
                    </label>
                    <input className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white"
                      value={form.nombreEvento || ''}
                      onChange={e => setF('nombreEvento', e.target.value)}
                      placeholder="CMC Latam 2026" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Tagline / subtítulo
                    </label>
                    <input className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white"
                      value={form.tagline || ''}
                      onChange={e => setF('tagline', e.target.value)}
                      placeholder="Congreso de Mantenimiento y Confiabilidad" />
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
                    💡 Los cambios de color en App se aplican en tiempo real al guardar. Si no ves los cambios, recarga la página.
                  </div>
                </>
              )}

              {tab === "identidad" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">URL del logo</label>
                    <input value={form.logoUrl || ""} onChange={e => setF("logoUrl", e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                    <p className="text-xs text-gray-400 mt-1">PNG o SVG con fondo transparente. Recomendado: versión blanca del logo.</p>
                    {form.logoUrl && (
                      <div className="mt-2 p-3 rounded-xl" style={{ background: form.colorPrimario || "#1a3a5c" }}>
                        <img src={form.logoUrl} alt="Preview" className="h-10 object-contain"
                          onError={e => { e.target.style.display="none"; }} />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Texto alternativo del logo</label>
                    <input value={form.logoAlt || ""} onChange={e => setF("logoAlt", e.target.value)}
                      placeholder="CMC Latam"
                      className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Nombre de la app</label>
                    <input value={form.appNombre || ""} onChange={e => setF("appNombre", e.target.value)}
                      placeholder="CMC App"
                      className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                    <p className="text-xs text-gray-400 mt-1">Aparece en el header y en el sidebar.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Tagline</label>
                    <input value={form.tagline || ""} onChange={e => setF("tagline", e.target.value)}
                      placeholder="Congreso de Mantenimiento y Confiabilidad"
                      className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Texto del footer</label>
                    <input value={form.footerTexto || ""} onChange={e => setF("footerTexto", e.target.value)}
                      placeholder="© CMC Latam · Todos los derechos reservados"
                      className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Imagen de fondo (opcional)</label>
                    <input value={form.imagenFondo || ""} onChange={e => setF("imagenFondo", e.target.value)}
                      placeholder="https://... (URL de imagen para el fondo del login)"
                      className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                  </div>
                </>
              )}

              {/* ── Tab: Tipografía ── */}
              {tab === "tipografia" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Fuente principal</label>
                    <div className="grid grid-cols-2 gap-2">
                      {FUENTES.map(f => (
                        <button key={f} onClick={() => setF("fuente", f)}
                          className={`px-4 py-3 rounded-xl border-2 text-sm transition
                            ${form.fuente === f
                              ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-semibold"
                              : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400"}`}
                          style={{ fontFamily: f }}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">Estilo de bordes</label>
                    <div className="flex flex-wrap gap-2">
                      {RADIOS.map(r => (
                        <button key={r.id} onClick={() => setF("borderRadius", r.id)}
                          className={`px-4 py-2 text-sm border-2 transition
                            ${form.borderRadius === r.id
                              ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 font-semibold"
                              : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400"}`}
                          style={{ borderRadius: { sm:"4px", md:"8px", lg:"12px", xl:"16px", "2xl":"24px" }[r.id] }}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>

        {/* ── Preview ── */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Eye size={14} /> Vista previa en tiempo real
              </p>
              <div className="flex gap-1">
                {[
                  { id:"desktop", icon:<Monitor size={14} /> },
                  { id:"mobile",  icon:<Smartphone size={14} /> },
                ].map(d => (
                  <button key={d.id} onClick={() => setDevice(d.id)}
                    className={`p-2 rounded-lg transition
                      ${device === d.id
                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600"
                        : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                  >
                    {d.icon}
                  </button>
                ))}
              </div>
            </div>
            <AppPreview branding={form} device={device} />
          </div>

          {/* Info box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-4 text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-semibold flex items-center gap-2"><Sun size={14} />¿Cómo funciona?</p>
            <ul className="space-y-1 text-xs ml-5 list-disc">
              <li><strong>Global</strong> aplica a todas las sedes como base.</li>
              <li>Cada <strong>sede</strong> puede sobreescribir solo lo que cambia.</li>
              <li>Los cambios se aplican al <strong>login y navegación</strong> de la app.</li>
              <li>Para el logo usa una <strong>URL pública</strong> (Dropbox, Drive, CDN).</li>
              <li>Los cambios son <strong>inmediatos</strong> tras guardar.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}