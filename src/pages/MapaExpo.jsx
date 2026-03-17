// src/pages/MapaExpo.jsx
// Mapa de exposición CMC
//
// FUNCIONALIDAD:
//   • Muestra la imagen del plano del salón (tabla `mapa` → url_publica)
//   • Lista lateral de expositores con stand, logo y categoría
//   • Click en un expositor → resalta su posición si tiene coordenadas
//   • Super admin / staff → puede actualizar la URL del mapa
//
// ROLES:
//   Todos con verMapa=true pueden ver.
//   Solo super_admin y staff pueden cambiar la imagen del mapa.

import { useState, useEffect, useRef } from "react";
import { useAuth }  from "../contexts/AuthContext.jsx";
import { useEvent } from "../contexts/EventContext.jsx";
import API from "../services/api";
import {
  Map, Building2, Search, ZoomIn, ZoomOut,
  RefreshCw, Edit2, Save, X, AlertCircle,
  ExternalLink, ChevronRight, Loader2
} from "lucide-react";

const ROLES_ADMIN = ["super_admin", "staff"];

export default function MapaExpo() {
  const { userProfile } = useAuth();
  const { sedeActiva, edicionActiva } = useEvent();

  const [mapa,         setMapa]         = useState(null);   // { url_publica, uploaded_at }
  const [expositores,  setExpositores]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [selected,     setSelected]     = useState(null);   // expositor seleccionado
  const [zoom,         setZoom]         = useState(1);
  const [editingUrl,   setEditingUrl]   = useState(false);
  const [newUrl,       setNewUrl]       = useState("");
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState(null);

  const imgRef = useRef(null);
  const esAdmin = ROLES_ADMIN.includes(userProfile?.rol);

  // ── Carga inicial ────────────────────────────────────────
  useEffect(() => {
    load();
  }, [sedeActiva, edicionActiva]);

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const [mapaRes, expoRes] = await Promise.all([
        API.get("/mapa"),
        API.get(`/expositores${sedeActiva ? `?sede=${sedeActiva}` : ""}`),
      ]);

      setMapa(mapaRes.data.mapa || null);

      const list = Array.isArray(expoRes.data)
        ? expoRes.data
        : Array.isArray(expoRes.data.expositores)
        ? expoRes.data.expositores
        : [];
      setExpositores(list.filter(e => e.activo !== false));
    } catch (err) {
      setError("No se pudo cargar el mapa de exposición");
    } finally {
      setLoading(false);
    }
  };

  // ── Guardar nueva URL del mapa ───────────────────────────
  const handleSaveUrl = async () => {
    if (!newUrl.trim()) return;
    try {
      setSaving(true);
      const res = await API.put("/mapa", { url_publica: newUrl.trim() });
      setMapa(res.data.mapa);
      setEditingUrl(false);
      setNewUrl("");
      setSaveMsg("Mapa actualizado correctamente");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setSaveMsg("Error al guardar: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  // ── Filtro de expositores ────────────────────────────────
  const filtered = expositores.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.nombre?.toLowerCase().includes(q) ||
      e.stand?.toLowerCase().includes(q) ||
      e.categoria?.toLowerCase().includes(q)
    );
  });

  // ── Zoom ────────────────────────────────────────────────
  const zoomIn  = () => setZoom(z => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Map className="text-blue-600" size={26} />
            Mapa de Exposición
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {expositores.length} expositores
            {sedeActiva && <span> · <span className="capitalize font-medium">{sedeActiva}</span></span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
            <RefreshCw size={18} />
          </button>
          {esAdmin && !editingUrl && (
            <button
              onClick={() => { setEditingUrl(true); setNewUrl(mapa?.url_publica || ""); }}
              className="flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
            >
              <Edit2 size={15} /> Cambiar imagen del mapa
            </button>
          )}
        </div>
      </div>

      {/* Alerta de éxito/error al guardar */}
      {saveMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border
          ${saveMsg.startsWith("Error")
            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300"
            : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300"}`}>
          {saveMsg.startsWith("Error") ? <AlertCircle size={14} /> : "✅"} {saveMsg}
        </div>
      )}

      {/* Editor URL del mapa (solo admin) */}
      {editingUrl && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">URL de la imagen del mapa</p>
          <p className="text-xs text-gray-400">Sube la imagen a Google Drive, Dropbox o cualquier CDN y pega la URL pública aquí.</p>
          <div className="flex gap-2">
            <input
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder="https://drive.google.com/... o https://..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={handleSaveUrl} disabled={saving || !newUrl.trim()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Guardar
            </button>
            <button onClick={() => setEditingUrl(false)}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Layout: Mapa + Lista */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Imagen del mapa ── */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Controles de zoom */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Plano del salón
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{Math.round(zoom * 100)}%</span>
                <button onClick={zoomOut} disabled={zoom <= 0.5}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 transition">
                  <ZoomOut size={16} />
                </button>
                <button onClick={zoomIn} disabled={zoom >= 3}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 transition">
                  <ZoomIn size={16} />
                </button>
                <button onClick={() => setZoom(1)}
                  className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  Restablecer
                </button>
              </div>
            </div>

            {/* Imagen */}
            <div className="overflow-auto bg-gray-50 dark:bg-gray-900" style={{ maxHeight: "520px" }}>
              {mapa?.url_publica ? (
                <div className="relative inline-block min-w-full" style={{ transformOrigin: "top left" }}>
                  <img
                    ref={imgRef}
                    src={mapa.url_publica}
                    alt="Mapa de exposición CMC"
                    style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.2s" }}
                    className="block max-w-none"
                    onError={e => { e.target.style.display="none"; }}
                  />
                  {/* Pins de expositores con coordenadas */}
                  {selected && selected.posicion_x && selected.posicion_y && (
                    <div
                      className="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2 flex items-center justify-center animate-bounce"
                      style={{
                        left:  `${selected.posicion_x}%`,
                        top:   `${selected.posicion_y}%`,
                        transform: `scale(${1/zoom}) translate(-50%, -50%)`,
                      }}
                      title={selected.nombre}
                    >
                      <span className="text-white text-xs font-bold">★</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Map size={56} className="mb-3 opacity-30" />
                  <p className="font-semibold">Sin mapa configurado</p>
                  {esAdmin && (
                    <p className="text-sm mt-1">
                      Usa el botón <strong>"Cambiar imagen del mapa"</strong> para subir el plano del salón.
                    </p>
                  )}
                  {!esAdmin && (
                    <p className="text-sm mt-1">El equipo del CMC publicará el mapa próximamente.</p>
                  )}
                </div>
              )}
            </div>

            {/* Nota al pie */}
            {mapa?.uploaded_at && (
              <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span>Última actualización: {new Date(mapa.uploaded_at).toLocaleDateString("es", { day:"numeric", month:"short", year:"numeric" })}</span>
                {mapa.url_publica && (
                  <a href={mapa.url_publica} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-500 hover:text-blue-700">
                    Abrir imagen <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Lista de expositores ── */}
        <div className="flex flex-col gap-3">
          {/* Buscador */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar expositor o stand..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Lista */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Expositores ({filtered.length})
              </p>
              {selected && (
                <button onClick={() => setSelected(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <X size={12} /> Limpiar
                </button>
              )}
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: "460px" }}>
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Building2 size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{search ? "Sin resultados" : "No hay expositores"}</p>
                </div>
              ) : (
                filtered.map(expo => (
                  <button
                    key={expo.id}
                    onClick={() => setSelected(selected?.id === expo.id ? null : expo)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-0 dark:border-gray-700 transition
                      ${selected?.id === expo.id
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                  >
                    {/* Logo o inicial */}
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0 flex items-center justify-center">
                      {expo.logo_url ? (
                        <img src={expo.logo_url} alt={expo.nombre}
                          className="w-full h-full object-contain p-1"
                          onError={e => { e.target.style.display="none"; e.target.parentNode.innerHTML = `<span class="text-lg font-bold text-gray-400">${expo.nombre?.charAt(0)}</span>`; }} />
                      ) : (
                        <span className="text-lg font-bold text-gray-400">
                          {expo.nombre?.charAt(0)?.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${selected?.id === expo.id ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
                        {expo.nombre}
                      </p>
                      <div className="flex gap-2 text-xs text-gray-400 mt-0.5">
                        {expo.stand && <span className="font-medium">Stand {expo.stand}</span>}
                        {expo.categoria && <span>· {expo.categoria}</span>}
                      </div>
                    </div>

                    <ChevronRight size={16} className={`shrink-0 transition ${selected?.id === expo.id ? "text-blue-500 rotate-90" : "text-gray-300"}`} />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Detalle del expositor seleccionado */}
          {selected && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-200 dark:border-blue-700 p-4 space-y-3">
              <div className="flex items-start gap-3">
                {selected.logo_url && (
                  <img src={selected.logo_url} alt={selected.nombre}
                    className="w-14 h-14 rounded-xl object-contain bg-gray-50 dark:bg-gray-700 p-1 border dark:border-gray-600 shrink-0"
                    onError={e => e.target.style.display="none"} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white">{selected.nombre}</p>
                  {selected.stand && <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">Stand {selected.stand}</p>}
                  {selected.categoria && <p className="text-xs text-gray-500 dark:text-gray-400">{selected.categoria}</p>}
                </div>
              </div>

              {selected.descripcion && (
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{selected.descripcion}</p>
              )}

              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                {selected.contact?.email && (
                  <a href={`mailto:${selected.contact.email}`}
                    className="flex items-center gap-1.5 hover:text-blue-600 transition">
                    ✉️ {selected.contact.email}
                  </a>
                )}
                {selected.contact?.telefono && (
                  <a href={`tel:${selected.contact.telefono}`}
                    className="flex items-center gap-1.5 hover:text-blue-600 transition">
                    📞 {selected.contact.telefono}
                  </a>
                )}
                {selected.website_url && (
                  <a href={selected.website_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-blue-600 transition">
                    🌐 {selected.website_url.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>

              {selected.posicion_x && selected.posicion_y && (
                <p className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                  📍 Ubicado en el mapa — mira el pin rojo
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}
    </div>
  );
}