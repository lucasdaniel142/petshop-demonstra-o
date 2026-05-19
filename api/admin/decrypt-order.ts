import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminAuth, getAdminDb } from '../utils/firebaseAdmin';
import { decryptPII } from '../utils/encryption';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autorizado. Token não fornecido.' });
    }

    const token = authHeader.split('Bearer ')[1];
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

    // Apenas Admins podem descriptografar
    const adminDoc = await adminDb.collection('admins').doc(decodedToken.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas admins podem ler dados sensíveis.' });
    }

    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId é obrigatório' });

    const orderDoc = await adminDb.collection('pedidos').doc(orderId).get();
    if (!orderDoc.exists) return res.status(404).json({ error: 'Pedido não encontrado' });

    const data = orderDoc.data();
    if (!data) return res.status(404).json({ error: 'Pedido vazio' });

    // Descriptografa campos PII
    const decryptedData = {
      customerName: decryptPII(data.customerName || ''),
      customerEmail: decryptPII(data.customerEmail || ''),
      customerCpf: decryptPII(data.customerCpf || ''),
      deliveryAddress: decryptPII(data.deliveryAddress || ''),
      cep: decryptPII(data.cep || ''),
    };

    return res.status(200).json({ success: true, decryptedData });

  } catch (error: any) {
    console.error('Erro ao descriptografar:', error);
    return res.status(500).json({ error: 'Erro interno ao descriptografar dados.' });
  }
}
