// src/shared/config/stores.ts
// ============================================================
// White Label — filiais lidas 100% de variáveis de ambiente.
//
// Configure no .env.local (ou Vercel) assim:
//
//   VITE_STORE_BRANCHES=filial_1:Filial Centro,filial_2:Filial Norte
//   VITE_WHATSAPP_filial_1=5511912345678
//   VITE_WHATSAPP_filial_2=5511987654321
//
// Para uma loja com filial única, defina apenas:
//   VITE_STORE_BRANCHES=principal:Loja Principal
//   VITE_WHATSAPP_principal=5511912345678
// ============================================================

import type { StoreId, StoreOption } from '../types';

/** Parseia VITE_STORE_BRANCHES="id:Label,id2:Label 2" */
function parseBranches(): StoreOption[] {
  const raw = import.meta.env.VITE_STORE_BRANCHES ?? '';
  if (!raw) {
    // fallback de desenvolvimento: uma única loja genérica
    return [{ id: 'principal', label: 'Loja Principal' }];
  }
  return raw.split(',').map((entry: string) => {
    const [id, ...labelParts] = entry.trim().split(':');
    return { id: id.trim(), label: labelParts.join(':').trim() || id.trim() };
  });
}

export const STORES: ReadonlyArray<StoreOption> = parseBranches();
export const STORE_IDS: StoreId[] = STORES.map((s) => s.id);

export const ADMIN_STORES: ReadonlyArray<{ id: StoreId; label: string }> = STORES;

export const ADMIN_UNIDADES: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'geral', name: 'Administrativo Geral' },
  ...STORES.map((s) => ({ id: s.id, name: s.label })),
];

const getWhatsAppNumber = (storeId: string, storeName: string): string => {
  const envKey = `VITE_WHATSAPP_${storeId.toUpperCase()}`;
  const value = import.meta.env[envKey] ?? '';
  if (!value && import.meta.env.DEV) {
    console.warn(
      `[WhatsApp] Número da loja "${storeName}" não configurado.\n` +
      `Adicione "${envKey}=55XXXXXXXXXXX" ao arquivo .env.local e reinicie o servidor.`
    );
  }
  return value;
};

export const STORE_WHATSAPP_NUMBERS: Record<StoreId, string> = Object.fromEntries(
  STORES.map((s) => [s.id, getWhatsAppNumber(s.id, s.label)])
);
