import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

// ── Firebase Admin (server-side) ──
if (getApps().length === 0) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({ credential: cert(serviceAccount) });
    } catch {
      console.error('[Notify] Erro ao parsear FIREBASE_SERVICE_ACCOUNT_KEY');
      initializeApp({ projectId });
    }
  } else {
    initializeApp({ projectId });
  }
}

const adminDb = getFirestore();
const adminMessaging = getMessaging();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS ──
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autorizado. Token não fornecido.' });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(token);
    } catch (error) {
      return res.status(401).json({ error: 'Não autorizado. Token JWT inválido ou expirado.' });
    }

    // Verificar se o usuário possui a role de admin no Firestore
    const adminDoc = await adminDb.collection('admins').doc(decodedToken.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem disparar notificações.' });
    }
    const { title, body } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ error: 'Título e corpo são obrigatórios' });
    }

    // Pega todos os tokens do Firestore
    const snapshot = await adminDb.collection('fcmTokens').get();
    const tokens = snapshot.docs.map(doc => doc.id);

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'Nenhum usuário inscrito para receber notificações.' });
    }

    // FCM tem limite de 500 tokens por sendMulticast
    // Vamos fazer em lotes de 500
    const batches = [];
    for (let i = 0; i < tokens.length; i += 500) {
      batches.push(tokens.slice(i, i + 500));
    }

    let successCount = 0;
    let failureCount = 0;

    for (const batch of batches) {
      const response = await adminMessaging.sendEachForMulticast({
        tokens: batch,
        notification: {
          title: title,
          body: body,
        },
        webpush: {
          fcmOptions: {
            link: '/' // Ao clicar na notificação, abre a home
          }
        }
      });
      
      successCount += response.successCount;
      failureCount += response.failureCount;

      // Remove tokens inválidos
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
            failedTokens.push(batch[idx]);
          }
        });
        
        // Remove os tokens que deram unregister
        if (failedTokens.length > 0) {
          const batchDelete = adminDb.batch();
          failedTokens.forEach(token => {
            batchDelete.delete(adminDb.collection('fcmTokens').doc(token));
          });
          await batchDelete.commit();
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      sent: successCount, 
      failed: failureCount 
    });

  } catch (error: any) {
    console.error('Erro ao enviar push notifications:', error);
    return res.status(500).json({ error: 'Erro ao enviar notificações' });
  }
}
