// public/sw.js — Service Worker para Web Push CMC
// Maneja notificaciones push cuando la app está cerrada o en background

const CACHE_NAME = 'cmc-app-v1';

// ── Instalación ──────────────────────────────────────────
self.addEventListener('install', (event) => {
    console.log('[SW] Instalado');
    self.skipWaiting();
});

// ── Activación ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
    console.log('[SW] Activado');
    event.waitUntil(clients.claim());
});

// ── Push recibido ─────────────────────────────────────────
self.addEventListener('push', (event) => {
    console.log('[SW] Push recibido');

    let data = {
        title: 'CMC — Congreso de Mantenimiento',
        body: 'Tienes una nueva notificación',
        icon: '/logo192.png',
        badge: '/logo192.png',
        data: { url: '/' },
    };

    if (event.data) {
        try {
            const parsed = event.data.json();
            data = {
                title: parsed.title || data.title,
                body: parsed.body || data.body,
                icon: parsed.icon || data.icon,
                badge: parsed.badge || data.badge,
                tag: parsed.tag || 'cmc-noti',
                data: parsed.data || { url: '/' },
            };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        tag: data.tag || 'cmc-noti',
        data: data.data,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        actions: [
            { action: 'abrir', title: '📱 Abrir app' },
            { action: 'cerrar', title: '✕ Cerrar' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ── Clic en la notificación ───────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'cerrar') return;

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Si la app ya está abierta, enfocarla
                for (const client of windowClients) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Si no está abierta, abrirla
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// ── Push subscription change ──────────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
    console.log('[SW] Suscripción expirada — re-suscribiendo...');
    // El frontend detectará esto y re-registrará
});