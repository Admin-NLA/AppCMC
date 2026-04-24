// src/hooks/usePush.js
// Hook para gestionar Web Push Notifications (PWA)
//
// USO:
//   const { isSupported, isSubscribed, requestPermission, unsubscribe } = usePush();

import { useState, useEffect } from 'react';
import API from '../services/api';

export function usePush() {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permission, setPermission] = useState('default');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Verificar soporte al montar
    useEffect(() => {
        const supported = 'serviceWorker' in navigator && 'PushManager' in window;
        setIsSupported(supported);
        if (supported) {
            setPermission(Notification.permission);
            checkSubscription();
        }
    }, []);

    // Verificar si ya hay suscripción activa
    const checkSubscription = async () => {
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            setIsSubscribed(!!sub);
        } catch { setIsSubscribed(false); }
    };

    // Registrar Service Worker y solicitar permiso
    const requestPermission = async () => {
        if (!isSupported) return { ok: false, error: 'No soportado' };
        setLoading(true); setError(null);
        try {
            // 1. Obtener VAPID public key del backend
            const vapidRes = await API.get('/push/vapid-public');
            const vapidKey = vapidRes.data?.publicKey;
            if (!vapidKey) throw new Error('VAPID key no disponible');

            // 2. Registrar Service Worker
            const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            await navigator.serviceWorker.ready;

            // 3. Solicitar permiso al usuario
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== 'granted') throw new Error('Permiso denegado por el usuario');

            // 4. Suscribir al push
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });

            // 5. Guardar suscripción en el backend
            await API.post('/push/subscribe', {
                subscription: sub.toJSON(),
                userAgent: navigator.userAgent,
            });

            setIsSubscribed(true);
            console.log('[Push] ✅ Suscripción registrada');
            return { ok: true };
        } catch (err) {
            setError(err.message);
            return { ok: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // Cancelar suscripción
    const unsubscribe = async () => {
        setLoading(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await API.delete('/push/subscribe', { data: { endpoint: sub.endpoint } });
                await sub.unsubscribe();
            }
            setIsSubscribed(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return {
        isSupported, isSubscribed, permission, loading, error,
        requestPermission, unsubscribe, checkSubscription
    };
}

// Convertir VAPID key de base64url a Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}