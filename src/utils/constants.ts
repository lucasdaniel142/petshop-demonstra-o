// src/utils/constants.ts
// Centraliza todas as constantes de negócio do domínio.
// Antes: STORES, CATEGORY_OPTIONS e CATEGORY_KEYWORDS viviam em Home.tsx
// e precisariam ser copiadas para qualquer outro componente que as precisasse.

import type { StoreId, StoreOption } from '../types';

export const STORES: ReadonlyArray<StoreOption> = [
  { id: 'benedito_bentes', label: 'Benedito Bentes' },
  { id: 'vergel',          label: 'Vergel do Lago'  },
  { id: 'salvador_lyra',   label: 'Salvador Lyra'   },
] as const;

export const STORE_IDS = STORES.map((s) => s.id) as StoreId[];

export const ADMIN_STORES = [
  { id: 'visao_geral',    name: 'Visão Geral (Apenas Leitura)' },
  { id: 'benedito_bentes', name: 'Benedito Bentes' },
  { id: 'vergel',          name: 'Vergel do Lago'  },
  { id: 'salvador_lyra',   name: 'Salvador Lyra'   },
] as const;

export const ADMIN_UNIDADES = [
  { id: 'geral',           name: 'Administrativo Geral' },
  { id: 'benedito_bentes', name: 'Benedito Bentes'      },
  { id: 'vergel',          name: 'Vergel do Lago'       },
  { id: 'salvador_lyra',   name: 'Salvador Lyra'        },
] as const;

export const CATEGORY_OPTIONS = [
  { id: 'all',                  label: 'Todos'                  },
  { id: 'ofertas',              label: '🔥 Ofertas'             },
  { id: 'mercearia',            label: '🥫 Mercearia'           },
  { id: 'bebidas',              label: '🥤 Bebidas'             },
  { id: 'hortifruti',           label: '🍎 Hortifruti'          },
  { id: 'acougue-peixaria',     label: '🥩 Açougue e Peixaria'  },
  { id: 'padaria-confeitaria',  label: '🍞 Padaria e Confeitaria' },
  { id: 'limpeza',              label: '🧼 Limpeza'             },
  { id: 'higiene-pessoal',      label: '🧴 Higiene Pessoal'     },
  { id: 'congelados',           label: '❄️ Congelados'          },
] as const;

export const PRODUCT_CATEGORIES = [
  'Mercearia',
  'Bebidas',
  'Hortifruti',
  'Açougue e Peixaria',
  'Padaria e Confeitaria',
  'Limpeza',
  'Higiene Pessoal',
  'Congelados',
] as const;

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  ofertas:               ['oferta', 'ofertas', 'promoção', 'promo', 'desconto'],
  mercearia:             ['mercearia', 'grocery', 'mercado', 'supermercado'],
  bebidas:               ['bebida', 'bebidas', 'beverage', 'refrigerante', 'suco', 'cerveja', 'vinho'],
  hortifruti:            ['hortifruti', 'fruta', 'frutas', 'verdura', 'verduras', 'legume', 'legumes'],
  'acougue-peixaria':    ['acougue', 'açougue', 'peixaria', 'peixe', 'frutos do mar', 'marisco', 'salmão'],
  'padaria-confeitaria': ['padaria', 'pão', 'pães', 'bakery', 'confeitaria', 'doce', 'bolo', 'torta'],
  limpeza:               ['limpeza', 'detergente', 'sabão', 'desinfetante'],
  'higiene-pessoal':     ['higiene', 'shampoo', 'condicionador', 'sabonete', 'pasta de dente'],
  congelados:            ['congelado', 'congelados', 'frozen', 'freezer'],
};
