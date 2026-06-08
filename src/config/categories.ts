// src/config/categories.ts
// ============================================================
// Configuração centralizada de categorias de produtos.
// Para personalizar para um novo cliente, edite apenas este
// arquivo — nenhum outro arquivo precisa ser alterado.
// ============================================================

// ── Categorias de produtos (ProductManager + filtro) ──
export const PRODUCT_CATEGORIES = [
  'Rações',
  'Medicamentos',
  'Acessórios',
  'Banho e Tosa',
  'Ofertas',
] as const;

// ── Categorias para a barra de navegação (Home) ──
export const CATEGORY_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'all', label: '🛒 Todos' },
  { id: 'ofertas', label: '🏷️ Ofertas' },
  { id: 'racoes', label: '🍖 Rações' },
  { id: 'medicamentos', label: '💊 Medicamentos' },
  { id: 'acessorios', label: '🎾 Acessórios' },
  { id: 'banho_tosa', label: '🛁 Banho e Tosa' },
];

// ── Keywords para filtrar categorias (matcheia nome da categoria do Firestore) ──
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  racoes: ['rações', 'racoes', 'racao', 'alimento'],
  medicamentos: ['medicamentos', 'remédios', 'vermífugo', 'antipulgas'],
  acessorios: ['acessórios', 'acessorios', 'coleira', 'brinquedo', 'cama', 'comedouro', 'bebedouro'],
  banho_tosa: ['banho', 'tosa', 'banho e tosa', 'higiênica'],
};
