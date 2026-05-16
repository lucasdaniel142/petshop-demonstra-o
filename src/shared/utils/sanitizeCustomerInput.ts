/** Normaliza texto de cliente (nome/endereço) — alinhado ao backend em `api/checkout.ts`. */
export function sanitizeCustomerText(str: string, maxLen: number): string {
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .slice(0, maxLen);
}
