import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '../utils/firebaseAdmin.js';

export const config = {
  runtime: 'nodejs',
};

const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BATCH_LIMIT = 500;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token não fornecido.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const adminDb = getAdminDb();
    const adminDoc = await adminDb.collection('admins').doc(decodedToken.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Acesso negado.' });
    }

    const cutoffDate = new Date(Date.now() - HISTORY_TTL_MS);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    let deletedCount = 0;
    let lastBatchCount = 0;

    do {
      const snapshot = await adminDb
        .collection('pedidos')
        .where('createdAt', '<=', cutoffTimestamp)
        .limit(BATCH_LIMIT)
        .get();

      if (snapshot.empty) {
        break;
      }

      lastBatchCount = snapshot.size;
      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deletedCount += lastBatchCount;
    } while (lastBatchCount === BATCH_LIMIT);

    return res.status(200).json({
      success: true,
      deleted: deletedCount,
      cutoff: cutoffDate.toISOString(),
      message: deletedCount > 0 ? `Pedidos antigos removidos: ${deletedCount}` : 'Nenhum pedido antigo encontrado.',
    });
  } catch (error: any) {
    console.error('[cleanup-old-orders] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno',
    });
  }
}
