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

    // 3. Buscar tokens FCM únicos dos pedidos (mais simples que fcmTokens)
    const ordersSnapshot = await adminDb.collection('pedidos').get();
    const uniqueTokens = new Set<string>();
    const uniquePhones = new Set<string>();

    ordersSnapshot.forEach(doc => {
      const token = doc.data()?.fcmToken;
      const phone = doc.data()?.customerPhone || doc.data()?.phone;
      if (token && token !== 'null' && token !== 'false') {
        uniqueTokens.add(token);
      }
      if (phone) {
        uniquePhones.add(phone);
      }
    });

    const allTokens = Array.from(uniqueTokens);
    console.log('[API Send-Promotions] Tokens únicos encontrados nos pedidos:', allTokens.length);
    console.log('[API Send-Promotions] Telefones únicos:', uniquePhones.size);

    if (allTokens.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'Nenhum token FCM encontrado nos pedidos.' 
      });
    }

    // 4. Enviar notificações push
    const BATCH_SIZE = 500;
    let pushSuccess = 0;
    let pushFailed = 0;

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

      pushSuccess += response.successCount;
      pushFailed += response.failureCount;
    }

    return res.status(200).json({
      success: true,
      sent: pushSuccess,
      failed: pushFailed,
      totalClients: uniquePhones.size
    });

  } catch (error: any) {
    console.error('[API Send-Promotions] Erro:', error);
    return res.status(500).json({ error: error.message || 'Erro interno' });
  }
}
