/**
 * Spacing Tokens
 * Maps to CSS custom properties defined in index.css
 */

/**
 * Base spacing scale in rem units
 */
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: 'var(--spacing-1)', // 0.25rem / 4px
  1.5: '0.375rem', // 6px
  2: 'var(--spacing-2)', // 0.5rem / 8px
  2.5: '0.625rem', // 10px
  3: 'var(--spacing-3)', // 0.75rem / 12px
  3.5: '0.875rem', // 14px
  4: 'var(--spacing-4)', // 1rem / 16px
  5: '1.25rem', // 20px
  6: 'var(--spacing-6)', // 1.5rem / 24px
  7: '1.75rem', // 28px
  8: 'var(--spacing-8)', // 2rem / 32px
  9: '2.25rem', // 36px
  10: 'var(--spacing-10)', // 2.5rem / 40px
  11: '2.75rem', // 44px
  12: 'var(--spacing-12)', // 3rem / 48px
  14: '3.5rem', // 56px
  16: 'var(--spacing-16)', // 4rem / 64px
  20: 'var(--spacing-20)', // 5rem / 80px
  24: 'var(--spacing-24)', // 6rem / 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
  36: '9rem', // 144px
  40: '10rem', // 160px
  44: '11rem', // 176px
  48: '12rem', // 192px
  52: '13rem', // 208px
  56: '14rem', // 224px
  60: '15rem', // 240px
  64: '16rem', // 256px
  72: '18rem', // 288px
  80: '20rem', // 320px
  96: '24rem', // 384px
} as const;

/**
 * App-specific layout spacing
 */
export const layoutSpacing = {
  pageX: 'var(--spacing-page-x)',
  sectionY: 'var(--spacing-section-y)',
  headerOffsetTop: 'var(--header-offset-top)',
  headerHeight: 'var(--header-height)',
  headerHeightSm: 'var(--header-height-sm)',
} as const;

/**
 * Gap sizes for flex/grid layouts
 */
export const gap = {
  none: '0',
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
  '2xl': spacing[12],
  '3xl': spacing[16],
} as const;

/**
 * Padding presets
 */
export const padding = {
  none: '0',
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
  '2xl': spacing[12],
} as const;

/**
 * Margin presets
 */
export const margin = {
  none: '0',
  auto: 'auto',
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
  '2xl': spacing[12],
} as const;

export type SpacingKey = keyof typeof spacing;
export type GapKey = keyof typeof gap;
export type PaddingKey = keyof typeof padding;
export type MarginKey = keyof typeof margin;
