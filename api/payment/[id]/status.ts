// api/payment/[id]/status.ts
// ============================================================
// Vercel Serverless Function — Consulta status de pagamento.
// GET /api/payment/{id}/status?order=ORDERID
//
// SEGURANÇA:
// - Rate limiting (10 req/min por IP)
// - Validação de ID (numérico positivo, max 15 dígitos)
// - Segundo fator: orderId obrigatório (anti-enumeração)
// - Resposta mínima (só status, sem dados sensíveis)
// - Nenhum erro interno vazado
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ── Firebase Admin (server-side) ──
if (getApps().length === 0) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({ credential: cert(serviceAccount) });
    } catch {
      console.error('[Status] Erro ao parsear FIREBASE_SERVICE_ACCOUNT_KEY');
      initializeApp({ projectId });
    }
  } else {
    initializeApp({ projectId });
  }
}

const adminDb = getFirestore();

const accessToken = process.env.MP_ACCESS_TOKEN || '';
const mpClient = new MercadoPagoConfig({ accessToken });
const paymentApi = new Payment(mpClient);

// Rate limiting
const statusRateLimit = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = statusRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    statusRateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 10; // 10 req/min (polling a cada 5s = 12/min, margem OK)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Muitas requisições. Aguarde.' });
  }

  try {
    const { id } = req.query;
    const rawId = String(id || '');

    // SEGURANÇA: Validar que o ID é numérico, positivo e não excede 15 dígitos
    if (!/^\d{1,15}$/.test(rawId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const paymentId = Number(rawId);

    // SEGURANÇA: Segundo fator — orderId obrigatório (anti-enumeração)
    const orderId = typeof req.query.order === 'string' ? req.query.order.trim() : '';
    if (!orderId || orderId.length < 5 || orderId.length > 40) {
      return res.status(400).json({ error: 'Parâmetro inválido' });
    }

    // Verificar que o par (mpPaymentId, orderId) existe no Firestore
    const orderDoc = await adminDb.collection('pedidos').doc(orderId).get();
    if (!orderDoc.exists || orderDoc.data()?.mpPaymentId !== paymentId) {
      // Retornar 404 genérico — não revelar se o orderId existe
      return res.status(404).json({ error: 'Não encontrado' });
    }

    if (!accessToken) {
      return res.status(503).json({ error: 'Serviço indisponível' });
    }

    const result = await paymentApi.get({ id: paymentId });

    // Resposta mínima: apenas status (não vazar dados do pagador, valores, etc.)
    return res.status(200).json({
      status: result.status || 'unknown',
      statusDetail: String(result.status_detail || '').slice(0, 50),
    });

  } catch {
    // Não vazar detalhes do erro
    return res.status(500).json({ error: 'Erro ao consultar' });
  }
}
