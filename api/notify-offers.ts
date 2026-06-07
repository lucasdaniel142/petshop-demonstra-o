import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminMessaging, getAdminAuth, getAdminDb } from './utils/firebaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // --- CORS CONFIGURATION (SEC-02) ---
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

    const { title, body, link } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Título e corpo são obrigatórios' });
    }

    // 2. Buscar tokens em lotes (paginação) para evitar gargalo com muitos dispositivos
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

    if (allTokens.length === 0) {
      return res.status(200).json({ success: true, message: 'Nenhum dispositivo inscrito.' });
    }

    // 3. Enviar via Multicast em lotes de 500 (limite do Firebase)
    let totalSuccess = 0;
    let totalFailed = 0;

    for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
      const batch = allTokens.slice(i, i + BATCH_SIZE);
      const response = await adminMessaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            title,
            body,
            icon: '/icons/icon-app.png',
            badge: '/icons/icon-192.png',
            requireInteraction: false,
            tag: 'promotion-notification',
          },
          fcmOptions: {
            link: link || '/'
          }
        },
        data: {
          title,
          body,
          link: link || '/',
        },
      });

      totalSuccess += response.successCount;
      totalFailed += response.failureCount;
    }

    return res.status(200).json({
      success: true,
      sent: totalSuccess,
      failed: totalFailed
    });

  } catch (error: any) {
    console.error('[API Notify-Offers] Erro:', error);
    return res.status(500).json({ error: error.message || 'Erro interno' });
  }
}
