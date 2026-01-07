// src/components/dashboard/StaffPanel.jsx

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Users,
  Calendar,
  Building2,
  TrendingUp,
  Download,
  BarChart3,
  Award
} from "lucide-react";

/**
 * 🔧 Feature flag
 * Cuando el backend esté listo → cambiar a true
 */
const USE_BACKEND_STATS = false;

const StaffPanel = () => {
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

  /**
   * ✅ FUNCIÓN ESTABLE
   * NO Firestore
   * NO crashes
   * NO efectos colaterales
   */
  const loadStats = async () => {
    try {
      if (!USE_BACKEND_STATS) {
        setStats({
          totalAsistentes: 0,
          asistentesCurso: 0,
          asistentesSesion: 0,
          asistentesCombo: 0,
          becados: 0,
          checkInsCursos: 0,
          checkInsSesiones: 0,
          visitasStands: 0
        });
        setTopSesiones([]);
        setTopStands([]);
        return;
      }

      // 🔜 FUTURO:
      // const res = await fetch(`${import.meta.env.VITE_API_URL}/staff/stats`, {
      //   headers: {
      //     Authorization: `Bearer ${localStorage.getItem("token")}`
      //   }
      // });
      // const data = await res.json();
      // setStats(data.stats);
      // setTopSesiones(data.topSesiones);
      // setTopStands(data.topStands);

    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Panel de Staff</h2>
        <p className="text-gray-300">
          {userData?.nombre} - {userData?.rol || "Staff"}
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Vista de solo lectura - Estadísticas en tiempo real
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users />} value={stats.totalAsistentes} label="Total Asistentes" />
        <StatCard icon={<Calendar />} value={stats.checkInsSesiones} label="Check-ins Sesiones" />
        <StatCard icon={<Building2 />} value={stats.visitasStands} label="Visitas a Stands" />
        <StatCard icon={<TrendingUp />} value="—" label="Satisfacción" />
      </div>

      {/* Distribución */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <BarChart3 /> Distribución de Asistentes
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <DistCard label="Curso" value={stats.asistentesCurso} />
          <DistCard label="Sesión" value={stats.asistentesSesion} />
          <DistCard label="Combo" value={stats.asistentesCombo} />
        </div>
      </div>

      {/* Becas */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Award /> Asistentes con Beca
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <DistCard label="Becados" value={stats.becados} />
          <DistCard
            label="Pagados"
            value={stats.totalAsistentes - stats.becados}
          />
        </div>
      </div>

      {/* Top Sesiones */}
      <TopList title="Top 5 Sesiones más Concurridas" data={topSesiones} />

      {/* Top Stands */}
      <TopList title="Top 5 Stands más Visitados" data={topStands} />

      {/* Exportar */}
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-6 rounded-xl">
        <button
          onClick={() => alert("Exportación próximamente")}
          className="w-full bg-gray-700 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2"
        >
          <Download /> Exportar Reportes
        </button>
      </div>
    </div>
  );
};

/* ============================= */
/* COMPONENTES AUXILIARES */
/* ============================= */

const StatCard = ({ icon, value, label }) => (
  <div className="bg-white p-4 rounded-xl shadow-md">
    <div className="text-blue-600 mb-2">{icon}</div>
    <p className="text-3xl font-bold">{value}</p>
    <p className="text-sm text-gray-600">{label}</p>
  </div>
);

const DistCard = ({ label, value }) => (
  <div className="text-center p-4 bg-gray-50 rounded-lg">
    <p className="text-3xl font-bold">{value}</p>
    <p className="text-sm text-gray-600">{label}</p>
  </div>
);

const TopList = ({ title, data }) => (
  <div className="bg-white p-6 rounded-xl shadow-md">
    <h3 className="font-bold text-lg mb-4">{title}</h3>
    {data.length === 0 ? (
      <p className="text-sm text-gray-500">Sin datos disponibles</p>
    ) : (
      data.map((item, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <span className="font-bold">{i + 1}</span>
          <span className="flex-1">{item.nombre || item.titulo}</span>
          <span className="font-bold">{item.visitas || item.asistentes}</span>
        </div>
      ))
    )}
  </div>
);

export default StaffPanel;
