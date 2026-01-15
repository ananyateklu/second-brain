/**
 * Theme Configuration - Single Source of Truth
 *
 * All theme metadata and utilities in one place.
 * Adding a new theme only requires:
 * 1. Add to THEME_IDS
 * 2. Add config to THEME_CONFIG
 * 3. Add to THEME_ORDER (if it should be in toggle cycle)
 * 4. Add CSS palette in colors.css and surfaces.css
 */

// ============================================
// Theme IDs - The canonical list of all themes
// ============================================

export const THEME_IDS = ['light', 'dark', 'blue', 'midnight', 'sunset'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

// ============================================
// Theme Configuration
// ============================================

export type ColorFamily = 'green' | 'blue' | 'midnight' | 'sunset';

export interface ThemeConfig {
  /** Unique theme identifier */
  id: ThemeId;
  /** Display name for UI */
  displayName: string;
  /** Whether this theme uses dark mode styling (affects Tailwind dark: classes) */
  isDark: boolean;
  /** Color family for theme-specific styling */
  colorFamily: ColorFamily;
  /** CSS color-scheme value */
  colorScheme: 'light' | 'dark';
  /** Optional indicator color for theme toggle UI */
  indicatorColor?: string;
}

export const THEME_CONFIG: Record<ThemeId, ThemeConfig> = {
  light: {
    id: 'light',
    displayName: 'Light',
    isDark: false,
    colorFamily: 'green',
    colorScheme: 'light',
  },
  dark: {
    id: 'dark',
    displayName: 'Dark',
    isDark: true,
    colorFamily: 'green',
    colorScheme: 'dark',
  },
  blue: {
    id: 'blue',
    displayName: 'Blue',
    isDark: true,
    colorFamily: 'blue',
    colorScheme: 'dark',
    indicatorColor: 'var(--color-blue-400)',
  },
  midnight: {
    id: 'midnight',
    displayName: 'Midnight',
    isDark: true,
    colorFamily: 'midnight',
    colorScheme: 'dark',
    indicatorColor: 'var(--color-midnight-400, #2e4369)',
  },
  sunset: {
    id: 'sunset',
    displayName: 'Sunset',
    isDark: false,
    colorFamily: 'sunset',
    colorScheme: 'light',
    indicatorColor: 'var(--color-sunset-500, #e8956c)',
  },
} as const;

// ============================================
// Theme Order (for toggle cycling)
// ============================================

export const THEME_ORDER: readonly ThemeId[] = ['light', 'dark', 'blue', 'midnight', 'sunset'] as const;

// ============================================
// Utility Functions
// ============================================

/**
 * Check if a theme uses dark mode styling
 */
export function isDarkTheme(theme: ThemeId): boolean {
  return THEME_CONFIG[theme].isDark;
}

/**
 * Get full configuration for a theme
 */
export function getThemeConfig(theme: ThemeId): ThemeConfig {
  return THEME_CONFIG[theme];
}

/**
 * Get the next theme in the toggle cycle
 */
export function getNextTheme(current: ThemeId): ThemeId {
  const currentIndex = THEME_ORDER.indexOf(current);
  const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
  return THEME_ORDER[nextIndex];
}

/**
 * Validate if a value is a valid theme ID
 */
export function isValidTheme(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.includes(value as ThemeId);
}

/**
 * Get all dark theme IDs
 */
export const DARK_THEMES: readonly ThemeId[] = THEME_IDS.filter(
  (id) => THEME_CONFIG[id].isDark
);

/**
 * Check if theme belongs to blue color family (blue or midnight)
 */
export function isBlueFamily(theme: ThemeId): boolean {
  const family = THEME_CONFIG[theme].colorFamily;
  return family === 'blue' || family === 'midnight';
}
