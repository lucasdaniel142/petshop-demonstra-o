// src/utils/whatsapp.ts
// ============================================================
// CORREÇÕES DESTA VERSÃO:
//
// 1. [CRÍTICO] Validação explícita das variáveis de ambiente VITE_WHATSAPP_*.
//    Antes: retornava '' silenciosamente, link nunca era gerado.
//    Agora: emite aviso claro no console DEV quando o número não está
//    configurado, para que o desenvolvedor saiba exatamente o que falta.
//
// 2. Para que o WhatsApp funcione, adicione ao .env.local:
//    VITE_WHATSAPP_BENEDITO_BENTES=5582XXXXXXXXX
//    VITE_WHATSAPP_VERGEL=5582XXXXXXXXX
//    VITE_WHATSAPP_SALVADOR_LYRA=5582XXXXXXXXX
//    (formato: código do país + DDD + número, sem espaços ou símbolos)
// ============================================================

import type { CartItem, StoreId } from '../types';

// Lê e valida as variáveis de ambiente.
// Em DEV, loga um aviso claro se estiverem ausentes.
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

export const STORE_WHATSAPP_NUMBERS: Record<StoreId, string> = {
  benedito_bentes: getWhatsAppNumber('VITE_WHATSAPP_BENEDITO_BENTES', 'Benedito Bentes'),
  vergel:          getWhatsAppNumber('VITE_WHATSAPP_VERGEL', 'Vergel do Lago'),
  salvador_lyra:   getWhatsAppNumber('VITE_WHATSAPP_SALVADOR_LYRA', 'Salvador Lyra'),
};

// Sanitiza strings do usuário para evitar injeção de conteúdo na mensagem
const sanitize = (input: string): string =>
  input.replace(/[\r\n\t]/g, ' ').trim();

/**
 * Gera um link wa.me com a lista de itens do carrinho formatada.
 *
 * @returns URL do WhatsApp pronta para abrir, ou '' se dados inválidos.
 */
export const generateWhatsAppLink = (
  items: CartItem[],
  subtotal: number,
  customerName: string,
  address: string,
  paymentMethod: string,
  storeLabel: string,
  storePhone: string,
  deliveryFee: number = 0
): string => {
  // Remove tudo que não seja dígito do número de telefone
  const cleanPhone = storePhone.replace(/\D/g, '');

  if (items.length === 0) return '';

  if (!cleanPhone) {
    if (import.meta.env.DEV) {
      console.error(
        '[WhatsApp] Número de telefone não configurado para esta loja. ' +
        'Verifique as variáveis VITE_WHATSAPP_* no .env.local'
      );
    }
    return '';
  }

  const safeName    = sanitize(customerName);
  const safeAddress = sanitize(address);
  const safePayment = sanitize(paymentMethod);

  const greeting = `Olá, Supermercado Sagrada Família! Meu nome é ${safeName} e gostaria de fazer o pedido para a loja *${storeLabel}*:\n\n`;

  const itemsList = items
    .map(
      (item) =>
        `*${item.quantity}x* ${item.name} — R$ ${(item.price * item.quantity)
          .toFixed(2)
          .replace('.', ',')}`
    )
    .join('\n');

  const totalGeral = subtotal + deliveryFee;

  const taxaLabel = deliveryFee === 0
    ? 'Grátis'
    : `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`;

  const footer = [
    `\n*Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}`,
    `*Taxa de Entrega:* ${taxaLabel}`,
    `*Total a Pagar:* R$ ${totalGeral.toFixed(2).replace('.', ',')}`,
    '',
    `*Endereço de Entrega:* ${safeAddress}`,
    `*Forma de Pagamento:* ${safePayment}`,
  ].join('\n');

  const message = `${greeting}${itemsList}${footer}`;

  // Usa api.whatsapp.com para evitar o bug de "aba branca" em alguns dispositivos
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
};