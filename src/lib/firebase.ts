// ============================================================
// ARQUIVO: src/lib/firebase.ts
// REVISÃO: Enterprise Grade
// ============================================================
//
// BUG CRÍTICO CORRIGIDO:
//
// [SEGURANÇA] VAZAMENTO DE CREDENCIAIS NO CONSOLE
//   PROBLEMA: O arquivo original tem um `console.log('Firebase config loaded', {...})`
//   que imprime a `apiKey`, `authDomain` e `projectId` no console do browser.
//   Em produção, qualquer pessoa que abrir o DevTools verá esses dados.
//   Embora as chaves do Firebase sejam semi-públicas (elas aparecem no HTML),
//   logar ativamente dados de configuração é uma má prática de segurança
//   (Security Anti-Pattern) e pode facilitar ataques de enumeração.
//
//   SOLUÇÃO: Removido o console.log de produção.
//   Para debug em desenvolvimento, use: console.log apenas em DEV:
//     if (import.meta.env.DEV) { console.log(...) }
//
// ============================================================

/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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

// FIX: Apenas loga em modo de desenvolvimento, nunca em produção.
if (import.meta.env.DEV) {
  console.log('[Firebase DEV] Config carregada:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
  });
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
