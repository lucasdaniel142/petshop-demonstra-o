// =============================================================================
// currency.ts — Utilitários de formatação de moeda
// =============================================================================
// [MP-03 FIX] Centralização de funções de formatação para evitar duplicação

/**
 * Formata um valor numérico para o formato de moeda brasileira (R$ 0,00).
 * 
 * @param value - Valor a ser formatado (number, string, ou objeto com propriedade 'valor')
 * @returns String formatada no padrão "R$ 0,00"
 * 
 * @example
 * formatCurrency(12.5) // "R$ 12,50"
 * formatCurrency("12.5") // "R$ 12,50"
 * formatCurrency({ valor: 12.5 }) // "R$ 12,50"
 * formatCurrency(null) // "R$ 0,00"
 */
export function formatCurrency(value: number | string | { valor: number | string } | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00';
  
  let num = 0;
  
  // Se for um objeto com propriedade 'valor'
  if (typeof value === 'object' && value !== null) {
    if ('valor' in value) {
      num = typeof value.valor === 'number' 
        ? value.valor 
        : parseFloat(value.valor) || 0;
    }
  } else {
    // Se for number ou string
    num = typeof value === 'number' 
      ? value 
      : parseFloat(value as string) || 0;
  }
  
  if (isNaN(num)) return 'R$ 0,00';
  
  return `R$ ${num.toFixed(2).replace('.', ',')}`;
}

/**
 * Extrai o preço numérico de um item do carrinho/pedido.
 * 
 * @param item - Item com propriedade 'price' (number, string, ou objeto)
 * @returns Preço numérico (0 se inválido)
 * 
 * @example
 * getItemPrice({ price: 12.5 }) // 12.5
 * getItemPrice({ price: { valor: 12.5 } }) // 12.5
 * getItemPrice({ price: "12.5" }) // 12.5
 * getItemPrice({}) // 0
 */
export function getItemPrice(item: { price?: number | string | { valor: number | string } | null }): number {
  if (!item || item.price === null || item.price === undefined) return 0;
  
  let price = 0;
  
  // Se price for um objeto com propriedade 'valor'
  if (typeof item.price === 'object' && item.price !== null) {
    if ('valor' in item.price) {
      price = typeof item.price.valor === 'number' 
        ? item.price.valor 
        : parseFloat(item.price.valor) || 0;
    }
  } else {
    // Se price for number ou string
    price = typeof item.price === 'number' 
      ? item.price 
      : parseFloat(item.price as string) || 0;
  }
  
  return isNaN(price) ? 0 : price;
}

/**
 * Formata um valor numérico para exibição sem o símbolo de moeda.
 * Útil para inputs de formulário.
 * 
 * @param value - Valor numérico
 * @returns String formatada no padrão "0,00"
 * 
 * @example
 * formatNumber(12.5) // "12,50"
 * formatNumber(0) // "0,00"
 */
export function formatNumber(value: number): string {
  if (isNaN(value)) return '0,00';
  return value.toFixed(2).replace('.', ',');
}

/**
 * Converte uma string formatada em número.
 * Aceita tanto ponto quanto vírgula como separador decimal.
 * 
 * @param value - String formatada (ex: "12,50" ou "12.50")
 * @returns Número parseado (0 se inválido)
 * 
 * @example
 * parseNumber("12,50") // 12.5
 * parseNumber("12.50") // 12.5
 * parseNumber("abc") // 0
 */
export function parseNumber(value: string): number {
  const cleaned = value.replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
