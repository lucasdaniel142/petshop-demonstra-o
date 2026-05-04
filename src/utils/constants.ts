// src/utils/constants.ts
// ============================================================
// Re-exports centralizados para backward compatibility.
//
// NOTA: Todas as configurações foram movidas para src/config/.
// Este arquivo existe apenas para não quebrar imports existentes.
// Em novos arquivos, importe diretamente de:
//   - '../config/stores'
//   - '../config/categories'
// ============================================================

// ── Lojas ──
export { STORE_IDS, STORES, ADMIN_STORES, ADMIN_UNIDADES } from '../config/stores';

// ── Categorias ──
export { PRODUCT_CATEGORIES, CATEGORY_OPTIONS, CATEGORY_KEYWORDS } from '../config/categories';
