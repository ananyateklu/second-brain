/**
 * Theme Slice
 * Manages application theme (light/dark/blue)
 */

import { resetThemeColorCache } from '../../utils/theme-colors';
import type { ThemeSlice, SliceCreator, Theme } from '../types';

const THEME_STORAGE_KEY = 'second-brain-theme';

/**
 * Load theme from localStorage
 */
const loadTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'blue') {
    return stored;
  }
  return 'light';
};

/**
 * Save theme to localStorage and apply to DOM
 */
const applyTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);

  // Manage the 'dark' class for Tailwind's dark mode
  if (theme === 'dark' || theme === 'blue') {
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
  if (initialTheme === 'dark' || initialTheme === 'blue') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const createThemeSlice: SliceCreator<ThemeSlice> = (set, get) => ({
  theme: initialTheme,

  setTheme: (theme: Theme) => {
    set({ theme });
    applyTheme(theme);
  },

  toggleTheme: () => {
    const currentTheme = get().theme;
    const themeOrder: Theme[] = ['light', 'dark', 'blue'];
    const currentIndex = themeOrder.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const newTheme = themeOrder[nextIndex];
    get().setTheme(newTheme);
  },
});
