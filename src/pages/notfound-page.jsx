// src/pages/NotFound.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-gray-800 flex items-center justify-center p-4">
      <div className="text-center text-white max-w-md">
        <div className="mb-8">
          <h1 className="text-9xl font-bold mb-4">404</h1>
          <div className="w-32 h-32 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <span className="text-6xl">🔍</span>
          </div>
        </div>

        <h2 className="text-3xl font-bold mb-4">Página no encontrada</h2>
        <p className="text-blue-200 mb-8">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition"
          >
            <ArrowLeft size={20} />
            Volver
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-3 bg-white text-blue-900 hover:bg-blue-50 rounded-lg font-semibold transition"
          >
            <Home size={20} />
            Ir al Inicio
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-white/20">
          <p className="text-sm text-blue-300">
            CMC Chile 2025 - Congreso de Mantenimiento y Confiabilidad
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
