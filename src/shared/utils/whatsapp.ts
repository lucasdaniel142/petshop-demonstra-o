import type { CartItem } from '../types';

export const STORE_WHATSAPP_NUMBERS: Record<string, string> = {
  benedito_bentes: import.meta.env.VITE_WHATSAPP_BENEDITO_BENTES || '5582987187113',
  salvador_lyra: import.meta.env.VITE_WHATSAPP_SALVADOR_LYRA || '5582999999999',
  vergel_do_lago: import.meta.env.VITE_WHATSAPP_VERGEL_DO_LAGO || '5582999999999',
};

const GREETING = import.meta.env.VITE_STORE_WHATSAPP_GREETING || 'Olá! Gostaria de fazer um pedido.';

// Definição dos emojis usando Unicode Escape Sequences para evitar problemas de encoding no Windows/VS Code
const EMOJI = {
  BOX: '\u{1F4E6}',      // 📦
  USER: '\u{1F464}',     // 👤
  PIN: '\u{1F4CD}',      // 📍
  CART: '\u{1F6D2}',     // 🛒
  MONEY: '\u{1F4B0}',    // 💰
  BIKE: '\u{1F6F5}',     // 🛵
  CHECK: '\u{2705}',     // ✅
  CARD: '\u{1F4B3}',     // 💳
  CASH: '\u{1F4B5}'      // 💵
};

/**
 * Gera o link do WhatsApp blindado contra erros de encoding.
 */
export function generateWhatsAppLink(
  items: CartItem[],
  total: number,
  customerName: string,
  address: string,
  paymentMethod: string,
  storeLabel: string,
  storePhone: string,
  deliveryFee: number,
  changeFor?: string,
  isFallback?: boolean
): string {
  const itemsText = items
    .map(item => `• ${item.quantity}x ${item.name} (R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')})`)
    .join('\n');

  const deliveryWarning = isFallback ? '\n⚠️ *API INDISPONÍVEL: Confirmar distância!*' : '';

  const text = `${EMOJI.BOX} *NOVO PEDIDO - ${storeLabel}*

${GREETING}

${EMOJI.USER} *Cliente:* ${customerName}
${EMOJI.PIN} *Endereço:* ${address}

${EMOJI.CART} *Itens:*
${itemsText}

${EMOJI.MONEY} *Subtotal:* R$ ${total.toFixed(2).replace('.', ',')}
${EMOJI.BIKE} *Taxa de Entrega:* R$ ${deliveryFee.toFixed(2).replace('.', ',')}${deliveryWarning}
${EMOJI.CHECK} *TOTAL: R$ ${(total + deliveryFee).toFixed(2).replace('.', ',')}*

${EMOJI.CARD} *Pagamento:* ${paymentMethod}${changeFor ? `\n${EMOJI.CASH} *Troco para:* R$ ${changeFor}` : ''}

_Enviado via App Supermercado Sagrada Família_`;

  return `https://api.whatsapp.com/send?phone=${storePhone}&text=${encodeURIComponent(text)}`;
}
