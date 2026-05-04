import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { encryptPII } from './utils/encryption';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { items, storeId, customerName, customerEmail, customerCpf, deliveryAddress, cep, distanceKm, subtotal, deliveryFee, total } = req.body;

    // 1. Criar pedido "rascunho" no Firestore
    const orderRef = await adminDb.collection('pedidos').add({
      items: items.map((i: any) => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })),
      subtotal,
      deliveryFee,
      total,
      customerName: encryptPII(customerName),
      customerEmail: encryptPII(customerEmail),
      customerCpf: encryptPII(customerCpf),
      deliveryAddress: encryptPII(deliveryAddress),
      cep: encryptPII(cep),
      isEncrypted: true,
      storeId,
      distanceKm,
      paymentMethod: 'mercado_pago_wallet',
      paymentStatus: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });

    const orderId = orderRef.id;

    const body = {
      items: items.map((item: any) => ({
        id: item.id,
        title: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        currency_id: 'BRL',
      })),
      payer: {
        email: customerEmail,
      },
      external_reference: orderId,
      back_urls: {
        success: `${getBaseUrl(req)}/checkout/success`,
        failure: `${getBaseUrl(req)}/checkout/failure`,
        pending: `${getBaseUrl(req)}/checkout/pending`,
      },
      auto_return: 'approved' as const,
      notification_url: `${getBaseUrl(req)}/api/webhook`,
    };

    const response = await preference.create({ body });

    // 2. Atualizar o pedido com o Preference ID
    await orderRef.update({ mpPreferenceId: response.id });

    return res.status(200).json({ id: response.id, orderId });
  } catch (error: any) {
    console.error('Preference Error:', error);
    return res.status(500).json({ error: 'Erro ao criar preferência de pagamento.' });
  }
}

function getBaseUrl(req: VercelRequest): string {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}
