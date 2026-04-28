// api/payment/[id]/status.ts
// ============================================================
// Vercel Serverless Function — Consulta status de pagamento.
// GET /api/payment/{id}/status
//
// SEGURANÇA:
// - Rate limiting (10 req/min por IP)
// - Validação de ID (numérico positivo, max 15 dígitos)
// - Resposta mínima (só status, sem dados sensíveis)
// - Nenhum erro interno vazado
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Payment } from 'mercadopago';

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
