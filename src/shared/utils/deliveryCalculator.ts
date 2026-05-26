// =============================================================================
// deliveryCalculator.ts — Lógica de cálculo de frete compartilhada
// =============================================================================
// [MP-01 FIX] Centralização da lógica de frete para evitar duplicação entre
// frontend (src/shared/config/delivery.ts) e backend (api/checkout.ts)

export interface DeliveryConfig {
  baseFee: number;
  baseRadiusKm: number;
  perKmFee: number;
  maxRadiusKm: number;
  freeShippingMinValue: number;
  freeShippingByValueEnabled: boolean;
}

export interface DeliveryCalculationResult {
  fee: number;
  distanceKm: number;
  description: string;
  isInRange: boolean;
}

/**
 * Calcula a taxa de entrega baseada na distância e regras de frete grátis.
 * 
 * Esta função é usada tanto no frontend quanto no backend para garantir
 * consistência no cálculo.
 * 
 * @param distanceKm - Distância em quilômetros
 * @param hasFreeShippingByItem - Se algum item do carrinho tem frete grátis
 * @param cartTotal - Valor total do carrinho (para regra de frete grátis por valor)
 * @param config - Configurações de entrega
 * @returns Resultado do cálculo com taxa, distância e descrição
 */
export function calculateDeliveryFee(
  distanceKm: number,
  hasFreeShippingByItem: boolean,
  cartTotal: number,
  config: DeliveryConfig
): DeliveryCalculationResult {
  // Verifica se está fora da área de cobertura
  if (distanceKm > config.maxRadiusKm) {
    return {
      fee: 0,
      distanceKm: parseFloat(distanceKm.toFixed(1)),
      description: `Fora da área de entrega (${distanceKm.toFixed(1)} km)`,
      isInRange: false,
    };
  }

  // Arredonda o total do carrinho para evitar problemas de ponto flutuante
  const roundedCartTotal = Math.round(cartTotal * 100) / 100;
  
  // Verifica se tem frete grátis por valor mínimo
  const hasFreeShippingByValue =
    config.freeShippingByValueEnabled && 
    roundedCartTotal >= config.freeShippingMinValue;
  
  const hasFreeShipping = hasFreeShippingByItem || hasFreeShippingByValue;

  // Se tem frete grátis, retorna taxa zero
  if (hasFreeShipping) {
    return {
      fee: 0,
      distanceKm: parseFloat(distanceKm.toFixed(1)),
      description: hasFreeShippingByValue
        ? `Frete grátis (pedido ≥ R$ ${config.freeShippingMinValue.toFixed(2).replace('.', ',')})`
        : 'Frete grátis (produto incluído)',
      isInRange: true,
    };
  }

  // Calcula a taxa de entrega
  const roundedKm = Math.round(distanceKm * 10) / 10;
  let fee = config.baseFee;

  if (roundedKm > config.baseRadiusKm) {
    const extraKm = roundedKm - config.baseRadiusKm;
    fee = config.baseFee + (Math.ceil(extraKm) * config.perKmFee);
  }

  return {
    fee: parseFloat(fee.toFixed(2)),
    distanceKm: parseFloat(distanceKm.toFixed(1)),
    description: `Entrega a ${distanceKm.toFixed(1)} km`,
    isInRange: true,
  };
}
