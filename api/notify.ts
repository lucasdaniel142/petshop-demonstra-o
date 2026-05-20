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
    };

    if (fcmToken && typeof fcmToken === 'string' && fcmToken.trim()) {
      message.token = fcmToken.trim();
    } else {
      message.topic = topic.trim();
    }

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
