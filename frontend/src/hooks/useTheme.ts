/**
 * useTheme Hook
 *
 * Lightweight hook for accessing theme state and utilities.
 * Uses centralized theme configuration for consistent behavior.
 *
 * @example
 * const { theme, isDarkMode, config } = useTheme();
 * if (isDarkMode) {
 *   // Apply dark mode styling
 * }
 */

import { useBoundStore } from '../store/bound-store';
import {
  isDarkTheme,
  isBlueFamily,
  getThemeConfig,
  type ThemeId,
  type ThemeConfig,
} from '../config/themes';

export interface UseThemeReturn {
  /** Current theme ID */
  theme: ThemeId;
  /** Whether the current theme uses dark mode styling */
  isDarkMode: boolean;
  /** Whether the current theme is specifically 'light' */
  isLightMode: boolean;
  /** Whether the current theme belongs to blue color family (blue or midnight) */
  isBlueFamily: boolean;
  /** Full theme configuration */
  config: ThemeConfig;
  /** Theme color family */
  colorFamily: ThemeConfig['colorFamily'];
}

/**
 * Hook for accessing theme state and computed properties.
 *
 * Replaces the common pattern:
 * ```ts
 * const theme = useBoundStore((state) => state.theme);
 * const isDarkMode = theme === 'dark' || theme === 'blue' || theme === 'midnight';
 * ```
 *
 * With:
 * ```ts
 * const { isDarkMode } = useTheme();
 * ```
 */
export function useTheme(): UseThemeReturn {
  const theme = useBoundStore((state) => state.theme) as ThemeId;
  const config = getThemeConfig(theme);

  return {
    theme,
    isDarkMode: isDarkTheme(theme),
    isLightMode: theme === 'light',
    isBlueFamily: isBlueFamily(theme),
    config,
    colorFamily: config.colorFamily,
  };
}

/**
 * Hook for accessing theme actions.
 * Separated from useTheme to allow components that only need actions
 * to avoid re-renders when theme state changes.
 */
export function useThemeActions() {
  const setTheme = useBoundStore((state) => state.setTheme);
  const toggleTheme = useBoundStore((state) => state.toggleTheme);

  return { setTheme, toggleTheme };
}
