import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminMessaging, getAdminDb } from './utils/firebaseAdmin.js';

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminDb = getAdminDb();
    const adminMessaging = getAdminMessaging();

    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token FCM é obrigatório.' });
    }

    // Buscar configurações de promoção do Firestore (lê de settings/delivery)
    const settingsDoc = await adminDb.collection('settings').doc('delivery').get();
    let title = '🔥 Promoção Especial!';
    let body = 'Confira nossas ofertas imperdíveis!';

    if (settingsDoc.exists) {
      const settingsData = settingsDoc.data();
      title = settingsData?.promoNotificationTitle || title;
      body = settingsData?.promoNotificationBody || body;
    } else {
      console.log('[API Send-Promotion-To-Client] Documento de configurações não encontrado, usando valores padrão');
    }

    // Enviar notificação para o token específico
    const message = {
      token,
      notification: { title, body },
      webpush: {
        fcmOptions: {
          link: '/'
        }
      }
    };

    const messageId = await adminMessaging.send(message);

    return res.status(200).json({
      success: true,
      messageId
    });

  } catch (error: any) {
    console.error('[API Send-Promotion-To-Client] Erro:', error);
    
    // Tratamento de erro 410 (token inválido)
    if (error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token') {
      return res.status(410).json({
        error: 'Token FCM expirado ou inválido.',
        code: 'TOKEN_REVOKED'
      });
    }

    return res.status(500).json({ error: error.message || 'Erro interno' });
  }
}
