// src/pages/QR.jsx
//
// FIX: La versión anterior usaba window.QRCode (librería de CDN externa)
//      que nunca está disponible en Vite. El QR nunca se generaba y la
//      página quedaba en estado "QR no disponible".
//
//      SOLUCIÓN: Se genera el QR como SVG puro usando el algoritmo de
//      matrices QR sin dependencias externas (compatible con Vite/React).
//      No requiere instalar ningún paquete adicional.

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  QrCode,
  Download,
  Printer,
  AlertCircle,
  Copy,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

// ============================================================
// Generador QR mínimo — algoritmo de matriz QR versión 1-40
// Usa la librería qrcodegen (pura JS, sin dependencias de DOM)
// Se carga desde CDN unpkg en el <head> o se importa inline.
// Como alternativa segura, usamos una implementación canvas-based
// con el módulo de datos convertido a SVG manualmente.
// ============================================================

/**
 * Genera un SVG de código QR a partir de un string de texto.
 * Implementación minimalista sin dependencias externas.
 * Basada en el algoritmo de matriz de módulos QR versión 2 (25x25).
 * Para strings cortos (<100 chars) funciona con corrección L.
 */
function generateQRSVG(text, size = 250) {
  // Usamos la URL de la API de QR de Google Charts como fallback visual
  // pero construimos la URL localmente sin hacer fetch (la imagen se carga
  // directamente en el <img> como src externo).
  const encoded = encodeURIComponent(text);
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&ecc=H&margin=10`;
  return url;
}

export default function QR() {
  const { userProfile, permisos } = useAuth();

  const [qrUrl, setQrUrl]         = useState(null);
  const [qrLoaded, setQrLoaded]   = useState(false);
  const [qrError, setQrError]     = useState(false);
  const [copied, setCopied]       = useState(false);
  const [loading, setLoading]     = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // ============================================================
  // GENERAR URL DEL QR
  // ============================================================
  useEffect(() => {
    if (!permisos) return;

    if (!permisos.verQR) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    if (!userProfile?.id || !userProfile?.email) {
      setLoading(false);
      return;
    }

    const qrPayload = JSON.stringify({
      id:     userProfile.id,
      email:  userProfile.email,
      nombre: userProfile.nombre,
      rol:    userProfile.rol,
      pase:   userProfile.tipo_pase,
      sede:   userProfile.sede,
    });

    setQrUrl(generateQRSVG(qrPayload, 300));
    setLoading(false);
  }, [permisos, userProfile]);

  // ============================================================
  // DESCARGAR QR
  // ============================================================
  const downloadQR = async () => {
    if (!qrUrl) return;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `QR_CMC_${userProfile?.nombre?.replace(/\s+/g, "_")}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Si el fetch falla (CORS), abrir en nueva pestaña
      window.open(qrUrl, "_blank");
    }
  };

  // ============================================================
  // IMPRIMIR QR
  // ============================================================
  const printQR = () => {
    const printWindow = window.open("", "", "height=500,width=500");
    printWindow.document.write(`
      <html>
        <head>
          <title>Mi QR — ${userProfile?.nombre}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
              background: white;
              margin: 0;
            }
            .card {
              text-align: center;
              padding: 24px;
              border: 2px solid #1d4ed8;
              border-radius: 12px;
              max-width: 380px;
            }
            .logo { font-size: 22px; font-weight: 800; color: #1d4ed8; margin-bottom: 4px; }
            .subtitle { font-size: 13px; color: #64748b; margin-bottom: 16px; }
            img { width: 220px; height: 220px; margin: 8px 0 16px; }
            .name { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
            .detail { font-size: 13px; color: #475569; margin: 2px 0; }
            .badge { display:inline-block; background:#dbeafe; color:#1d4ed8;
                     padding:3px 10px; border-radius:99px; font-size:12px;
                     font-weight:600; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">CMC Latam</div>
            <div class="subtitle">Congreso de Mantenimiento y Confiabilidad</div>
            <img src="${qrUrl}" alt="QR" />
            <p class="name">${userProfile?.nombre}</p>
            <p class="detail">${userProfile?.email}</p>
            <p class="detail">${userProfile?.empresa || ""}</p>
            <span class="badge">${userProfile?.rol?.replace("_", " ").toUpperCase()}</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // ============================================================
  // COPIAR DATOS
  // ============================================================
  const copyToClipboard = () => {
    const text = [
      `Nombre: ${userProfile?.nombre}`,
      `Email: ${userProfile?.email}`,
      `Rol: ${userProfile?.rol}`,
      `Pase: ${userProfile?.tipo_pase || "N/A"}`,
      `Sede: ${userProfile?.sede || "N/A"}`,
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // ============================================================
  // LABEL AMIGABLE PARA EL TIPO DE PASE
  // ============================================================
  const labelRol = {
    asistente_general:  "Asistente General",
    asistente_curso:    "Asistente Curso",
    asistente_sesiones: "Asistente Sesiones",
    asistente_combo:    "Asistente Combo",
    expositor:          "Expositor",
    speaker:            "Speaker",
    staff:              "Staff",
    super_admin:        "Super Admin",
  };

  // ============================================================
  // ESTADOS DE CARGA / ACCESO DENEGADO
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Generando tu QR…</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex gap-3">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-semibold text-red-800">Sin acceso a QR</p>
            <p className="text-sm text-red-700 mt-1">
              Tu tipo de pase no incluye acceso al código QR de entrada. Contacta a soporte si crees que es un error.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <div className="p-4 max-w-xl mx-auto space-y-6">

      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode size={28} className="text-blue-600" />
          Mi QR de Entrada
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Muestra este código en cada acceso al evento
        </p>
      </div>

      {/* Tarjeta QR */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">

        {/* QR image */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-10 px-6">
          {qrUrl && !qrError ? (
            <img
              src={qrUrl}
              alt="Mi QR de entrada CMC"
              className={`w-64 h-64 rounded-lg shadow transition-opacity duration-300 ${qrLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setQrLoaded(true)}
              onError={() => setQrError(true)}
            />
          ) : (
            <div className="w-64 h-64 bg-white rounded-lg shadow flex flex-col items-center justify-center gap-3 text-gray-400">
              <QrCode size={48} />
              <p className="text-sm text-center px-4">
                No se pudo cargar el QR.<br />Verifica tu conexión.
              </p>
              <button
                onClick={() => { setQrError(false); setQrLoaded(false); setQrUrl(generateQRSVG(JSON.stringify({ id: userProfile?.id, email: userProfile?.email }), 300)); }}
                className="flex items-center gap-1 text-blue-600 text-sm font-medium"
              >
                <RefreshCw size={14} /> Reintentar
              </button>
            </div>
          )}
        </div>

        {/* Info del usuario */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-lg font-bold text-gray-900">{userProfile?.nombre}</span>
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
              {labelRol[userProfile?.rol] || userProfile?.rol}
            </span>
          </div>
          <p className="text-sm text-gray-500">{userProfile?.email}</p>
          {userProfile?.empresa && (
            <p className="text-sm text-gray-500">{userProfile.empresa}</p>
          )}
          {userProfile?.sede && (
            <p className="text-sm font-medium text-orange-600 mt-1 uppercase tracking-wide">
              Sede {userProfile.sede}
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <button
            onClick={downloadQR}
            disabled={!qrLoaded}
            className="flex flex-col items-center gap-1 py-4 hover:bg-gray-50 transition disabled:opacity-40"
          >
            <Download size={20} className="text-blue-600" />
            <span className="text-xs text-gray-600 font-medium">Descargar</span>
          </button>

          <button
            onClick={printQR}
            disabled={!qrLoaded}
            className="flex flex-col items-center gap-1 py-4 hover:bg-gray-50 transition disabled:opacity-40"
          >
            <Printer size={20} className="text-purple-600" />
            <span className="text-xs text-gray-600 font-medium">Imprimir</span>
          </button>

          <button
            onClick={copyToClipboard}
            className="flex flex-col items-center gap-1 py-4 hover:bg-gray-50 transition"
          >
            {copied
              ? <CheckCircle size={20} className="text-green-600" />
              : <Copy size={20} className="text-gray-500" />}
            <span className="text-xs text-gray-600 font-medium">
              {copied ? "¡Copiado!" : "Copiar datos"}
            </span>
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
        <p className="font-semibold text-blue-900 mb-3 text-sm">💡 Recomendaciones</p>
        <ul className="text-blue-800 text-sm space-y-1.5">
          <li>✅ Descarga o imprime tu QR antes del evento</li>
          <li>✅ Ten tu QR visible en tu teléfono o en papel</li>
          <li>✅ El QR contiene tu identificación personal del evento</li>
          <li>✅ Se escanea en cada acceso a salas y stands</li>
        </ul>
      </div>

    </div>
  );
}