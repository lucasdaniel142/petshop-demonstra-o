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
// [FIX-MESSAGING] Usa getMessagingPromise() para garantir instância pronta.
// [FIX-MOBILE]    Retry com backoff para aguardar SW ativo no Android/PWA.
// ---------------------------------------------------------------------------
export async function getNotificationToken(): Promise<string | null> {
  try {
    console.log('[getNotificationToken] Iniciando obtenção de token FCM');

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

    // [FIX-MOBILE] Aguarda SW com retry + backoff.
    // No Android Chrome e PWAs instalados, o SW pode levar alguns segundos
    // para ativar após a instalação. Sem retry, getToken falha silenciosamente
    // retornando string vazia, e o token nunca é salvo no Firestore.
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      const MAX_SW_RETRIES = 3;
      for (let attempt = 1; attempt <= MAX_SW_RETRIES; attempt++) {
        try {
          swRegistration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('SW ready timeout')), 5000)
            ),
          ]) as ServiceWorkerRegistration;
          console.log(`[getNotificationToken] SW pronto (tentativa ${attempt}):`, swRegistration.active?.scriptURL);
          break;
        } catch (swErr) {
          console.warn(`[getNotificationToken] SW não pronto (tentativa ${attempt}/${MAX_SW_RETRIES}):`, swErr);
          if (attempt < MAX_SW_RETRIES) {
            await new Promise(r => setTimeout(r, 1000 * attempt)); // backoff: 1s, 2s
          }
        }
      }
      if (!swRegistration) {
        console.warn('[getNotificationToken] SW não ficou pronto. Tentando sem SW...');
      }
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      ...(swRegistration ? { serviceWorkerRegistration: swRegistration } : {}),
    });

    if (!token) {
      console.warn('[getNotificationToken] Token vazio retornado pelo SDK. Verifique VITE_FIREBASE_VAPID_KEY e o registro do SW.');
      loggers.fcm.warn('Token vazio retornado pelo SDK.');
      return null;
    }

    console.log('[getNotificationToken] Token obtido:', token.substring(0, 20) + '...');
    localStorage.setItem('fcmToken', token);

    const phone = localStorage.getItem('lastOrderPhone');

    // [FIX-AUTH] Garante autenticação anônima antes de gravar no Firestore.
    try {
      await ensureAnonymousAuth();
    } catch (authErr) {
      console.warn('[getNotificationToken] Falha na autenticação anônima:', authErr);
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
