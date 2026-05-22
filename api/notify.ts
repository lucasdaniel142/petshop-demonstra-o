// =============================================================================
// api/notify.ts — Serverless Function (Vercel / Cloudflare Workers)
// =============================================================================
// CORREÇÕES APLICADAS:
//   [FIX-FCM-SERVER] Detecta resposta 410 do FCM e deleta o token do Firestore
//                    server-side (Firebase Admin SDK), garantindo consistência
//                    mesmo quando o cliente não executa a limpeza.
//   [FIX-SEC]        Validação de origem via CORS + verificação de payload.
//   [FIX-PERF]       firebase-admin inicializado uma única vez (singleton),
//                    evitando re-inicialização a cada invocação da função.
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// ---------------------------------------------------------------------------
// Inicialização singleton do Firebase Admin
// [FIX-PERF] A verificação apps.length > 0 é CRÍTICA em Vercel/Serverless:
// cada cold start pode tentar re-inicializar, causando "app already exists".
// ---------------------------------------------------------------------------
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const messaging = admin.messaging();
const firestore = admin.firestore();

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  const allowedOrigin = process.env.VITE_APP_URL ?? '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { token, title, body, icon, data } = req.body ?? {};

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Campo "token" é obrigatório.' });
  }
  if (!title || !body) {
    return res.status(400).json({ error: 'Campos "title" e "body" são obrigatórios.' });
  }

  const message: admin.messaging.Message = {
    token,
    notification: { title, body, ...(icon ? { imageUrl: icon } : {}) },
    ...(data ? { data } : {}),
    webpush: {
      fcmOptions: { link: process.env.VITE_APP_URL ?? '/' },
    },
  };

  try {
    const messageId = await messaging.send(message);
    return res.status(200).json({ success: true, messageId });
  } catch (err: unknown) {
    const fcmError = err as { code?: string; httpErrorCode?: { status?: number } };

    // -------------------------------------------------------------------------
    // [FIX-FCM-SERVER] Limpeza automática de token 410 / registration-token-not-registered
    //
    // O Firebase Admin SDK mapeia o erro 410 do FCM para o código:
    //   "messaging/registration-token-not-registered"
    // Isso acontece quando:
    //   - O usuário desinstalou o app / limpou dados do navegador
    //   - O token expirou (FCM tokens têm vida útil)
    //   - A inscrição do service worker foi removida
    //
    // AÇÃO: deletar o documento em fcmTokens/{token} do Firestore para
    // garantir que o sistema NUNCA mais tente enviar para este token.
    // -------------------------------------------------------------------------
    const isTokenInvalid =
      fcmError?.code === 'messaging/registration-token-not-registered' ||
      fcmError?.code === 'messaging/invalid-registration-token' ||
      fcmError?.httpErrorCode?.status === 410;

    if (isTokenInvalid) {
      console.warn(`[FCM] Token inválido/expirado detectado. Deletando: ${token.slice(0, 20)}...`);
      try {
        await firestore.collection('fcmTokens').doc(token).delete();
        console.info('[FCM] Token removido do Firestore (server-side).');
      } catch (deleteErr) {
        console.error('[FCM] Falha ao deletar token expirado:', deleteErr);
      }
      // Retorna 410 para o cliente saber que deve fazer a limpeza também
      return res.status(410).json({
        error: 'Token FCM expirado ou inválido. Token removido do banco.',
        code: 'TOKEN_REVOKED',
      });
    }

    // Outros erros do FCM
    console.error('[FCM] Erro ao enviar notificação:', err);
    return res.status(500).json({ error: 'Falha ao enviar notificação push.' });
  }
}
