// src/pages/MapaExpo.jsx — Mapa interactivo de exposición CMC
// Soporta: imagen de fondo + stands posicionados interactivamente
// El admin puede subir imagen (base64) o pegar URL, y posicionar stands con drag

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth }  from "../contexts/AuthContext.jsx";
import { useEvent } from "../contexts/EventContext.jsx";
import API from "../services/api";
import {
  Map, Building2, Search, ZoomIn, ZoomOut,
  RefreshCw, Save, X, AlertCircle, Loader2,
  Upload, Link, Eye, ChevronRight, Info
} from "lucide-react";

const ROLES_ADMIN = ["super_admin", "staff"];

// ── Colores por categoría de expositor ──────────────────────
const CATEGORIA_COLORES = {
  platinum: { bg: "#e8d5b7", border: "#b8860b", text: "#7c5a00" },
  gold:     { bg: "#fef3c7", border: "#d97706", text: "#92400e" },
  silver:   { bg: "#e2e8f0", border: "#64748b", text: "#334155" },
  bronze:   { bg: "#fee2e2", border: "#dc2626", text: "#991b1b" },
  default:  { bg: "#eff6ff", border: "#2563eb", text: "#1d4ed8" },
};

function getColor(categoria) {
  const k = (categoria || "").toLowerCase();
  return CATEGORIA_COLORES[k] || CATEGORIA_COLORES.default;
}

