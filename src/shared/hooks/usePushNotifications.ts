import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, getFirebaseMessaging } from '../lib/firebase';

interface ToastPayload {
  title: string;
  description?: string;
  type?: 'info' | 'success' | 'error';
  duration?: number;
}

function emitAppToast(toast: ToastPayload) {
  const event = new CustomEvent<ToastPayload>('app-toast', { detail: toast });
  window.dispatchEvent(event);
}

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    const messaging = getFirebaseMessaging();
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        if (payload.notification) {
          console.log('[FCM] Nova mensagem foreground:', payload.notification);

          emitAppToast({
            title: payload.notification.title || 'Nova atualização',
            description: payload.notification.body || undefined,
            type: 'info',
            duration: 6000,
          });

          if (Notification.permission === 'granted') {
            new Notification(payload.notification.title || 'Nova atualização', {
              body: payload.notification.body,
              icon: '/logo.png',
            });
          }
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const requestPermissionAndGetToken = async () => {
    if (!('Notification' in window)) {
      console.warn('Este navegador não suporta notificações web.');
      return null;
    }

    try {
      const p = await Notification.requestPermission();
      setPermission(p);

      if (p === 'granted') {
        const messaging = getFirebaseMessaging();
        if (!messaging) throw new Error('Firebase Messaging não inicializado');

        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.error('VITE_FIREBASE_VAPID_KEY não configurada no .env.local');
          return null;
        }

        const currentToken = await getToken(messaging, { vapidKey });
        if (currentToken) {
          setToken(currentToken);
          await setDoc(doc(db, 'fcmTokens', currentToken), {
            token: currentToken,
            updatedAt: serverTimestamp(),
            platform: navigator.userAgent,
          });
          return currentToken;
        } else {
          console.warn('Nenhum token de registro disponível. Permissão negada?');
          return null;
        }
      } else {
        console.warn('Permissão para notificações negada pelo usuário.');
        return null;
      }
    } catch (error) {
      console.error('Erro ao pedir permissão ou pegar token:', error);
      return null;
    }
  };

  return { token, permission, requestPermissionAndGetToken };
}
