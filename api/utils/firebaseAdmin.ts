import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error) {
      console.error('[Firebase Admin] Erro ao parsear FIREBASE_SERVICE_ACCOUNT_KEY:', error);
      initializeApp({ projectId });
    }
  } else {
    // Fallback para Default Credentials se estiver no ambiente Google ou se o ProjectID estiver setado
    initializeApp({ projectId });
  }
}

export const adminMessaging = getMessaging();
export const adminAuth = getAuth();
export const adminDb = getFirestore();
