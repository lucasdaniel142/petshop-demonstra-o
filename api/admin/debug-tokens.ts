import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminAuth, getAdminDb } from '../utils/firebaseAdmin.js';

export const config = {
  runtime: 'nodejs',
};

/**
 * GET /api/admin/debug-tokens
 * Endpoint de diagnóstico — retorna quantos tokens FCM existem no Firestore.
 * Requer autenticação de admin.
 * REMOVA este endpoint após o diagnóstico.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // Verificar autenticação admin
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const adminDoc = await adminDb.collection('admins').doc(decodedToken.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    // Contar tokens
    const snapshot = await adminDb.collection('fcmTokens').get();
    const tokens = snapshot.docs.map(doc => ({
      id: doc.id.substring(0, 30) + '...',
      phone: doc.data()?.phone || null,
      updatedAt: doc.data()?.updatedAt || null,
      platform: (doc.data()?.platform || '').substring(0, 50),
    }));

    return res.status(200).json({
      total: tokens.length,
      tokens,
    });

  } catch (error: any) {
    console.error('[debug-tokens] Erro:', error);
    return res.status(500).json({ error: error.message || 'Erro interno' });
  }
}
