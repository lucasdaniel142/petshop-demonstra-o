import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminMessaging, getAdminAuth, getAdminDb } from './utils/firebaseAdmin.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // --- CORS CONFIGURATION ---
  const ALLOWED_ORIGIN = process.env.VITE_APP_URL || '';
  const origin = req.headers.origin || '';
  
  if (origin.includes('localhost') || origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN || origin);
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

    // 1. Verificar Autenticação (Apenas Admins)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autorizado. Token não fornecido.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    const adminDoc = await adminDb.collection('admins').doc(decodedToken.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    // 2. Buscar configurações de promoção do Firestore (lê de settings/delivery)
    const settingsDoc = await adminDb.collection('settings').doc('delivery').get();
    let title = '� Promoção Especial!';
    let body = 'Confira nossas ofertas imperdíveis!';

    if (settingsDoc.exists) {
      const settingsData = settingsDoc.data();
      title = settingsData?.promoNotificationTitle || title;
      body = settingsData?.promoNotificationBody || body;
    } else {
      console.log('[API Send-Promotions] Documento de configurações não encontrado, usando valores padrão');
    }

    // 3. Buscar todos os dispositivos cadastrados na coleção fcmTokens
    const BATCH_SIZE = 500;
    let allTokens: string[] = [];
    let lastDoc: any = null;
    let hasMore = true;

    while (hasMore) {
      let query = adminDb.collection('fcmTokens').limit(BATCH_SIZE);
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      const batchTokens = snapshot.docs.map(doc => doc.id);
      allTokens = allTokens.concat(batchTokens);

      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      hasMore = batchTokens.length === BATCH_SIZE;
    }

    console.log('[API Send-Promotions] Tokens encontrados em fcmTokens:', allTokens.length);

    if (allTokens.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'Nenhum dispositivo inscrito. Faça um pedido para inscrever seu dispositivo.' 
      });
    }

    // 4. Enviar notificações em massa
    let totalSuccess = 0;
    let totalFailed = 0;
    let tokensDeleted = 0;

    for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
      const batch = allTokens.slice(i, i + BATCH_SIZE);
      const response = await adminMessaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        webpush: {
          fcmOptions: {
            link: '/'
          }
        }
      });

      totalSuccess += response.successCount;
      totalFailed += response.failureCount;

      // Tratamento de erro 410 - deletar tokens inválidos
      if (response.responses) {
        for (let j = 0; j < response.responses.length; j++) {
          const resp = response.responses[j];
          if (resp.error) {
            const errorCode = resp.error.code;
            if (errorCode === 'messaging/registration-token-not-registered' ||
                errorCode === 'messaging/invalid-registration-token') {
              const invalidToken = batch[j];
              try {
                await adminDb.collection('fcmTokens').doc(invalidToken).delete();
                tokensDeleted++;
                console.log(`[API Send-Promotions] Token inválido removido: ${invalidToken}`);
              } catch (deleteErr) {
                console.error(`[API Send-Promotions] Erro ao deletar token ${invalidToken}:`, deleteErr);
              }
            }
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      sent: totalSuccess,
      failed: totalFailed,
      tokensDeleted
    });

  } catch (error: any) {
    console.error('[API Send-Promotions] Erro:', error);
    return res.status(500).json({ error: error.message || 'Erro interno' });
  }
}
