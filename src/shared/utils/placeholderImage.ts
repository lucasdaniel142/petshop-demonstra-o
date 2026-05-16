export const DEFAULT_PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200';

export function getPlaceholderImage(url: string | undefined): string {
  if (!url || url.trim() === '') {
    return DEFAULT_PLACEHOLDER_IMAGE;
  }
  return url;
}
