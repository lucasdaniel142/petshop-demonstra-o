export const PRODUCT_CATEGORIES = [
  'Rações',
  'Medicamentos',
  'Acessórios',
  'Banho e Tosa',
] as const;

export const CATEGORY_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'all', label: '🛒 Todos' },
  { id: 'racoes', label: '� Rações' },
  { id: 'medicamentos', label: '💊 Medicamentos' },
  { id: 'acessorios', label: '� Acessórios' },
  { id: 'banho_tosa', label: '🛁 Banho e Tosa' },
];

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  racoes: ['rações', 'racoes', 'racao', 'alimento'],
  medicamentos: ['medicamentos', 'remédios', 'vermífugo', 'antipulgas'],
  acessorios: ['acessórios', 'acessorios', 'coleira', 'brinquedo', 'cama', 'comedouro', 'bebedouro'],
  banho_tosa: ['banho', 'tosa', 'banho e tosa', 'higiênica'],
};
