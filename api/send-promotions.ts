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

    // 4. Buscar telefones únicos dos pedidos para WhatsApp fallback
    const phonesWithTokens = new Set<string>();
    const tokenDocs = await adminDb.collection('fcmTokens').get();
    tokenDocs.forEach(doc => {
      const phone = doc.data()?.phone;
      if (phone) phonesWithTokens.add(phone);
    });

    const ordersSnapshot = await adminDb.collection('pedidos').get();
    const allPhones = new Set<string>();
    ordersSnapshot.forEach(doc => {
      const phone = doc.data()?.customerPhone || doc.data()?.phone;
      if (phone) allPhones.add(phone);
    });

    // Telefones que NÃO têm token FCM (vão receber WhatsApp)
    const phonesWithoutToken = Array.from(allPhones).filter(phone => !phonesWithTokens.has(phone));

    console.log('[API Send-Promotions] Dispositivos com FCM:', allTokens.length);
    console.log('[API Send-Promotions] Telefones únicos:', allPhones.size);
    console.log('[API Send-Promotions] Telefones sem FCM (WhatsApp fallback):', phonesWithoutToken.length);

    // 5. Enviar notificações push para dispositivos com FCM
    let pushSuccess = 0;
    let pushFailed = 0;
    let tokensDeleted = 0;

    if (allTokens.length > 0) {
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

        // [FIX-FCM-SERVER] Tratamento de erro 410 - deletar tokens inválidos do Firestore
        if (response.responses) {
          for (let j = 0; j < response.responses.length; j++) {
            const resp = response.responses[j];
            if (resp.error) {
              const errorCode = resp.error.code;
              // Erro 410 (UNREGISTERED) ou código de token não registrado
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
    }

    // 6. Enviar WhatsApp para clientes sem FCM token
    let whatsappSuccess = 0;
    const STORE_WHATSAPP_NUMBERS: Record<string, string> = {
      benedito_bentes: process.env.VITE_WHATSAPP_BENEDITO_BENTES || '',
      salvador_lyra: process.env.VITE_WHATSAPP_SALVADOR_LYRA || '',
      vergel_do_lago: process.env.VITE_WHATSAPP_VERGEL_DO_LAGO || '',
    };

    for (const phone of phonesWithoutToken) {
      try {
        // Enviar para todas as lojas (ou você pode filtrar por loja específica)
        for (const [storeId, whatsappNumber] of Object.entries(STORE_WHATSAPP_NUMBERS)) {
          if (!whatsappNumber) continue;

          const message = `${title}\n\n${body}\n\nAcesse: ${process.env.VITE_APP_URL || 'https://sagrada-familia-a334e.vercel.app'}`;
          const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

          // Aqui você pode usar uma API de WhatsApp ou apenas logar
          // Por enquanto, vamos apenas logar (para implementar API real, use Twilio ou similar)
          console.log(`[API Send-Promotions] WhatsApp para ${phone} (loja ${storeId}): ${message}`);
          whatsappSuccess++;
        }
      } catch (err) {
        console.error(`[API Send-Promotions] Erro ao enviar WhatsApp para ${phone}:`, err);
      }
    }

    return res.status(200).json({
      success: true,
      push: {
        sent: pushSuccess,
        failed: pushFailed,
        tokensDeleted
      },
      whatsapp: {
        sent: whatsappSuccess,
        phones: phonesWithoutToken.length
      },
      total: pushSuccess + whatsappSuccess
    });

  } catch (error: any) {
    console.error('[API Send-Promotions] Erro:', error);
    return res.status(500).json({ error: error.message || 'Erro interno' });
  }
}
