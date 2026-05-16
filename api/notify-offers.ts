import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminMessaging, adminAuth, adminDb } from './_utils/firebaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    // 2. Buscar todos os tokens registrados
    const snapshot = await adminDb.collection('fcmTokens').get();
    const tokens = snapshot.docs.map(doc => doc.id);

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'Nenhum dispositivo inscrito.' });
    }

    // 3. Enviar via Multicast (lotes de 500)
    const response = await adminMessaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      webpush: {
        fcmOptions: {
          link: link || '/'
        }
      }
    });

    return res.status(200).json({ 
      success: true, 
      sent: response.successCount, 
      failed: response.failureCount 
    });

  } catch (error: any) {
    console.error('[API Notify-Offers] Erro:', error);
    return res.status(500).json({ error: error.message || 'Erro interno' });
  }
}
