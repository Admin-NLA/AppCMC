// cmc-backend/utils/email.js
// Servicio de email usando Resend (resend.com)
// Gratis hasta 3,000 emails/mes — no requiere SMTP
//
// CONFIGURACIÓN:
//   1. Crear cuenta en resend.com (gratis)
//   2. Verificar tu dominio o usar el sandbox de pruebas
//   3. Crear una API key en resend.com/api-keys
//   4. Agregar en cmc-backend/.env:
//        RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
//        EMAIL_FROM=noreply@cmc-latam.com
//
// NOTA: Si no tienes dominio verificado, usa onboarding@resend.dev como FROM
//       y el email solo llegará a tu email de la cuenta Resend (modo sandbox)

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM     = process.env.EMAIL_FROM || 'CMC Latam <onboarding@resend.dev>';
const APP_URL        = process.env.FRONTEND_URL || 'https://app-cmc.web.app';

/**
 * Enviar email via Resend API (fetch nativo, sin dependencias extra)
 */
async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY no configurada — email no enviado');
    return { ok: false, reason: 'Sin configuración de email' };
  }
  if (!to || !subject || !html) return { ok: false, reason: 'Faltan campos' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: Array.isArray(to) ? to : [to], subject, html }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[Email] Error Resend:', data);
      return { ok: false, reason: data.message || 'Error al enviar' };
    }
    console.log(`[Email] ✅ Enviado a ${to}: ${subject}`);
    return { ok: true, id: data.id };
  } catch (err) {
    console.error('[Email] Error de red:', err.message);
    return { ok: false, reason: err.message };
  }
}

// ── Templates de networking ──────────────────────────────────
export async function emailCitaSolicitada({ solicitante, expositor, cita }) {
  return sendEmail({
    to: expositor.email,
    subject: `📅 Nueva solicitud de cita — ${solicitante.nombre}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#0d2240">Nueva solicitud de cita</h2>
        <p>Hola <strong>${expositor.nombre}</strong>,</p>
        <p><strong>${solicitante.nombre}</strong>${solicitante.empresa ? ` de <em>${solicitante.empresa}</em>` : ''} quiere reunirse contigo en el CMC.</p>
        <table style="background:#f8fafc;border-radius:12px;padding:16px;width:100%;margin:16px 0">
          <tr><td style="color:#666;padding:4px 0">📅 Fecha</td><td><strong>${cita.fecha}</strong></td></tr>
          <tr><td style="color:#666;padding:4px 0">🕐 Hora</td><td><strong>${cita.hora?.slice(0,5)}${cita.hora_fin ? ` – ${cita.hora_fin.slice(0,5)}` : ''}</strong></td></tr>
          ${cita.notas ? `<tr><td style="color:#666;padding:4px 0">💬 Nota</td><td><em>${cita.notas}</em></td></tr>` : ''}
        </table>
        <a href="${APP_URL}/networking" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
          Ver y confirmar la cita →
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">CMC Latam · Congreso de Mantenimiento y Confiabilidad</p>
      </div>
    `,
  });
}

export async function emailCitaConfirmada({ solicitante, expositor, cita }) {
  return sendEmail({
    to: solicitante.email,
    subject: `✅ Cita confirmada con ${expositor.nombre}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#16a34a">¡Tu cita fue confirmada!</h2>
        <p>Hola <strong>${solicitante.nombre}</strong>,</p>
        <p><strong>${expositor.nombre}</strong> confirmó tu solicitud de cita en el CMC.</p>
        <table style="background:#f0fdf4;border-radius:12px;padding:16px;width:100%;margin:16px 0">
          <tr><td style="color:#666;padding:4px 0">📅 Fecha</td><td><strong>${cita.fecha}</strong></td></tr>
          <tr><td style="color:#666;padding:4px 0">🕐 Hora</td><td><strong>${cita.hora?.slice(0,5)}${cita.hora_fin ? ` – ${cita.hora_fin.slice(0,5)}` : ''}</strong></td></tr>
          ${cita.ubicacion ? `<tr><td style="color:#666;padding:4px 0">📍 Ubicación</td><td><strong>${cita.ubicacion}</strong></td></tr>` : ''}
          ${cita.notas ? `<tr><td style="color:#666;padding:4px 0">💬 Nota</td><td><em>${cita.notas}</em></td></tr>` : ''}
        </table>
        <a href="${APP_URL}/networking" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
          Ver mis citas →
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">CMC Latam · Congreso de Mantenimiento y Confiabilidad</p>
      </div>
    `,
  });
}

export async function emailCitaRechazada({ solicitante, expositor, cita }) {
  return sendEmail({
    to: solicitante.email,
    subject: `❌ Solicitud de cita rechazada — ${expositor.nombre}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#dc2626">Solicitud de cita rechazada</h2>
        <p>Hola <strong>${solicitante.nombre}</strong>,</p>
        <p>Lo sentimos, <strong>${expositor.nombre}</strong> no pudo confirmar tu solicitud de cita para el ${cita.fecha} a las ${cita.hora?.slice(0,5)}.</p>
        <p>Puedes intentar agendar en otro horario disponible.</p>
        <a href="${APP_URL}/networking" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
          Ver expositores disponibles →
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">CMC Latam · Congreso de Mantenimiento y Confiabilidad</p>
      </div>
    `,
  });
}

export async function emailCitaCancelada({ expositorEmail, expositorNombre, solicitanteNombre, cita }) {
  if (!expositorEmail) return { ok: false, reason: 'Sin email del expositor' };
  return sendEmail({
    to: expositorEmail,
    subject: `🚫 Cita cancelada — ${solicitanteNombre}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#d97706">Cita cancelada</h2>
        <p>Hola <strong>${expositorNombre}</strong>,</p>
        <p><strong>${solicitanteNombre}</strong> canceló la cita del ${cita.fecha} a las ${cita.hora?.slice(0,5)}.</p>
        <a href="${APP_URL}/networking" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
          Ver mis citas →
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">CMC Latam · Congreso de Mantenimiento y Confiabilidad</p>
      </div>
    `,
  });
}