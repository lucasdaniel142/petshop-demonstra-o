// =============================================================================
// notifications.ts
// =============================================================================
// API de notificações push seguindo o padrão "Soft Prompt":
//
//   requestPermission()   — pede permissão ao navegador (chame APENAS em resposta
//                           a um gesto explícito do usuário, nunca no carregamento).
//   getNotificationToken() — obtém o token FCM assumindo que a permissão já foi
//                            concedida. Não chama requestPermission internamente.
//   requestNotificationToken() — helper legado: pede permissão + obtém token em
//                                uma única chamada. Mantido para compatibilidade
//                                com usePushNotifications.ts.
//   sendPushNotification() — envia push via API server-side com retry e limpeza
//                            automática de token 410.
// =============================================================================

import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from './firebase';
import { loggers } from '../utils/logger';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

// ---------------------------------------------------------------------------
// requestPermission
// Solicita permissão de notificação ao navegador.
// Deve ser chamada APENAS em resposta a um gesto explícito do usuário
// (clique em botão), nunca automaticamente no carregamento da página.
//
// Retorna o estado da permissão após a solicitação.
// ---------------------------------------------------------------------------
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    loggers.fcm.info('Notificações não suportadas neste navegador.');
    return 'denied';
  }
  return Notification.requestPermission();
}

// ---------------------------------------------------------------------------
// getNotificationToken
// Obtém o token FCM assumindo que a permissão já foi concedida.
// Salva o token no Firestore (fcmTokens/{token}) e no localStorage.
// Retorna null se não suportado, permissão não concedida ou em caso de erro.
// ---------------------------------------------------------------------------
export async function getNotificationToken(): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported) {
      loggers.fcm.info('Firebase Messaging não suportado neste navegador.');
      return null;
    }

    if (Notification.permission !== 'granted') {
      loggers.fcm.warn('getNotificationToken chamado sem permissão concedida.');
      return null;
    }

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (!token) {
      loggers.fcm.warn('Token vazio retornado pelo SDK.');
      return null;
    }

    // Persiste no Firestore para que o admin possa enviar notificações
    await setDoc(doc(db, 'fcmTokens', token), {
      token,
      updatedAt: serverTimestamp(),
      platform: navigator.userAgent,
    });

    // Persiste no localStorage para uso no checkout (CartDrawer)
    localStorage.setItem('fcmToken', token);

    loggers.fcm.info('Token registrado com sucesso:', token.slice(0, 20) + '...');
    return token;
  } catch (err) {
    loggers.fcm.error('Erro ao obter token de notificação:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// requestNotificationToken (legado — mantido para compatibilidade)
// Combina requestPermission + getNotificationToken em uma única chamada.
// Preferir usar as duas funções separadas para maior controle de UX.
// ---------------------------------------------------------------------------
export async function requestNotificationToken(): Promise<string | null> {
  const permission = await requestPermission();
  if (permission !== 'granted') return null;
  return getNotificationToken();
}

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------
interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
}

interface SendResult {
  success: boolean;
  tokenRevoked?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// sendPushNotification
// Envia notificação via API server-side e trata o erro 410 automaticamente.
// Retry automático para erros transitórios (5xx). Erros 4xx são fatais.
// ---------------------------------------------------------------------------
export async function sendPushNotification(
  fcmToken: string,
  payload: NotificationPayload,
  maxRetries = 2
): Promise<SendResult> {
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;

    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: fcmToken, ...payload }),
      });

      if (response.status === 410) {
        loggers.fcm.warn(`Token expirado (410). Deletando do Firestore: ${fcmToken.slice(0, 20)}...`);
        try {
          await deleteDoc(doc(db, 'fcmTokens', fcmToken));
          // [HP-04 FIX] Remove também do localStorage para evitar loop de tentativas
          localStorage.removeItem('fcmToken');
          loggers.fcm.info('Token removido do Firestore e localStorage.');
        } catch (deleteErr) {
          loggers.fcm.error('Erro ao deletar token expirado:', deleteErr);
        }
        return { success: false, tokenRevoked: true, error: 'Token FCM expirado (410)' };
      }

      if (response.status >= 400 && response.status < 500) {
        const body = await response.json().catch(() => ({}));
        const msg = body?.error ?? `Erro HTTP ${response.status}`;
        loggers.fcm.error('Erro fatal ao enviar notificação:', msg);
        return { success: false, error: msg };
      }

      if (!response.ok) {
        if (attempt > maxRetries) {
          return { success: false, error: `Servidor indisponível após ${maxRetries + 1} tentativas.` };
        }
        await sleep(500 * attempt);
        continue;
      }

      return { success: true };
    } catch (networkErr) {
      if (attempt > maxRetries) {
        const msg = networkErr instanceof Error ? networkErr.message : 'Erro de rede';
        loggers.fcm.error('Erro de rede após todas as tentativas:', msg);
        return { success: false, error: msg };
      }
      await sleep(500 * attempt);
    }
  }

  return { success: false, error: 'Número máximo de tentativas atingido.' };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
