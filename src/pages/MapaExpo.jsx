// src/pages/MapaExpo.jsx
// Mapa de exposición interactivo CMC
// Muestra un grid configurable con stands posicionados
// Admin puede cambiar estado de cada stand desde el panel

import React, { useState, useEffect, useRef } from "react";
import { useAuth }  from "../contexts/AuthContext.jsx";
import { useEvent } from "../contexts/EventContext.jsx";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  Map, Building2, Search, ZoomIn, ZoomOut, RefreshCw,
  X, Star, Navigation, Coffee, CheckCircle2, Clock,
  AlertCircle, Loader2, Upload, Info, Eye
} from "lucide-react";

const ROLES_ADMIN = ["super_admin", "staff"];

// ── Estados del stand ──────────────────────────────────────
const ESTADOS = {
  libre:          { label: "Libre",         color: "#f0fdf4", border: "#86efac", text: "#16a34a", dot: "bg-green-400" },
  solicitado:     { label: "Solicitado",    color: "#fffbeb", border: "#fcd34d", text: "#d97706", dot: "bg-yellow-400" },
  ocupado:        { label: "Ocupado",       color: "#eff6ff", border: "#93c5fd", text: "#2563eb", dot: "bg-blue-500"   },
  no_disponible:  { label: "No disponible", color: "#f9fafb", border: "#d1d5db", text: "#6b7280", dot: "bg-gray-400"   },
};

