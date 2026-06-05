import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from './utils/firebaseAdmin.js';
import { 
  calculateDeliveryFee as calculateDeliveryFeeShared,
  type DeliveryConfig
} from '../src/shared/utils/deliveryCalculator.js';

// Configurações de entrega duplicadas para o backend (Segurança: Single Source of Truth em produção viria de um DB de config)
const DELIVERY_BASE_FEE = parseFloat(process.env.VITE_DELIVERY_BASE_FEE || '5.00');
const DELIVERY_BASE_RADIUS_KM = parseFloat(process.env.VITE_DELIVERY_BASE_RADIUS_KM || '3');
const DELIVERY_PER_KM_FEE = parseFloat(process.env.VITE_DELIVERY_PER_KM_FEE || '1.50');
const DELIVERY_MAX_RADIUS_KM = parseFloat(process.env.VITE_DELIVERY_MAX_RADIUS_KM || '15');
const FREE_SHIPPING_MIN_VALUE = parseFloat(process.env.VITE_FREE_SHIPPING_MIN_VALUE || '100');
const FREE_SHIPPING_BY_VALUE_ENABLED = process.env.VITE_FREE_SHIPPING_MIN_VALUE_ENABLED === 'true';

// [HP-02 FIX] Cache de produtos em memória para evitar N+1 queries
// TTL de 5 minutos - produtos não mudam com frequência durante o dia
let productCache: Record<string, any> = {};
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function sanitizeCustomerText(str: unknown, maxLen: number): string {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .slice(0, maxLen);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const adminDb = getAdminDb(); // Garante inicialização
    const { 
      items, 
      customerName, 
      customerPhone, 
      deliveryAddress, 
      cep, 
      storeId, 
      paymentMethod, 
      changeFor, 
      distanceKm,
      fcmToken 
    } = req.body;

    // 1. Validação Básica
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Carrinho vazio ou inválido' });
    }

    // 2. RE-CÁLCULO DE PREÇOS (PROTEÇÃO CONTRA MANIPULAÇÃO)
    let subtotal = 0;
    let hasFreeShipping = false;
    const validatedItems = [];

    if (!storeId || typeof storeId !== 'string') {
      return res.status(400).json({ success: false, error: 'Loja inválida' });
    }

    // [HP-02 FIX] Busca produtos com cache em memória para evitar N+1 queries
    const productIds = items
      .map((item: any) => String(item?.id || '').trim())
      .filter((id) => id.length > 0);

    if (productIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Carrinho inválido. IDs de produtos não informados.' });
    }

    // Verifica se o cache expirou
    const now = Date.now();
    if (now - cacheTimestamp > CACHE_TTL || Object.keys(productCache).length === 0) {
      // [LOG INTENCIONAL] Logs de API são úteis para debug no Vercel Dashboard
      console.log('[Checkout] Cache expirado ou vazio. Recarregando produtos...');
      const allProductsSnapshot = await adminDb.collection('produtos').get();
      productCache = {};
      allProductsSnapshot.forEach(doc => {
        productCache[doc.id] = doc.data();
      });
      cacheTimestamp = now;
      console.log(`[Checkout] Cache atualizado com ${Object.keys(productCache).length} produtos.`);
    }

    // Busca produtos do cache (0 queries ao Firestore!)
    const productMap: Record<string, any> = {};
    for (const id of productIds) {
      if (productCache[id]) {
        productMap[id] = productCache[id];
      }
    }

    // Se algum produto não estiver no cache (produto novo adicionado recentemente),
    // busca apenas os faltantes do Firestore
    const missingIds = productIds.filter(id => !productMap[id]);
    if (missingIds.length > 0) {
      // [LOG INTENCIONAL] Útil para debug no Vercel Dashboard
      console.log(`[Checkout] ${missingIds.length} produtos não encontrados no cache. Buscando...`);
      const chunkArray = <T,>(arr: T[], size: number): T[][] => {
        const result: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          result.push(arr.slice(i, i + size));
        }
        return result;
      };

      const missingIdChunks = chunkArray(missingIds, 10).filter((chunk) => chunk.length > 0);
      for (const chunk of missingIdChunks) {
        const productsSnapshot = await adminDb.collection('produtos').where('__name__', 'in', chunk).get();
        productsSnapshot.forEach(doc => {
          productMap[doc.id] = doc.data();
          productCache[doc.id] = doc.data(); // Atualiza cache
        });
      }
    }

    for (const item of items) {
      const itemId = String(item?.id || '').trim();
      const realProduct = productMap[itemId];
      if (!realProduct) {
        return res.status(400).json({ success: false, error: `Produto não encontrado: ${itemId || '(ID inválido)'}` });
      }

      const quantity = Math.min(Math.max(parseInt(item.quantity) || 1, 1), 99);
      
      let price = 0;
      const storePriceObj = realProduct.precos?.[storeId];
      if (storePriceObj && typeof storePriceObj === 'object') {
        if ('valor' in storePriceObj) {
          price = typeof storePriceObj.valor === 'number' ? storePriceObj.valor : parseFloat(storePriceObj.valor) || 0;
        }
      } else if (realProduct.preco !== undefined) {
        price = typeof realProduct.preco === 'number' ? realProduct.preco : parseFloat(realProduct.preco) || 0;
      }
      
      if (isNaN(price) || price < 0) {
        price = 0;
      }
      
      if (realProduct.freteGratis) hasFreeShipping = true;

      subtotal += price * quantity;
      validatedItems.push({
        id: item.id,
        name: realProduct.nome,
        price: price,
        quantity: quantity,
        imageUrl: realProduct.imageUrl || ''
      });
    }

    // 3. RE-CÁLCULO DA TAXA DE ENTREGA usando função centralizada
    // [MP-01 FIX] Usa calculateDeliveryFeeShared para garantir consistência
    const config: DeliveryConfig = {
      baseFee: DELIVERY_BASE_FEE,
      baseRadiusKm: DELIVERY_BASE_RADIUS_KM,
      perKmFee: DELIVERY_PER_KM_FEE,
      maxRadiusKm: DELIVERY_MAX_RADIUS_KM,
      freeShippingMinValue: FREE_SHIPPING_MIN_VALUE,
      freeShippingByValueEnabled: FREE_SHIPPING_BY_VALUE_ENABLED,
    };

    const deliveryResult = calculateDeliveryFeeShared(
      distanceKm || 0,
      hasFreeShipping,
      subtotal,
      config
    );

    if (!deliveryResult.isInRange) {
      return res.status(400).json({ success: false, error: 'Endereço fora da área de cobertura' });
    }

    const deliveryFee = deliveryResult.fee;
    const total = subtotal + deliveryFee;

    const safeName = sanitizeCustomerText(customerName, 100);
    const safeAddress = sanitizeCustomerText(deliveryAddress, 500);
    const cleanPhone = String(customerPhone || '').replace(/\D/g, '');
    const cleanCep = String(cep || '').replace(/\D/g, '');

    if (!safeName || !safeAddress || cleanPhone.length < 10) {
      return res.status(400).json({ success: false, error: 'Dados do cliente inválidos ou incompletos' });
    }

    if (cleanCep.length !== 8) {
      return res.status(400).json({ success: false, error: 'CEP inválido' });
    }

    // 4. Gravação Segura no Firestore
    const orderData = {
      items: validatedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      deliveryFee: Math.round(deliveryFee * 100) / 100,
      total: Math.round(total * 100) / 100,
      customerName: safeName,
      customerPhone: cleanPhone,
      phone: cleanPhone, // Campo adicional para compatibilidade com OrderManager
      deliveryAddress: safeAddress,
      cep: cleanCep,
      storeId,
      paymentMethod: paymentMethod,
      paymentStatus: 'pending',
      changeFor: changeFor ? parseFloat(changeFor) : null,
      fcmToken: fcmToken || null,
      isDeliveryFallback: !distanceKm && !hasFreeShipping,
      createdAt: FieldValue.serverTimestamp(),
      source: 'api_secure_v1'
    };

    const docRef = await adminDb.collection('pedidos').add(orderData);

    // [FIX] Sincronizar token no fcmTokens caso o client-side tenha falhado (adblock/regras)
    if (fcmToken && cleanPhone) {
      try {
        await adminDb.collection('fcmTokens').doc(fcmToken).set({
          phone: cleanPhone,
          updatedAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          platform: 'checkout-api-fallback'
        }, { merge: true });
      } catch (err) {
        console.warn('[Checkout] Erro ao sincronizar token FCM:', err);
      }
    }

    return res.status(200).json({ 
      success: true, 
      orderId: docRef.id,
      subtotal: orderData.subtotal,
      deliveryFee: orderData.deliveryFee,
      total: orderData.total,
      url: `/orders/${docRef.id}`
    });

  } catch (error: any) {
    console.error('ERRO CRÍTICO CHECKOUT:', error);
    
    // Garante que o Content-Type está definido mesmo em caso de erro antes do setHeader
    try { res.setHeader('Content-Type', 'application/json; charset=utf-8'); } catch { /* já definido */ }
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno desconhecido',
      detail: 'Falha interna na API de checkout',
      code: error.code || 'INTERNAL_SERVER_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
