// src/utils/deliveryFee.ts
// ============================================================
// Mapeamento de taxas de entrega por loja.
// Os valores são lidos das variáveis de ambiente VITE_TAXA_*
// definidas no .env.local. Se não configuradas, o fallback é 0 (grátis).
// ============================================================

import type { StoreId } from '../types';

export const DELIVERY_FEES: Record<StoreId, number> = {
  benedito_bentes: Number(import.meta.env.VITE_TAXA_BENEDITO_BENTES) || 0,
  // vergel:          Number(import.meta.env.VITE_TAXA_VERGEL) || 0,
  // salvador_lyra:   Number(import.meta.env.VITE_TAXA_SALVADOR_LYRA) || 0,
};

/**
 * Retorna a taxa de entrega para a loja informada.
 * Se o ID não for encontrado, retorna 0.
 */
export const getDeliveryFee = (storeId: StoreId): number =>
  DELIVERY_FEES[storeId] ?? 0;
