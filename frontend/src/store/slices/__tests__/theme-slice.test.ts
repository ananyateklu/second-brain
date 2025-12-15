/**
 * Theme Slice Tests
 * Unit tests for theme store slice
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createThemeSlice } from '../theme-slice';
import type { ThemeSlice, BoundStore } from '../../types';

// Mock theme-colors utility
vi.mock('../../../utils/theme-colors', () => ({
  resetThemeColorCache: vi.fn(),
}));

// Mock localStorage
let localStorageMock: Record<string, string>;

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
    localStorageMock = {};

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key: string) => localStorageMock[key] ?? null
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key: string, value: string) => {
        localStorageMock[key] = value;
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
    it('should have a theme', () => {
      expect(['light', 'dark', 'blue']).toContain(slice.theme);
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

    it('should toggle from blue to light', () => {
      state.theme = 'blue';
      state.setTheme = (theme) => {
        state.theme = theme;
        mockSet({ theme });
      };

      slice.toggleTheme();

      expect(mockSet).toHaveBeenCalledWith({ theme: 'light' });
    });
  });
});
