/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getMessaging, isSupported } from 'firebase/messaging';

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

// [FIX-MESSAGING-RACE] Expõe uma Promise que resolve com a instância de
// messaging (ou null se não suportado). Substituímos o padrão anterior que
// usava uma variável `messagingInstance` preenchida de forma assíncrona —
// código que consumia `getFirebaseMessaging()` sincronicamente obtinha null.
let _messagingInstance: ReturnType<typeof getMessaging> | null = null;
let _messagingPromise: Promise<ReturnType<typeof getMessaging> | null> | null = null;

export function getMessagingPromise(): Promise<ReturnType<typeof getMessaging> | null> {
  if (_messagingPromise) return _messagingPromise;
  _messagingPromise = isSupported().then((supported) => {
    if (supported) {
      _messagingInstance = getMessaging(app);
      return _messagingInstance;
    }
    return null;
  });
  return _messagingPromise;
}

// Mantido por compatibilidade — retorna null se a Promise ainda não resolveu.
// Prefira `getMessagingPromise()` em novos usos.
export const getFirebaseMessaging = () => _messagingInstance;

/**
 * Garante `request.auth != null` nas regras do Firestore (ex.: `fcmTokens`)
 * sem exigir login com e-mail. Ative "Anonymous" em Firebase Console → Authentication → Sign-in method.
 */
export async function ensureAnonymousAuth(): Promise<void> {
  if (auth.currentUser) return;
  await signInAnonymously(auth);
}
