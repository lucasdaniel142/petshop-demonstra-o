// =============================================================================
// delivery.ts — Configuração de entrega (Frontend)
// =============================================================================
// [MP-01 FIX] Agora usa a função centralizada de deliveryCalculator.ts

import { 
  calculateDeliveryFee as calculateDeliveryFeeShared,
  type DeliveryConfig,
  type DeliveryCalculationResult
} from '../utils/deliveryCalculator';

export const DELIVERY_BASE_FEE       = parseFloat(import.meta.env.VITE_DELIVERY_BASE_FEE       ?? '5.00');
export const DELIVERY_BASE_RADIUS_KM = parseFloat(import.meta.env.VITE_DELIVERY_BASE_RADIUS_KM ?? '3');
export const DELIVERY_PER_KM_FEE     = parseFloat(import.meta.env.VITE_DELIVERY_PER_KM_FEE     ?? '1.50');
export const DELIVERY_MAX_RADIUS_KM  = parseFloat(import.meta.env.VITE_DELIVERY_MAX_RADIUS_KM  ?? '15');

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
 * Calcula a taxa de entrega usando a função centralizada.
 * 
 * @param distanceKm - Distância em quilômetros
 * @param hasFreeShippingByItem - Se algum item tem frete grátis
 * @param cartTotal - Valor total do carrinho (padrão: 0)
 * @returns Resultado do cálculo de entrega
 */
export function calculateDeliveryFee(
  distanceKm: number,
  hasFreeShippingByItem: boolean = false,
  cartTotal: number = 0
): DeliveryResult {
  const config: DeliveryConfig = {
    baseFee: DELIVERY_BASE_FEE,
    baseRadiusKm: DELIVERY_BASE_RADIUS_KM,
    perKmFee: DELIVERY_PER_KM_FEE,
    maxRadiusKm: DELIVERY_MAX_RADIUS_KM,
    freeShippingMinValue: freeShippingMinValue,
    freeShippingByValueEnabled: freeShippingByValueEnabled,
  };

  return calculateDeliveryFeeShared(
    distanceKm,
    hasFreeShippingByItem,
    cartTotal,
    config
  );
}
