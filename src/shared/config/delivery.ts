// =============================================================================
// delivery.ts — REFATORADO
// =============================================================================
// CORREÇÕES APLICADAS:
//   [FIX-FRETE-1] calculateDeliveryFee: agora recebe cartTotal como parâmetro
//                 e aplica a regra de frete grátis por valor >= R$100,00.
//   [FIX-FRETE-2] Operador corrigido: >= (maior OU IGUAL) garante que R$100,00
//                 exatos também resultem em frete grátis.
//   [FIX-FRETE-3] parseFloat seguro em todas as env vars (fallback numérico).
//   [FIX-FRETE-4] Math.round para eliminar imprecisão de ponto flutuante.
// =============================================================================

export const DELIVERY_BASE_FEE       = parseFloat(import.meta.env.VITE_DELIVERY_BASE_FEE       ?? '5.00');
export const DELIVERY_BASE_RADIUS_KM = parseFloat(import.meta.env.VITE_DELIVERY_BASE_RADIUS_KM ?? '3');
export const DELIVERY_PER_KM_FEE     = parseFloat(import.meta.env.VITE_DELIVERY_PER_KM_FEE     ?? '1.50');
export const DELIVERY_MAX_RADIUS_KM  = parseFloat(import.meta.env.VITE_DELIVERY_MAX_RADIUS_KM  ?? '15');

// [FIX-FRETE-2] === 'true' trata corretamente string 'false' como boolean false
// Variáveis mutáveis para atualização dinâmica via SettingsManager
let freeShippingByValueEnabled = import.meta.env.VITE_FREE_SHIPPING_MIN_VALUE_ENABLED === 'true';
let freeShippingMinValue = parseFloat(
  import.meta.env.VITE_FREE_SHIPPING_MIN_VALUE ?? '100'
);

export const FREE_SHIPPING_BY_VALUE_ENABLED = freeShippingByValueEnabled;
export const FREE_SHIPPING_MIN_VALUE = freeShippingMinValue;

/**
 * Atualiza as configurações de frete grátis dinamicamente.
 * Usado pelo SettingsManager para alterar as configurações em tempo de execução.
 */
export function updateDeliverySettings(enabled: boolean, minValue: number): void {
  freeShippingByValueEnabled = enabled;
  freeShippingMinValue = minValue;
}

export const STORE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  benedito_bentes: { lat: -9.5694, lng: -35.7469 },
  salvador_lyra:   { lat: -9.6098, lng: -35.7347 },
  vergel_do_lago:  { lat: -9.6237, lng: -35.7425 },
};

export interface DeliveryResult {
  fee: number;
  distanceKm: number;
  description: string;
  isInRange: boolean;
}

/**
 * Calcula a taxa de entrega.
 *
 * [FIX-FRETE-1] cartTotal agora é parâmetro explícito — antes jamais era
 *               verificado contra FREE_SHIPPING_MIN_VALUE.
 * [FIX-FRETE-2] >= garante limiar inclusivo (R$ 100,00 exatos = frete grátis).
 * [FIX-FRETE-4] Math.round(n * 100) / 100 elimina imprecisão de ponto flutuante:
 *               ex: 33.33 + 66.67 = 99.99999... → round → 100.00 → frete grátis ✓
 */
export function calculateDeliveryFee(
  distanceKm: number,
  hasFreeShippingByItem: boolean,
  cartTotal: number = 0
): DeliveryResult {

  if (distanceKm > DELIVERY_MAX_RADIUS_KM) {
    return {
      fee: 0,
      distanceKm: parseFloat(distanceKm.toFixed(1)),
      description: `Fora da área de entrega (${distanceKm.toFixed(1)} km)`,
      isInRange: false,
    };
  }

  const roundedCartTotal    = Math.round(cartTotal * 100) / 100;
  const hasFreeShippingByValue =
    FREE_SHIPPING_BY_VALUE_ENABLED && roundedCartTotal >= FREE_SHIPPING_MIN_VALUE;
  const hasFreeShipping     = hasFreeShippingByItem || hasFreeShippingByValue;

  if (hasFreeShipping) {
    return {
      fee: 0,
      distanceKm: parseFloat(distanceKm.toFixed(1)),
      description: hasFreeShippingByValue
        ? `Frete grátis (pedido ≥ R$ ${FREE_SHIPPING_MIN_VALUE.toFixed(2).replace('.', ',')})`
        : 'Frete grátis (produto incluído)',
      isInRange: true,
    };
  }

  const extraKm = Math.max(0, distanceKm - DELIVERY_BASE_RADIUS_KM);
  const fee     = parseFloat((DELIVERY_BASE_FEE + extraKm * DELIVERY_PER_KM_FEE).toFixed(2));

  return {
    fee,
    distanceKm: parseFloat(distanceKm.toFixed(1)),
    description: `Entrega a ${distanceKm.toFixed(1)} km`,
    isInRange: true,
  };
}
