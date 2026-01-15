/**
 * Theme Slice Tests
 * Unit tests for theme store slice
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createThemeSlice } from '../theme-slice';
import type { ThemeSlice, BoundStore } from '../../types';
import { THEME_IDS, THEME_ORDER } from '../../../config/themes';

// Mock theme-colors utility
vi.mock('../../../utils/theme-colors', () => ({
  resetThemeColorCache: vi.fn(),
}));

// Storage for localStorage mock
const localStorageData: Record<string, string> = {};

describe('themeSlice', () => {
  let state: Partial<BoundStore>;
  let slice: ThemeSlice;

  const mockSet = vi.fn((partial: Partial<BoundStore> | ((state: BoundStore) => Partial<BoundStore>)) => {
    if (typeof partial === 'function') {
      const newState = partial(state as BoundStore);
      Object.assign(state, newState);
    } else {
      Object.assign(state, partial);
    }
  });

  const mockGet = vi.fn(() => state as BoundStore);

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear storage data
    Object.keys(localStorageData).forEach(key => delete localStorageData[key]);

    // Setup localStorage mock (already mocked in setup.ts, but we override behavior)
    vi.mocked(localStorage.getItem).mockImplementation(
      (key: string) => localStorageData[key] ?? null
    );
    vi.mocked(localStorage.setItem).mockImplementation(
      (key: string, value: string) => {
        localStorageData[key] = value;
      }
    );

    // Mock document.documentElement
    Object.defineProperty(document, 'documentElement', {
      value: {
        setAttribute: vi.fn(),
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
        },
      },
      writable: true,
    });

    state = {};
    // @ts-expect-error - Partial store mock
    slice = createThemeSlice(mockSet, mockGet, {});
    Object.assign(state, slice);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('initial state', () => {
    it('should have a valid theme from config', () => {
      expect(THEME_IDS).toContain(slice.theme);
    });
  });

  // ============================================
  // setTheme Tests
  // ============================================
  describe('setTheme', () => {
    it('should set theme to light', () => {
      slice.setTheme('light');

      expect(mockSet).toHaveBeenCalledWith({ theme: 'light' });
    });

    it('should set theme to dark', () => {
      slice.setTheme('dark');

      expect(mockSet).toHaveBeenCalledWith({ theme: 'dark' });
    });

    it('should set theme to blue', () => {
      slice.setTheme('blue');

      expect(mockSet).toHaveBeenCalledWith({ theme: 'blue' });
    });

    it('should set theme to midnight', () => {
      slice.setTheme('midnight');

      expect(mockSet).toHaveBeenCalledWith({ theme: 'midnight' });
    });

    it('should add dark class for midnight theme', () => {
      slice.setTheme('midnight');

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should save theme to localStorage', () => {
      slice.setTheme('dark');

      expect(localStorage.setItem).toHaveBeenCalledWith('second-brain-theme', 'dark');
    });

    it('should apply theme to document element', () => {
      slice.setTheme('dark');

      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('should add dark class for dark theme', () => {
      slice.setTheme('dark');

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should add dark class for blue theme', () => {
      slice.setTheme('blue');

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should remove dark class for light theme', () => {
      slice.setTheme('light');

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
    });
  });

  // ============================================
  // toggleTheme Tests
  // ============================================
  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      state.theme = 'light';
      // Need to re-assign setTheme to update state
      state.setTheme = (theme) => {
        state.theme = theme;
        mockSet({ theme });
      };

      slice.toggleTheme();

      // toggleTheme calls get().setTheme, which should update theme
      expect(mockSet).toHaveBeenCalledWith({ theme: 'dark' });
    });

    it('should toggle from dark to blue', () => {
      state.theme = 'dark';
      state.setTheme = (theme) => {
        state.theme = theme;
        mockSet({ theme });
      };

      slice.toggleTheme();

      expect(mockSet).toHaveBeenCalledWith({ theme: 'blue' });
    });

    it('should toggle from blue to midnight', () => {
      state.theme = 'blue';
      state.setTheme = (theme) => {
        state.theme = theme;
        mockSet({ theme });
      };

      slice.toggleTheme();

      expect(mockSet).toHaveBeenCalledWith({ theme: 'midnight' });
    });

    it('should toggle from midnight to light', () => {
      state.theme = 'midnight';
      state.setTheme = (theme) => {
        state.theme = theme;
        mockSet({ theme });
      };

      slice.toggleTheme();

      expect(mockSet).toHaveBeenCalledWith({ theme: 'light' });
    });
  });
});
