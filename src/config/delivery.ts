// src/config/delivery.ts
// ============================================================
// Configuração de taxa de entrega dinâmica por distância.
//
// Lógica de preço (configurável via .env.local):
//   - Até BASE_RADIUS_KM → cobra DELIVERY_BASE_FEE
//   - Acima disso → DELIVERY_BASE_FEE + (km extras × PER_KM_FEE)
//   - Acima de MAX_RADIUS_KM → recusa (fora da área de entrega)
//
// Exemplo padrão:
//   Até 3km = R$ 5,00
//   De 3km a 15km = R$ 5,00 + R$ 1,50/km extra
//   Acima de 15km = fora da área
// ============================================================

import type { Coordinates } from '../shared/utils/geolocation';

// ============================================================
// Coordenadas das filiais — White Label
// Configure via VITE_STORE_COORDINATES no .env:
//   Formato: id:lat,lng separados por | entre filiais
//   Exemplo: VITE_STORE_COORDINATES=principal:-23.5505,-46.6333|norte:-23.5100,-46.6100
// ============================================================
function parseCoordinates(): Record<string, Coordinates> {
  const raw = import.meta.env.VITE_STORE_COORDINATES ?? '';
  if (!raw) return {};
  const result: Record<string, Coordinates> = {};
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

/** Coordenadas das filiais — carregadas do .env via VITE_STORE_COORDINATES */
export const STORE_COORDINATES: Record<string, Coordinates> = parseCoordinates();

const parseEnvNumber = (val: string | undefined, defaultVal: number, emptyIsZero: boolean = false): number => {
  if (val === undefined) return defaultVal;
  if (val.trim() === '') return emptyIsZero ? 0 : defaultVal;
  const parsed = parseFloat(val.replace(',', '.'));
  return isNaN(parsed) ? defaultVal : parsed;
};

/** Taxa fixa para entregas dentro do raio base */
export const DELIVERY_BASE_FEE = parseEnvNumber(import.meta.env.VITE_DELIVERY_BASE_FEE, 5.00, true);

/** Raio em KM onde a taxa é fixa (DELIVERY_BASE_FEE) */
export const DELIVERY_BASE_RADIUS_KM = parseEnvNumber(import.meta.env.VITE_DELIVERY_BASE_RADIUS_KM, 3);

/** Valor cobrado por KM adicional (além do raio base) */
export const DELIVERY_PER_KM_FEE = parseEnvNumber(import.meta.env.VITE_DELIVERY_PER_KM_FEE, 1.50, true);

/** Distância máxima de entrega (acima disso = fora da área) */
export const DELIVERY_MAX_RADIUS_KM = parseEnvNumber(import.meta.env.VITE_DELIVERY_MAX_RADIUS_KM, 15);

export interface DeliveryCalcResult {
  /** Distância em KM */
  distanceKm: number;
  /** Taxa calculada em R$ */
  fee: number;
  /** Se está dentro da área de entrega */
  isInRange: boolean;
  /** Descrição legível para o usuário */
  description: string;
}

/**
 * Calcula a taxa de entrega com base na distância em KM.
 */
export function calculateDeliveryFee(distanceKm: number, hasFreeShipping: boolean = false): DeliveryCalcResult {
  const roundedKm = Math.round(distanceKm * 10) / 10; // 1 casa decimal

  // Fora da área de entrega
  if (roundedKm > DELIVERY_MAX_RADIUS_KM) {
    return {
      distanceKm: roundedKm,
      fee: 0,
      isInRange: false,
      description: `Endereço fora da área de entrega (${roundedKm} km). Máximo: ${DELIVERY_MAX_RADIUS_KM} km.`,
    };
  }

  // Frete Grátis por produto promocional
  if (hasFreeShipping) {
    return {
      distanceKm: roundedKm,
      fee: 0,
      isInRange: true,
      description: 'Frete Grátis (Produto Especial)',
    };
  }

  // Dentro do raio base → taxa fixa
  if (roundedKm <= DELIVERY_BASE_RADIUS_KM) {
    return {
      distanceKm: roundedKm,
      fee: DELIVERY_BASE_FEE,
      isInRange: true,
      description: `${roundedKm} km — Taxa fixa`,
    };
  }

  // Entre o raio base e o máximo → taxa base + km extras
  const extraKm = roundedKm - DELIVERY_BASE_RADIUS_KM;
  const extraFee = Math.ceil(extraKm) * DELIVERY_PER_KM_FEE; // arredonda KM extra pra cima
  const totalFee = DELIVERY_BASE_FEE + extraFee;

  return {
    distanceKm: roundedKm,
    fee: Math.round(totalFee * 100) / 100, // evitar floating point
    isInRange: true,
    description: `${roundedKm} km — R$ ${DELIVERY_BASE_FEE.toFixed(2).replace('.', ',')} + ${Math.ceil(extraKm)} km extra`,
  };
}
