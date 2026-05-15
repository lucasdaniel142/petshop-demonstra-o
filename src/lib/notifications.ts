// src/lib/notifications.ts
// ============================================================
// Utilitário de Notificações Web Push (FCM)
// Responsável por pedir permissão e obter o Token do usuário.
// ============================================================

import { getToken } from 'firebase/messaging';
import { getFirebaseMessaging } from './firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Solicita permissão para notificações e retorna o FCM Token.
 */
export async function requestNotificationToken(): Promise<string | null> {
  try {
    if (!('Notification' in window)) {
      console.warn('Este navegador não suporta notificações desktop');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permissão de notificação negada pelo usuário');
      return null;
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.warn('FCM Messaging não suportado ou não inicializado');
      return null;
    }

    if (!VAPID_KEY) {
      console.error('VITE_FIREBASE_VAPID_KEY não configurada no .env.local');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    return token;
  } catch (error) {
    console.error('Erro ao obter FCM Token:', error);
    return null;
  }
}
