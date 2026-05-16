export const BRAND = {
  name: import.meta.env.VITE_STORE_NAME || 'Sagrada Família',
  shortName: import.meta.env.VITE_STORE_SHORT_NAME || 'Sagrada Família',
  whatsappGreeting: import.meta.env.VITE_STORE_WHATSAPP_GREETING || 'Olá!',
} as const;
