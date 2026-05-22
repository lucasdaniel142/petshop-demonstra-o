/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getMessaging, isSupported, onMessage } from 'firebase/messaging';

const requireEnv = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `[Firebase] Variável de ambiente obrigatória ausente: ${key}. ` +
      `Adicione-a ao arquivo .env.local e reinicie o servidor de desenvolvimento.`
    );
  }
  return value as string;
};

export const firebaseConfig = {
  apiKey: requireEnv('VITE_FIREBASE_API_KEY'),
  authDomain: requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requireEnv('VITE_FIREBASE_APP_ID'),
};

if (import.meta.env.DEV) {
  console.log('[Firebase DEV] Config carregada:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
  });
}

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const auth = getAuth(app);

let messagingInstance: ReturnType<typeof getMessaging> | null = null;
isSupported().then((supported) => {
  if (supported) {
    messagingInstance = getMessaging(app);
    
    // Handler para mensagens recebidas quando o app está em foreground (aberto)
    onMessage(messagingInstance, (payload) => {
      console.log('[Firebase] Mensagem recebida em foreground:', payload);
      
      // Mostrar notificação nativa mesmo quando o app está aberto
      if (Notification.permission === 'granted') {
        const notificationTitle = payload.notification?.title || 'Supermercado Sagrada Família';
        const notificationOptions = {
          body: payload.notification?.body || 'Nova atualização disponível',
          icon: '/icons/icon-sagrada-familia-app.png',
          badge: '/icons/icon-192.png',
          vibrate: [200, 100, 200],
          tag: 'sagrada-familia-notification',
          requireInteraction: false,
          data: {
            url: (payload as any).fcmOptions?.link || (payload as any).webpush?.fcmOptions?.link || '/',
          }
        };
        
        new Notification(notificationTitle, notificationOptions);
      }
    });
  }
});

export const getFirebaseMessaging = () => messagingInstance;

/**
 * Garante `request.auth != null` nas regras do Firestore (ex.: `fcmTokens`)
 * sem exigir login com e-mail. Ative "Anonymous" em Firebase Console → Authentication → Sign-in method.
 */
export async function ensureAnonymousAuth(): Promise<void> {
  if (auth.currentUser) return;
  await signInAnonymously(auth);
}
