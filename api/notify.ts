import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminMessaging, getAdminAuth, getAdminDb } from './utils/firebaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- 1. CORS CONFIGURATION ---
  const ALLOWED_ORIGIN = process.env.VITE_APP_URL || '';
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const origin = String(req.headers.origin || '');
  const allowedOrigins = [ALLOWED_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

  const chosenOrigin =
    origin && (origin.includes('localhost') || allowedOrigins.includes(origin))
      ? origin
      : ALLOWED_ORIGIN || origin || '';

  if (chosenOrigin) {
    res.setHeader('Access-Control-Allow-Origin', chosenOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const adminMessaging = getAdminMessaging();

    // --- 2. AUTHENTICATION (CRÍTICO: SEC-01) ---
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autorizado. Token não fornecido.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error: any) {
      console.warn('[API Notify] Token inválido ou expirado:', error.message);
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    // Verificar se o usuário é realmente um admin no Firestore
    const adminDoc = await adminDb.collection('admins').doc(decodedToken.uid).get();
    if (!adminDoc.exists || !['admin', 'superadmin'].includes(adminDoc.data()?.role)) {
      console.warn(`[Security] Tentativa de acesso não autorizado por UID: ${decodedToken.uid}`);
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    // --- 3. NOTIFICATION LOGIC ---
    const { fcmToken, topic, title, body, link } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Campo obrigatório ausente: title' });
    }

    if (!body || typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ error: 'Campo obrigatório ausente: body' });
    }

    if ((!fcmToken || typeof fcmToken !== 'string' || !fcmToken.trim()) && (!topic || typeof topic !== 'string' || !topic.trim())) {
      return res.status(400).json({ error: 'Campo obrigatório ausente: fcmToken ou topic' });
    }

    // --- Caso 3A: Envio para todos os clientes registrados (via Tópico) ---
    if (topic && typeof topic === 'string' && topic.trim()) {
      const tokensSnapshot = await adminDb.collection('fcmTokens').get();
      const tokens: string[] = [];
      tokensSnapshot.forEach((doc: any) => {
        const t = doc.id;
        if (t && typeof t === 'string' && t.trim()) {
          tokens.push(t.trim());
        }
      });

      if (tokens.length === 0) {
        return res.status(200).json({ success: true, sentCount: 0, message: 'Nenhum cliente registrado para receber notificações.' });
      }

      const batchSize = 500;
      let sentCount = 0;
      let failureCount = 0;
      const invalidTokensToDelete: string[] = [];

      for (let i = 0; i < tokens.length; i += batchSize) {
        const batchTokens = tokens.slice(i, i + batchSize);
        const multicastMessage = {
          tokens: batchTokens,
          notification: {
            title: title.trim(),
            body: body.trim(),
          },
          webpush: {
            fcmOptions: {
              link: typeof link === 'string' && link.trim() ? link.trim() : '/',
            },
          },
        };

        const response = await adminMessaging.sendEachForMulticast(multicastMessage);
        sentCount += response.successCount;
        failureCount += response.failureCount;

        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            const error = resp.error;
            const token = batchTokens[idx];
            if (
              error?.code === 'messaging/registration-token-not-registered' ||
              error?.message?.includes('NotRegistered') ||
              error?.message?.includes('registration-token-not-registered')
            ) {
              invalidTokensToDelete.push(token);
            }
          }
        });
      }

      if (invalidTokensToDelete.length > 0) {
        const dbBatch = adminDb.batch();
        invalidTokensToDelete.forEach((token) => {
          dbBatch.delete(adminDb.collection('fcmTokens').doc(token));
        });
        await dbBatch.commit();
        console.log(`[API Notify] Removidos ${invalidTokensToDelete.length} tokens inválidos.`);
      }

      return res.status(200).json({
        success: true,
        sentCount,
        failureCount,
        message: `Notificações enviadas: ${sentCount} com sucesso, ${failureCount} falhas.`
      });
    }

    // --- Caso 3B: Envio para um único token ---
    const message: any = {
      notification: {
        title: title.trim(),
        body: body.trim(),
      },
      webpush: {
        fcmOptions: {
          link: typeof link === 'string' && link.trim() ? link.trim() : '/',
        },
      },
      token: fcmToken.trim(),
    };

    try {
      const response = await adminMessaging.send(message);
      return res.status(200).json({ success: true, messageId: response });
    } catch (sendError: any) {
      const isUnregistered =
        sendError.code === 'messaging/registration-token-not-registered' ||
        sendError.message?.includes('registration-token-not-registered') ||
        sendError.message?.includes('NotRegistered');

      if (isUnregistered) {
        try {
          await adminDb.collection('fcmTokens').doc(fcmToken.trim()).delete();
          console.log(`[API Notify] Token individual inválido removido: ${fcmToken}`);
        } catch (dbErr) {
          console.warn('[API Notify] Falha ao deletar token individual inválido:', dbErr);
        }
        return res.status(410).json({
          success: false,
          error: 'NotRegistered',
          detail: 'O token do cliente expirou ou não é mais válido.'
        });
      }
      throw sendError;
    }

  } catch (error: any) {
    console.error('[API Notify] Erro:', error);
    
    if (error.message?.includes('CONFIG_ERROR')) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(500).json({ error: error.message || 'Erro interno no servidor' });
  }
}
