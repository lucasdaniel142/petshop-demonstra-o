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

export interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

/**
 * Calcula a distância em KM entre dois pontos usando a fórmula de Haversine.
 * Precisão suficiente para distâncias urbanas (erro < 0.5%).
 */
export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371; // Raio da Terra em KM
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Busca endereço completo a partir do CEP usando a API ViaCEP.
 * @param cep - CEP com 8 dígitos (sem máscara)
 * @returns Dados do endereço ou null se não encontrado
 */
export async function fetchAddressFromCEP(cep: string): Promise<ViaCEPResponse | null> {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) return null;

    const data: ViaCEPResponse = await response.json();
    if (data.erro) return null;

    return data;
  } catch {
    return null;
  }
}

/**
 * Converte um endereço de texto em coordenadas (lat/lng)
 * usando a API Nominatim do OpenStreetMap.
 *
 * IMPORTANTE: Nominatim tem rate limit de 1 request/segundo.
 * O debounce no CartDrawer já garante isso.
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
      countrycodes: 'br',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          'User-Agent': 'EcommerceWhiteLabel/1.0',
        },
      }
    );

    if (!response.ok) return null;

    const results = await response.json();
    if (!results || results.length === 0) return null;

    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
    };
  } catch {
    return null;
  }
}
