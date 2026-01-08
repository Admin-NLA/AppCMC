import { getSpeakers } from "../services/speakers.service";
import { useState, useEffect } from "react";
import { Users, Building2, Calendar, Clock } from "lucide-react";

export default function Speakers() {
  const [speakers, setSpeakers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSpeakers()
      .then(setSpeakers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  {loading && <p>Cargando speakers...</p>}

  {!loading && speakers.map(sp => (
    <div key={sp.id}>
      <h3>{sp.name}</h3>
      {sp.photo && <img src={sp.photo} alt={sp.name} width={120} />}
      <div dangerouslySetInnerHTML={{ __html: sp.bio }} />
      <hr />
    </div>
  ))}
  
  /* ==========================================
      Cargar speakers + sesiones
  ========================================== */
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load speakers
      const snapshotSpeakers = await getDocs(collection(db, "speakers"));
      const speakersData = snapshotSpeakers.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Load all sessions ONCE
      const snapshotSessions = await getDocs(collection(db, "sessions"));
      const sessionsData = snapshotSessions.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setSpeakers(speakersData);
      setSessions(sessionsData);
    } catch (error) {
      console.error("Error cargando speakers:", error);
    } finally {
      setLoading(false);
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users />
          Speakers del Evento
        </h1>
        <p className="text-gray-600 mt-1">Conoce a los expertos del congreso</p>
      </div>

      {speakers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Users size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No hay speakers registrados aún
          </h3>
          <p className="text-gray-500">Se agregarán próximamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {speakers.map((speaker) => (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              sessions={sessions.filter((s) => s.speakerId === speaker.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ==========================================
      Tarjeta individual
========================================== */
function SpeakerCard({ speaker, sessions }) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition">
      {/* Foto */}
      <div className="h-48 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
        {speaker.foto ? (
          <img
            src={speaker.foto}
            alt={speaker.nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <Users size={64} className="text-white opacity-50" />
        )}
      </div>

      {/* Contenido */}
      <div className="p-6">
        <h3 className="text-xl font-bold mb-1">{speaker.nombre}</h3>

        {speaker.empresa && (
          <div className="flex items-center text-gray-600 text-sm mb-3">
            <Building2 size={16} className="mr-1" />
            {speaker.empresa}
          </div>
        )}

        {speaker.bio && (
          <p className="text-gray-700 text-sm mb-4 line-clamp-3">
            {speaker.bio}
          </p>
        )}

        {/* Sesiones asignadas */}
        <div className="mt-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Calendar size={18} /> Sesiones
          </h4>

          {sessions.length === 0 ? (
            <p className="text-sm text-gray-500">Sin sesiones asignadas.</p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="border-l-4 border-blue-500 pl-3 py-1 bg-blue-50/30 rounded"
                >
                  <p className="font-medium">{s.titulo}</p>
                  <p className="text-xs text-gray-500 flex gap-2 items-center">
                    <Clock size={14} /> {s.horaInicio} — {s.horaFin}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
