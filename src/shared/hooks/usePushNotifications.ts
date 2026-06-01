// =============================================================================
// usePushNotifications.ts
// Hook para gerenciar o ciclo de vida das notificações push (Soft Prompt).
//
// [FIX-FOREGROUND] Usa getMessagingPromise() para garantir que a instância
//   de Messaging está pronta antes de registrar o listener onMessage.
//   O padrão anterior usava getFirebaseMessaging() (síncrono), que retornava
//   null frequentemente pois a Promise de isSupported() ainda não tinha resolvido.
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import { onMessage } from 'firebase/messaging';
import { getMessagingPromise } from '../lib/firebase';
import { requestPermission, getNotificationToken } from '../lib/notifications';
import { logger } from '../utils/logger';

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
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('fcmToken') : null
  );
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const didSyncTokenRef = useRef(false);

  // Lê o estado atual da permissão sem pedir nada
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Se já tinha permissão concedida, sincroniza o token
  useEffect(() => {
    if (permission !== 'granted') return;
    if (didSyncTokenRef.current) return;
    didSyncTokenRef.current = true;
    getNotificationToken().then((t) => {
      if (t) setToken(t);
    });
  }, [permission]);

  // [FIX-FOREGROUND] Aguarda Messaging estar pronta antes de registrar onMessage
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    getMessagingPromise().then((messaging) => {
      if (!messaging) return;

      unsubscribe = onMessage(messaging, (payload) => {
        logger.debug('[FCM] Mensagem foreground recebida:', payload);

        // [FIX-PAYLOAD] api/notify.ts envia campos em `data`, não em `notification`.
        // O SDK web não gera notificação nativa no foreground automaticamente
        // (comportamento correto: o app está aberto). Exibimos um toast.
        const title =
          payload.notification?.title ||
          payload.data?.title ||
          'Nova atualização';
        const body =
          payload.notification?.body ||
          payload.data?.body ||
          undefined;

        emitAppToast({
          title,
          description: body,
          type: 'info',
          duration: 6000,
        });
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // requestPermissionAndGetToken
  // Deve ser chamado APENAS em resposta a um gesto explícito do usuário.
  // ---------------------------------------------------------------------------
  const requestPermissionAndGetToken = async (): Promise<string | null> => {
    if (!('Notification' in window)) {
      console.warn('[FCM] Este navegador não suporta notificações web.');
      return null;
    }

    const p = await requestPermission();
    setPermission(p);

    if (p !== 'granted') {
      console.warn('[FCM] Permissão não concedida:', p);
      return null;
    }

    const currentToken = await getNotificationToken();
    if (currentToken) {
      setToken(currentToken);
    }
    return currentToken;
  };

  return { token, permission, setPermission, requestPermissionAndGetToken };
}
