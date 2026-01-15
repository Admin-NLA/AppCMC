// controllers/agendaController.js
import axios from "axios";
import { sedesPermitidasFromPases, sedeActivaPorFecha } from "../utils/sedeHelper.js";

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
    return res.status(500).json({
      ok: false,
      error: "No se pudo obtener la agenda desde WordPress",
    });
  }
};