// src/utils/placeholderImage.ts
// ============================================================
// Imagem placeholder para produtos sem foto.
// Usa um SVG inline em data URI — zero dependências externas.
// ============================================================

/**
 * Gera um placeholder SVG como data URI.
 * Usado quando o produto não tem imagem cadastrada.
 */
export const DEFAULT_PLACEHOLDER_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
      <rect width="200" height="200" rx="12" fill="#F0F2F2"/>
      <text x="100" y="90" text-anchor="middle" font-family="sans-serif" font-size="48" fill="#CBD5E1">📦</text>
      <text x="100" y="130" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#94A3B8">Sem imagem</text>
    </svg>`
  );

/**
 * Retorna a URL da imagem ou o placeholder se vazia.
 */
export function getPlaceholderImage(imageUrl: string | undefined | null): string {
  return imageUrl?.trim() || DEFAULT_PLACEHOLDER_IMAGE;
}
