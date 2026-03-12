// src/pages/Galeria.jsx
// Galería de fotos del CMC
//
// VISTAS POR ROL:
//  • Todos (autenticados) → ven la galería completa con filtros
//  • Staff/Admin          → pueden subir, editar, eliminar, destacar fotos
//
// CARACTERÍSTICAS:
//  • Grid masonry responsivo con lightbox integrado
//  • Filtros por sede, edición, tipo y destacadas
//  • Subida por URL o base64 (drag & drop)
//  • Búsqueda por título / tags
//  • Sección "Mis fotos" para asistentes

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import API from "../services/api";
import {
  Images, Upload, X, Star, StarOff, Edit2, Trash2,
  ChevronLeft, ChevronRight, Search, Filter, Plus,
  CheckCircle, AlertCircle, Loader2, Download, Eye,
  ZoomIn
} from "lucide-react";

const ROLES_ADMIN = ["staff", "super_admin"];

// ──────────────────────────────────────────────────────────
// Lightbox — visor de foto en pantalla completa
// ──────────────────────────────────────────────────────────
function Lightbox({ fotos, index, onClose, onPrev, onNext }) {
  const foto = fotos[index];
  if (!foto) return null;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowLeft")  onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Botón cerrar */}
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white z-10 p-2"
        onClick={onClose}
      >
        <X size={28} />
      </button>

      {/* Navegación prev */}
      {fotos.length > 1 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 p-3 bg-black/40 rounded-full hover:bg-black/70 transition"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Imagen */}
      <div
        className="max-w-[90vw] max-h-[85vh] relative"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={foto.url}
          alt={foto.titulo || "Foto CMC"}
          className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
        />
        {(foto.titulo || foto.descripcion || foto.uploader_nombre) && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-xl">
            {foto.titulo && (
              <p className="text-white font-semibold text-base">{foto.titulo}</p>
            )}
            {foto.descripcion && (
              <p className="text-white/70 text-sm mt-0.5">{foto.descripcion}</p>
            )}
            <div className="flex gap-3 mt-1 text-xs text-white/50">
              {foto.uploader_nombre && <span>📷 {foto.uploader_nombre}</span>}
              {foto.sede && <span>📍 {foto.sede}</span>}
              {foto.edicion && <span>📅 {foto.edicion}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Contador */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
        {index + 1} / {fotos.length}
      </div>

      {/* Navegación next */}
      {fotos.length > 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 p-3 bg-black/40 rounded-full hover:bg-black/70 transition"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
        >
          <ChevronRight size={28} />
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Modal de subida de foto
// ──────────────────────────────────────────────────────────
function UploadModal({ sesiones, onClose, onSuccess }) {
  const [mode,    setMode]    = useState("url"); // url | archivo
  const [form,    setForm]    = useState({
    url: "", titulo: "", descripcion: "",
    sede: "", edicion: "", sesion_id: "", tipo: "foto", tags: "",
  });
  const [preview,  setPreview] = useState(null);
  const [base64,   setBase64]  = useState(null);
  const [saving,   setSaving]  = useState(false);
  const [error,    setError]   = useState(null);
  const fileRef = useRef();

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setBase64(e.target.result);
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (mode === "url" && !form.url) { setError("Ingresa una URL"); return; }
    if (mode === "archivo" && !base64) { setError("Selecciona una imagen"); return; }
    setSaving(true); setError(null);
    try {
      const body = {
        ...(mode === "url" ? { url: form.url } : { data: base64 }),
        titulo:      form.titulo,
        descripcion: form.descripcion,
        sede:        form.sede || undefined,
        edicion:     form.edicion ? parseInt(form.edicion) : undefined,
        sesion_id:   form.sesion_id || undefined,
        tipo:        form.tipo,
        tags:        form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      };
      await API.post("/galeria", body);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Upload size={18} className="text-blue-600" /> Subir foto
          </h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="p-5 space-y-4">

          {/* Modo */}
          <div className="flex gap-2">
            {[{id:"url",label:"🔗 Por URL"},{id:"archivo",label:"📁 Archivo"}].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition
                  ${mode === m.id ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700" : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* URL */}
          {mode === "url" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1 block">URL de la imagen *</label>
              <input value={form.url} onChange={e => { setF("url", e.target.value); setPreview(e.target.value); }}
                placeholder="https://..."
                className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
              {preview && (
                <img src={preview} alt="" className="mt-2 rounded-xl max-h-40 object-cover w-full"
                  onError={() => setPreview(null)} />
              )}
            </div>
          )}

          {/* Archivo */}
          {mode === "archivo" && (
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition"
              onDrop={handleDrop} onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="" className="max-h-40 mx-auto object-contain rounded-xl" />
              ) : (
                <>
                  <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Arrastra una imagen o haz clic</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · máx 5MB</p>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => handleFile(e.target.files[0])} />
            </div>
          )}

          {/* Metadatos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1 block">Título</label>
              <input value={form.titulo} onChange={e => setF("titulo", e.target.value)}
                placeholder="Ej: Sesión inaugural CMC 2025"
                className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1 block">Sede</label>
              <select value={form.sede} onChange={e => setF("sede", e.target.value)}
                className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
                <option value="">Todas</option>
                <option value="mexico">México</option>
                <option value="chile">Chile</option>
                <option value="colombia">Colombia</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1 block">Edición</label>
              <input type="number" value={form.edicion} onChange={e => setF("edicion", e.target.value)}
                placeholder="2025"
                className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1 block">Sesión vinculada</label>
              <select value={form.sesion_id} onChange={e => setF("sesion_id", e.target.value)}
                className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
                <option value="">— Ninguna —</option>
                {sesiones.map(s => <option key={s.id} value={s.id}>{s.titulo || s.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1 block">Tipo</label>
              <select value={form.tipo} onChange={e => setF("tipo", e.target.value)}
                className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
                <option value="foto">Foto</option>
                <option value="video">Video (thumb)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1 block">Tags</label>
              <input value={form.tags} onChange={e => setF("tags", e.target.value)}
                placeholder="sesion, ponente, expo"
                className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1 block">Descripción</label>
              <textarea value={form.descripcion} onChange={e => setF("descripcion", e.target.value)} rows={2}
                className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-xl">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 text-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {saving ? "Subiendo..." : "Subir foto"}
            </button>
            <button onClick={onClose}
              className="px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────────────────────
export default function Galeria() {
  const { userProfile } = useAuth();

  const [fotos,     setFotos]     = useState([]);
  const [sesiones,  setSesiones]  = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [lightbox,  setLightbox]  = useState(null); // índice

  // Filtros
  const [filtros, setFiltros] = useState({
    sede: "", edicion: "", tipo: "", destacadas: false,
  });
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const esAdmin = ROLES_ADMIN.includes(userProfile?.rol);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const params = new URLSearchParams();
      if (filtros.sede)      params.append("sede",      filtros.sede);
      if (filtros.edicion)   params.append("edicion",   filtros.edicion);
      if (filtros.tipo)      params.append("tipo",      filtros.tipo);
      if (filtros.destacadas) params.append("destacadas", "true");
      params.append("limit", "100");

      const r = await API.get(`/galeria?${params}`);
      setFotos(Array.isArray(r.data.fotos) ? r.data.fotos : []);
      setTotal(r.data.total || 0);

      if (esAdmin) {
        const rs = await API.get("/agenda/sessions");
        setSesiones(Array.isArray(rs.data.sessions) ? rs.data.sessions : []);
      }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.data?.error?.includes("does not exist")) {
        setError("La tabla de galería aún no existe. Ejecuta la migración SQL primero.");
      } else {
        setError(err.response?.data?.error || err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [filtros, esAdmin]);

  useEffect(() => { if (userProfile) load(); }, [userProfile, filtros]);

  // Filtro local por búsqueda de texto
  const fotosFiltradas = fotos.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (f.titulo || "").toLowerCase().includes(q) ||
      (f.descripcion || "").toLowerCase().includes(q) ||
      (f.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (f.uploader_nombre || "").toLowerCase().includes(q)
    );
  });

  const handleDestacar = async (foto) => {
    try {
      await API.put(`/galeria/${foto.id}/destacar`);
      setFotos(prev => prev.map(f =>
        f.id === foto.id ? { ...f, destacada: !f.destacada } : f
      ));
    } catch (err) {
      console.error("Error destacando foto:", err);
    }
  };

  const handleDelete = async (foto) => {
    if (!confirm("¿Eliminar esta foto de la galería?")) return;
    try {
      await API.delete(`/galeria/${foto.id}`);
      setFotos(prev => prev.filter(f => f.id !== foto.id));
    } catch (err) {
      console.error("Error eliminando foto:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Images className="text-pink-600" size={26} />
            Galería
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total} fotos · {fotosFiltradas.length} visibles con filtros actuales
          </p>
        </div>
        {esAdmin && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-xl hover:bg-pink-700 font-semibold text-sm"
          >
            <Plus size={16} /> Subir foto
          </button>
        )}
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Buscador */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título, tag..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filtro sede */}
          <select
            value={filtros.sede}
            onChange={e => setFiltros(p => ({ ...p, sede: e.target.value }))}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todas las sedes</option>
            <option value="mexico">México</option>
            <option value="chile">Chile</option>
            <option value="colombia">Colombia</option>
          </select>

          {/* Filtro edición */}
          <input
            type="number"
            value={filtros.edicion}
            onChange={e => setFiltros(p => ({ ...p, edicion: e.target.value }))}
            placeholder="Edición"
            className="w-24 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white"
          />

          {/* Toggle destacadas */}
          <button
            onClick={() => setFiltros(p => ({ ...p, destacadas: !p.destacadas }))}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border-2 transition
              ${filtros.destacadas
                ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"}`}
          >
            <Star size={14} className={filtros.destacadas ? "fill-yellow-400 text-yellow-400" : ""} />
            Destacadas
          </button>

          {/* Limpiar */}
          {(filtros.sede || filtros.edicion || filtros.destacadas || search) && (
            <button
              onClick={() => { setFiltros({ sede:"", edicion:"", tipo:"", destacadas:false }); setSearch(""); }}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <X size={12} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-pink-600" size={36} />
        </div>
      )}

      {!loading && error && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 p-5 rounded-2xl">
          <p className="font-semibold flex items-center gap-2"><AlertCircle size={18} /> Módulo en configuración</p>
          <p className="text-sm mt-1">{error}</p>
          {error.includes("migración") && (
            <div className="mt-3 bg-gray-900 text-green-400 p-3 rounded-xl text-xs font-mono">
              <p className="text-gray-400 mb-1">-- Ejecuta en la consola SQL de NeonDB:</p>
              <p>CREATE TABLE IF NOT EXISTS galeria_fotos ( ... );</p>
              <p className="text-gray-400 mt-1">Ver archivo: cmc-backend/migrations/galeria.sql</p>
            </div>
          )}
        </div>
      )}

      {/* Grid de fotos */}
      {!loading && !error && (
        <>
          {fotosFiltradas.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Images size={56} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-lg">Sin fotos</p>
              <p className="text-sm mt-1">
                {esAdmin
                  ? "Sube la primera foto con el botón \"Subir foto\""
                  : "El equipo del CMC publicará fotos aquí durante el evento"}
              </p>
            </div>
          ) : (
            <>
              {/* Sección destacadas */}
              {fotosFiltradas.some(f => f.destacada) && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Star size={14} className="fill-yellow-400 text-yellow-400" /> Destacadas
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                    {fotosFiltradas.filter(f => f.destacada).map((foto, idx) => (
                      <FotoCard
                        key={foto.id}
                        foto={foto}
                        esAdmin={esAdmin}
                        onOpen={() => setLightbox(fotosFiltradas.indexOf(foto))}
                        onDestacar={() => handleDestacar(foto)}
                        onDelete={() => handleDelete(foto)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Grid principal */}
              <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
                {fotosFiltradas.map((foto) => (
                  <div key={foto.id} className="break-inside-avoid mb-3">
                    <FotoCard
                      foto={foto}
                      esAdmin={esAdmin}
                      onOpen={() => setLightbox(fotosFiltradas.indexOf(foto))}
                      onDestacar={() => handleDestacar(foto)}
                      onDelete={() => handleDelete(foto)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <Lightbox
          fotos={fotosFiltradas}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onPrev={() => setLightbox(i => Math.max(0, i - 1))}
          onNext={() => setLightbox(i => Math.min(fotosFiltradas.length - 1, i + 1))}
        />
      )}

      {/* Modal de subida */}
      {showUpload && (
        <UploadModal
          sesiones={sesiones}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); load(); }}
        />
      )}
    </div>
  );
}

// ── Tarjeta de foto ──────────────────────────────────────
function FotoCard({ foto, esAdmin, onOpen, onDestacar, onDelete }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 group cursor-pointer shadow-sm hover:shadow-lg transition-shadow"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <img
        src={foto.url}
        alt={foto.titulo || "Foto CMC"}
        className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        onError={e => { e.target.src = "https://via.placeholder.com/400x300?text=CMC"; }}
        onClick={onOpen}
      />

      {/* Overlay en hover */}
      <div className={`absolute inset-0 bg-black/40 flex flex-col justify-between p-2 transition-opacity duration-200 ${hover ? "opacity-100" : "opacity-0"}`}>
        {/* Acciones admin */}
        {esAdmin && (
          <div className="flex justify-end gap-1">
            <button
              onClick={e => { e.stopPropagation(); onDestacar(); }}
              className={`p-1.5 rounded-lg transition ${foto.destacada ? "bg-yellow-400 text-white" : "bg-black/50 text-white hover:bg-yellow-400"}`}
              title={foto.destacada ? "Quitar destacado" : "Destacar"}
            >
              <Star size={14} className={foto.destacada ? "fill-white" : ""} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500 transition"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {/* Info abajo */}
        <div className="mt-auto" onClick={onOpen}>
          {foto.titulo && (
            <p className="text-white text-xs font-semibold truncate">{foto.titulo}</p>
          )}
          {foto.sede && (
            <p className="text-white/60 text-xs">{foto.sede} {foto.edicion || ""}</p>
          )}
        </div>
      </div>

      {/* Badge destacada */}
      {foto.destacada && !hover && (
        <div className="absolute top-2 right-2">
          <Star size={14} className="fill-yellow-400 text-yellow-400 drop-shadow" />
        </div>
      )}
    </div>
  );
}