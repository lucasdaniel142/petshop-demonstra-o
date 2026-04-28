// src/config/brand.ts
// ============================================================
// Configuração centralizada da marca do cliente.
// Para personalizar para um novo supermercado, basta editar
// as variáveis VITE_STORE_* no arquivo .env.local.
// Nenhum outro arquivo precisa ser alterado.
// ============================================================

export const BRAND = {
  /** Nome completo do supermercado (ex: "Supermercado Bom Preço") */
  name: import.meta.env.VITE_STORE_NAME || 'Meu Supermercado',

  /** Nome curto para título da aba do navegador */
  shortName: import.meta.env.VITE_STORE_SHORT_NAME || 'Meu Super',

  /** Saudação personalizada na mensagem do WhatsApp */
  whatsappGreeting: import.meta.env.VITE_STORE_WHATSAPP_GREETING || 'Olá!',
} as const;
