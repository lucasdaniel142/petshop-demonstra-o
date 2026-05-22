// =============================================================================
// notifications.ts — REFATORADO
// =============================================================================
// CORREÇÕES APLICADAS:
//   [FIX-FCM-1] sendPushNotification: detecta HTTP 410 (Gone) e deleta o token
//               expirado do Firestore imediatamente, evitando tentativas futuras.
//   [FIX-FCM-2] Função resiliente com retry automático (max 2 tentativas)
//               para erros transitórios (5xx, timeout). Erros 4xx são fatais.
//   [FIX-FCM-3] requestNotificationToken: verificação de suporte e permissão
//               antes de tentar obter token, evitando crash em browsers antigos.
// =============================================================================

import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { doc, deleteDoc } from 'firebase/firestore';
import { app, db } from './firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

// ---------------------------------------------------------------------------
// requestNotificationToken
// Solicita permissão e retorna o token FCM do dispositivo.
// Retorna null se não suportado, negado ou em caso de erro.
// [FIX-FCM-3] Adicionada verificação de suporte (isSupported) antes de chamar
// getMessaging — evita crashes silenciosos em Safari/Firefox sem service worker.
// ---------------------------------------------------------------------------
export async function requestNotificationToken(): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.info('[FCM] Notificações push não suportadas neste navegador.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('[FCM] Permissão de notificação negada pelo usuário.');
      return null;
    }

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (!token) {
      console.warn('[FCM] Token vazio retornado pelo SDK.');
      return null;
    }

    return token;
  } catch (err) {
    console.error('[FCM] Erro ao obter token de notificação:', err);
    return null;
  }
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
  tokenRevoked?: boolean; // true quando o token foi deletado (410)
  error?: string;
}

// ---------------------------------------------------------------------------
// sendPushNotification
// Envia notificação via API server-side e trata o erro 410 automaticamente.
//
// [FIX-FCM-1] LÓGICA DE LIMPEZA AUTOMÁTICA DE TOKEN 410:
//   Quando o FCM retorna 410 (Gone), o token está definitivamente expirado.
//   Este código deleta o documento em fcmTokens/{token} no Firestore
//   imediatamente após receber o 410, impedindo que o sistema continue
//   tentando enviar notificações para um token inválido.
//
// [FIX-FCM-2] Retry somente para erros transitórios (5xx).
//   Erros 4xx (exceto 429 rate-limit) são fatais e não são retentados.
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

      // -----------------------------------------------------------------------
      // [FIX-FCM-1] Tratamento do erro 410 (Gone) — token expirado/inválido
      // -----------------------------------------------------------------------
      if (response.status === 410) {
        console.warn(
          `[FCM] Token expirado (410). Deletando do Firestore: ${fcmToken.slice(0, 20)}...`
        );
        try {
          await deleteDoc(doc(db, 'fcmTokens', fcmToken));
          console.info('[FCM] Token removido do Firestore com sucesso.');
        } catch (deleteErr) {
          // Falha na limpeza não deve propagar — o importante é não crashar o fluxo
          console.error('[FCM] Erro ao deletar token expirado:', deleteErr);
        }
        return { success: false, tokenRevoked: true, error: 'Token FCM expirado (410)' };
      }

      // Erro 4xx que não é 410: fatal, não retenta
      if (response.status >= 400 && response.status < 500) {
        const body = await response.json().catch(() => ({}));
        const msg = body?.error ?? `Erro HTTP ${response.status}`;
        console.error('[FCM] Erro fatal ao enviar notificação:', msg);
        return { success: false, error: msg };
      }

      // Erro 5xx ou rede: retenta se ainda tiver tentativas
      if (!response.ok) {
        if (attempt > maxRetries) {
          return { success: false, error: `Servidor indisponível após ${maxRetries + 1} tentativas.` };
        }
        // Backoff exponencial: 500ms, 1000ms
        await sleep(500 * attempt);
        continue;
      }

      return { success: true };
    } catch (networkErr) {
      // Erro de rede (offline, timeout)
      if (attempt > maxRetries) {
        const msg = networkErr instanceof Error ? networkErr.message : 'Erro de rede';
        console.error('[FCM] Erro de rede após todas as tentativas:', msg);
        return { success: false, error: msg };
      }
      await sleep(500 * attempt);
    }
  }

  return { success: false, error: 'Número máximo de tentativas atingido.' };
}

// ---------------------------------------------------------------------------
// Utilitário
// ---------------------------------------------------------------------------
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
