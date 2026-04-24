// cmc-backend/routes/push.js
// Web Push Notifications (Opción A — PWA)
//
// ENDPOINTS:
//   GET  /api/push/vapid-public  → retorna la VAPID public key al frontend
//   POST /api/push/subscribe     → guarda suscripción del navegador
//   DELETE /api/push/subscribe   → elimina suscripción
//   POST /api/push/send/:userId  → (interno) enviar push a usuario específico
//
// VARIABLES DE ENTORNO requeridas en Render:
//   VAPID_PUBLIC_KEY   → generada con: npx web-push generate-vapid-keys
//   VAPID_PRIVATE_KEY  → ídem
//   VAPID_EMAIL        → mailto:tu@email.com

import express from 'express';
import webpush from 'web-push';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// Configurar VAPID
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@cmc-latam.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
    console.log('[Push] ✅ VAPID configurado');
} else {
    console.warn('[Push] ⚠️ VAPID keys no configuradas — Push desactivado');
}

// ── GET /api/push/vapid-public ─────────────────────────────
router.get('/vapid-public', (req, res) => {
    if (!VAPID_PUBLIC) {
        return res.status(503).json({ error: 'Push no configurado en el servidor' });
    }
    res.json({ publicKey: VAPID_PUBLIC });
});

// ── POST /api/push/subscribe ───────────────────────────────
router.post('/subscribe', authRequired, async (req, res) => {
    try {
        const { subscription, userAgent } = req.body;
        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return res.status(400).json({ error: 'Suscripción inválida' });
        }

        const userId = req.user.id;

        await pool.query(
            `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET
         p256dh     = EXCLUDED.p256dh,
         auth       = EXCLUDED.auth,
         user_agent = EXCLUDED.user_agent`,
            [userId, subscription.endpoint, subscription.keys.p256dh,
                subscription.keys.auth, userAgent || null]
        );

        console.log(`[Push] ✅ Suscripción guardada para ${req.user.email}`);
        res.json({ ok: true, message: 'Suscripción registrada' });
    } catch (err) {
        console.error('[Push] Error subscribe:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/push/subscribe ─────────────────────────────
router.delete('/subscribe', authRequired, async (req, res) => {
    try {
        const { endpoint } = req.body;
        await pool.query(
            `DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2`,
            [req.user.id, endpoint]
        );
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Función interna: enviar push a un usuario ─────────────
export async function sendPushToUser(userId, payload) {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
    try {
        const r = await pool.query(
            `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
            [userId]
        );
        if (!r.rows.length) return;

        const message = JSON.stringify({
            title: payload.titulo || 'CMC Notificación',
            body: payload.mensaje || '',
            icon: '/logo192.png',
            badge: '/badge.png',
            data: { url: payload.url || '/', meta: payload.meta || {} },
            tag: payload.tipo || 'general',
        });

        await Promise.all(r.rows.map(async sub => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    message
                );
            } catch (err) {
                // 410 Gone = suscripción expirada, eliminar
                if (err.statusCode === 410) {
                    await pool.query(
                        `DELETE FROM push_subscriptions WHERE endpoint=$1`, [sub.endpoint]
                    ).catch(() => { });
                }
            }
        }));
    } catch (err) {
        console.error('[Push] Error sendPushToUser:', err.message);
    }
}

// ── Función interna: enviar push a múltiples usuarios ──────
export async function sendPushBroadcast(userIds, payload) {
    if (!userIds?.length) return;
    await Promise.all(userIds.map(id => sendPushToUser(id, payload)));
}

// ── POST /api/push/test ───────────────────────────────────
router.post('/test', authRequired, async (req, res) => {
    if (req.user.rol !== 'super_admin')
        return res.status(403).json({ error: 'Solo super_admin' });
    try {
        await sendPushToUser(req.user.id, {
            titulo: '🧪 Test de Push',
            mensaje: 'Las notificaciones push funcionan correctamente',
            tipo: 'info',
        });
        res.json({ ok: true, message: 'Push de prueba enviado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;