export default function MapaExpo() {
  const { userProfile } = useAuth();
  const { sedeActiva, edicionActiva } = useEvent();

  const [mapa,        setMapa]        = useState(null);
  const [expositores, setExpositores] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState("");
  const [selected,    setSelected]    = useState(null);
  const [zoom,        setZoom]        = useState(1);
  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState(null);

  // Panel de edición de imagen
  const [showUpload, setShowUpload]   = useState(false);
  const [inputUrl,   setInputUrl]     = useState("");
  const [imgStatus,  setImgStatus]    = useState("idle"); // idle | loading | ok | error
  const fileInputRef = useRef(null);
  const mapContainerRef = useRef(null);

  const esAdmin = ROLES_ADMIN.includes(userProfile?.rol);

  // ── Carga ─────────────────────────────────────────────────
  useEffect(() => { load(); }, [sedeActiva]);

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const [mr, er] = await Promise.all([
        API.get("/mapa"),
        API.get(`/expositores${sedeActiva ? `?sede=${sedeActiva}` : ""}`),
      ]);
      const m = mr.data.mapa || null;
      setMapa(m);
      setImgStatus(m?.url_publica ? "loading" : "idle");
      const list = Array.isArray(er.data) ? er.data
        : Array.isArray(er.data?.expositores) ? er.data.expositores : [];
      setExpositores(list.filter(e => e.activo !== false));
    } catch {
      setError("No se pudo cargar el mapa");
    } finally {
      setLoading(false);
    }
  };

  // ── Guardar imagen (URL o base64) ─────────────────────────
  const handleSaveUrl = async (url) => {
    if (!url?.trim()) return;
    try {
      setSaving(true);
      const res = await API.put("/mapa", { url_publica: url.trim() });
      setMapa(res.data.mapa);
      setImgStatus("loading");
      setShowUpload(false);
      setSaveMsg("✅ Mapa actualizado");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e) {
      setSaveMsg("❌ " + (e.response?.data?.error || "Error al guardar"));
    } finally { setSaving(false); }
  };

  // Subir archivo como base64
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSaveMsg("❌ La imagen no puede superar 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await handleSaveUrl(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // ── Filtro de expositores ─────────────────────────────────
  const filtrados = expositores.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.nombre?.toLowerCase().includes(q) || e.stand?.toLowerCase().includes(q);
  });

  // Expositores con posición definida
  const conPosicion = expositores.filter(e => e.posicion_x != null && e.posicion_y != null);

  const zoomIn  = () => setZoom(z => Math.min(z + 0.2, 4));
  const zoomOut = () => setZoom(z => Math.max(z - 0.2, 0.3));

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Map className="text-blue-600" size={26} /> Mapa de Exposición
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {conPosicion.length > 0
              ? `${conPosicion.length} stands posicionados · ${expositores.length} expositores`
              : `${expositores.length} expositores`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
            <RefreshCw size={18} />
          </button>
          {esAdmin && (
            <button onClick={() => { setShowUpload(p => !p); setInputUrl(mapa?.url_publica || ""); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">
              <Upload size={15} /> {mapa?.url_publica ? "Cambiar imagen" : "Subir imagen del mapa"}
            </button>
          )}
        </div>
      </div>

      {saveMsg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${saveMsg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {saveMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Panel de subida de imagen */}
      {showUpload && esAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white">Imagen del mapa</h3>

          {/* Subir archivo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Opción 1: Subir imagen desde tu equipo (PNG, JPG — máx 5MB)
            </label>
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile({ target: { files: e.dataTransfer.files } }); }}
            >
              <Upload size={28} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Arrastra aquí o <span className="text-blue-600 font-semibold">haz clic para seleccionar</span></p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Opción 2: URL pública de la imagen
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white"
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                placeholder="https://... (usa Google Drive: Compartir → Cualquier persona → copia el ID)"
              />
              <button onClick={() => handleSaveUrl(inputUrl)} disabled={saving || !inputUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              💡 Google Drive: abre la imagen → Compartir → "Cualquier persona con el enlace" → copia el ID del URL y usa:
              <code className="ml-1 text-blue-600">https://drive.google.com/uc?export=view&id=TU_ID</code>
            </p>
          </div>

          <button onClick={() => setShowUpload(false)}
            className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* Sidebar de expositores */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar expositor..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 dark:text-white" />
          </div>

          <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
            {filtrados.map(expo => {
              const col = getColor(expo.categoria);
              const isSelected = selected?.id === expo.id;
              const tienePos = expo.posicion_x != null && expo.posicion_y != null;
              return (
                <button key={expo.id}
                  onClick={() => setSelected(isSelected ? null : expo)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition flex items-center gap-2.5 ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: col.bg, border: `2px solid ${col.border}` }}>
                    {expo.logo_url
                      ? <img src={expo.logo_url} alt="" className="w-full h-full object-contain p-0.5" onError={e => e.target.style.display='none'} />
                      : <Building2 size={14} style={{ color: col.text }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{expo.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {expo.stand ? `Stand ${expo.stand}` : "Sin stand"}
                      {!tienePos && <span className="ml-1 text-orange-400">· sin pos.</span>}
                    </p>
                  </div>
                  {tienePos && <ChevronRight size={14} className="text-gray-400 shrink-0" />}
                </button>
              );
            })}
            {filtrados.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-6">Sin resultados</p>
            )}
          </div>
        </div>

        {/* Área del mapa */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

            {/* Controles zoom */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Plano del salón {imgStatus === 'error' && <span className="text-orange-500 ml-1">· mapa generado</span>}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{Math.round(zoom * 100)}%</span>
                <button onClick={zoomOut} disabled={zoom <= 0.3} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 disabled:opacity-30">
                  <ZoomOut size={15} />
                </button>
                <button onClick={zoomIn} disabled={zoom >= 4} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 disabled:opacity-30">
                  <ZoomIn size={15} />
                </button>
                <button onClick={() => setZoom(1)} className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500">
                  Restablecer
                </button>
              </div>
            </div>

            {/* Contenedor del mapa */}
            <div ref={mapContainerRef}
              className="overflow-auto bg-gray-50 dark:bg-gray-900"
              style={{ maxHeight: 560 }}>
              <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.2s", position: "relative", minHeight: 400 }}>

                {/* Imagen de fondo */}
                {mapa?.url_publica && imgStatus !== 'error' && (
                  <img
                    src={mapa.url_publica}
                    alt="Mapa de exposición"
                    className="block w-full"
                    style={{ maxWidth: "100%" }}
                    onLoad={() => setImgStatus("ok")}
                    onError={() => setImgStatus("error")}
                  />
                )}

                {/* Mapa generado cuando no hay imagen O la imagen falla */}
                {(imgStatus === 'error' || !mapa?.url_publica) && (
                  <MapaGenerado
                    expositores={expositores}
                    selected={selected}
                    onSelect={setSelected}
                  />
                )}

                {/* Pins sobre la imagen (solo cuando la imagen cargó bien) */}
                {imgStatus === 'ok' && expositores.map(expo => {
                  if (expo.posicion_x == null || expo.posicion_y == null) return null;
                  const isSelected = selected?.id === expo.id;
                  const col = getColor(expo.categoria);
                  return (
                    <div key={expo.id}
                      onClick={() => setSelected(isSelected ? null : expo)}
                      className="absolute cursor-pointer transition-all duration-200"
                      style={{
                        left: `${expo.posicion_x}%`,
                        top: `${expo.posicion_y}%`,
                        transform: "translate(-50%, -50%)",
                        zIndex: isSelected ? 20 : 10,
                      }}
                      title={expo.nombre}
                    >
                      <div className={`flex flex-col items-center justify-center rounded-lg border-2 shadow-lg text-center px-1.5 py-1 min-w-[48px] transition-all
                        ${isSelected ? "scale-125 shadow-xl" : "hover:scale-110"}`}
                        style={{ backgroundColor: col.bg, borderColor: isSelected ? "#2563eb" : col.border }}>
                        {expo.logo_url
                          ? <img src={expo.logo_url} alt="" className="w-6 h-6 object-contain" onError={e => e.target.style.display='none'} />
                          : <Building2 size={14} style={{ color: col.text }} />
                        }
                        <span className="text-xs font-bold leading-tight mt-0.5" style={{ color: col.text, fontSize: "0.6rem" }}>
                          {expo.stand || expo.nombre.split(" ")[0]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info del seleccionado */}
            {selected && (
              <div className="border-t border-gray-100 dark:border-gray-700 p-4 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: getColor(selected.categoria).bg, border: `2px solid ${getColor(selected.categoria).border}` }}>
                  {selected.logo_url
                    ? <img src={selected.logo_url} alt="" className="w-full h-full object-contain p-1" onError={e => e.target.style.display='none'} />
                    : <Building2 size={20} style={{ color: getColor(selected.categoria).text }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white">{selected.nombre}</p>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-0.5">
                    {selected.stand && <span>Stand {selected.stand}</span>}
                    {selected.categoria && <span className="capitalize">{selected.categoria}</span>}
                    {selected.website_url && (
                      <a href={selected.website_url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline">Sitio web</a>
                    )}
                  </div>
                  {selected.descripcion && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{selected.descripcion}</p>
                  )}
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 shrink-0">
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Nota admin */}
            {esAdmin && conPosicion.length < expositores.length && (
              <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                <Info size={13} />
                {expositores.length - conPosicion.length} expositor(es) sin posición. Edítalos en Expositores para asignarles posicion_x y posicion_y (%).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mapa generado con CSS cuando no hay imagen ──────────────
function MapaGenerado({ expositores, selected, onSelect }) {
  const conPos = expositores.filter(e => e.posicion_x != null && e.posicion_y != null);

  if (conPos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Map size={56} className="mb-3 opacity-20" />
        <p className="font-semibold text-lg text-gray-500 dark:text-gray-400">Sin mapa configurado</p>
        <p className="text-sm mt-1 text-center max-w-xs">
          Sube una imagen del plano, o configura las coordenadas de los expositores (posicion_x, posicion_y en %) para generar el mapa automáticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ minHeight: 480, background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" }}>
      {/* Grid de fondo */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Borde del salón */}
      <div className="absolute inset-4 border-2 border-blue-200 dark:border-blue-800 rounded-xl" />
      {/* Stands */}
      {conPos.map(expo => {
        const isSelected = selected?.id === expo.id;
        const col = getColor(expo.categoria);
        return (
          <div key={expo.id}
            onClick={() => onSelect(isSelected ? null : expo)}
            className="absolute cursor-pointer transition-all duration-200 flex flex-col items-center justify-center rounded-xl border-2 text-center px-1 py-1.5"
            style={{
              left: `${expo.posicion_x}%`,
              top: `${expo.posicion_y}%`,
              width: "10%", minWidth: 52, maxWidth: 80,
              transform: `translate(-50%, -50%) ${isSelected ? "scale(1.2)" : "scale(1)"}`,
              backgroundColor: col.bg,
              borderColor: isSelected ? "#2563eb" : col.border,
              boxShadow: isSelected ? "0 0 0 3px #93c5fd" : "0 1px 4px rgba(0,0,0,0.08)",
              zIndex: isSelected ? 20 : 10,
            }}
            title={expo.nombre}
          >
            {expo.logo_url
              ? <img src={expo.logo_url} alt="" className="w-7 h-7 object-contain" onError={e => e.target.style.display='none'} />
              : <Building2 size={16} style={{ color: col.text }} />
            }
            <span className="font-bold leading-tight mt-0.5 truncate w-full px-1" style={{ color: col.text, fontSize: "0.58rem" }}>
              {expo.stand ? `Stand ${expo.stand}` : expo.nombre.split(" ")[0]}
            </span>
          </div>
        );
      })}
      {/* Leyenda */}
      <div className="absolute bottom-3 right-3 bg-white/80 dark:bg-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-500 shadow">
        <p className="font-semibold mb-1">Mapa generado</p>
        {Object.entries(CATEGORIA_COLORES).filter(([k]) => k !== 'default').map(([k, col]) => (
          expositores.some(e => e.categoria?.toLowerCase() === k) && (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: col.bg, border: `1.5px solid ${col.border}` }} />
              <span className="capitalize">{k}</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}