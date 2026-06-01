// =============================================================================
// notifications.ts
// =============================================================================
// API de notificações push seguindo o padrão "Soft Prompt":
//
//   requestPermission()    — pede permissão ao navegador (apenas por gesto).
//   getNotificationToken() — obtém token FCM (permissão já concedida).
//   requestNotificationToken() — helper legado: pede permissão + token.
//   sendPushNotification() — envia push via API server-side com retry.
// =============================================================================

import { getToken } from 'firebase/messaging';
import { doc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { app, db, ensureAnonymousAuth, getMessagingPromise } from './firebase';
import { loggers } from '../utils/logger';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

// ---------------------------------------------------------------------------
// requestPermission
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
// [FIX-AUTH]      Chama ensureAnonymousAuth() antes de gravar no Firestore.
//                 Sem isso, as regras de segurança rejeitam a gravação se o
//                 usuário não está autenticado.
// [FIX-MESSAGING] Usa getMessagingPromise() ao invés de getMessaging(app)
//                 diretamente, garantindo que a instância está pronta.
// ---------------------------------------------------------------------------
export async function getNotificationToken(): Promise<string | null> {
  try {
    console.log('[getNotificationToken] Iniciando obtenção de token FCM');

    // [FIX-MESSAGING] Aguarda a Promise em vez de usar a instância síncrona
    const messaging = await getMessagingPromise();
    if (!messaging) {
      console.warn('[getNotificationToken] Firebase Messaging não suportado neste navegador.');
      loggers.fcm.info('Firebase Messaging não suportado neste navegador.');
      return null;
    }

    console.log('[getNotificationToken] Firebase Messaging suportado');
    console.log('[getNotificationToken] Permissão de notificação:', Notification.permission);

    if (Notification.permission !== 'granted') {
      console.warn('[getNotificationToken] Permissão não concedida:', Notification.permission);
      loggers.fcm.warn('getNotificationToken chamado sem permissão concedida.');
      return null;
    }

    // [FIX-SW] Aguarda o SW estar ativo antes de obter o token.
    // Sem isso, getToken pode falhar silenciosamente pois o SW ainda não
    // controla a página.
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.ready;
        console.log('[getNotificationToken] Service Worker pronto:', swRegistration.active?.scriptURL);
      } catch (swErr) {
        console.warn('[getNotificationToken] Falha ao obter SW ready:', swErr);
      }
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      ...(swRegistration ? { serviceWorkerRegistration: swRegistration } : {}),
    });

    if (!token) {
      console.warn('[getNotificationToken] Token vazio retornado pelo SDK.');
      loggers.fcm.warn('Token vazio retornado pelo SDK.');
      return null;
    }

    console.log('[getNotificationToken] Token obtido:', token.substring(0, 20) + '...');
    localStorage.setItem('fcmToken', token);

    const phone = localStorage.getItem('lastOrderPhone');

    // [FIX-AUTH] Garante autenticação anônima antes de gravar no Firestore.
    // Sem autenticação, as regras de segurança do Firestore rejeitam a escrita.
    try {
      await ensureAnonymousAuth();
    } catch (authErr) {
      console.warn('[getNotificationToken] Falha na autenticação anônima:', authErr);
      // Continua mesmo sem autenticação (token fica apenas no localStorage)
    }

    const tokenRef = doc(db, 'fcmTokens', token);
    try {
      const existing = await getDoc(tokenRef);
      const now = new Date().toISOString();
      const payload: Record<string, unknown> = {
        lastUsed: now,
        updatedAt: now,
        platform: navigator.userAgent,
      };
      if (phone) payload.phone = phone;
      if (!existing.exists()) payload.createdAt = now;
      else {
        const createdAt = existing.data()?.createdAt;
        if (createdAt) payload.createdAt = createdAt;
      }
      await setDoc(tokenRef, payload);
      console.log('[getNotificationToken] Token salvo no Firestore com sucesso');
    } catch (err) {
      console.error('[getNotificationToken] Falha ao persistir token no Firestore:', err);
      loggers.fcm.warn('Falha ao persistir token no Firestore (mantendo token local):', err);
    }

    console.log('[getNotificationToken] Token registrado com sucesso');
    loggers.fcm.info('Token registrado com sucesso.');
    return token;
  } catch (err) {
    console.error('[getNotificationToken] Erro ao obter token de notificação:', err);
    loggers.fcm.error('Erro ao obter token de notificação:', err);
    return null;
  }
}

export async function linkNotificationTokenToPhone(token: string, phone: string): Promise<void> {
  try {
    if (!token || !phone) {
      console.warn('[linkNotificationTokenToPhone] Token ou phone vazio:', { token: !!token, phone: !!phone });
      return;
    }

    // [FIX-AUTH] Garante autenticação antes de gravar no Firestore
    try {
      await ensureAnonymousAuth();
    } catch (authErr) {
      console.warn('[linkNotificationTokenToPhone] Falha na autenticação anônima:', authErr);
    }

    console.log('[linkNotificationTokenToPhone] Salvando token no Firestore:', { token: token.substring(0, 20) + '...', phone });
    const tokenRef = doc(db, 'fcmTokens', token);
    const existing = await getDoc(tokenRef);
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      lastUsed: now,
      updatedAt: now,
      platform: navigator.userAgent,
      phone,
    };
    if (!existing.exists()) payload.createdAt = now;
    else {
      const createdAt = existing.data()?.createdAt;
      if (createdAt) payload.createdAt = createdAt;
    }
    await setDoc(tokenRef, payload);
    console.log('[linkNotificationTokenToPhone] Token salvo com sucesso no Firestore');
  } catch (err) {
    console.error('[linkNotificationTokenToPhone] Falha ao vincular token ao telefone:', err);
    loggers.fcm.warn('Falha ao vincular token ao telefone:', err);
  }
}

// ---------------------------------------------------------------------------
// requestNotificationToken (legado — mantido para compatibilidade)
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
        loggers.fcm.warn('Token expirado (410). Deletando do Firestore e tentando obter novo token.');
        try {
          await deleteDoc(doc(db, 'fcmTokens', fcmToken));
          loggers.fcm.info('Token removido do Firestore.');

          try {
            const newToken = await getNotificationToken();
            if (newToken) {
              loggers.fcm.info('Novo token obtido com sucesso.');
              const retryResponse = await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: newToken, ...payload }),
              });
              if (retryResponse.ok) {
                return { success: true };
              }
            }
          } catch (retryErr) {
            loggers.fcm.error('Falha ao obter novo token:', retryErr);
          }
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
