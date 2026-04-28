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

import type { Coordinates } from '../utils/geolocation';

/** Coordenadas do supermercado (centro da área de entrega) */
export const STORE_COORDINATES: Coordinates = {
  lat: parseFloat(import.meta.env.VITE_STORE_LAT || '-9.6498'),
  lng: parseFloat(import.meta.env.VITE_STORE_LNG || '-35.7089'),
};

/** Taxa fixa para entregas dentro do raio base */
export const DELIVERY_BASE_FEE = parseFloat(import.meta.env.VITE_DELIVERY_BASE_FEE || '5.00');

/** Raio em KM onde a taxa é fixa (DELIVERY_BASE_FEE) */
export const DELIVERY_BASE_RADIUS_KM = parseFloat(import.meta.env.VITE_DELIVERY_BASE_RADIUS_KM || '3');

/** Valor cobrado por KM adicional (além do raio base) */
export const DELIVERY_PER_KM_FEE = parseFloat(import.meta.env.VITE_DELIVERY_PER_KM_FEE || '1.50');

/** Distância máxima de entrega (acima disso = fora da área) */
export const DELIVERY_MAX_RADIUS_KM = parseFloat(import.meta.env.VITE_DELIVERY_MAX_RADIUS_KM || '15');

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
export function calculateDeliveryFee(distanceKm: number): DeliveryCalcResult {
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