// ── Colores por categoría ──────────────────────────────────
const CAT_COLORS = {
  platinum: { bg: "#fefce8", border: "#ca8a04", text: "#854d0e" },
  gold:     { bg: "#fff7ed", border: "#f97316", text: "#9a3412" },
  silver:   { bg: "#f1f5f9", border: "#64748b", text: "#1e293b" },
  bronze:   { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" },
  default:  { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8" },
};
const catColor = (c) => CAT_COLORS[(c||"").toLowerCase()] || CAT_COLORS.default;

export default function MapaExpo() {
  const { userProfile } = useAuth();
  const { sedeActiva, edicionActiva } = useEvent();
  const navigate = useNavigate();

  const [expositores,  setExpositores]  = useState([]);
  const [mapa,         setMapa]         = useState(null);    // imagen de fondo
  const [gridConfig,   setGridConfig]   = useState({ grid_cols: 20, grid_filas: 15 });
  const [selected,     setSelected]     = useState(null);    // stand seleccionado
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [zoom,         setZoom]         = useState(1);
  const [imgError,     setImgError]     = useState(false);
  const [vista,        setVista]        = useState("mapa");  // mapa | lista
  const [actionMsg,    setActionMsg]    = useState(null);

  const esAdmin = ROLES_ADMIN.includes(userProfile?.rol);
  const containerRef = useRef(null);

  useEffect(() => { load(); }, [sedeActiva, edicionActiva]);

  const load = async () => {
    setLoading(true);
    try {
      const [expoRes, mapaRes, cfgRes] = await Promise.all([
        API.get(`/expositores${sedeActiva ? `?sede=${sedeActiva}` : ""}`),
        API.get("/mapa").catch(() => ({ data: { mapa: null } })),
        API.get(`/expositores/mapa-config/${sedeActiva || "mexico"}?edicion=${edicionActiva || 2026}`)
          .catch(() => ({ data: { config: { grid_cols: 20, grid_filas: 15 } } })),
      ]);
      const list = Array.isArray(expoRes.data) ? expoRes.data
        : Array.isArray(expoRes.data?.expositores) ? expoRes.data.expositores : [];
      setExpositores(list);
      setMapa(mapaRes.data?.mapa || null);
      setGridConfig(cfgRes.data?.config || { grid_cols: 20, grid_filas: 15 });
      setImgError(false);
    } catch (err) {
      console.error("Error cargando mapa:", err);
    } finally {
      setLoading(false);
    }
  };

  const flash = (msg, isError = false) => {
    setActionMsg({ msg, isError });
    setTimeout(() => setActionMsg(null), 3000);
  };

  // Cambiar estado de un stand (solo admin)
  const cambiarEstado = async (expo, nuevoEstado) => {
    try {
      await API.patch(`/expositores/${expo.id}/estado`, { estado_stand: nuevoEstado });
      setExpositores(prev => prev.map(e => e.id === expo.id ? { ...e, estado_stand: nuevoEstado } : e));
      if (selected?.id === expo.id) setSelected(s => ({ ...s, estado_stand: nuevoEstado }));
      flash(`Estado actualizado: ${ESTADOS[nuevoEstado]?.label}`);
    } catch { flash("Error al cambiar estado", true); }
  };

  // Registrar visita o interés
  const registrarAccion = async (expo, tipo) => {
    try {
      await API.post(`/expositores/${expo.id}/visita`, { tipo });
      flash(tipo === 'visita' ? "✅ Visita registrada" : "⭐ Interés registrado");
    } catch { flash("Error al registrar", true); }
  };

  // Filtrar expositores
  const filtrados = expositores.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      e.nombre?.toLowerCase().includes(q) ||
      e.stand?.toLowerCase().includes(q) ||
      e.categoria?.toLowerCase().includes(q);
    const matchEstado = filterEstado === "todos" || (e.estado_stand || "libre") === filterEstado;
    return matchSearch && matchEstado;
  });

  // Construir mapa de grid — clave "col-fila" → expositor
  const gridMap = {};
  expositores.forEach(e => {
    if (e.grid_col != null && e.grid_fila != null) {
      for (let dc = 0; dc < (e.ancho_celdas || 1); dc++) {
        for (let df = 0; df < (e.alto_celdas || 1); df++) {
          gridMap[`${e.grid_col + dc}-${e.grid_fila + df}`] = { expo: e, isOrigin: dc === 0 && df === 0 };
        }
      }
    }
  });

  const sinPosicion = expositores.filter(e => e.grid_col == null || e.grid_fila == null);
  const conPosicion = expositores.filter(e => e.grid_col != null && e.grid_fila != null);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Map className="text-blue-600" size={26} /> Mapa de Exposición
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {conPosicion.length} stands posicionados · {expositores.length} expositores totales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setVista(v => v === "mapa" ? "lista" : "mapa")}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            {vista === "mapa" ? "Ver lista" : "Ver mapa"}
          </button>
          <button onClick={load} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Mensaje de acción */}
      {actionMsg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${actionMsg.isError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {actionMsg.msg}
        </div>
      )}

      {/* Leyenda de estados */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(ESTADOS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
            style={{ backgroundColor: v.color, borderColor: v.border, color: v.text }}>
            <span className={`w-2 h-2 rounded-full ${v.dot}`} />
            {v.label} ({expositores.filter(e => (e.estado_stand||"libre") === k).length})
          </span>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar stand o empresa..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 dark:text-white" />
        </div>
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 dark:text-white">
          <option value="todos">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-600 rounded-xl px-2">
          <button onClick={() => setZoom(z => Math.max(z-0.2, 0.3))} className="p-1.5 text-gray-500 hover:text-gray-700">
            <ZoomOut size={15} />
          </button>
          <span className="text-xs text-gray-400 w-10 text-center">{Math.round(zoom*100)}%</span>
          <button onClick={() => setZoom(z => Math.min(z+0.2, 3))} className="p-1.5 text-gray-500 hover:text-gray-700">
            <ZoomIn size={15} />
          </button>
        </div>
      </div>

      {/* VISTA MAPA */}
      {vista === "mapa" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          {/* Grid interactivo */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-auto" style={{ maxHeight: 600 }}>
                <div ref={containerRef}
                  style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.2s" }}>

                  {/* Imagen de fondo si existe */}
                  {mapa?.url_publica && !imgError ? (
                    <div className="relative" style={{ minHeight: 400 }}>
                      <img
                        src={mapa.url_publica}
                        alt="Plano"
                        className="w-full"
                        onError={() => setImgError(true)}
                      />
                      {/* Pins sobre imagen */}
                      {expositores.map(expo => {
                        if (expo.posicion_x == null || expo.posicion_y == null) return null;
                        const estado = ESTADOS[expo.estado_stand || "libre"];
                        const isSelected = selected?.id === expo.id;
                        return (
                          <div key={expo.id}
                            onClick={() => setSelected(isSelected ? null : expo)}
                            className="absolute cursor-pointer transition-all"
                            style={{
                              left: `${expo.posicion_x}%`, top: `${expo.posicion_y}%`,
                              transform: `translate(-50%,-50%) ${isSelected ? "scale(1.3)" : "scale(1)"}`,
                              zIndex: isSelected ? 20 : 10,
                            }}>
                            <div className="flex flex-col items-center justify-center rounded-xl border-2 px-2 py-1.5 shadow-lg min-w-[60px] text-center"
                              style={{ backgroundColor: estado.color, borderColor: isSelected ? "#1d4ed8" : estado.border }}>
                              {expo.logo_url
                                ? <img src={expo.logo_url} className="w-8 h-8 object-contain" onError={e=>e.target.style.display='none'} />
                                : <Building2 size={16} style={{ color: estado.text }} />
                              }
                              <span className="font-bold leading-tight mt-0.5" style={{ color: estado.text, fontSize:"0.6rem" }}>
                                {expo.stand || expo.nombre?.split(" ")[0]}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Grid generado */
                    <GridMapa
                      gridConfig={gridConfig}
                      gridMap={gridMap}
                      filtrados={filtrados}
                      selected={selected}
                      onSelect={setSelected}
                      esAdmin={esAdmin}
                      onCambiarEstado={cambiarEstado}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Info de stands sin posición */}
            {esAdmin && sinPosicion.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 px-1">
                <Info size={13} />
                {sinPosicion.length} expositor(es) sin posición en el grid. Edítalos en Admin → Expositores.
              </div>
            )}
          </div>

          {/* Panel lateral — detalle del stand seleccionado */}
          <div className="lg:col-span-1">
            {selected ? (
              <StandDetail
                expo={selected}
                userProfile={userProfile}
                esAdmin={esAdmin}
                onClose={() => setSelected(null)}
                onCambiarEstado={cambiarEstado}
                onRegistrarAccion={registrarAccion}
                onNavigate={navigate}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
                <Map size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Selecciona un stand</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Haz clic en cualquier celda del mapa para ver información del expositor
                </p>
              </div>
            )}

            {/* Lista de expositores filtrados */}
            <div className="mt-3 space-y-1.5 max-h-72 overflow-y-auto">
              {filtrados.slice(0,20).map(expo => {
                const estado = ESTADOS[expo.estado_stand || "libre"];
                return (
                  <button key={expo.id}
                    onClick={() => setSelected(expo)}
                    className={`w-full text-left px-3 py-2 rounded-xl border-2 transition flex items-center gap-2 text-xs ${
                      selected?.id === expo.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300"
                    }`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${estado.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{expo.nombre}</p>
                      <p className="text-gray-400">
                        {expo.stand ? `Stand ${expo.stand}` : "Sin asignar"} · {estado.label}
                      </p>
                    </div>
                  </button>
                );
              })}
              {filtrados.length > 20 && (
                <p className="text-center text-xs text-gray-400 py-2">+{filtrados.length-20} más</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISTA LISTA */}
      {vista === "lista" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(expo => {
            const estado = ESTADOS[expo.estado_stand || "libre"];
            const col = catColor(expo.categoria);
            return (
              <div key={expo.id}
                onClick={() => { setSelected(expo); setVista("mapa"); }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: col.bg, border: `2px solid ${col.border}` }}>
                    {expo.logo_url
                      ? <img src={expo.logo_url} className="w-full h-full object-contain p-1" onError={e=>e.target.style.display='none'} />
                      : <Building2 size={20} style={{ color: col.text }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white truncate">{expo.nombre}</p>
                    <p className="text-xs text-gray-500">{expo.stand ? `Stand ${expo.stand}` : ""}{expo.categoria ? ` · ${expo.categoria}` : ""}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: estado.color, color: estado.text, border: `1px solid ${estado.border}` }}>
                      {estado.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Grid generado con celdas ───────────────────────────────
function GridMapa({ gridConfig, gridMap, filtrados, selected, onSelect, esAdmin, onCambiarEstado }) {
  const { grid_cols = 20, grid_filas = 15 } = gridConfig;
  const filtradosIds = new Set(filtrados.map(e => e.id));

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-900" style={{ minHeight: 400 }}>
      {/* Grid SVG de fondo */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${grid_cols}, minmax(0, 1fr))`,
          gap: "2px",
          background: "#e2e8f0",
          padding: "2px",
        }}
      >
        {Array.from({ length: grid_cols * grid_filas }, (_, i) => {
          const col = (i % grid_cols) + 1;
          const fila = Math.floor(i / grid_cols) + 1;
          const cell = gridMap[`${col}-${fila}`];
          if (cell && !cell.isOrigin) return null; // ocupada por stand multi-celda

          const expo = cell?.expo;
          const isFiltered = expo ? filtradosIds.has(expo.id) : true;
          const isSelected = expo && selected?.id === expo.id;
          const estado = ESTADOS[expo?.estado_stand || "libre"];
          const col_cat = expo ? catColor(expo.categoria) : null;

          const ancho = expo ? (expo.ancho_celdas || 1) : 1;
          const alto  = expo ? (expo.alto_celdas  || 1) : 1;

          return (
            <div key={`${col}-${fila}`}
              onClick={() => expo ? onSelect(isSelected ? null : expo) : null}
              style={{
                gridColumn: `span ${ancho}`,
                gridRow:    `span ${alto}`,
                backgroundColor: expo ? (isSelected ? "#dbeafe" : (isFiltered ? estado.color : "#f9fafb")) : "#ffffff",
                border: `2px solid ${expo ? (isSelected ? "#2563eb" : (isFiltered ? estado.border : "#e5e7eb")) : "#f3f4f6"}`,
                opacity: expo && !isFiltered ? 0.4 : 1,
                cursor: expo ? "pointer" : "default",
                borderRadius: "6px",
                minHeight: "52px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
                position: "relative",
                transition: "all 0.15s",
                transform: isSelected ? "scale(0.97)" : "scale(1)",
              }}
              title={expo ? `${expo.nombre}${expo.stand ? " · Stand "+expo.stand : ""}` : `Celda libre (${col},${fila})`}
            >
              {expo ? (
                <>
                  {expo.logo_url
                    ? <img src={expo.logo_url} alt="" className="object-contain" style={{width:32, height:32}} onError={e=>e.target.style.display='none'} />
                    : <Building2 size={16} style={{ color: estado.text }} />
                  }
                  <span className="font-bold truncate w-full text-center leading-tight mt-0.5"
                    style={{ color: estado.text, fontSize: "0.55rem" }}>
                    {expo.stand || expo.nombre?.split(" ")[0]}
                  </span>
                  <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${estado.dot}`} />
                </>
              ) : (
                <span className="text-gray-200 dark:text-gray-700" style={{ fontSize: "0.5rem" }}>
                  {col},{fila}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda de coordenadas */}
      <p className="text-xs text-gray-400 mt-2 text-center">
        Grid {grid_cols}×{grid_filas} · Haz clic en un stand para ver detalles
      </p>
    </div>
  );
}

// ── Detalle del stand seleccionado ─────────────────────────
function StandDetail({ expo, userProfile, esAdmin, onClose, onCambiarEstado, onRegistrarAccion, onNavigate }) {
  const estado = ESTADOS[expo.estado_stand || "libre"];
  const col    = catColor(expo.categoria);
  const contact = expo.contact || {};

  const estaOcupado = expo.estado_stand === "ocupado";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-blue-200 dark:border-blue-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between"
        style={{ backgroundColor: estaOcupado ? col.bg : estado.color, borderBottom: `2px solid ${estaOcupado ? col.border : estado.border}` }}>
        <div className="flex-1 min-w-0">
          {expo.logo_url && (
            <img src={expo.logo_url} alt="" className="h-8 object-contain mb-2 max-w-full"
              onError={e=>e.target.style.display='none'} />
          )}
          <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{expo.nombre}</p>
          {expo.stand && <p className="text-xs font-semibold" style={{ color: col.text }}>Stand {expo.stand}</p>}
          {expo.categoria && <p className="text-xs text-gray-500 capitalize">{expo.categoria}</p>}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2 shrink-0">
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Estado */}
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: estado.color, color: estado.text, border: `1px solid ${estado.border}` }}>
            {estado.label}
          </span>
          {expo.grid_col && expo.grid_fila && (
            <span className="text-xs text-gray-400">
              Posición: {expo.grid_col},{expo.grid_fila}
              {expo.ancho_celdas > 1 || expo.alto_celdas > 1
                ? ` (${expo.ancho_celdas}×${expo.alto_celdas})`
                : ""}
            </span>
          )}
        </div>

        {/* Descripción */}
        {expo.descripcion && (
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
            {expo.descripcion}
          </p>
        )}

        {/* Contacto */}
        {(contact.nombre || contact.email || contact.telefono) && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase">Contacto</p>
            {contact.nombre    && <p className="text-xs font-medium text-gray-800 dark:text-white">{contact.nombre}</p>}
            {contact.email     && <a href={`mailto:${contact.email}`} className="text-xs text-blue-600 hover:underline block">{contact.email}</a>}
            {contact.telefono  && <a href={`tel:${contact.telefono}`} className="text-xs text-blue-600 hover:underline block">{contact.telefono}</a>}
          </div>
        )}

        {/* Website */}
        {expo.website_url && (
          <a href={expo.website_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
            🌐 {expo.website_url.replace(/^https?:\/\//, '')}
          </a>
        )}

        {/* Acciones del asistente */}
        {!esAdmin && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onRegistrarAccion(expo, 'visita')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-xl text-xs font-semibold hover:bg-green-100 transition">
              <CheckCircle2 size={13} /> Visité este stand
            </button>
            <button
              onClick={() => onRegistrarAccion(expo, 'interes')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700 rounded-xl text-xs font-semibold hover:bg-yellow-100 transition">
              <Star size={13} /> Me interesa
            </button>
            {expo.estado_stand === "ocupado" && (
              <button
                onClick={() => onNavigate('/networking')}
                className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition">
                <Navigation size={13} /> Agendar cita de networking
              </button>
            )}
          </div>
        )}

        {/* Acciones del admin */}
        {esAdmin && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-gray-500 uppercase">Cambiar estado</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(ESTADOS).map(([k, v]) => (
                <button key={k}
                  onClick={() => onCambiarEstado(expo, k)}
                  className={`px-2 py-1.5 rounded-xl text-xs font-semibold border-2 transition ${
                    (expo.estado_stand||"libre") === k ? "ring-2 ring-blue-400" : "hover:opacity-80"
                  }`}
                  style={{ backgroundColor: v.color, borderColor: v.border, color: v.text }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}