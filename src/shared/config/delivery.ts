import type { StoreId } from '../types';
import type { Coordinates } from '../utils/geolocation';

export const STORE_COORDINATES: Record<StoreId, Coordinates> = {
  benedito_bentes: { lat: -9.548488550476605, lng: -35.72458132449029 },
  salvador_lyra: { lat: -9.560838058928207, lng: -35.75117433618712 },
  vergel_do_lago: { lat: -9.65473763672645, lng: -35.7622505067133 },
};

const parseEnvNumber = (val: string | undefined, defaultVal: number, emptyIsZero: boolean = false): number => {
  if (val === undefined) return defaultVal;
  if (val.trim() === '') return emptyIsZero ? 0 : defaultVal;
  const parsed = parseFloat(val.replace(',', '.'));
  return isNaN(parsed) ? defaultVal : parsed;
};

export const DELIVERY_BASE_FEE = parseEnvNumber(import.meta.env.VITE_DELIVERY_BASE_FEE, 5.00, true);
export const DELIVERY_BASE_RADIUS_KM = parseEnvNumber(import.meta.env.VITE_DELIVERY_BASE_RADIUS_KM, 3);
export const DELIVERY_PER_KM_FEE = parseEnvNumber(import.meta.env.VITE_DELIVERY_PER_KM_FEE, 1.50, true);
export const DELIVERY_MAX_RADIUS_KM = parseEnvNumber(import.meta.env.VITE_DELIVERY_MAX_RADIUS_KM, 15);

// Configuração de frete grátis por valor mínimo (fallback para env vars)
const ENV_FREE_SHIPPING_MIN_VALUE_ENABLED = import.meta.env.VITE_FREE_SHIPPING_MIN_VALUE_ENABLED === 'true';
const ENV_FREE_SHIPPING_MIN_VALUE = parseEnvNumber(import.meta.env.VITE_FREE_SHIPPING_MIN_VALUE, 100.00, false);

// Estado global para configurações do Firestore (será atualizado pelo componente)
let firestoreFreeShippingEnabled = ENV_FREE_SHIPPING_MIN_VALUE_ENABLED;
let firestoreFreeShippingMinValue = ENV_FREE_SHIPPING_MIN_VALUE;

export function updateDeliverySettings(enabled: boolean, minValue: number) {
  firestoreFreeShippingEnabled = enabled;
  firestoreFreeShippingMinValue = minValue;
}

export const FREE_SHIPPING_MIN_VALUE_ENABLED = () => firestoreFreeShippingEnabled;
export const FREE_SHIPPING_MIN_VALUE = () => firestoreFreeShippingMinValue;

export interface DeliveryCalcResult {
  distanceKm: number;
  fee: number;
  isInRange: boolean;
  description: string;
}

export function calculateDeliveryFee(distanceKm: number, hasFreeShipping: boolean = false, subtotal: number = 0): DeliveryCalcResult {
  const roundedKm = Math.round(distanceKm * 10) / 10;

  if (roundedKm > DELIVERY_MAX_RADIUS_KM) {
    return {
      distanceKm: roundedKm,
      fee: 0,
      isInRange: false,
      description: `Endereço fora da área de entrega (${roundedKm} km). Máximo: ${DELIVERY_MAX_RADIUS_KM} km.`,
    };
  }

  // Prioridade: frete grátis por produto > frete grátis por valor > frete normal
  if (hasFreeShipping) {
    return {
      distanceKm: roundedKm,
      fee: 0,
      isInRange: true,
      description: 'Frete Grátis (Produto Especial)',
    };
  }

  // Verifica frete grátis por valor mínimo (usa configurações do Firestore ou env vars)
  const enabled = FREE_SHIPPING_MIN_VALUE_ENABLED();
  const minValue = FREE_SHIPPING_MIN_VALUE();

  if (enabled && subtotal >= minValue) {
    return {
      distanceKm: roundedKm,
      fee: 0,
      isInRange: true,
      description: `Frete Grátis (Acima de R$ ${minValue.toFixed(2).replace('.', ',')})`,
    };
  }

  if (roundedKm <= DELIVERY_BASE_RADIUS_KM) {
    return {
      distanceKm: roundedKm,
      fee: DELIVERY_BASE_FEE,
      isInRange: true,
      description: `${roundedKm} km — Taxa fixa`,
    };
  }

  const extraKm = roundedKm - DELIVERY_BASE_RADIUS_KM;
  const extraFee = Math.ceil(extraKm) * DELIVERY_PER_KM_FEE;
  const totalFee = DELIVERY_BASE_FEE + extraFee;

  return {
    distanceKm: roundedKm,
    fee: Math.round(totalFee * 100) / 100,
    isInRange: true,
    description: `${roundedKm} km — R$ ${DELIVERY_BASE_FEE.toFixed(2).replace('.', ',')} + ${Math.ceil(extraKm)} km extra`,
  };
}
