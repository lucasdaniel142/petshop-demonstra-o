// ============================================================
// ARQUIVO: src/utils/placeholderImage.ts
// REVISÃO: Enterprise Grade
// ============================================================
//
// PROBLEMAS ENCONTRADOS E CORRIGIDOS:
//
// 1. [BUG] FUNÇÃO `getPlaceholderImage` NÃO EXPORTADA
//    PROBLEMA: O PriceManager (versão original) chama `getPlaceholderImage()`
//    mas o arquivo só exporta a constante `DEFAULT_PLACEHOLDER_IMAGE`.
//    Isso causaria um erro de "getPlaceholderImage is not a function".
//    SOLUÇÃO: Exportar a função como alias da constante para compatibilidade.
//
// 2. [MELHORIA] SVG MELHORADO COM ÍCONE
//    O SVG placeholder agora inclui um ícone de câmera além do texto,
//    ficando mais profissional e reconhecível.
//
// ============================================================

// Placeholder SVG inline — sem dependência de URL externa (sem CDN, sem Unsplash)
export const DEFAULT_PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="100%" height="100%" fill="#F3F4F6"/>
  <circle cx="200" cy="130" r="36" fill="none" stroke="#D1D5DB" stroke-width="3"/>
  <circle cx="200" cy="130" r="22" fill="#D1D5DB"/>
  <rect x="170" y="108" width="60" height="8" rx="4" fill="#9CA3AF"/>
  <text x="50%" y="195" dominant-baseline="middle" text-anchor="middle"
    fill="#9CA3AF" font-family="Inter, ui-sans-serif, system-ui, sans-serif"
    font-size="16" font-weight="500">
    Sem imagem
  </text>
</svg>
`)}`;

// FIX #1: Alias como função para compatibilidade com chamadas existentes
export const getPlaceholderImage = (): string => DEFAULT_PLACEHOLDER_IMAGE;
