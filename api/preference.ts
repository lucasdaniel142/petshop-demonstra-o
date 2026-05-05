// api/preference.ts
// ============================================================
// Vercel Serverless Function — Cria preferência do Mercado Pago (Wallet Brick).
//
// SEGURANÇA (AUDITORIA):
// - Preços verificados SERVER-SIDE via Firestore (Anti-Fraude)
// - Taxa de entrega calculada SERVER-SIDE
// - Rate limiting por IP (5 req/min)
// - Validação rigorosa de inputs
// - PII criptografada antes de salvar no Firestore
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { encryptPII } from './utils/encryption.js';

// ── Firebase Admin ──
if (getApps().length === 0) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({ credential: cert(serviceAccount) });
    } catch {
      initializeApp({ projectId });
    }
  } else {
    initializeApp({ projectId });
  }
}

const adminDb = getFirestore();
const accessToken = process.env.MP_ACCESS_TOKEN || '';
const mpClient = new MercadoPagoConfig({ accessToken });
const preference = new Preference(mpClient);

// ── Rate Limiting ──
const rateLimit = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 5;
}

// ── Delivery Fee (Server-Side) ──
const DELIVERY_BASE_FEE = parseFloat(process.env.VITE_DELIVERY_BASE_FEE || '5.00');
const DELIVERY_BASE_RADIUS_KM = parseFloat(process.env.VITE_DELIVERY_BASE_RADIUS_KM || '3');
const DELIVERY_PER_KM_FEE = parseFloat(process.env.VITE_DELIVERY_PER_KM_FEE || '1.50');
const DELIVERY_MAX_RADIUS_KM = parseFloat(process.env.VITE_DELIVERY_MAX_RADIUS_KM || '15');

function calculateServerDeliveryFee(distanceKm: number): number {
  const roundedKm = Math.round(distanceKm * 10) / 10;
  if (roundedKm > DELIVERY_MAX_RADIUS_KM) return -1;
  if (roundedKm <= DELIVERY_BASE_RADIUS_KM) return DELIVERY_BASE_FEE;
  const extraKm = roundedKm - DELIVERY_BASE_RADIUS_KM;
  const extraFee = Math.ceil(extraKm) * DELIVERY_PER_KM_FEE;
  return Math.round((DELIVERY_BASE_FEE + extraFee) * 100) / 100;
}

function sanitizeString(input: unknown, maxLen: number = 200): string {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '').replace(/[^\w\s@.\-àáâãéêíóôõúçÀÁÂÃÉÊÍÓÔÕÚÇ,()/]/gi, '').trim().slice(0, maxLen);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Muitas requisições. Aguarde.' });
  }

  try {
    const body = req.body || {};
    
    // Debug: log what we receive
    console.log('[preference] Body keys:', Object.keys(body));
    console.log('[preference] items type:', typeof body.items, 'isArray:', Array.isArray(body.items), 'length:', body.items?.length);
    console.log('[preference] storeId:', body.storeId);
    console.log('[preference] customerEmail:', body.customerEmail, 'email:', body.email);
    
    const items = body.items;
    const storeId = body.storeId;
    const customerName = body.customerName || 'Cliente';
    const customerEmail = body.customerEmail || body.email || '';
    const customerCpf = body.customerCpf || body.cpf || '';
    const deliveryAddress = body.deliveryAddress || '';
    const cep = body.cep || '';
    const distanceKm = body.distanceKm || 0;

    // Validações
    if (!Array.isArray(items) || items.length === 0) {
      console.log('[preference] REJECTED: items empty/invalid');
      return res.status(400).json({ error: 'Carrinho vazio.' });
    }
    if (!storeId) {
      console.log('[preference] REJECTED: storeId missing');
      return res.status(400).json({ error: 'ID da loja não informado.' });
    }

    // ── SEGURANÇA: Calcular preços SERVER-SIDE ──
    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const qty = Number(item.quantity);
      if (!qty || qty <= 0) continue;

      const docSnap = await adminDb.collection('produtos').doc(item.id).get();
      if (!docSnap.exists) {
        return res.status(400).json({ error: `Produto ${item.id} não encontrado.` });
      }

      const productData = docSnap.data();
      const priceData = productData?.precos?.[storeId];

      if (!priceData || priceData.esgotado) {
        return res.status(400).json({ error: `Produto '${productData?.nome}' indisponível nesta loja.` });
      }

      const price = Number(priceData.valor) || 0;
      subtotal += price * qty;

      verifiedItems.push({
        id: docSnap.id,
        name: productData?.nome || 'Produto sem nome',
        price,
        quantity: qty,
      });
    }

    // ── Taxa de Entrega Server-Side ──
    const distance = Number(distanceKm) || 0;
    const deliveryFee = calculateServerDeliveryFee(distance);
    if (deliveryFee === -1) {
      return res.status(400).json({ error: 'Endereço fora da área de entrega.' });
    }

    const total = Math.round((subtotal + deliveryFee) * 100) / 100;

    // ── Valor mínimo ──
    const MIN_ORDER_VALUE = parseFloat(process.env.VITE_MIN_ORDER_VALUE || '0');
    if (subtotal < MIN_ORDER_VALUE) {
      console.log(`[preference] REJECTED: MIN_ORDER_VALUE. Subtotal: ${subtotal}, Min: ${MIN_ORDER_VALUE}`);
      return res.status(400).json({
        error: `Pedido mínimo é R$ ${MIN_ORDER_VALUE.toFixed(2).replace('.', ',')}.`
      });
    }

    // 1. Criar pedido "rascunho" no Firestore (preços verificados)
    const orderRef = await adminDb.collection('pedidos').add({
      items: verifiedItems,
      subtotal,
      deliveryFee,
      total,
      customerName: encryptPII(sanitizeString(customerName, 100)),
      customerEmail: encryptPII(sanitizeString(customerEmail, 100)),
      customerCpf: encryptPII(sanitizeString(customerCpf, 20)),
      deliveryAddress: encryptPII(sanitizeString(deliveryAddress, 500)),
      cep: encryptPII(sanitizeString(cep, 20)),
      isEncrypted: true,
      storeId,
      distanceKm: distance,
      paymentMethod: 'mercado_pago_wallet',
      paymentStatus: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });

    const orderId = orderRef.id;

    // 2. Criar preferência com preços verificados
    const preferenceBody = {
      items: verifiedItems.map((item) => ({
        id: item.id,
        title: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        currency_id: 'BRL',
      })),
      // Adicionar taxa de entrega como item separado
      ...(deliveryFee > 0 ? {
        shipments: {
          cost: deliveryFee,
          mode: 'not_specified',
        }
      } : {}),
      payer: {
        email: sanitizeString(customerEmail, 100) || 'cliente@email.com',
      },
      external_reference: orderId,
      back_urls: {
        success: `${getBaseUrl(req)}/`,
        failure: `${getBaseUrl(req)}/`,
        pending: `${getBaseUrl(req)}/`,
      },
      auto_return: 'approved' as const,
      notification_url: `${getBaseUrl(req)}/api/webhook`,
    };

    const response = await preference.create({ body: preferenceBody });

    // 3. Atualizar o pedido com o Preference ID
    await orderRef.update({ mpPreferenceId: response.id });

    return res.status(200).json({ id: response.id, orderId });
  } catch (error: any) {
    console.error('Preference Error:', error);
    return res.status(500).json({ error: 'Erro ao criar preferência de pagamento.' });
  }
}

function getBaseUrl(req: VercelRequest): string {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const safeHost = String(host).replace(/[^a-zA-Z0-9.\-:]/g, '');
  return `https://${safeHost}`;
}
