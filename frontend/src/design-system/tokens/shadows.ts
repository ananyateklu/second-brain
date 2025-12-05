/**
 * Shadow Tokens
 * Maps to CSS custom properties defined in globals.css
 */

/**
 * Box shadow scale
 */
export const shadows = {
  none: 'none',
  sm: 'var(--shadow-sm)', // 0 1px 3px 0 rgba(0, 0, 0, 0.1)
  md: 'var(--shadow-md)', // 0 4px 6px -1px rgba(0, 0, 0, 0.1)
  lg: 'var(--shadow-lg)', // 0 10px 15px -3px rgba(0, 0, 0, 0.1)
  xl: 'var(--shadow-xl)', // 0 20px 25px -5px rgba(0, 0, 0, 0.1)
  '2xl': 'var(--shadow-2xl)', // 0 25px 50px -12px rgba(0, 0, 0, 0.25)
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
} as const;

/**
 * Card-specific shadows
 */
export const cardShadows = {
  base: 'var(--shadow-card)',
  hover: 'var(--shadow-card-hover)',
} as const;

/**
 * Button shadows (from button colors)
 */
export const buttonShadows = {
  primary: 'var(--btn-primary-shadow)',
  primaryHover: 'var(--btn-primary-hover-shadow)',
  secondary: 'var(--btn-secondary-shadow)',
  secondaryHover: 'var(--btn-secondary-hover-shadow)',
} as const;

/**
 * Focus ring shadows
 */
export const focusShadows = {
  ring: '0 0 0 3px var(--input-focus-ring)',
  ringInset: 'inset 0 0 0 2px var(--input-focus-border)',
} as const;

/**
 * Glassmorphism shadows
 */
export const glassShadows = {
  base: 'var(--glass-shadow)',
  focus: 'var(--glass-shadow-focus)',
} as const;

/**
 * Combined shadows export
 */
export const allShadows = {
  box: shadows,
  card: cardShadows,
  button: buttonShadows,
  focus: focusShadows,
  glass: glassShadows,
} as const;

export type ShadowKey = keyof typeof shadows;
export type CardShadowKey = keyof typeof cardShadows;
export type ButtonShadowKey = keyof typeof buttonShadows;
