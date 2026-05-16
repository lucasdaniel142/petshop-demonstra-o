import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

/**
 * Inicializa e exporta os serviços do Firebase Admin de forma modular.
 * Este padrão é o mais estável para ambientes Node.js modernos e Vercel Serverless.
 */

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  // Nota: Não lançamos erro no nível global do módulo para permitir que o servidor suba,
  // mas as funções internas (getAdminDb, etc) validarão isso.
  console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_KEY não definida.");
}

function initializeAdmin() {
  if (getApps().length === 0 && serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      initializeApp({
        credential: cert(serviceAccount)
      });
    } catch (error: any) {
      console.error("❌ Erro ao inicializar Firebase Admin:", error.message);
    }
  }
}

// Inicializa uma vez no carregamento do módulo
initializeAdmin();

// Exportações Seguras
export const getAdminDb = () => {
  initializeAdmin();
  return getFirestore();
};

export const getAdminAuth = () => {
  initializeAdmin();
  return getAuth();
};

export const getAdminMessaging = () => {
  initializeAdmin();
  return getMessaging();
};

// Aliases para compatibilidade (Legacy)
export const adminDb = getApps().length ? getFirestore() : null;
export const adminAuth = getApps().length ? getAuth() : null;
export const adminMessaging = getApps().length ? getMessaging() : null;
