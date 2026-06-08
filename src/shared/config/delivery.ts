// =============================================================================
// delivery.ts — Configuração de entrega (Frontend)
// =============================================================================
// [MP-01 FIX] Agora usa a função centralizada de deliveryCalculator.ts

import { 
  calculateDeliveryFee as calculateDeliveryFeeShared,
  type DeliveryConfig,
  type DeliveryCalculationResult
} from '../utils/deliveryCalculator';

export const DELIVERY_BASE_FEE       = parseFloat(import.meta.env.VITE_DELIVERY_BASE_FEE       ?? '0');
export const DELIVERY_BASE_RADIUS_KM = parseFloat(import.meta.env.VITE_DELIVERY_BASE_RADIUS_KM ?? '15');
export const DELIVERY_PER_KM_FEE     = parseFloat(import.meta.env.VITE_DELIVERY_PER_KM_FEE     ?? '0');
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

// ============================================================
// Coordenadas das filiais — White Label
// Configure via VITE_STORE_COORDINATES no .env:
//   VITE_STORE_COORDINATES=principal:-23.5505,-46.6333,filial_norte:-23.5100,-46.6100
// Formato: id:lat,lng  separados por vírgula entre filiais
// ============================================================
function parseCoordinates(): Record<string, { lat: number; lng: number }> {
  const raw = import.meta.env.VITE_STORE_COORDINATES ?? '';
  if (!raw) return {};
  const result: Record<string, { lat: number; lng: number }> = {};
  raw.split('|').forEach((entry: string) => {
    const parts = entry.trim().split(':');
    if (parts.length === 2) {
      const id = parts[0].trim();
      const [lat, lng] = parts[1].split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) result[id] = { lat, lng };
    }
  });
  return result;
}

export const STORE_COORDINATES: Record<string, { lat: number; lng: number }> = parseCoordinates();

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
