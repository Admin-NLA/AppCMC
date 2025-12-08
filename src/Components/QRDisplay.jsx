// src/components/checkin/QRDisplay.jsx

import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { Download, Share2 } from 'lucide-react';

const QRDisplay = ({ size = 256 }) => {
  const { userData } = useAuth();
  const qrRef = useRef(null);

  const downloadQR = () => {
    const svg = qrRef.current.querySelector('svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `CMC2025-${userData.nombre}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const shareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mi QR - CMC Chile 2025',
          text: `QR de ${userData.nombre} para CMC Chile 2025`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copiar código al portapapeles
      navigator.clipboard.writeText(userData.qrCode);
      alert('Código copiado al portapapeles');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code */}
      <div ref={qrRef} className="bg-white p-6 rounded-2xl shadow-lg">
        <QRCodeSVG
          value={userData.qrCode}
          size={size}
          level="H"
          includeMargin={true}
          imageSettings={{
            src: "/logo-cmc.png", // Logo en el centro (opcional)
            height: 40,
            width: 40,
            excavate: true
          }}
        />
      </div>

      {/* Info del código */}
      <div className="text-center">
        <p className="text-sm font-mono bg-gray-100 px-4 py-2 rounded-lg text-gray-700">
          {userData.qrCode}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Presenta este código para registrar tu asistencia
        </p>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3">
        <button
          onClick={downloadQR}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Download size={18} />
          Descargar
        </button>
        <button
          onClick={shareQR}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          <Share2 size={18} />
          Compartir
        </button>
      </div>

      {/* Indicador de tipo de pase */}
      <div className="mt-4 text-center">
        <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
          userData.tipo === 'curso' ? 'bg-blue-100 text-blue-800' :
          userData.tipo === 'sesion' ? 'bg-green-100 text-green-800' :
          userData.tipo === 'combo' ? 'bg-purple-100 text-purple-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          Pase: {userData.tipo.toUpperCase()}
        </span>
      </div>
    </div>
  );
};

export default QRDisplay;
