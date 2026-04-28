// api/webhook.ts
// ============================================================
// Vercel Serverless Function — Webhook do Mercado Pago.
//
// SEGURANÇA (conforme documentação oficial do MP):
// - Valida assinatura HMAC SHA-256 conforme template oficial:
//     id:[data.id_url];request-id:[x-request-id];ts:[ts];
// - Nunca confia no body — sempre consulta a API do MP
// - Rate limiting (20 req/min)
// - Validação de payload ID (numérico positivo)
// - State machine de transição de status
// - Respostas minimalistas (não vazar estado interno)
//
// Ref: https://www.mercadopago.com.br/developers/pt/docs/
//      your-integrations/notifications/webhooks
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createHmac, timingSafeEqual } from 'crypto';
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
      console.error('[Webhook] Erro ao parsear FIREBASE_SERVICE_ACCOUNT_KEY');
      initializeApp({ projectId });
    }
  } else {
    initializeApp({ projectId });
  }
}

const adminDb = getFirestore();

// ── Mercado Pago ──
const accessToken = process.env.MP_ACCESS_TOKEN || '';
const webhookSecret = process.env.MP_WEBHOOK_SECRET || '';

const mpClient = new MercadoPagoConfig({ accessToken });
const paymentApi = new Payment(mpClient);

// ── Rate Limiting ──
const webhookRateLimit = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = webhookRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    webhookRateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 20; // 20 req/min (MP pode enviar retries)
}

// ── Tolerância de timestamp: 5 minutos ──
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Valida a assinatura HMAC do Mercado Pago conforme documentação oficial.
 *
 * Template: id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];
 *
 * Regras:
 * - data.id vem dos QUERY PARAMS da URL (não do body)
 * - Se data.id for alfanumérico, deve ser minúsculo
 * - Se algum campo não estiver presente, remover do template
 * - Comparação timing-safe para prevenir timing attacks
 */
function verifyWebhookSignature(req: VercelRequest): boolean {
  if (!webhookSecret) {
    // Se não configurou secret, aceitar mas logar warning
    console.warn('[Webhook] MP_WEBHOOK_SECRET não configurado — aceitando sem verificação');
    return true;
  }

  const xSignature = req.headers['x-signature'] as string;
  const xRequestId = req.headers['x-request-id'] as string;

  if (!xSignature) return false;

  // 1. Extrair ts e v1 do header x-signature
  //    Formato: "ts=1704908010,v1=618c8534..."
  const parts: Record<string, string> = {};
  xSignature.split(',').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const key = part.substring(0, idx).trim();
      const value = part.substring(idx + 1).trim();
      if (key && value) parts[key] = value;
    }
  });

  const ts = parts['ts'];
  const hash = parts['v1'];
  if (!ts || !hash) return false;

  // 2. Verificar tolerância de timestamp (previne replay attacks)
  const notificationTime = Number(ts) * 1000; // ts está em segundos
  const now = Date.now();
  if (isNaN(notificationTime) || Math.abs(now - notificationTime) > TIMESTAMP_TOLERANCE_MS) {
    console.warn('[Webhook] Timestamp fora da tolerância — possível replay attack');
    return false;
  }

  // 3. Extrair data.id dos query params (conforme documentação oficial)
  //    "Parâmetros com sufixo _url são provenientes de query params"
  const dataId = typeof req.query?.['data.id'] === 'string'
    ? req.query['data.id']
    : '';

  // Se alfanumérico, converter para minúsculas (conforme docs)
  const safeDataId = dataId.toLowerCase();

  // 4. Montar o manifest conforme template oficial
  //    "Se algum dos valores não estiver presente, removê-lo"
  let manifest = '';
  if (safeDataId) {
    manifest += `id:${safeDataId};`;
  }
  if (xRequestId) {
    manifest += `request-id:${xRequestId};`;
  }
  if (ts) {
    manifest += `ts:${ts};`;
  }

  // 5. Calcular HMAC SHA-256
  const computedHash = createHmac('sha256', webhookSecret)
    .update(manifest)
    .digest('hex');

  // 6. Comparação timing-safe (previne timing attacks)
  try {
    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Whitelist de status válidos do MP
const VALID_STATUSES = [
  'approved', 'rejected', 'pending', 'cancelled',
  'refunded', 'charged_back', 'in_process', 'in_mediation',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Health check
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    // ── Verificar assinatura HMAC (algoritmo oficial do MP) ──
    if (webhookSecret && !verifyWebhookSignature(req)) {
      console.warn(`[Webhook] Assinatura inválida — IP: ${clientIp}`);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { data, type } = req.body || {};

    // Só processar notificações de pagamento
    if (type !== 'payment' || !data?.id) {
      // Retornar 200 para o MP não reenviar (é uma notificação que não nos interessa)
      return res.status(200).json({ ok: true });
    }

    // Validar que o ID é numérico positivo
    const paymentId = Number(data.id);
    if (!paymentId || isNaN(paymentId) || paymentId <= 0 || !Number.isInteger(paymentId)) {
      return res.status(400).json({ error: 'Invalid payment ID' });
    }

    // SEGURANÇA: Consultar a API do MP para confirmar o status real
    // (nunca confiar no body do webhook — anti-spoofing)
    const mpPayment = await paymentApi.get({ id: paymentId });

    if (!mpPayment || !mpPayment.status) {
      return res.status(200).json({ ok: true });
    }

    const newStatus = mpPayment.status;

    // Validar que o status é um valor conhecido
    if (!VALID_STATUSES.includes(newStatus)) {
      return res.status(200).json({ ok: true });
    }

    // Atualizar no Firestore
    const ordersRef = adminDb.collection('pedidos');
    const snapshot = await ordersRef
      .where('mpPaymentId', '==', paymentId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const orderDoc = snapshot.docs[0];

      // SEGURANÇA: Só permitir transições de status válidas
      const currentStatus = orderDoc.data().paymentStatus;
      if (isValidTransition(currentStatus, newStatus)) {
        await orderDoc.ref.update({
          paymentStatus: newStatus,
          mpStatusDetail: String(mpPayment.status_detail || '').slice(0, 100),
          updatedAt: new Date(),
        });
      }
    }

    // Responder 200 para o MP confirmar recebimento
    // (o MP espera 200/201 em até 22 segundos)
    return res.status(200).json({ ok: true });

  } catch {
    // Sempre retornar 200 para o MP não reenviar infinitamente
    // NÃO vazar detalhes do erro
    return res.status(200).json({ ok: false });
  }
}

/**
 * Impede transições de status inválidas (ex: approved → pending).
 * Uma vez aprovado, o status só pode ir para refunded/charged_back.
 */
function isValidTransition(current: string, next: string): boolean {
  if (!current || current === 'idle' || current === 'processing') return true;

  // Status finais — não podem voltar atrás
  if (current === 'approved') {
    return ['refunded', 'charged_back'].includes(next);
  }
  if (current === 'refunded' || current === 'charged_back') {
    return false; // Terminal
  }

  // pending/rejected/in_process → pode mudar
  return true;
}
