// src/pages/Scanner.jsx
// Scanner QR para staff/admin — PWA ready, funciona en móvil
//
// FLUJO:
//   1. Staff elige el tipo de check-in (entrada / sesión / curso)
//   2. Si es sesión/curso, elige la sesión del día
//   3. Apunta la cámara al QR del asistente → registro automático
//   4. Feedback visual inmediato (verde = nuevo, amarillo = duplicado, rojo = error)
//   5. Panel lateral con historial en vivo del escáner actual
//
// LECTURA QR:
//   Usa la API nativa getUserMedia + BarcodeDetector (Chrome/Edge/Android)
//   Con fallback a un decodificador JS manual (jsQR desde CDN)

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth }  from "../contexts/AuthContext.jsx";
import API          from "../services/api";
import {
  QrCode, Camera, CameraOff, CheckCircle, AlertCircle,
  Clock, Users, RefreshCw, List, X, Wifi, WifiOff, Loader2
} from "lucide-react";

// ── Cargar jsQR desde CDN (fallback para Safari/Firefox) ──
function loadJsQR() {
  return new Promise((resolve) => {
    if (window.jsQR) { resolve(window.jsQR); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.4.0/jsQR.min.js";
    script.onload  = () => resolve(window.jsQR);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

// ── Colores por resultado ─────────────────────────────────
const RESULT_STYLES = {
  ok:      { bg: "bg-green-500",  border: "border-green-400",  text: "text-green-700",  light: "bg-green-50"  },
  dup:     { bg: "bg-yellow-500", border: "border-yellow-400", text: "text-yellow-700", light: "bg-yellow-50" },
  error:   { bg: "bg-red-500",    border: "border-red-400",    text: "text-red-700",    light: "bg-red-50"    },
  idle:    { bg: "bg-gray-400",   border: "border-gray-300",   text: "text-gray-600",   light: "bg-gray-50"   },
};

export default function Scanner() {
  const { userProfile } = useAuth();

  // ── Config del scanner ────────────────────────────────
  const [tipo,      setTipo]      = useState("entrada"); // entrada | sesion | curso
  const [sesionId,  setSesionId]  = useState("");
  const [sesiones,  setSesiones]  = useState([]);
  const [sede,      setSede]      = useState(userProfile?.sede || "");

  // ── Estado de la cámara ────────────────────────────────
  const [camActiva,  setCamActiva]  = useState(false);
  const [camError,   setCamError]   = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // trasera por defecto

  // ── Último resultado ──────────────────────────────────
  const [resultado,  setResultado]  = useState(null); // { ok, usuario, mensaje, tipo }
  const [resultKind, setResultKind] = useState("idle"); // ok | dup | error | idle

  // ── Historial de la sesión ────────────────────────────
  const [historial, setHistorial] = useState([]);
  const [stats,     setStats]     = useState({ entradas_hoy: 0, asistentes_sesion: 0 });
  const [showList,  setShowList]  = useState(false);

  // ── Estado general ────────────────────────────────────
  const [loading,   setLoading]   = useState(false);
  const [scanLock,  setScanLock]  = useState(false); // evita doble-scan

  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const streamRef    = useRef(null);
  const rafRef       = useRef(null);
  const jsQRRef      = useRef(null);
  const lastQRRef    = useRef(null); // último QR escaneado (evita re-scan inmediato)
  const lastQRTime   = useRef(0);

  // ── Cargar sesiones del día ───────────────────────────
  useEffect(() => {
    const dia = new Date().getDay() || 1;
    API.get(`/scan/sesiones?dia=${dia}${sede ? `&sede=${sede}` : ""}`)
      .then(r => setSesiones(r.data.sesiones || []))
      .catch(() => {});
  }, [sede]);

  // ── Actualizar stats periódicamente ──────────────────
  useEffect(() => {
    const fetchStats = () => {
      const params = new URLSearchParams();
      if (sesionId) params.append("sesion_id", sesionId);
      if (sede)     params.append("sede", sede);
      API.get(`/scan/stats?${params}`)
        .then(r => setStats(r.data.stats || {}))
        .catch(() => {});
    };
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [sesionId, sede]);

  // ── Cargar historial ──────────────────────────────────
  const fetchHistorial = useCallback(() => {
    API.get("/scan/historial?limit=20")
      .then(r => setHistorial(r.data.registros || []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchHistorial(); }, []);

  // ── Iniciar cámara ────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCamError(null);
    try {
      // Pedir permiso de cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width:  { ideal: 1280 },
          height: { ideal: 720  },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Cargar jsQR si BarcodeDetector no está disponible
      if (!window.BarcodeDetector) {
        jsQRRef.current = await loadJsQR();
      }

      setCamActiva(true);
      requestAnimationFrame(scanFrame);
    } catch (err) {
      console.error("Camera error:", err);
      setCamError(
        err.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Actívalo en la configuración del navegador."
          : `Error de cámara: ${err.message}`
      );
    }
  }, [facingMode]);

  // ── Detener cámara ────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamActiva(false);
  }, []);

  useEffect(() => {
    return () => stopCamera(); // cleanup al desmontar
  }, [stopCamera]);

  // ── Loop de escaneo ───────────────────────────────────
  const scanFrame = useCallback(async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);

    let qrData = null;

    // Intentar BarcodeDetector (nativo, rápido)
    if (window.BarcodeDetector) {
      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const codes    = await detector.detect(canvas);
        if (codes.length > 0) qrData = codes[0].rawValue;
      } catch {}
    }

    // Fallback: jsQR
    if (!qrData && jsQRRef.current) {
      const imageData = ctx.getImageData(0, 0, w, h);
      const code = jsQRRef.current(imageData.data, w, h);
      if (code) qrData = code.data;
    }

    if (qrData) {
      const now = Date.now();
      // Evitar re-escanear el mismo QR en menos de 3s
      if (qrData !== lastQRRef.current || now - lastQRTime.current > 3000) {
        lastQRRef.current  = qrData;
        lastQRTime.current = now;
        if (!scanLock) {
          await procesarQR(qrData);
        }
      }
    }

    rafRef.current = requestAnimationFrame(scanFrame);
  }, [scanLock, tipo, sesionId, sede]);

  // ── Procesar QR detectado ─────────────────────────────
  const procesarQR = useCallback(async (rawQR) => {
    setScanLock(true);
    setLoading(true);

    // Vibrar si el dispositivo lo soporta
    if (navigator.vibrate) navigator.vibrate(50);

    try {
      let payload;
      try {
        payload = JSON.parse(rawQR);
      } catch {
        // Si no es JSON, intentar usarlo como ID directo
        payload = { id: rawQR };
      }

      const body = {
        qr_payload: payload,
        tipo,
        sede,
        ...(sesionId ? { sesion_id: sesionId } : {}),
      };

      const r = await API.post("/scan/checkin", body);
      const data = r.data;

      if (data.yaRegistrado) {
        setResultKind("dup");
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } else {
        setResultKind("ok");
        if (navigator.vibrate) navigator.vibrate([200]);
      }

      setResultado(data);
      fetchHistorial();

      // Auto-reset del resultado tras 3s
      setTimeout(() => {
        setResultado(null);
        setResultKind("idle");
      }, 3000);

    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setResultKind("error");
      setResultado({ mensaje: msg });
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
      setTimeout(() => {
        setResultado(null);
        setResultKind("idle");
      }, 4000);
    } finally {
      setLoading(false);
      // Desbloquear después de 1.5s
      setTimeout(() => setScanLock(false), 1500);
    }
  }, [tipo, sesionId, sede, fetchHistorial]);

  const styles = RESULT_STYLES[resultKind];

  return (
    <div className="max-w-md mx-auto space-y-4 pb-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <QrCode className="text-blue-600" size={26} />
            Scanner QR
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {camActiva
              ? <span className="flex items-center gap-1 text-green-600"><Wifi size={12} />Cámara activa — escaneando</span>
              : <span className="flex items-center gap-1"><WifiOff size={12} />Cámara apagada</span>
            }
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowList(!showList)}
            className={`p-2 rounded-xl border transition ${showList ? "bg-blue-100 dark:bg-blue-900/30 border-blue-400 text-blue-600" : "border-gray-200 dark:border-gray-600 text-gray-500"}`}
          >
            <List size={18} />
          </button>
          <button
            onClick={camActiva ? stopCamera : startCamera}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition
              ${camActiva
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            {camActiva ? <><CameraOff size={16} />Detener</> : <><Camera size={16} />Activar</>}
          </button>
        </div>
      </div>

      {/* ── Estadísticas del día ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-3xl font-black text-blue-600">{stats.entradas_hoy || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Entradas hoy</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-3xl font-black text-purple-600">{stats.asistentes_sesion || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {sesionId ? "En sesión activa" : "Selecciona sesión"}
          </p>
        </div>
      </div>

      {/* ── Config ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Configuración del scan</p>

        {/* Tipo */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Tipo de registro</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: "entrada",  label: "🚪 Entrada" },
              { id: "sesion",   label: "📅 Sesión" },
              { id: "curso",    label: "🎓 Curso" },
            ].map(t => (
              <button key={t.id} onClick={() => { setTipo(t.id); setSesionId(""); }}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition
                  ${tipo === t.id
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selector de sesión */}
        {(tipo === "sesion" || tipo === "curso") && (
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
              Sesión {sesiones.length === 0 ? "(cargando...)" : `(${sesiones.length} disponibles)`}
            </label>
            <select
              value={sesionId}
              onChange={e => setSesionId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white"
            >
              <option value="">— Selecciona sesión —</option>
              {sesiones
                .filter(s => tipo === "curso" ? s.categoria === "curso" : s.categoria !== "curso")
                .map(s => (
                  <option key={s.id} value={s.id}>
                    {s.titulo} {s.hora_inicio ? `· ${new Date(s.hora_inicio).toLocaleTimeString("es", {hour:"2-digit",minute:"2-digit"})}` : ""} {s.sala ? `· ${s.sala}` : ""}
                  </option>
                ))}
            </select>
            {(tipo === "sesion" || tipo === "curso") && !sesionId && (
              <p className="text-xs text-orange-500 mt-1">⚠️ Selecciona una sesión antes de escanear</p>
            )}
          </div>
        )}

        {/* Sede */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Sede</label>
          <select value={sede} onChange={e => setSede(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white">
            <option value="">— Todas —</option>
            <option value="mexico">México</option>
            <option value="chile">Chile</option>
            <option value="colombia">Colombia</option>
          </select>
        </div>
      </div>

      {/* ── Visor de cámara ── */}
      <div className="bg-black rounded-2xl overflow-hidden relative aspect-square">
        <video
          ref={videoRef}
          muted playsInline autoPlay
          className="w-full h-full object-cover"
          style={{ display: camActiva ? "block" : "none" }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay de estado cuando la cámara no está activa */}
        {!camActiva && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 gap-3">
            <Camera size={56} />
            <p className="text-sm font-semibold">Toca "Activar" para iniciar</p>
            <p className="text-xs text-center px-8">
              Necesitarás permitir acceso a la cámara
            </p>
          </div>
        )}

        {/* Error de cámara */}
        {camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 text-white gap-3 p-6">
            <CameraOff size={40} />
            <p className="text-sm font-semibold text-center">{camError}</p>
          </div>
        )}

        {/* Visor de escaneo — marco */}
        {camActiva && !resultado && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-52 h-52 relative">
              {/* Esquinas del marco */}
              {["top-0 left-0 border-t-4 border-l-4",
                "top-0 right-0 border-t-4 border-r-4",
                "bottom-0 left-0 border-b-4 border-l-4",
                "bottom-0 right-0 border-b-4 border-r-4"].map((cls, i) => (
                <div key={i} className={`absolute w-8 h-8 ${cls} border-white rounded-sm`} />
              ))}
              {/* Línea de escaneo animada */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-400/80 animate-scan-line" />
            </div>
          </div>
        )}

        {/* Overlay de carga */}
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="animate-spin text-white" size={40} />
          </div>
        )}

        {/* Resultado del escaneo */}
        {resultado && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 p-6
            ${resultKind === "ok"    ? "bg-green-900/90"  :
              resultKind === "dup"   ? "bg-yellow-900/90" :
                                       "bg-red-900/90"}`}>
            {resultKind === "ok"  && <CheckCircle  size={64} className="text-green-400"  />}
            {resultKind === "dup" && <Clock         size={64} className="text-yellow-400" />}
            {resultKind === "error" && <AlertCircle size={64} className="text-red-400"    />}

            {resultado.usuario && (
              <div className="text-center">
                <p className="text-white font-black text-2xl">{resultado.usuario.nombre}</p>
                <p className="text-white/70 text-sm mt-1">{resultado.usuario.tipo_pase}</p>
                {resultado.sesion && (
                  <p className="text-white/60 text-xs mt-1">📅 {resultado.sesion.titulo}</p>
                )}
              </div>
            )}

            <p className={`text-center text-sm font-semibold px-4 py-2 rounded-xl
              ${resultKind === "ok"    ? "bg-green-500/30 text-green-200"  :
                resultKind === "dup"   ? "bg-yellow-500/30 text-yellow-200" :
                                         "bg-red-500/30 text-red-200"}`}>
              {resultado.mensaje}
            </p>
          </div>
        )}

        {/* Botón cambiar cámara */}
        {camActiva && (
          <button
            onClick={() => { stopCamera(); setFacingMode(m => m === "environment" ? "user" : "environment"); }}
            className="absolute bottom-3 right-3 p-2 bg-black/50 rounded-xl text-white hover:bg-black/70"
          >
            <RefreshCw size={18} />
          </button>
        )}
      </div>

      {/* ── Historial lateral/inferior ── */}
      {showList && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              Registros de hoy ({historial.length})
            </h3>
            <button onClick={fetchHistorial} className="text-gray-400 hover:text-gray-600">
              <RefreshCw size={16} />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {historial.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-sm">Sin registros aún</p>
            ) : (
              historial.map((r, i) => (
                <div key={r.id || i} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0 dark:border-gray-700">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${r.tipo === "entrada" ? "bg-blue-400" : "bg-green-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{r.nombre}</p>
                    <p className="text-xs text-gray-400 truncate">{r.sesion} · {r.tipo_pase}</p>
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">
                    {new Date(r.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Nota de compatibilidad ── */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-3 text-xs text-blue-700 dark:text-blue-300">
        <p className="font-semibold mb-1">💡 Mejor experiencia en móvil</p>
        <p>Usa <strong>Chrome o Edge en Android</strong> para detección QR nativa y más rápida.
        En iOS (Safari) funciona con jsQR (puede tardar 1-2 seg más por frame).</p>
      </div>

      {/* CSS animación línea de scan */}
      <style>{`
        @keyframes scan-line {
          0%   { transform: translateY(0); }
          50%  { transform: translateY(200px); }
          100% { transform: translateY(0); }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}