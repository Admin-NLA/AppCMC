// src/components/dashboard/StaffDashboard.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from "../contexts/AuthContext";
import { Users, Calendar, Building2, TrendingUp, Download, BarChart3, Award } from 'lucide-react';

const StaffDashboard = () => {
  const { userData } = useAuth();
  const [stats, setStats] = useState({
    totalAsistentes: 0,
    asistentesCurso: 0,
    asistentesSesion: 0,
    asistentesCombo: 0,
    becados: 0,
    checkInsCursos: 0,
    checkInsSesiones: 0,
    visitasStands: 0
  });
  const [topSesiones, setTopSesiones] = useState([]);
  const [topStands, setTopStands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);
/*
  const loadStats = async () => {
    try {
      // Cargar asistentes
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(doc => doc.data());

      const asistentes = users.filter(u => ['curso', 'sesion', 'combo'].includes(u.tipo));
      const curso = users.filter(u => u.tipo === 'curso');
      const sesion = users.filter(u => u.tipo === 'sesion');
      const combo = users.filter(u => u.tipo === 'combo');
      const becados = users.filter(u => u.esBeca === true);

      // Cargar check-ins
      const checkInsSnap = await getDocs(collection(db, 'checkIns'));
      const checkIns = checkInsSnap.docs.map(doc => doc.data());

      const checkInsCursos = checkIns.filter(c => c.tipo === 'curso').length;
      const checkInsSesiones = checkIns.filter(c => c.tipo === 'sesion').length;
      const visitasStands = checkIns.filter(c => c.tipo === 'stand').length;

      // Cargar sesiones y calcular top
      const sesionesSnap = await getDocs(collection(db, 'sesiones'));
      const sesiones = sesionesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      const topSes = sesiones
        .sort((a, b) => (b.asistentesActuales || 0) - (a.asistentesActuales || 0))
        .slice(0, 5);

      // Cargar expositores y calcular top
      const expositoresSnap = await getDocs(collection(db, 'expositores'));
      const expositores = expositoresSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Contar visitas por stand
      const visitasPorStand = {};
      checkIns.filter(c => c.tipo === 'stand').forEach(c => {
        visitasPorStand[c.referenceId] = (visitasPorStand[c.referenceId] || 0) + 1;
      });

      const topExp = expositores
        .map(exp => ({
          ...exp,
          visitas: visitasPorStand[exp.stand] || 0
        }))
        .sort((a, b) => b.visitas - a.visitas)
        .slice(0, 5);

      setStats({
        totalAsistentes: asistentes.length,
        asistentesCurso: curso.length,
        asistentesSesion: sesion.length,
        asistentesCombo: combo.length,
        becados: becados.length,
        checkInsCursos,
        checkInsSesiones,
        visitasStands
      });

      setTopSesiones(topSes);
      setTopStands(topExp);

    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  }; 

  const exportarDatos = () => {
    alert('Función de exportación en desarrollo');
    // Implementar exportación completa
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }*/

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Panel de Staff</h2>
        <p className="text-gray-300">{userData.nombre} - {userData.rol || 'Staff'}</p>
        <p className="text-sm text-gray-400 mt-2">Vista de solo lectura - Estadísticas en tiempo real</p>
      </div>

      {/* Estadísticas Principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-md">
          <Users className="text-blue-600 mb-2" size={28} />
          <p className="text-3xl font-bold text-gray-800">{stats.totalAsistentes}</p>
          <p className="text-sm text-gray-600">Total Asistentes</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-md">
          <Calendar className="text-green-600 mb-2" size={28} />
          <p className="text-3xl font-bold text-gray-800">{stats.checkInsSesiones}</p>
          <p className="text-sm text-gray-600">Check-ins Sesiones</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-md">
          <Building2 className="text-orange-600 mb-2" size={28} />
          <p className="text-3xl font-bold text-gray-800">{stats.visitasStands}</p>
          <p className="text-sm text-gray-600">Visitas a Stands</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-md">
          <TrendingUp className="text-purple-600 mb-2" size={28} />
          <p className="text-3xl font-bold text-gray-800">89%</p>
          <p className="text-sm text-gray-600">Satisfacción</p>
        </div>
      </div>

      {/* Distribución de Asistentes */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <BarChart3 className="text-gray-700" size={24} />
          Distribución de Asistentes
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{stats.asistentesCurso}</p>
            <p className="text-sm text-gray-600">Solo Curso</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{stats.asistentesSesion}</p>
            <p className="text-sm text-gray-600">Solo Sesión</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-3xl font-bold text-purple-600">{stats.asistentesCombo}</p>
            <p className="text-sm text-gray-600">Combo</p>
          </div>
        </div>
      </div>

      {/* Información de Becas (Solo visible para staff/admin) */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Award className="text-yellow-600" size={24} />
          Asistentes con Beca
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500 text-center">
            <p className="text-3xl font-bold text-yellow-700">{stats.becados}</p>
            <p className="text-sm text-gray-600">Becados</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 text-center">
            <p className="text-3xl font-bold text-blue-700">{stats.totalAsistentes - stats.becados}</p>
            <p className="text-sm text-gray-600">Pagados</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          ⚠️ Información confidencial - Solo visible para Staff y Admin
        </p>
      </div>

      {/* Top 5 Sesiones */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="font-bold text-lg mb-4">Top 5 Sesiones más Concurridas</h3>
        <div className="space-y-3">
          {topSesiones.map((sesion, index) => (
            <div key={sesion.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{sesion.titulo}</p>
                <p className="text-xs text-gray-600">{sesion.speaker}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-blue-600">{sesion.asistentesActuales || 0}</p>
                <p className="text-xs text-gray-500">asistentes</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 Stands */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="font-bold text-lg mb-4">Top 5 Stands más Visitados</h3>
        <div className="space-y-3">
          {topStands.map((expositor, index) => (
            <div key={expositor.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{expositor.empresa}</p>
                <p className="text-xs text-gray-600">Stand {expositor.stand}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-orange-600">{expositor.visitas}</p>
                <p className="text-xs text-gray-500">visitas</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón Exportar */}
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-6 rounded-xl">
        <h3 className="font-bold text-lg mb-3">Exportar Datos</h3>
        <p className="text-sm text-gray-600 mb-4">
          Descarga todos los reportes y estadísticas en formato CSV
        </p>
        <button
          onClick={exportarDatos}
          className="w-full bg-gray-700 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2"
        >
          <Download size={20} />
          Exportar Reportes Completos
        </button>
      </div>
    </div>
  );
};

export default StaffDashboard;