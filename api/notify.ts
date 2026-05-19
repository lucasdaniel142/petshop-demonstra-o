import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminMessaging, getAdminAuth, getAdminDb } from './_utils/firebaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- 1. CORS CONFIGURATION ---
  const ALLOWED_ORIGIN = process.env.VITE_APP_URL || '';
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const origin = req.headers.origin || '';
  
  // Permite localhost em desenvolvimento ou o domínio configurado
  if (origin.includes('localhost') || origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback de segurança: apenas o próprio domínio se nada for especificado
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
    
    // Proteção básica contra Replay: Verificar se o token foi emitido há mais de 5 minutos
    // (Ajuste conforme a necessidade de sincronia de relógio)
    const now = Math.floor(Date.now() / 1000);
    if (now - decodedToken.iat > 300) { 
      return res.status(403).json({ error: 'Token expirado para esta operação (Replay Protection).' });
    }

    // Verificar se o usuário é realmente um admin no Firestore
    const adminDoc = await adminDb.collection('admins').doc(decodedToken.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      console.warn(`[Security] Tentativa de acesso não autorizado por UID: ${decodedToken.uid}`);
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    // --- 3. NOTIFICATION LOGIC ---
    const { fcmToken, title, body, link } = req.body;

    if (!fcmToken || !title || !body) {
      return res.status(400).json({ error: 'Token, título e corpo são obrigatórios' });
    }

    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      webpush: {
        fcmOptions: {
          link: link || '/'
        }
      }
    };

    const response = await adminMessaging.send(message);
    return res.status(200).json({ success: true, messageId: response });

  } catch (error: any) {
    console.error('[API Notify] Erro:', error);
    
    if (error.message?.includes('CONFIG_ERROR')) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(500).json({ error: error.message || 'Erro interno no servidor' });
  }
}
