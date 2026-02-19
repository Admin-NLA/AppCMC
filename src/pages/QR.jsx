import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { QrCode, Download, Printer, AlertCircle, Copy, CheckCircle } from "lucide-react";
import Header from "../Components/layout/Header";

// QR Code library (usando QR.js CDN)
const QRCode = window.QRCode || null;

export default function QR() {
  const { userProfile, permisos } = useAuth();

  const [qrCanvas, setQrCanvas] = useState(null);
  const [copied, setCopied] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // ========================================================
  // VALIDACIÓN DE ACCESO
  // ========================================================
  const validateAccess = () => {
    if (!permisos?.verQR) {
      setAccessDenied(true);
      setAccessMessage("No tienes permiso para acceder a tu QR");
      return false;
    }
    return true;
  };

  // ========================================================
  // CARGAR Y GENERAR QR
  // ========================================================
  useEffect(() => {
    if (!validateAccess()) {
      setLoading(false);
      return;
    }

    generateQR();
  }, [permisos, userProfile]);

  const generateQR = () => {
    try {
      if (!userProfile?.id || !userProfile?.email) {
        setLoading(false);
        return;
      }

      // Datos para el QR
      const qrData = {
        id: userProfile.id,
        email: userProfile.email,
        nombre: userProfile.nombre,
        rol: userProfile.rol,
        pase: userProfile.tipo_pase,
        timestamp: new Date().toISOString()
      };

      const qrString = JSON.stringify(qrData);

      // Crear elemento canvas
      const canvas = document.createElement("canvas");
      
      // Usar librería QR (si está disponible)
      if (window.QRCode) {
        new window.QRCode({
          useSVG: true,
          correctLevel: window.QRCode.CorrectLevel.H,
          colorDark: "#000",
          colorLight: "#FFF",
          text: qrString,
          width: 250,
          height: 250,
          onRenderingStart: () => {},
          onRenderingEnd: () => {
            setQrCanvas(canvas);
            setLoading(false);
          }
        });
      } else {
        // Fallback: mostrar código simple
        console.log("QR Code library no disponible");
        setLoading(false);
      }
    } catch (err) {
      console.error("Error generando QR:", err);
      setLoading(false);
    }
  };

  // ========================================================
  // DESCARGAR QR
  // ========================================================
  const downloadQR = () => {
    if (!qrCanvas) return;

    const link = document.createElement("a");
    link.href = qrCanvas.toDataURL("image/png");
    link.download = `QR_${userProfile.id}_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ========================================================
  // IMPRIMIR QR
  // ========================================================
  const printQR = () => {
    const printWindow = window.open("", "", "height=400,width=400");
    printWindow.document.write(`
      <html>
        <head>
          <title>Mi QR - ${userProfile.nombre}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              font-family: sans-serif;
              background: white;
            }
            .qr-container {
              text-align: center;
              padding: 20px;
              border: 2px solid #333;
            }
            h2 { margin: 0 0 10px 0; }
            p { margin: 5px 0; color: #666; }
            canvas { margin: 20px 0; }
            .info { font-size: 12px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>${userProfile.nombre}</h2>
            <p><strong>Email:</strong> ${userProfile.email}</p>
            <p><strong>Rol:</strong> ${userProfile.rol}</p>
            <p><strong>Pase:</strong> ${userProfile.tipo_pase}</p>
            <p><strong>CMC Chile 2025</strong></p>
            <div class="info">
              <p>Mostra este QR en la entrada</p>
              <p>Impreso: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // ========================================================
  // COPIAR A PORTAPAPELES
  // ========================================================
  const copyToClipboard = () => {
    const qrData = {
      id: userProfile.id,
      email: userProfile.email,
      nombre: userProfile.nombre,
      rol: userProfile.rol,
      pase: userProfile.tipo_pase
    };

    navigator.clipboard.writeText(JSON.stringify(qrData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ========================================================
  // RENDERIZADO
  // ========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Generando QR...</p>
          </div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 mt-1" size={24} />
              <div>
                <p className="text-red-800 font-semibold text-lg">{accessMessage}</p>
                <p className="text-red-700 text-sm mt-2">
                  Tu tipo de pase no incluye acceso a tu QR de entrada.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <QrCode size={32} className="text-blue-600" />
            Mi QR de Entrada
          </h1>
          <p className="text-gray-600">
            Muestra este código QR en la entrada del evento
          </p>
        </div>

        {/* Tarjeta principal del QR */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-8 text-center mb-8">
            <div id="qr-container" className="inline-block">
              {qrCanvas ? (
                <img
                  src={qrCanvas.toDataURL("image/png")}
                  alt="Mi QR"
                  className="mx-auto"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-gray-200 rounded-lg">
                  <p className="text-gray-600 text-center px-4">
                    QR no disponible.<br />
                    Intenta recargar la página.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Información del usuario */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">Tu Información</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Nombre:</span>
                <span className="font-semibold text-gray-900">{userProfile.nombre}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Email:</span>
                <span className="font-semibold text-gray-900">{userProfile.email}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Rol:</span>
                <span className="font-semibold text-gray-900 capitalize">
                  {userProfile.rol}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Tipo de Pase:</span>
                <span className="font-semibold text-gray-900 capitalize">
                  {userProfile.tipo_pase || "N/A"}
                </span>
              </div>
              {userProfile.sede && (
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Sede:</span>
                  <span className="font-semibold text-gray-900 uppercase">
                    {userProfile.sede}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={downloadQR}
              disabled={!qrCanvas}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold"
            >
              <Download size={20} />
              Descargar
            </button>

            <button
              onClick={printQR}
              disabled={!qrCanvas}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition font-semibold"
            >
              <Printer size={20} />
              Imprimir
            </button>

            <button
              onClick={copyToClipboard}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition font-semibold ${
                copied
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle size={20} />
                  Copiado
                </>
              ) : (
                <>
                  <Copy size={20} />
                  Copiar datos
                </>
              )}
            </button>
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-3">💡 Recomendaciones</h3>
          <ul className="text-blue-800 text-sm space-y-2">
            <li>✅ Descarga o imprime tu QR antes del evento</li>
            <li>✅ Ten tu QR visible en tu teléfono o en papel</li>
            <li>✅ El QR contiene tu información personal y de registro</li>
            <li>✅ Puedes regenerar tu QR en cualquier momento</li>
            <li>✅ Si pierdes tu acceso, contacta a soporte</li>
          </ul>
        </div>
      </div>
    </div>
  );
}