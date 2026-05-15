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

export const CATEGORY_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'all', label: '🛒 Todos' },
  { id: 'ofertas', label: '🏷️ Ofertas' },
  { id: 'mercearia', label: '🥫 Mercearia' },
  { id: 'bebidas', label: '🥤 Bebidas' },
  { id: 'hortifruti', label: '🍎 Hortifruti' },
  { id: 'carnes', label: '🥩 Carnes' },
  { id: 'laticinios', label: '🧀 Laticínios' },
  { id: 'padaria', label: '🥖 Padaria' },
  { id: 'limpeza', label: '🧹 Limpeza' },
  { id: 'higiene', label: '🧴 Higiene Pessoal' },
  { id: 'congelados', label: '🧊 Congelados' },
];

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
