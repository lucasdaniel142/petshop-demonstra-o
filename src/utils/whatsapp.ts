// src/utils/whatsapp.ts
// ============================================================
// Geração de links do WhatsApp com mensagem formatada do pedido.
// ============================================================

import type { CartItem, StoreId } from '../types';
import { BRAND } from '../config/brand';

// Lê e valida as variáveis de ambiente.
const getWhatsAppNumber = (envKey: string, storeName: string): string => {
  const value = import.meta.env[envKey] ?? '';
  if (!value && import.meta.env.DEV) {
    console.warn(
      `[WhatsApp] Número da loja "${storeName}" não configurado.\n` +
      `Adicione "${envKey}=5582XXXXXXXXX" ao arquivo .env.local e reinicie o servidor.`
    );
  }
  return value;
};

// Mapeamento de lojas → números do WhatsApp
export const STORE_WHATSAPP_NUMBERS: Record<StoreId, string> = {
  benedito_bentes: getWhatsAppNumber('VITE_WHATSAPP_BENEDITO_BENTES', 'Benedito Bentes'),
  // vergel: getWhatsAppNumber('VITE_WHATSAPP_VERGEL', 'Vergel'),
  // salvador_lyra: getWhatsAppNumber('VITE_WHATSAPP_SALVADOR_LYRA', 'Salvador Lyra'),
};

/**
 * Gera a URL do WhatsApp com a mensagem do pedido formatada.
 */
export function generateWhatsAppLink(
  items: CartItem[],
  subtotal: number,
  customerName: string,
  deliveryAddress: string,
  paymentMethod: string,
  storeLabel: string,
  storePhone: string,
  deliveryFee: number = 0
): string | null {
  if (!storePhone) return null;

  const greeting = BRAND.whatsappGreeting;
  const total = subtotal + deliveryFee;

  let message = `${greeting}\n\n`;
  message += `📋 *PEDIDO — ${storeLabel}*\n`;
  message += `━━━━━━━━━━━━━━━━\n\n`;

  items.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    message += `▸ ${item.name}\n`;
    message += `  ${item.quantity}x R$ ${item.price.toFixed(2).replace('.', ',')} = R$ ${itemTotal.toFixed(2).replace('.', ',')}\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━\n`;
  message += `💰 Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;

  if (deliveryFee > 0) {
    message += `🚚 Taxa de entrega: R$ ${deliveryFee.toFixed(2).replace('.', ',')}\n`;
  }

  message += `💲 *TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*\n\n`;
  message += `👤 Nome: ${customerName}\n`;
  message += `📍 Endereço: ${deliveryAddress}\n`;
  message += `💳 Pagamento: ${paymentMethod}\n`;

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${storePhone}?text=${encoded}`;
}
