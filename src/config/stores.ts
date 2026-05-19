// src/config/stores.ts
// ============================================================
// Configuração centralizada de lojas (White Label).
// Para adicionar uma nova unidade, basta descomentar/adicionar
// uma entrada aqui — o restante do sistema se adapta.
// ============================================================

import type { StoreId, StoreOption } from '../shared/types';

// ── IDs das lojas (devem corresponder ao type StoreId) ──
export const STORE_IDS: StoreId[] = ['benedito_bentes', 'salvador_lyra', 'vergel_do_lago'];

// ── Lojas disponíveis na vitrine (header) ──
export const STORES: ReadonlyArray<StoreOption> = [
  { id: 'benedito_bentes', label: 'Benedito Bentes' },
  { id: 'salvador_lyra', label: 'Salvador Lyra' },
  { id: 'vergel_do_lago', label: 'Vergel do Lago' },
] as const;

// ── Lojas no painel admin (PriceManager) ──
export const ADMIN_STORES: ReadonlyArray<{ id: StoreId; label: string }> = [
  { id: 'benedito_bentes', label: 'Benedito Bentes' },
  { id: 'salvador_lyra', label: 'Salvador Lyra' },
  { id: 'vergel_do_lago', label: 'Vergel do Lago' },
];

// ── Unidades no painel admin (TeamManager) ──
export const ADMIN_UNIDADES: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'geral', name: 'Administrativo Geral' },
  { id: 'benedito_bentes', name: 'Benedito Bentes' },
  { id: 'salvador_lyra', name: 'Salvador Lyra' },
  { id: 'vergel_do_lago', name: 'Vergel do Lago' },
];

// ── WhatsApp por Loja ──
// Formato: código do país (55) + DDD + número, sem espaços.
const getWhatsAppNumber = (envKey: string, storeName: string): string => {
  const value = import.meta.env[envKey] ?? '';
  if (!value && import.meta.env.DEV) {
    console.warn(
      `[WhatsApp] Número da loja "${storeName}" não configurado.\n` +
      `Adicione "${envKey}=5582XXXXXXXXX" ao arquivo .env.local e reinicie o servidor.`
    );
  }
  return value;
};

export const STORE_WHATSAPP_NUMBERS: Record<StoreId, string> = {
  benedito_bentes: getWhatsAppNumber('VITE_WHATSAPP_BENEDITO_BENTES', 'Benedito Bentes'),
  salvador_lyra: getWhatsAppNumber('VITE_WHATSAPP_SALVADOR_LYRA', 'Salvador Lyra'),
  vergel_do_lago: getWhatsAppNumber('VITE_WHATSAPP_VERGEL_DO_LAGO', 'Vergel do Lago'),
};
