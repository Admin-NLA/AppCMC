// controllers/agendaController.js
import axios from "axios";
import { sedesPermitidasFromPases, sedeActivaPorFecha } from "../utils/sedeHelper.js";
import pool from "../db.js";

// dentro del controlador:
const userPases = req.user?.pases || []; // si tu auth añade info del usuario
const sedesPermitidas = sedesPermitidasFromPases(userPases); // array de sedes permitidas

// Si el usuario no tiene pases (o quieres mostrar por defecto),
// usa la sede activa por fecha:
let sedeDefault = sedeActivaPorFecha();
if (!sedesPermitidas.length && sedeDefault) {
  // filtrar por sedeDefault.name (ej: 'Colombia')
  filtered = filtered.filter(s => s.sede && s.sede === sedeDefault.name);
} else if (sedesPermitidas.length === 1) {
  // si solo tiene 1 pase, filtrar automáticamente por esa sede
  filtered = filtered.filter(s => s.sede && s.sede === sedesPermitidas[0].name);
} else if (sedesPermitidas.length > 1) {
  // si tiene pases para varias sedes, no filtramos: dejamos que el frontend muestre dropdown para elegir
}

const WP_URL = "https://cmc-latam.com/wp-json/wp/v2";

/* =====================================================
      GET /agenda/wp
      Obtiene todas las sesiones desde WordPress
===================================================== */
export const getAgendaFromWP = async (req, res) => {
  try {
    // Traemos todas las sesiones del CPT "session"
    const { data: sessionsWP } = await axios.get(
      `${WP_URL}/session?per_page=100`
    );

  const sessionsFormatted = sessions.map(s => ({
    id: s.id,
    titulo: s.title ?? "Sesión sin título",
    descripcion: s.description ?? "",
    horaInicio: s.start_at
      ? new Date(s.start_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
      : "",
    horaFin: s.end_at
      ? new Date(s.end_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
      : "",
    sala: s.room ?? "Por definir",
    dia: s.start_at
      ? new Date(s.start_at)
          .toLocaleDateString("es-MX", { weekday: "long" })
          .toLowerCase()
      : "",
    tipo: s.tipo ?? "conferencia",
    speakerNombre: s.speakers?.map(sp => sp.name).join(", "),
    sede: s.sede
  }));

    // Formateamos las sesiones
    const sessions = sessionsWP.map((s) => ({
      id: s.id,
      titulo: s.title?.rendered || "",
      descripcion: s.excerpt?.rendered?.replace(/<[^>]+>/g, "") || "",
      contenido: s.content?.rendered || "",

      // TAXONOMÍAS
      sede: s.events_category || null,
      tipo: s.session_type || null,
      edicion: s.edicion || null,

      // CAMPOS PERSONALIZADOS (ACF)
      speakerNombre: s.acf?.speaker || "",
      horaInicio: s.acf?.hora_inicio || "",
      horaFin: s.acf?.hora_fin || "",
      sala: s.acf?.sala || "",
      qr: s.acf?.qr || null,

      imagen: s.featured_media_url || null,
    }));

    return res.json({ ok: true, sessions });
  } catch (error) {
    console.error("Error obteniendo agenda WP:", error);
    
    return res.status(200).json({
      sessions: sessionsFormatted
    });
  }
};

export async function getSessions(sede) {
  const { rows } = await pool.query(
    `
    SELECT
      id,
      titulo,
      descripcion,
      dia,
      hora_inicio AS "horaInicio",
      hora_fin AS "horaFin",
      sala,
      tipo,
      speaker_nombre AS "speakerNombre"
    FROM agenda
    WHERE sede = $1
    ORDER BY dia, hora_inicio
    `,
    [sede]
  );

  return rows;
}