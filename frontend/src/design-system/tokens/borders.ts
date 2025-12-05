/**
 * Border Tokens
 * Border radius and width definitions
 */

/**
 * Border radius scale
 */
export const borderRadius = {
  none: '0',
  sm: '0.125rem', // 2px
  default: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const;

/**
 * Border width scale
 */
export const borderWidth = {
  0: '0',
  1: '1px',
  2: '2px',
  4: '4px',
  8: '8px',
} as const;

/**
 * Border style
 */
export const borderStyle = {
  none: 'none',
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
  double: 'double',
} as const;

/**
 * Ring width (focus outlines)
 */
export const ringWidth = {
  0: '0',
  1: '1px',
  2: '2px',
  4: '4px',
  8: '8px',
  default: '3px',
} as const;

/**
 * Ring offset
 */
export const ringOffset = {
  0: '0',
  1: '1px',
  2: '2px',
  4: '4px',
  8: '8px',
} as const;

/**
 * Common border presets
 */
export const borderPresets = {
  // Standard borders
  default: '1px solid var(--border)',
  strong: '1px solid var(--border-strong)',
  subtle: '1px solid var(--color-border-subtle)',

  // Colored borders
  primary: '1px solid var(--color-primary)',
  error: '1px solid var(--color-error-border)',

  // Focus borders
  focus: '1px solid var(--input-focus-border)',

  // Transparent
  transparent: '1px solid transparent',
} as const;

/**
 * Combined borders export
 */
export const borders = {
  radius: borderRadius,
  width: borderWidth,
  style: borderStyle,
  ring: ringWidth,
  ringOffset,
  presets: borderPresets,
} as const;

export type BorderRadiusKey = keyof typeof borderRadius;
export type BorderWidthKey = keyof typeof borderWidth;
export type BorderStyleKey = keyof typeof borderStyle;
export type BorderPresetKey = keyof typeof borderPresets;
