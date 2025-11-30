/**
 * Theme Color Utilities
 * Shared utility for caching and resetting CSS variable colors
 * Used by theme store and dashboard components
 */

// Cache theme colors - read once instead of on every render
let cachedThemeColors: string[] | null = null;
let cachedRagChartColor: string | null = null;
let cachedRegularChartColor: string | null = null;
let cachedImageGenChartColor: string | null = null;

/**
 * Get theme colors from CSS variables (cached)
 */
export const getThemeColors = (): string[] => {
  if (cachedThemeColors) return cachedThemeColors;

  const style = getComputedStyle(document.documentElement);
  cachedThemeColors = [
    style.getPropertyValue('--color-brand-600').trim() || '#36693d', // Primary green
    style.getPropertyValue('--color-brand-500').trim() || '#4a7d52', // Medium green
    style.getPropertyValue('--color-brand-700').trim() || '#2f5638', // Medium-dark green
    style.getPropertyValue('--color-brand-400').trim() || '#5e9167', // Medium-light green
    style.getPropertyValue('--color-brand-300').trim() || '#7aa884', // Light green
    style.getPropertyValue('--color-brand-800').trim() || '#25422b', // Dark green
  ];
  return cachedThemeColors;
};

/**
 * Get RAG chart color from CSS variables (cached)
 */
export const getRagChartColor = (): string => {
  if (cachedRagChartColor) return cachedRagChartColor;

  const style = getComputedStyle(document.documentElement);
  cachedRagChartColor = style.getPropertyValue('--color-brand-600').trim() || '#36693d';
  return cachedRagChartColor;
};

/**
 * Get regular chart color from CSS variables (cached)
 */
export const getRegularChartColor = (): string => {
  if (cachedRegularChartColor) return cachedRegularChartColor;

  const style = getComputedStyle(document.documentElement);
  cachedRegularChartColor = style.getPropertyValue('--color-brand-400').trim() || '#5e9167';
  return cachedRegularChartColor;
};

/**
 * Get image generation chart color from CSS variables (cached)
 * Uses a soft muted green that blends with the theme
 */
export const getImageGenChartColor = (): string => {
  if (cachedImageGenChartColor) return cachedImageGenChartColor;

  const style = getComputedStyle(document.documentElement);
  cachedImageGenChartColor = style.getPropertyValue('--color-image-gen').trim() || '#a3c4ab';
  return cachedImageGenChartColor;
};

/**
 * Reset color cache when theme changes
 * Should be called when the theme is changed
 */
export const resetThemeColorCache = (): void => {
  cachedThemeColors = null;
  cachedRagChartColor = null;
  cachedRegularChartColor = null;
  cachedImageGenChartColor = null;
};

