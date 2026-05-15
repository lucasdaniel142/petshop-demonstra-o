// src/utils/whatsapp.ts
// ============================================================
// Geração de links do WhatsApp com mensagem formatada do pedido.
// ============================================================

import type { CartItem, StoreId } from '../types';
import { BRAND } from '../config/brand';
import { STORE_WHATSAPP_NUMBERS } from '../config/stores';

// Re-export para backward compatibility (CartDrawer importa daqui)
export { STORE_WHATSAPP_NUMBERS };

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
  deliveryFee: number = 0,
  changeFor?: string
): string | null {
  if (!storePhone) return null;

  const greeting = BRAND.whatsappGreeting;
  const total = subtotal + deliveryFee;

  let message = `${greeting}\n\n`;
  message += `🛒 *NOVO PEDIDO - ${storeLabel}*\n`;
  message += `--------------------------------\n\n`;

  items.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    message += `✅ ${item.name}\n`;
    message += `   ${item.quantity}x R$ ${item.price.toFixed(2).replace('.', ',')} = R$ ${itemTotal.toFixed(2).replace('.', ',')}\n\n`;
  });

  message += `--------------------------------\n`;
  message += `💵 *Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;

  if (deliveryFee > 0) {
    message += `🛵 *Taxa de entrega:* R$ ${deliveryFee.toFixed(2).replace('.', ',')}\n`;
  }

  message += `💰 *TOTAL:* R$ ${total.toFixed(2).replace('.', ',')}\n\n`;
  message += `👤 *CLIENTE:* ${customerName}\n`;
  message += `📍 *ENDERE\u00C7O:* ${deliveryAddress}\n`;
  message += `💳 *PAGAMENTO:* ${paymentMethod} na Entrega\n`;

  if (paymentMethod === 'Dinheiro' && changeFor) {
    message += `🪙 *TROCO PARA:* R$ ${changeFor}\n`;
  }

  const encoded = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${storePhone}&text=${encoded}`;
}
