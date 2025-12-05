/**
 * Color Tokens
 * Maps to CSS custom properties defined in globals.css
 */

/**
 * Brand color palette based on #36693d
 */
export const brandColors = {
  50: 'var(--color-brand-50)',
  100: 'var(--color-brand-100)',
  200: 'var(--color-brand-200)',
  300: 'var(--color-brand-300)',
  400: 'var(--color-brand-400)',
  500: 'var(--color-brand-500)',
  600: 'var(--color-brand-600)',
  700: 'var(--color-brand-700)',
  800: 'var(--color-brand-800)',
  900: 'var(--color-brand-900)',
  950: 'var(--color-brand-950)',
} as const;

/**
 * Blue theme color palette
 */
export const blueColors = {
  50: 'var(--color-blue-50)',
  100: 'var(--color-blue-100)',
  200: 'var(--color-blue-200)',
  300: 'var(--color-blue-300)',
  400: 'var(--color-blue-400)',
  500: 'var(--color-blue-500)',
  600: 'var(--color-blue-600)',
  700: 'var(--color-blue-700)',
  800: 'var(--color-blue-800)',
  900: 'var(--color-blue-900)',
  950: 'var(--color-blue-950)',
} as const;

/**
 * Semantic color tokens - theme-aware
 */
export const semanticColors = {
  // Primary
  primary: 'var(--color-primary)',
  primaryAlpha: 'var(--color-primary-alpha)',

  // Backgrounds
  background: 'var(--background)',
  backgroundSolid: 'var(--background-solid)',
  pageBackground: 'var(--page-background)',

  // Surfaces
  surface: 'var(--surface)',
  surfaceSolid: 'var(--surface-solid)',
  surfaceElevated: 'var(--surface-elevated)',
  surfaceElevatedSolid: 'var(--surface-elevated-solid)',
  surfaceCard: 'var(--surface-card)',
  surfaceCardSolid: 'var(--surface-card-solid)',

  // Borders
  border: 'var(--border)',
  borderStrong: 'var(--border-strong)',
  borderSubtle: 'var(--color-border-subtle)',

  // Text
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textTertiary: 'var(--text-tertiary)',
  textMuted: 'var(--color-text-muted)',
  foreground: 'var(--foreground)',

  // Links
  link: 'var(--link)',
  linkHover: 'var(--link-hover)',

  // Modal
  modalOverlay: 'var(--modal-overlay)',
} as const;

/**
 * Error/danger colors
 */
export const errorColors = {
  base: 'var(--color-error)',
  light: 'var(--color-error-light)',
  border: 'var(--color-error-border)',
  text: 'var(--color-error-text)',
  textLight: 'var(--color-error-text-light)',
} as const;

/**
 * Accent colors for features
 */
export const accentColors = {
  // Notes capability (green)
  notes: {
    base: 'var(--color-notes)',
    alpha: 'var(--color-notes-alpha)',
    text: 'var(--color-notes-text)',
    border: 'var(--color-notes-border)',
    dot: 'var(--color-notes-dot)',
  },
  // Web search (blue)
  blue: {
    base: 'var(--color-accent-blue)',
    alpha: 'var(--color-accent-blue-alpha)',
    text: 'var(--color-accent-blue-text)',
    border: 'var(--color-accent-blue-border)',
    dot: 'var(--color-accent-blue-dot)',
  },
  // Image generation (purple)
  purple: {
    base: 'var(--color-accent-purple)',
    alpha: 'var(--color-accent-purple-alpha)',
    text: 'var(--color-accent-purple-text)',
    border: 'var(--color-accent-purple-border)',
    dot: 'var(--color-accent-purple-dot)',
  },
  // Image generation (legacy green)
  imageGen: {
    base: 'var(--color-image-gen)',
    alpha: 'var(--color-image-gen-alpha)',
    text: 'var(--color-image-gen-text)',
    border: 'var(--color-image-gen-border)',
  },
} as const;

/**
 * Button colors
 */
export const buttonColors = {
  primary: {
    bg: 'var(--btn-primary-bg)',
    hoverBg: 'var(--btn-primary-hover-bg)',
    text: 'var(--btn-primary-text)',
    border: 'var(--btn-primary-border)',
    hoverBorder: 'var(--btn-primary-hover-border)',
    shadow: 'var(--btn-primary-shadow)',
    hoverShadow: 'var(--btn-primary-hover-shadow)',
  },
  secondary: {
    text: 'var(--btn-secondary-text)',
    border: 'var(--btn-secondary-border)',
    hoverBg: 'var(--btn-secondary-hover-bg)',
    hoverText: 'var(--btn-secondary-hover-text)',
    hoverBorder: 'var(--btn-secondary-hover-border)',
    shadow: 'var(--btn-secondary-shadow)',
    hoverShadow: 'var(--btn-secondary-hover-shadow)',
  },
} as const;

/**
 * Icon colors
 */
export const iconColors = {
  bgLight: 'var(--icon-bg-light)',
  bgDark: 'var(--icon-bg-dark)',
  textLight: 'var(--icon-text-light)',
  textDark: 'var(--icon-text-dark)',
  hoverBgLight: 'var(--icon-hover-bg-light)',
  hoverBgDark: 'var(--icon-hover-bg-dark)',
  hoverTextLight: 'var(--icon-hover-text-light)',
  hoverTextDark: 'var(--icon-hover-text-dark)',
} as const;

/**
 * Gradient colors
 */
export const gradientColors = {
  brandStart: 'var(--gradient-brand-start)',
  brandEnd: 'var(--gradient-brand-end)',
  brandStartDark: 'var(--gradient-brand-start-dark)',
  brandEndDark: 'var(--gradient-brand-end-dark)',
} as const;

/**
 * Input/form colors
 */
export const inputColors = {
  focusBorder: 'var(--input-focus-border)',
  focusRing: 'var(--input-focus-ring)',
} as const;

/**
 * Smart prompt chip colors
 */
export const promptChipColors = {
  bg: 'var(--prompt-chip-bg)',
  text: 'var(--prompt-chip-text)',
  border: 'var(--prompt-chip-border)',
  hoverBg: 'var(--prompt-chip-hover-bg)',
} as const;

/**
 * Glassmorphism colors
 */
export const glassColors = {
  bg: 'var(--glass-bg)',
  border: 'var(--glass-border)',
  borderFocus: 'var(--glass-border-focus)',
  shadow: 'var(--glass-shadow)',
  shadowFocus: 'var(--glass-shadow-focus)',
  blur: 'var(--glass-blur)',
} as const;

/**
 * Combined colors export
 */
export const colors = {
  brand: brandColors,
  blue: blueColors,
  semantic: semanticColors,
  error: errorColors,
  accent: accentColors,
  button: buttonColors,
  icon: iconColors,
  gradient: gradientColors,
  input: inputColors,
  promptChip: promptChipColors,
  glass: glassColors,
} as const;

export type BrandColorKey = keyof typeof brandColors;
export type SemanticColorKey = keyof typeof semanticColors;
export type Colors = typeof colors;
