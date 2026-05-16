import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from './_utils/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

// Configurações de entrega duplicadas para o backend (Segurança: Single Source of Truth em produção viria de um DB de config)
const DELIVERY_BASE_FEE = parseFloat(process.env.VITE_DELIVERY_BASE_FEE || '5.00');
const DELIVERY_BASE_RADIUS_KM = parseFloat(process.env.VITE_DELIVERY_BASE_RADIUS_KM || '3');
const DELIVERY_PER_KM_FEE = parseFloat(process.env.VITE_DELIVERY_PER_KM_FEE || '1.50');
const DELIVERY_MAX_RADIUS_KM = parseFloat(process.env.VITE_DELIVERY_MAX_RADIUS_KM || '15');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
      return res.status(400).json({ error: 'Carrinho vazio ou inválido' });
    }

    // 2. RE-CÁLCULO DE PREÇOS (PROTEÇÃO CONTRA MANIPULAÇÃO)
    let subtotal = 0;
    let hasFreeShipping = false;
    const validatedItems = [];

    // Busca todos os produtos do pedido de uma vez para eficiência
    const productIds = items.map((item: any) => item.id);
    const productsSnapshot = await adminDb.collection('produtos').where('__name__', 'in', productIds).get();
    
    const productMap: Record<string, any> = {};
    productsSnapshot.forEach(doc => {
      productMap[doc.id] = doc.data();
    });

    for (const item of items) {
      const realProduct = productMap[item.id];
      if (!realProduct) {
        return res.status(400).json({ error: `Produto não encontrado: ${item.id}` });
      }

      const quantity = Math.min(Math.max(parseInt(item.quantity) || 1, 1), 99);
      const price = realProduct.precos?.[storeId] || realProduct.preco || 0;
      
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

    // 3. RE-CÁLCULO DA TAXA DE ENTREGA
    let deliveryFee = 0;
    const roundedKm = Math.round((distanceKm || 0) * 10) / 10;

    if (roundedKm > DELIVERY_MAX_RADIUS_KM) {
      return res.status(400).json({ error: 'Endereço fora da área de cobertura' });
    }

    if (!hasFreeShipping) {
      if (roundedKm <= DELIVERY_BASE_RADIUS_KM) {
        deliveryFee = DELIVERY_BASE_FEE;
      } else {
        const extraKm = roundedKm - DELIVERY_BASE_RADIUS_KM;
        deliveryFee = DELIVERY_BASE_FEE + (Math.ceil(extraKm) * DELIVERY_PER_KM_FEE);
      }
    }

    const total = subtotal + deliveryFee;

    // 4. Gravação Segura no Firestore
    const orderData = {
      items: validatedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      deliveryFee: Math.round(deliveryFee * 100) / 100,
      total: Math.round(total * 100) / 100,
      customerName: customerName.trim().slice(0, 100),
      customerPhone: customerPhone.replace(/\D/g, ''),
      deliveryAddress: deliveryAddress.trim(),
      cep: cep.replace(/\D/g, ''),
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

    return res.status(200).json({ 
      success: true, 
      orderId: docRef.id,
      subtotal: orderData.subtotal,
      deliveryFee: orderData.deliveryFee,
      total: orderData.total 
    });

  } catch (error: any) {
    console.error('[API Checkout] Erro:', error);
    return res.status(500).json({ error: 'Erro interno ao processar pedido' });
  }
}
