// api/payment.ts
// ============================================================
// Vercel Serverless Function — Cria pagamento no Mercado Pago.
//
// SEGURANÇA:
// - Rate limiting por IP (5 req/min)
// - Validação rigorosa de todos os inputs
// - Preços calculados SERVER-SIDE (Anti-Fraude de manipulação de preço)
// - Taxa de entrega calculada SERVER-SIDE
// - Criação do pedido no Firestore com status 'processing' ANTES do pagamento
// - Idempotency key anti-duplicação
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { randomUUID } from 'crypto';
import { encryptPII } from './utils/encryption.js';

// Tipo auxiliar para itens do carrinho recebidos do client
interface CartItemPayload {
  id: string;
  quantity: number;
}
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ── Firebase Admin (server-side) ──
if (getApps().length === 0) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({ credential: cert(serviceAccount) });
    } catch {
      console.error('[Payment] Erro ao parsear FIREBASE_SERVICE_ACCOUNT_KEY');
      initializeApp({ projectId });
    }
  } else {
    initializeApp({ projectId });
  }
}

const adminDb = getFirestore();

// ── Rate Limiting In-Memory (por IP) ──
// ⚠️ LIMITAÇÃO CONHECIDA: Em serverless (Vercel), cada instância tem seu
// próprio Map — o rate limit NÃO é compartilhado entre instâncias.
// Para produção com tráfego significativo, migrar para:
// - Upstash Redis (10k req/dia grátis): https://upstash.com
// - @vercel/kv
// - Vercel Firewall Rate Limiting (plano Pro)
// Para V1 com volume baixo, o risco é aceitável.
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

// ── Validação e Configs ──
const ALLOWED_METHODS = ['pix', 'credit_card', 'debit_card'];
const ALLOWED_PAYMENT_IDS = ['visa', 'master', 'elo', 'amex', 'hipercard', 'cabal', 'debvisa', 'debmaster'];
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const parseEnvNumber = (val: string | undefined, defaultVal: number, emptyIsZero: boolean = false): number => {
  if (val === undefined) return defaultVal;
  if (val.trim() === '') return emptyIsZero ? 0 : defaultVal;
  const parsed = parseFloat(val.replace(',', '.'));
  return isNaN(parsed) ? defaultVal : parsed;
};

const DELIVERY_BASE_FEE = parseEnvNumber(process.env.VITE_DELIVERY_BASE_FEE, 5.00, true);
const DELIVERY_BASE_RADIUS_KM = parseEnvNumber(process.env.VITE_DELIVERY_BASE_RADIUS_KM, 3);
const DELIVERY_PER_KM_FEE = parseEnvNumber(process.env.VITE_DELIVERY_PER_KM_FEE, 1.50, true);
const DELIVERY_MAX_RADIUS_KM = parseEnvNumber(process.env.VITE_DELIVERY_MAX_RADIUS_KM, 15);

