export const BRAND = {
  name: import.meta.env.VITE_STORE_NAME || 'Meu E-Commerce',
  shortName: import.meta.env.VITE_STORE_SHORT_NAME || 'Meu E-Commerce',
  whatsappGreeting: import.meta.env.VITE_STORE_WHATSAPP_GREETING || 'Olá!',
} as const;
