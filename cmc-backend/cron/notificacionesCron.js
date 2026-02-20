// cmc-backend/cron/notificacionesCron.js
import pool from "../db.js";
import { sendSSE } from "../routes/notificaciones.js";

export async function procesarNotificacionesProgramadas() {
  try {
    // 1️⃣ Buscar notificaciones que están activas, programadas, y aún no enviadas
    const result = await pool.query(
      `SELECT *
       FROM notificaciones
       WHERE activa = true
       AND programada_para IS NOT NULL
       AND enviada = false
       AND programada_para <= NOW()`
    );

    if (result.rows.length === 0) return;

    console.log(`⏰ Notificaciones listas para envío: ${result.rows.length}`);

    for (const n of result.rows) {

      // 2️⃣ Enviar por SSE
      sendSSE({
        tipo: "PROGRAMMED_NOTIFICATION",
        data: n
      });

      // 3️⃣ Marcarlas como ENVIADAS
      await pool.query(
        `UPDATE notificaciones
         SET enviada = true
         WHERE id = $1`,
        [n.id]
      );

      console.log(`📨 Notificación enviada (ID: ${n.id})`);
    }

  } catch (err) {
    console.error("CRON error:", err);
  }
}