/**
 * Theme Slice
 * Manages application theme state
 *
 * Uses centralized theme configuration from config/themes.ts
 */

import {
  isDarkTheme,
  getNextTheme,
  isValidTheme,
  type ThemeId,
} from '../../config/themes';
import { resetThemeColorCache } from '../../utils/theme-colors';
import type { ThemeSlice, SliceCreator } from '../types';

const THEME_STORAGE_KEY = 'second-brain-theme';

/**
 * Load theme from localStorage
 */
const loadTheme = (): ThemeId => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  // Use centralized validation
  if (isValidTheme(stored)) {
    return stored;
  }
  return 'light';
};

/**
 * Save theme to localStorage and apply to DOM
 */
const applyTheme = (theme: ThemeId) => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);

  // Manage the 'dark' class for Tailwind's dark mode
  // Uses centralized isDarkTheme check
  if (isDarkTheme(theme)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Reset color cache when theme changes
  resetThemeColorCache();
};

// Initialize theme from storage
const initialTheme = loadTheme();

// Apply initial theme on load
if (typeof window !== 'undefined') {
  document.documentElement.setAttribute('data-theme', initialTheme);
  if (isDarkTheme(initialTheme)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const createThemeSlice: SliceCreator<ThemeSlice> = (set, get) => ({
  theme: initialTheme,

  setTheme: (theme: ThemeId) => {
    set({ theme });
    applyTheme(theme);
  },

  toggleTheme: () => {
    const currentTheme = get().theme;
    // Use centralized getNextTheme
    const newTheme = getNextTheme(currentTheme);
    get().setTheme(newTheme);
  },
});
