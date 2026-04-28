// src/utils/geolocation.ts
// ============================================================
// Funções de geolocalização para cálculo de taxa de entrega.
//
// - Fórmula de Haversine: distância em KM entre dois pontos
// - ViaCEP: busca endereço a partir do CEP (API gratuita BR)
// - Nominatim (OpenStreetMap): geocodifica endereço → lat/lng
//
// Custo: R$ 0,00 — nenhuma API paga necessária.
// ============================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ViaCEPResult {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  /** Endereço formatado para exibição */
  formatted: string;
}

// ── Haversine: Distância em KM entre dois pontos (lat/lng) ──

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calcula a distância em quilômetros entre dois pontos geográficos
 * usando a fórmula de Haversine (linha reta, não rota de trânsito).
 */
export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// ── ViaCEP: CEP → Endereço (API gratuita brasileira) ──

/**
 * Busca o endereço completo a partir de um CEP brasileiro.
 * API gratuita, sem necessidade de chave.
 *
 * @returns null se o CEP for inválido ou não encontrado.
 */
export async function fetchAddressFromCEP(cep: string): Promise<ViaCEPResult | null> {
  const cleanCep = cep.replace(/\D/g, '');

  if (cleanCep.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await res.json();

    if (data.erro) return null;

    return {
      cep: data.cep,
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || '',
      formatted: [data.logradouro, data.bairro, `${data.localidade} - ${data.uf}`]
        .filter(Boolean)
        .join(', '),
    };
  } catch {
    return null;
  }
}

// ── Nominatim (OpenStreetMap): Endereço → Coordenadas (Geocoding gratuito) ──

/**
 * Geocodifica um endereço em coordenadas usando a API Nominatim (OpenStreetMap).
 * Totalmente gratuita. Limite: 1 req/segundo (respeitado pelo uso normal).
 *
 * @returns null se não conseguir geocodificar.
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  if (!address.trim()) return null;

  try {
    const encoded = encodeURIComponent(address);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=br&limit=1`,
      {
        headers: {
          // Nominatim exige um User-Agent válido (política de uso)
          'User-Agent': 'MeuEcommerce/1.0',
        },
      }
    );

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}