function calculateServerDeliveryFee(distanceKm: number, hasFreeShipping: boolean = false): number {
  if (isNaN(distanceKm) || distanceKm < 0) return -1;
  const roundedKm = Math.round(distanceKm * 10) / 10;
  if (roundedKm > DELIVERY_MAX_RADIUS_KM) return -1; // Fora da área
  if (hasFreeShipping) return 0;
  if (roundedKm <= DELIVERY_BASE_RADIUS_KM) return DELIVERY_BASE_FEE;
  
  const extraKm = roundedKm - DELIVERY_BASE_RADIUS_KM;
  const extraFee = Math.ceil(extraKm) * DELIVERY_PER_KM_FEE;
  return Math.round((DELIVERY_BASE_FEE + extraFee) * 100) / 100;
}

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
  // ── CORS ──
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

  if (!accessToken) {
    console.error('[payment] MP_ACCESS_TOKEN não configurado — retornando 503');
    return res.status(503).json({ error: 'Serviço de pagamento temporariamente indisponível. Tente novamente em instantes.' });
  }

  try {
    const body = req.body;

    // Debug: log what we receive from the Brick
    console.log('[payment] Body keys:', Object.keys(body || {}));
    console.log('[payment] payment_method_id:', body?.payment_method_id);
    console.log('[payment] method:', body?.method);
    console.log('[payment] email:', body?.email, 'payer.email:', body?.payer?.email);
    console.log('[payment] storeId:', body?.storeId);
    console.log('[payment] items:', JSON.stringify(body?.items?.slice(0, 2)));

    // ── 1. Validações Iniciais ──
    // O Payment Brick envia dados dentro de body.formData (objeto aninhado)
    const brickData = body?.formData || {};
    const brickPaymentMethodId = (brickData?.payment_method_id || body?.payment_method_id || '').toLowerCase();
    const selectedMethod = body?.selectedPaymentMethod || body?.paymentType || '';
    const CARD_IDS = ['visa', 'master', 'elo', 'amex', 'hipercard', 'cabal'];
    const DEBIT_IDS = ['debvisa', 'debmaster', 'debelo'];
    
    let method: string;
    if (body?.method && ALLOWED_METHODS.includes(body.method)) {
      method = body.method;
    } else if (brickPaymentMethodId === 'pix' || selectedMethod === 'bank_transfer') {
      method = 'pix';
    } else if (DEBIT_IDS.includes(brickPaymentMethodId) || selectedMethod === 'debit_card') {
      method = 'debit_card';
    } else if (CARD_IDS.includes(brickPaymentMethodId) || brickData?.token || selectedMethod === 'credit_card') {
      method = 'credit_card';
    } else {
      method = brickPaymentMethodId || 'pix'; // fallback
    }

    // Email: pode vir de body.email OU do Brick em body.payer.email
    const rawEmail = body?.email || body?.payer?.email || '';
    const email = sanitizeString(rawEmail, 100);
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }

    // CPF: pode vir de body.cpf OU do Brick em body.payer.identification.number
    const rawCpfInput = body?.cpf || body?.payer?.identification?.number || '';
    const rawCpf = typeof rawCpfInput === 'string' ? rawCpfInput.replace(/\D/g, '') : '';
    if (rawCpf && !validateCPF(rawCpf)) {
      return res.status(400).json({ error: 'CPF inválido.' });
    }

    const storeId = sanitizeString(body?.storeId, 50);
    if (!storeId) {
      return res.status(400).json({ error: 'ID da loja não informado.' });
    }

    const description = sanitizeString(body?.description, 200) || 'Pedido Online';
    const customerName = sanitizeString(body?.customerName, 100) || 'Cliente';
    const deliveryAddress = sanitizeString(body?.deliveryAddress, 500) || '';
    const cep = sanitizeString(body?.cep, 20) || '';
    
    const distanceKm = Number(body?.distanceKm) || 0;
    const items: CartItemPayload[] = Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) {
      return res.status(400).json({ error: 'O carrinho está vazio.' });
    }

    // ── 2. Cálculo do Preço (Server-Side) ──
    let subtotal = 0;
    const verifiedItems = [];

    // Busca os produtos no Firestore para garantir o preço real
    for (const item of items) {
      if (!item?.id || typeof item.id !== 'string') continue;
      const qty = Number(item.quantity);
      if (!qty || qty <= 0 || qty > 999) continue;

      let docSnap;
      try {
        docSnap = await adminDb.collection('produtos').doc(item.id).get();
      } catch (dbErr: any) {
        console.error(`[payment] Firestore error fetching product ${item.id}:`, dbErr.message);
        return res.status(500).json({ error: 'Erro ao verificar produtos. Tente novamente.' });
      }

      if (!docSnap.exists) {
        return res.status(400).json({ error: `Produto não encontrado ou inativo.` });
      }

      const productData = docSnap.data();
      const priceData = productData?.precos?.[storeId];

      if (!priceData || typeof priceData.valor === 'undefined' || priceData.esgotado) {
        return res.status(400).json({ error: `O produto '${productData?.nome || 'Desconhecido'}' está esgotado ou indisponível nesta loja.` });
      }

      const price = Number(priceData.valor) || 0;
      if (price <= 0) {
        return res.status(400).json({ error: `O produto '${productData?.nome || 'Desconhecido'}' está com preço inválido nesta loja.` });
      }

      subtotal += price * qty;
      
      verifiedItems.push({
        id: docSnap.id,
        name: productData?.nome || 'Produto sem nome',
        price: price,
        quantity: qty,
        freteGratis: productData?.freteGratis === true,
      });
    }

    // Calcular Frete
    const hasFreeShipping = verifiedItems.some(item => item.freteGratis);
    const deliveryFee = calculateServerDeliveryFee(distanceKm, hasFreeShipping);
    if (deliveryFee === -1) {
      return res.status(400).json({ error: 'Endereço de entrega está fora da área permitida.' });
    }

    const totalAmount = Math.round((subtotal + deliveryFee) * 100) / 100;
    
    if (isNaN(totalAmount) || totalAmount < 0.01) {
      return res.status(400).json({ error: 'Valor total inválido.' });
    }

    // ── Valor mínimo de pedido (protege modelo de negócio do cliente) ──
    const MIN_ORDER_VALUE = parseFloat(process.env.VITE_MIN_ORDER_VALUE || '0');
    if (subtotal < MIN_ORDER_VALUE) {
      console.log(`[payment] REJECTED: MIN_ORDER_VALUE. Subtotal: ${subtotal}, Min: ${MIN_ORDER_VALUE}`);
      return res.status(400).json({
        error: `Pedido mínimo é R$ ${MIN_ORDER_VALUE.toFixed(2).replace('.', ',')}.`
      });
    }

    // ── 3. Criar Pedido no Firestore (Status: processing) ──
    const orderRef = await adminDb.collection('pedidos').add({
      items: verifiedItems,
      subtotal,
      deliveryFee,
      total: totalAmount,
      customerName: encryptPII(customerName),
      customerEmail: encryptPII(email),
      customerCpf: encryptPII(rawCpf),
      deliveryAddress: encryptPII(deliveryAddress),
      cep: encryptPII(cep),
      isEncrypted: true,
      storeId,
      distanceKm,
      paymentMethod: method,
      paymentStatus: 'processing', // Será atualizado pelo webhook
      createdAt: FieldValue.serverTimestamp(),
    });

    const orderId = orderRef.id;
    // ── 4. Criar Pagamento no MP ──
    const idempotencyKey = randomUUID();
    let paymentData: any;

    // Extração unificada de dados (suporta Payment Brick e payload manual)
    // O Payment Brick envia dados dentro de body.formData (objeto aninhado)
    const finalToken = brickData?.token || body?.token || '';
    const finalPaymentMethodId = (brickData?.payment_method_id || body?.payment_method_id || brickPaymentMethodId || (method === 'pix' ? 'pix' : '')).toLowerCase();
    const finalInstallments = Number(brickData?.installments || body?.installments || 1);
    const finalIssuerId = brickData?.issuer_id || body?.issuer_id || '';

    const firstName = customerName.split(' ')[0] || 'Cliente';
    const lastName = customerName.split(' ').slice(1).join(' ') || 'Sobrenome';

    if (method === 'pix' || finalPaymentMethodId === 'pix') {
      paymentData = {
        body: {
          transaction_amount: totalAmount,
          description: `${description} #${orderId.slice(0, 5)}`,
          payment_method_id: 'pix',
          payer: {
            email,
            first_name: firstName,
            last_name: lastName,
            entity_type: 'individual',
            ...(rawCpf ? { identification: { type: 'CPF', number: rawCpf } } : {}),
          },
          notification_url: `${getBaseUrl(req)}/api/webhook`,
          external_reference: orderId,
        },
        requestOptions: { idempotencyKey },
      };
    } else {
      // ── Cartão ou outros métodos ──
      if (!finalToken && method !== 'pix') {
        return res.status(400).json({ error: 'Token de pagamento ausente.' });
      }

      paymentData = {
        body: {
          transaction_amount: totalAmount,
          token: finalToken,
          description: `${description} #${orderId.slice(0, 5)}`,
          installments: finalInstallments,
          payment_method_id: finalPaymentMethodId,
          ...(finalIssuerId ? { issuer_id: finalIssuerId } : {}),
          payer: {
            email,
            first_name: firstName,
            last_name: lastName,
            entity_type: 'individual',
            ...(rawCpf ? { identification: { type: 'CPF', number: rawCpf } } : {}),
          },
          notification_url: `${getBaseUrl(req)}/api/webhook`,
          external_reference: orderId,
        },
        requestOptions: { idempotencyKey },
      };
    }

    // Criar Pagamento
    const result = await payment.create(paymentData);

    // ── 5. Atualizar Pedido com o mpPaymentId ──
    await orderRef.update({
      mpPaymentId: result.id,
      paymentStatus: result.status === 'approved' ? 'approved' : 'pending'
    });

    // ── Resposta mínima ──
    const response: Record<string, unknown> = {
      orderId,
      paymentId: result.id,
      status: result.status,
      statusDetail: result.status_detail,
      serverTotal: totalAmount
    };

    if ((method === 'pix' || result.payment_method_id === 'pix') && result.point_of_interaction) {
      const txData = result.point_of_interaction.transaction_data;
      response.pixQrBase64 = txData?.qr_code_base64 || null;
      response.pixCode = txData?.qr_code || null;
      response.pixExpiration = result.date_of_expiration || null;
    }

    return res.status(200).json(response);

  } catch (error: any) {
    console.error('[payment] Error in processing:', error.message);
    if (error.cause) console.error('[payment] Cause:', JSON.stringify(error.cause, null, 2));
    if (error.api_response) console.error('[payment] API Response:', JSON.stringify(error.api_response, null, 2));

    const statusCode = error?.api_response?.status || error?.status || 500;
    
    // Extrai a mensagem de erro da resposta da API do MP, se existir
    let mpError = error?.message;
    if (error?.api_response?.data?.message) {
      mpError = error.api_response.data.message;
    } else if (error?.cause?.length > 0) {
      mpError = error.cause[0].description;
    }

    const safeMessage = mpError
      ? String(mpError).replace(/[<>]/g, '')
      : 'Erro ao processar pagamento. Tente novamente.';
    
    return res.status(statusCode).json({ error: safeMessage });
  }
}

function getBaseUrl(req: VercelRequest): string {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const safeHost = String(host).replace(/[^a-zA-Z0-9.\-:]/g, '');
  return `https://${safeHost}`;
}

