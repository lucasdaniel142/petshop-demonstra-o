// src/utils/constants.ts
// ============================================================
// Constantes centralizadas do sistema.
// Toda constante de negócio (lojas, categorias, unidades)
// deve ficar aqui, nunca espalhada pelos componentes.
// ============================================================

import type { StoreId, StoreOption } from '../types';

// ── IDs das lojas (devem corresponder ao type StoreId) ──
export const STORE_IDS: StoreId[] = ['benedito_bentes'];

// ── Lojas disponíveis na vitrine (header) ──
export const STORES: ReadonlyArray<StoreOption> = [
  { id: 'benedito_bentes', label: 'Benedito Bentes' },
  // Adicione novas lojas aqui ao expandir:
  // { id: 'vergel', label: 'Vergel do Lago' },
  // { id: 'salvador_lyra', label: 'Salvador Lyra' },
] as const;

// ── Lojas no painel admin (PriceManager) ──
export const ADMIN_STORES: ReadonlyArray<{ id: StoreId; label: string }> = [
  { id: 'benedito_bentes', label: 'Benedito Bentes' },
];

// ── Unidades no painel admin (TeamManager) ──
export const ADMIN_UNIDADES: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'geral', name: 'Administrativo Geral' },
  { id: 'benedito_bentes', name: 'Benedito Bentes' },
  // { id: 'vergel', name: 'Vergel do Lago' },
  // { id: 'salvador_lyra', name: 'Salvador Lyra' },
];

// ── Categorias de produtos (ProductManager + filtro) ──
export const PRODUCT_CATEGORIES = [
  'Mercearia',
  'Bebidas',
  'Hortifruti',
  'Carnes',
  'Laticínios',
  'Padaria',
  'Limpeza',
  'Higiene Pessoal',
  'Congelados',
  'Ofertas',
] as const;

// ── Categorias para a barra de navegação (Home) ──
export const CATEGORY_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'ofertas', label: 'Ofertas' },
  { id: 'mercearia', label: 'Mercearia' },
  { id: 'bebidas', label: 'Bebidas' },
  { id: 'hortifruti', label: 'Hortifruti' },
  { id: 'carnes', label: '🥩 Carnes' },
  { id: 'laticinios', label: '🧀 Laticínios' },
  { id: 'padaria', label: '🥖 Padaria' },
  { id: 'limpeza', label: '🧹 Limpeza' },
  { id: 'higiene', label: '🧴 Higiene Pessoal' },
  { id: 'congelados', label: '🧊 Congelados' },
];

// ── Keywords para filtrar categorias (matcheia nome da categoria do Firestore) ──
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  mercearia: ['mercearia', 'grãos', 'cereais', 'enlatados'],
  bebidas: ['bebidas', 'refrigerante', 'suco', 'água'],
  hortifruti: ['hortifruti', 'frutas', 'verduras', 'legumes'],
  carnes: ['carnes', 'açougue', 'frango', 'peixe'],
  laticinios: ['laticínios', 'laticinios', 'queijo', 'leite', 'iogurte'],
  padaria: ['padaria', 'pão', 'bolo', 'confeitaria'],
  limpeza: ['limpeza', 'detergente', 'desinfetante'],
  higiene: ['higiene', 'pessoal', 'shampoo', 'sabonete'],
  congelados: ['congelados', 'frozen', 'sorvete'],
};
