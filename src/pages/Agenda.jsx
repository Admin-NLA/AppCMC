import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Star,
  StarOff,
  QrCode,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { sedesPermitidasFromPases, sedeActivaPorFecha } from "../utils/sedeHelper.js";

export default function Agenda() {
  const { userProfile } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [selectedDay, setSelectedDay] = useState("lunes");
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [qrInstance, setQrInstance] = useState(null);
  const [selectedSede, setSelectedSede] = useState(null); // ✅ FALTABA
  const days = ["lunes", "martes", "miercoles", "jueves"];

  // ===============================
  // Sedes por pases del usuario
  // ===============================
  const pasesUsuario = userProfile?.pases || [];
  const sedesPermitidas = sedesPermitidasFromPases(pasesUsuario);
  const sedePorFecha = sedeActivaPorFecha();

  // ---------------- Repetido eliminar ----------------
  //useEffect(() => {
  //loadAgenda();
  //}, []);
  
// LoadAgenda
//  const loadAgenda = async () => {
//  try {
//    setLoading(true);
//    const res = await API.get("/agenda");
//    setSessions(res.data || []);
//  } catch (err) {
//    console.error("Error cargando agenda:", err);
//  } finally {
//    setLoading(false); // 🔥 ESTO ES LO QUE TE FALTABA
//}
 // }; ---------------------------------------------------

  // ===============================
  // Auto-selección de sede
  // ===============================
  useEffect(() => {
    if (!userProfile) return;

    if (sedesPermitidas.length === 1) {
      setSelectedSede(sedesPermitidas[0]);
    } else if (!selectedSede && sedePorFecha) {
      setSelectedSede(sedePorFecha);
      } else {
       setLoading(false);
      }
  }, [userProfile, sedesPermitidas, sedePorFecha]);

  /* ==========================================
        Cargar sesiones
  ========================================== */
  useEffect(() => {
  if (selectedSede) loadSessions();
    }, [selectedSede]);
  
   if (!loading && !selectedSede && sedesPermitidas.length === 0) {
    console.log("DEBUG Agenda:", {
      loading,
      selectedSede,
      sedesPermitidas,
      userProfile
    });
    return (
      <div className="text-center text-gray-500 mt-10">
        No tienes sedes disponibles para tu usuario.
      </div>
    );
  }

  useEffect(() => {
  if (sessions.length > 0) {
    filterSessions();
    } else {
      setFilteredSessions([]);
    }
  }, [selectedDay, sessions]);

  const loadSessions = async () => {
  if (!selectedSede) {
    setLoading(false);
     return;
  }

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/agenda?sede=${encodeURIComponent(selectedSede)}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      }
    );

    if (!res.ok) {
      console.error("Agenda error:", res.status);
      setSessions([]);
      setLoading(false);
      return;
    }

    const data = await res.json();
    setSessions(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (error) {
      console.error("Error al cargar sesiones:", error);
    } finally {
      setLoading(false);
    }
};

  const filterSessions = () => {
    const filtered = sessions.filter(
      (s) => s.dia?.toLowerCase() === selectedDay.toLowerCase()
    );
    setFilteredSessions(filtered);
  };

  /* ==========================================
        Favoritos (sin recargar página)
  ========================================== */
  const toggleFavorite = async (sessionId) => {
  if (!userProfile) return;

  try {
    const isFavorite = userProfile.agendaGuardada?.includes(sessionId);

    const url = isFavorite
      ? `${import.meta.env.VITE_API_URL}api/agenda/unfavorite/${sessionId}`
      : `${import.meta.env.VITE_API_URL}api/agenda/favorite/${sessionId}`;

    await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
      body: JSON.stringify({ userId: userProfile.id }),
    });

     } catch (error) {
    console.error("Error al actualizar favorito:", error);
  }
};

  /* ==========================================
        Scanner QR
  ========================================== */
  const startScanner = async () => {
    try {
      setShowScanner(true);
      setScannerActive(true);

      const html5QrCode = new Html5Qrcode("qr-reader");
      setQrInstance(html5QrCode);

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => handleScanSuccess(decodedText),
        () => {}
      );
    } catch (err) {
      alert("No se pudo acceder a la cámara");
      setShowScanner(false);
      setScannerActive(false);
    }
  };

  const stopScanner = () => {
    if (qrInstance) {
      qrInstance.stop().catch(() => {});
    }
    setShowScanner(false);
    setScannerActive(false);
  };

  const handleScanSuccess = async (sessionQR) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}api/agenda/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          qr: sessionQR,
          userId: userProfile.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Código QR no válido");
        stopScanner();
        return;
      }

      alert(`✅ Asistencia registrada en: ${data.session.titulo}`);
      stopScanner();
      loadSessions();
    } catch (err) {
      console.error("Error en check-in:", err);
      alert("Error al registrar asistencia");
      stopScanner();
    }
  };

  /* ==========================================
        Loader
  ========================================== */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  /* ==========================================
        UI principal
  ========================================== */
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Agenda del Evento</h1>

        {["asistente", "staff"].includes(userProfile?.rol) && (
          <button
            onClick={startScanner}
            disabled={scannerActive}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
          >
            <QrCode size={20} />
            Check-in
          </button>
        )}
      </div>

      {/* Filtros por día */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              selectedDay === day
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {day.charAt(0).toUpperCase() + day.slice(1)}
          </button>
        ))}
      </div>

      {/* Modal del scanner */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Escanear QR</h3>
            <div id="qr-reader" className="w-full"></div>
            <button
              onClick={stopScanner}
              className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de sesiones */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <Calendar size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">
              No hay sesiones programadas para este día
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isFavorite={userProfile?.agendaGuardada?.includes(session.id)}
              onToggleFavorite={toggleFavorite}
              isCheckedIn={Array.isArray(session.checkIns) 
                ? session.checkIns.includes(userProfile?.id) 
                : false}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ==========================================
      Tarjeta de sesión
========================================== */
function SessionCard({ session, isFavorite, onToggleFavorite, isCheckedIn }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                session.tipo === "conferencia"
                  ? "bg-blue-100 text-blue-700"
                  : session.tipo === "curso"
                  ? "bg-green-100 text-green-700"
                  : "bg-purple-100 text-purple-700"
              }`}
            >
              {session.tipo}
            </span>

            {isCheckedIn && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                ✓ Asistencia registrada
              </span>
            )}
          </div>

          <h3 className="text-xl font-bold mb-2">{session.titulo}</h3>
          <p className="text-gray-600 mb-4">{session.descripcion}</p>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock size={16} />
              {session.horaInicio} - {session.horaFin}
            </div>

            <div className="flex items-center gap-1">
              <MapPin size={16} />
              {session.sala}
            </div>

            {session.speakerNombre && (
              <div className="flex items-center gap-1">
                <User size={16} />
                {session.speakerNombre}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => onToggleFavorite(session.id)}
          className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition"
        >
          {isFavorite ? (
            <Star size={24} className="text-yellow-500 fill-current" />
          ) : (
            <StarOff size={24} className="text-gray-400" />
          )}
        </button>
      </div>
    </div>
  );
}