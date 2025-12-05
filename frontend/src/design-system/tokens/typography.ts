/**
 * Typography Tokens
 * Maps to CSS custom properties defined in index.css
 */

/**
 * Font size scale
 */
export const fontSize = {
  xs: 'var(--text-xs)', // 0.75rem / 12px
  sm: 'var(--text-sm)', // 0.875rem / 14px
  base: 'var(--text-base)', // 1rem / 16px
  lg: 'var(--text-lg)', // 1.125rem / 18px
  xl: 'var(--text-xl)', // 1.25rem / 20px
  '2xl': 'var(--text-2xl)', // clamp(1.5rem, 1.25rem + 1vw, 1.875rem)
  '3xl': 'var(--text-3xl)', // clamp(1.875rem, 1.5rem + 1.5vw, 2.25rem)
  '4xl': 'var(--text-4xl)', // clamp(2.25rem, 1.75rem + 2vw, 3rem)
  '5xl': 'var(--text-5xl)', // clamp(2.75rem, 2rem + 3vw, 3.75rem)
} as const;

/**
 * Line height scale
 */
export const lineHeight = {
  none: 'var(--leading-none)', // 1
  tight: 'var(--leading-tight)', // 1.2
  snug: '1.375',
  normal: 'var(--leading-normal)', // 1.5
  relaxed: 'var(--leading-relaxed)', // 1.7
  loose: '2',
} as const;

/**
 * Font weight scale
 */
export const fontWeight = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

/**
 * Font family stacks
 */
export const fontFamily = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
} as const;

/**
 * Letter spacing (tracking)
 */
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

/**
 * Text decoration
 */
export const textDecoration = {
  none: 'none',
  underline: 'underline',
  overline: 'overline',
  lineThrough: 'line-through',
} as const;

/**
 * Text transform
 */
export const textTransform = {
  none: 'none',
  capitalize: 'capitalize',
  uppercase: 'uppercase',
  lowercase: 'lowercase',
} as const;

/**
 * Predefined text styles
 */
export const textStyles = {
  // Headings
  h1: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
  },
  h4: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
  },
  h5: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
  },
  h6: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
  },
  // Body text
  bodyLg: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.relaxed,
  },
  body: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  bodySm: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  // Labels & captions
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
  },
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  // Code
  code: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.mono,
    lineHeight: lineHeight.normal,
  },
} as const;

/**
 * Combined typography export
 */
export const typography = {
  fontSize,
  lineHeight,
  fontWeight,
  fontFamily,
  letterSpacing,
  textDecoration,
  textTransform,
  textStyles,
} as const;

export type FontSizeKey = keyof typeof fontSize;
export type LineHeightKey = keyof typeof lineHeight;
export type FontWeightKey = keyof typeof fontWeight;
export type FontFamilyKey = keyof typeof fontFamily;
export type TextStyleKey = keyof typeof textStyles;
