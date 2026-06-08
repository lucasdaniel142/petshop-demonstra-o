// src/config/brand.ts
// ============================================================
// Configuração centralizada da identidade visual (White Label).
// Para personalizar para qualquer tipo de loja, edite as
// variáveis VITE_STORE_* no arquivo .env.local ou no painel
// da Vercel. Nenhum outro arquivo precisa ser alterado.
// ============================================================

export const BRAND = {
  /** Nome completo da loja (ex: "Açaí do João", "Pet Shop Amigo Fiel") */
  name: import.meta.env.VITE_STORE_NAME || 'Bichos PetShop',

  /** Nome curto para título da aba e notificações */
  shortName: import.meta.env.VITE_STORE_SHORT_NAME || 'Bichos PetShop',

  /** Saudação personalizada na mensagem do WhatsApp */
  whatsappGreeting: import.meta.env.VITE_STORE_WHATSAPP_GREETING || 'Olá! Gostaria de fazer um pedido.',
} as const;
