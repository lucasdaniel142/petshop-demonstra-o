import { getToken } from 'firebase/messaging';
import { ensureAnonymousAuth, getFirebaseMessaging } from './firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export async function requestNotificationToken(): Promise<string | null> {
  try {
    await ensureAnonymousAuth();

    if (!('Notification' in window)) return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const messaging = getFirebaseMessaging();
    if (!messaging) return null;
    if (!VAPID_KEY) return null;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    return token;
  } catch (error) {
    console.error('Erro ao obter FCM Token:', error);
    return null;
  }
}
