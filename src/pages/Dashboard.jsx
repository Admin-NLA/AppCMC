import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
//----Sede activa--//
import { useEvent } from "../contexts/EventContext";
import API from "../services/api";

import { Link } from "react-router-dom";
import { Calendar, Users, Building2, CheckCircle, Clock, TrendingUp, Award, Bell } from "lucide-react";
import Header from "../Components/layout/Header";

// ============================================================
// DASHBOARD
// ============================================================

export default function Dashboard() {
  const { user, userProfile, permisos } = useAuth();
  // ✅ AQUÍ SÍ se puede usar el hook
  const { sedeActiva, edicionActiva, multiSede, ready } = useEvent();
  
  if (!permisos) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Cargando permisos...</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Cargando evento...</p>
      </div>
    );
  }

  console.log("EVENTO ACTIVO:", { sedeActiva, edicionActiva, multiSede });

  const [stats, setStats] = useState({
    sessions: 0,
    speakers: 0,
    expositores: 0,
    users: 0,
    checkIns: 0,
    byTipoPase: {},
    byRol: {},
    bySede: {},
  });

  const [nextSessions, setNextSessions] = useState([]);
  const [speakerSessions, setSpeakerSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ========================================================
  // Cargar estadísticas
  // ========================================================
  useEffect(() => {
    if (user && userProfile) loadDashboard();
  }, [user, userProfile]);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // ✅ LLAMAR A /api/stats
      console.log('📊 Cargando estadísticas...');
      const statsRes = await API.get("/stats");
      
      console.log('✅ Stats recibidas:', statsRes.data);

      setStats({
        sessions: statsRes.data.sessions || 0,
        speakers: statsRes.data.speakers || 0,
        expositores: statsRes.data.expositores || 0,
        users: statsRes.data.users || 0,
        checkIns: statsRes.data.checkIns || 0,
        byTipoPase: statsRes.data.byTipoPase || {},
        byRol: statsRes.data.byRol || {},
        bySede: statsRes.data.bySede || {},
      });

      // Opcional: Cargar próximas sesiones
      try {
        const sessionsRes = await API.get("/agenda/sessions");
        const sessions = Array.isArray(sessionsRes.data.sessions) 
          ? sessionsRes.data.sessions 
          : [];
        setNextSessions(sessions.slice(0, 5)); // Primeras 5
      } catch (err) {
        console.log('⚠️ No se pudieron cargar próximas sesiones:', err.message);
        setNextSessions([]);
      }

    } catch (err) {
      console.error("❌ Error cargando dashboard:", err);
      setStats({
        sessions: 0,
        speakers: 0,
        expositores: 0,
        users: 0,
        checkIns: 0,
        byTipoPase: {},
        byRol: {},
        bySede: {},
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !userProfile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER SEGÚN ROL
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-2">¡Bienvenido, {userProfile.nombre}!</h1>
        <p className="text-gray-600 mb-6">
          Rol: <span className="font-semibold capitalize">{userProfile.rol}</span>
          {sedeActiva && ` | Sede: ${sedeActiva.toUpperCase()}`}
          {edicionActiva && ` | Edición: ${edicionActiva}`}
        </p>

        {/* ADMIN / STAFF / SUPER_ADMIN */}
        {(userProfile.rol === "super_admin" || userProfile.rol === "admin" || userProfile.rol === "staff") && (
          <AdminView stats={stats} />
        )}

        {/* SPEAKER */}
        {userProfile.rol === "speaker" && <SpeakerView sessions={speakerSessions} />}

        {/* ASISTENTES */}
        {permisos.verAgenda && userProfile.rol === "asistente" && (
          <AsistenteView stats={stats} nextSessions={nextSessions} />
        )}

        {/* EXPOSITOR */}
        {userProfile.rol === "expositor" && <ExpositorView stats={stats} />}
      </div>
    </div>
  );
}

// ============================================================
// ADMIN / STAFF VIEW
// ============================================================

function AdminView({ stats }) {
  return (
    <div className="mt-8 space-y-6">
      {/* Cards principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          icon={Calendar} 
          label="Sesiones Totales" 
          value={stats.sessions} 
          color="blue" 
        />
        <StatCard 
          icon={Users} 
          label="Speakers" 
          value={stats.speakers} 
          color="purple" 
        />
        <StatCard 
          icon={Building2} 
          label="Expositores" 
          value={stats.expositores} 
          color="orange" 
        />
        <StatCard 
          icon={Users} 
          label="Usuarios Registrados" 
          value={stats.users} 
          color="green" 
        />
      </div>

      {/* Distribucion por rol */}
      {Object.keys(stats.byRol).length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Usuarios por Rol</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byRol).map(([rol, count]) => (
              <div key={rol} className="bg-gray-50 p-4 rounded-lg text-center border-l-4 border-blue-600">
                <p className="text-2xl font-bold text-gray-800">{count}</p>
                <p className="text-sm text-gray-600 capitalize">{rol}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distribucion por sede */}
      {Object.keys(stats.bySede).length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Usuarios por Sede</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.bySede).map(([sede, count]) => (
              <div key={sede} className="bg-gray-50 p-4 rounded-lg text-center border-l-4 border-orange-600">
                <p className="text-2xl font-bold text-gray-800">{count}</p>
                <p className="text-sm text-gray-600 capitalize">{sede}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distribucion por tipo de pase */}
      {Object.keys(stats.byTipoPase).length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Usuarios por Tipo de Pase</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byTipoPase).map(([pase, count]) => (
              <div key={pase} className="bg-gray-50 p-4 rounded-lg text-center border-l-4 border-purple-600">
                <p className="text-2xl font-bold text-gray-800">{count}</p>
                <p className="text-sm text-gray-600 capitalize">{pase}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link a panel admin */}
      <Link 
        to="/admin" 
        className="inline-block bg-blue-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-blue-700 transition"
      >
        Ir al Panel de Administración →
      </Link>
    </div>
  );
}

// ============================================================
// SPEAKER VIEW
// ============================================================

function SpeakerView({ sessions }) {
  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-xl font-bold">Mis Sesiones</h2>
      {sessions.length === 0 ? (
        <p className="text-gray-600">Aún no tienes sesiones asignadas.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="border-l-4 border-blue-600 pl-4 py-2 bg-white p-4 rounded-lg">
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-gray-600">
                {new Date(s.start_at).toLocaleString()} – {new Date(s.end_at).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ASISTENTE VIEW
// ============================================================

function AsistenteView({ stats, nextSessions }) {
  return (
    <div className="mt-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          icon={Calendar} 
          label="Sesiones Totales" 
          value={stats.sessions} 
          color="blue" 
        />
        <StatCard 
          icon={CheckCircle} 
          label="Check-ins" 
          value={stats.checkIns} 
          color="green" 
        />
        <StatCard 
          icon={Building2} 
          label="Expositores" 
          value={stats.expositores} 
          color="purple" 
        />
        <StatCard 
          icon={Award} 
          label="Speakers" 
          value={stats.speakers} 
          color="orange" 
        />
      </div>

      <NextSessionsCard sessions={nextSessions} />
    </div>
  );
}

// ============================================================
// EXPOSITOR VIEW
// ============================================================

function ExpositorView({ stats }) {
  return (
    <div className="mt-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          icon={Users} 
          label="Visitantes Registrados" 
          value={stats.checkIns} 
          color="blue" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Total de Usuarios" 
          value={stats.users} 
          color="green" 
        />
        <StatCard 
          icon={Award} 
          label="Sesiones Disponibles" 
          value={stats.sessions} 
          color="purple" 
        />
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{label}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colors[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

function NextSessionsCard({ sessions }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
        <Clock size={24} className="text-blue-600" /> Próximas Sesiones
      </h2>

      {sessions.length === 0 ? (
        <p className="text-gray-600">No hay próximas sesiones.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s, idx) => (
            <div key={s.id} className="border-l-4 border-blue-600 pl-4 py-2 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{idx + 1}. {s.titulo || 'Sin título'}</h3>
                  {s.horaInicio && (
                    <p className="text-sm text-gray-600">
                      {new Date(s.horaInicio).toLocaleTimeString()} 
                      {s.horaFin && ` - ${new Date(s.horaFin).toLocaleTimeString()}`}
                    </p>
                  )}
                </div>
                {s.sede && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                    {s.sede.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}