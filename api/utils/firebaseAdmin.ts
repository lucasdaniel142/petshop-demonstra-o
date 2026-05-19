import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

/**
 * Inicializa e exporta os serviços do Firebase Admin de forma modular.
 * Este padrão é o mais estável para ambientes Node.js modernos e Vercel Serverless.
 */

const rawServiceAccountKey =
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 ||
  process.env.SERVICE_ACCOUNT_KEY;

if (!rawServiceAccountKey) {
  console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY não definida. Configure a credencial do Firebase Admin no Vercel.');
}

function parseServiceAccountKey(value: string) {
  const trimmed = value.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error: any) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY não é JSON válido. Use JSON puro ou base64 encoded JSON.'
      );
    }
  }
}

function initializeAdmin() {
  if (getApps().length === 0 && rawServiceAccountKey) {
    try {
      const serviceAccount = parseServiceAccountKey(rawServiceAccountKey);
      initializeApp({
        credential: cert(serviceAccount)
      });
    } catch (error: any) {
      console.error('❌ Erro ao inicializar Firebase Admin:', error.message);
    }
  }
}

initializeAdmin();

const ensureAdminInitialized = () => {
  initializeAdmin();
  if (getApps().length === 0) {
    throw new Error(
      rawServiceAccountKey
        ? 'Firebase Admin não inicializado. Verifique se FIREBASE_SERVICE_ACCOUNT_KEY é JSON válido.'
        : 'Firebase Admin não inicializado porque FIREBASE_SERVICE_ACCOUNT_KEY está ausente. Defina o secret no Vercel.'
    );
  }
};

export const getAdminDb = () => {
  ensureAdminInitialized();
  return getFirestore();
};

export const getAdminAuth = () => {
  ensureAdminInitialized();
  return getAuth();
};

export const getAdminMessaging = () => {
  ensureAdminInitialized();
  return getMessaging();
};

export const adminDb = getApps().length ? getFirestore() : null;
export const adminAuth = getApps().length ? getAuth() : null;
export const adminMessaging = getApps().length ? getMessaging() : null;
