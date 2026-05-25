// =============================================================================
// usePushNotifications.ts
// Hook para gerenciar o ciclo de vida das notificações push (Soft Prompt).
//
// NÃO solicita permissão automaticamente. A permissão só é pedida quando
// o usuário clica explicitamente em um botão de opt-in.
// =============================================================================

import { useState, useEffect } from 'react';
import { onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from '../lib/firebase';
import { requestPermission, getNotificationToken } from '../lib/notifications';

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

  // Lê o estado atual da permissão sem pedir nada
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Escuta mensagens em foreground e exibe toast
  useEffect(() => {
    const messaging = getFirebaseMessaging();
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      if (payload.notification) {
        console.log('[FCM] Mensagem foreground recebida:', payload.notification);
        emitAppToast({
          title: payload.notification.title || 'Nova atualização',
          description: payload.notification.body || undefined,
          type: 'info',
          duration: 6000,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // ---------------------------------------------------------------------------
  // requestPermissionAndGetToken
  // Deve ser chamado APENAS em resposta a um gesto explícito do usuário.
  // Retorna o token se bem-sucedido, null caso contrário.
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
