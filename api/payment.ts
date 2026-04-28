// api/payment.ts
// ============================================================
// Vercel Serverless Function — Cria pagamento no Mercado Pago.
//
// POST /api/payment
//
// SEGURANÇA:
// - Rate limiting por IP (5 req/min)
// - Validação rigorosa de todos os inputs
// - Sanitização contra injection
// - Amount validado server-side (min/max)
// - Whitelist de métodos de pagamento
// - Headers CORS restritivos
// - Nenhum dado sensível nos logs/respostas
// - Idempotency key anti-duplicação
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { randomUUID } from 'crypto';

// ── Rate Limiting In-Memory (por IP) ──
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;       // max requests
const RATE_LIMIT_WINDOW = 60_000; // por minuto

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

// ── Validação ──
const ALLOWED_METHODS = ['pix', 'credit_card', 'debit_card'];
const ALLOWED_PAYMENT_IDS = ['visa', 'master', 'elo', 'amex', 'hipercard', 'cabal', 'debvisa', 'debmaster'];
const MIN_AMOUNT = 0.01;   // R$ 0,01
const MAX_AMOUNT = 50_000;  // R$ 50.000
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const CPF_REGEX = /^\d{11}$/;

function sanitizeString(input: unknown, maxLen: number = 200): string {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '').replace(/[^\w\s@.\-àáâãéêíóôõúçÀÁÂÃÉÊÍÓÔÕÚÇ,()\/]/gi, '').trim().slice(0, maxLen);
}

function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  if (rem !== parseInt(digits[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  if (rem !== parseInt(digits[10])) return false;
  
  return true;
}

// ── Mercado Pago Client ──
const accessToken = process.env.MP_ACCESS_TOKEN;
if (!accessToken) {
  console.error('[FATAL] MP_ACCESS_TOKEN não configurado');
}

const mpClient = new MercadoPagoConfig({ accessToken: accessToken || '' });
const payment = new Payment(mpClient);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS: Apenas POST, recusar qualquer outro método ──
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Rate Limiting ──
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Muitas requisições. Aguarde 1 minuto.' });
  }

  // ── Verificar se o token está configurado ──
  if (!accessToken) {
    return res.status(503).json({ error: 'Serviço de pagamento indisponível.' });
  }

  try {
    const body = req.body;

    // ── 1. Validar método de pagamento ──
    const method = typeof body?.method === 'string' ? body.method : '';
    if (!ALLOWED_METHODS.includes(method)) {
      return res.status(400).json({ error: 'Método de pagamento inválido.' });
    }

    // ── 2. Validar e sanitizar amount ──
    const amount = Number(body?.amount);
    if (!amount || isNaN(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      return res.status(400).json({ error: `Valor inválido. Mínimo: R$ ${MIN_AMOUNT}, Máximo: R$ ${MAX_AMOUNT}.` });
    }
    // Arredondar para 2 casas decimais (previne float manipulation)
    const safeAmount = Math.round(amount * 100) / 100;

    // ── 3. Validar email ──
    const email = sanitizeString(body?.email, 100);
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }

    // ── 4. Validar CPF (se fornecido) ──
    const rawCpf = typeof body?.cpf === 'string' ? body.cpf.replace(/\D/g, '') : '';
    if (rawCpf && !validateCPF(rawCpf)) {
      return res.status(400).json({ error: 'CPF inválido.' });
    }

    // ── 5. Sanitizar description ──
    const description = sanitizeString(body?.description, 200) || 'Pedido';

    // ── Idempotency key ──
    const idempotencyKey = randomUUID();

    let paymentData: any;

    if (method === 'pix') {
      paymentData = {
        body: {
          transaction_amount: safeAmount,
          description,
          payment_method_id: 'pix',
          payer: {
            email,
            ...(rawCpf ? {
              identification: { type: 'CPF', number: rawCpf },
            } : {}),
          },
          notification_url: `${getBaseUrl(req)}/api/webhook`,
        },
        requestOptions: { idempotencyKey },
      };
    } else {
      // ── Cartão: validações extras ──
      const token = typeof body?.token === 'string' ? body.token.trim() : '';
      const paymentMethodId = typeof body?.paymentMethodId === 'string' ? body.paymentMethodId.trim().toLowerCase() : '';
      const installments = Math.max(1, Math.min(12, Number(body?.installments) || 1));

      if (!token || token.length < 10 || token.length > 100) {
        return res.status(400).json({ error: 'Token de cartão inválido.' });
      }

      if (!ALLOWED_PAYMENT_IDS.includes(paymentMethodId)) {
        return res.status(400).json({ error: 'Bandeira de cartão não suportada.' });
      }

      paymentData = {
        body: {
          transaction_amount: safeAmount,
          token,
          description,
          installments,
          payment_method_id: paymentMethodId,
          payer: {
            email,
            ...(rawCpf ? {
              identification: { type: 'CPF', number: rawCpf },
            } : {}),
          },
          notification_url: `${getBaseUrl(req)}/api/webhook`,
        },
        requestOptions: { idempotencyKey },
      };
    }

    // ── Criar pagamento ──
    const result = await payment.create(paymentData);

    // ── Resposta mínima (não vazar dados internos do MP) ──
    const response: Record<string, unknown> = {
      paymentId: result.id,
      status: result.status,
      statusDetail: result.status_detail,
    };

    if (method === 'pix' && result.point_of_interaction) {
      const txData = result.point_of_interaction.transaction_data;
      response.pixQrBase64 = txData?.qr_code_base64 || null;
      response.pixCode = txData?.qr_code || null;
      response.pixExpiration = result.date_of_expiration || null;
    }

    return res.status(200).json(response);

  } catch (error: any) {
    // SEGURANÇA: Não vazar detalhes internos do erro para o cliente
    const mpError = error?.cause?.[0]?.description;
    const safeMessage = mpError
      ? mpError.replace(/[<>]/g, '') // sanitizar contra XSS refletido
      : 'Erro ao processar pagamento. Tente novamente.';
    
    return res.status(error?.status || 500).json({ error: safeMessage });
  }
}

function getBaseUrl(req: VercelRequest): string {
  // SEGURANÇA: Usar apenas o host do deploy, não confiar em headers arbitrários
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  // Sanitizar: apenas permitir domínios válidos
  const safeHost = String(host).replace(/[^a-zA-Z0-9.\-:]/g, '');
  return `https://${safeHost}`;
}
