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
    totalSessions: 0,
    speakers: 0,
    exhibitors: 0,
    mySessions: 0,
    myCheckIns: 0,
    myStandVisits: 0,
  });

  const [nextSessions, setNextSessions] = useState([]);
  const [speakerSessions, setSpeakerSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------
  // Cargar dashboard
  // ---------------------------------------------
  useEffect(() => {
  if (user && userProfile) loadDashboard();
  }, [user, userProfile]);

  const loadDashboard = async () => {
  try {
    const res = await API.get("/dashboard");

    const { base, payload, role } = res.data;

    // ---------- STATS GENERALES ----------
    setStats((prev) => ({
      ...prev,
      totalSessions: base.totals.sessions,
      speakers: base.totals.speakers,
      exhibitors: base.totals.expositores,

      // asistente
      mySessions: payload?.favorites?.length || 0,
      myCheckIns: payload?.entradasPorDia?.length || 0,
      myStandVisits: payload?.standVisits || 0,
    }));

    // ---------- PRÓXIMAS SESIONES ----------
    setNextSessions(base.upcoming || []);

    // ---------- SPEAKER ----------
    if (role === "speaker") {
      setSpeakerSessions(payload.mySessions || []);
    }

    } catch (err) {
      console.error("Error dashboard:", err);
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
        <h1 className="text-3xl font-bold">¡Bienvenido, {userProfile.nombre}!</h1>

        {/* ADMIN / STAFF */}
        {userProfile.rol === "super_admin" && <AdminView stats={stats} />}

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
// ADMIN
// ============================================================

function AdminView({ stats }) {
  return (
    <div className="mt-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Calendar} label="Sesiones Totales" value={stats.totalSessions} color="blue" />
        <StatCard icon={Users} label="Speakers" value={stats.speakers} color="purple" />
        <StatCard icon={Building2} label="Expositores" value={stats.exhibitors} color="orange" />
      </div>

      <Link to="/admin" className="text-blue-600 font-medium hover:underline text-lg">
        Ir al Panel de Administración →
      </Link>
    </div>
  );
}

// ============================================================
// SPEAKER
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
            <div key={s.id} className="border-l-4 border-blue-600 pl-4 py-2">
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
// ASISTENTE
// ============================================================

function AsistenteView({ stats, nextSessions }) {
  return (
    <div className="mt-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Sesiones Totales" value={stats.totalSessions} color="blue" />
        <StatCard icon={CheckCircle} label="Mis Asistencias" value={stats.myCheckIns} color="green" />
        <StatCard icon={Building2} label="Stands Visitados" value={stats.myStandVisits} color="purple" />
        <StatCard icon={Award} label="Mi Agenda" value={stats.mySessions} color="orange" />
      </div>

      <NextSessionsCard sessions={nextSessions} />
    </div>
  );
}

// ============================================================
// EXPOSITOR
// ============================================================

function ExpositorView({ stats }) {
  return (
    <div className="mt-8 space-y-6">
      <StatCard icon={Users} label="Visitantes" value={stats.myStandVisits} color="blue" />
      <StatCard icon={TrendingUp} label="Promedio por Hora" value="12" color="green" />
      <StatCard icon={Award} label="Leads" value={stats.myStandVisits} color="purple" />
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
          <p className="text-3xl font-bold">{value}</p>
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
      <h2 className="text-xl font-bold flex items-center">
        <Clock className="mr-2" /> Próximas Sesiones
      </h2>

      {sessions.length === 0 ? (
        <p className="text-gray-600">No hay próximas sesiones.</p>
      ) : (
        <div className="space-y-3 mt-4">
          {sessions.map((s) => (
            <div key={s.id} className="border-l-4 border-blue-600 pl-4 py-2">
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-gray-600">
                {new Date(s.start_at).toLocaleString()} − {new Date(s.end_at).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
