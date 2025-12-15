/**
 * Theme Colors Tests
 * Unit tests for theme color utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getThemeColors,
  getRagChartColor,
  getRegularChartColor,
  getImageGenChartColor,
  resetThemeColorCache,
} from '../theme-colors';

describe('theme-colors', () => {
  let mockGetComputedStyle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset cache before each test
    resetThemeColorCache();

    // Mock getComputedStyle
    mockGetComputedStyle = vi.fn().mockReturnValue({
      getPropertyValue: vi.fn((property: string) => {
        const colors: Record<string, string> = {
          '--color-brand-600': '#36693d',
          '--color-brand-500': '#4a7d52',
          '--color-brand-700': '#2f5638',
          '--color-brand-400': '#5e9167',
          '--color-brand-300': '#7aa884',
          '--color-brand-800': '#25422b',
          '--color-image-gen': '#a3c4ab',
        };
        return colors[property] || '';
      }),
    });

    vi.stubGlobal('getComputedStyle', mockGetComputedStyle);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    resetThemeColorCache();
  });

  // ============================================
  // getThemeColors Tests
  // ============================================
  describe('getThemeColors', () => {
    it('should return array of theme colors', () => {
      const colors = getThemeColors();

      expect(Array.isArray(colors)).toBe(true);
      expect(colors.length).toBe(6);
    });

    it('should return correct color values', () => {
      const colors = getThemeColors();

      expect(colors[0]).toBe('#36693d'); // brand-600
      expect(colors[1]).toBe('#4a7d52'); // brand-500
      expect(colors[2]).toBe('#2f5638'); // brand-700
      expect(colors[3]).toBe('#5e9167'); // brand-400
      expect(colors[4]).toBe('#7aa884'); // brand-300
      expect(colors[5]).toBe('#25422b'); // brand-800
    });

    it('should cache colors after first call', () => {
      getThemeColors();
      getThemeColors();
      getThemeColors();

      // getComputedStyle should only be called once
      expect(mockGetComputedStyle).toHaveBeenCalledTimes(1);
    });

    it('should use default colors when CSS vars empty', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: vi.fn(() => ''),
      });

      const colors = getThemeColors();

      expect(colors[0]).toBe('#36693d'); // default primary green
      expect(colors[1]).toBe('#4a7d52'); // default medium green
    });

    it('should trim whitespace from color values', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: vi.fn((property: string) => {
          if (property === '--color-brand-600') return '  #36693d  ';
          return '';
        }),
      });

      const colors = getThemeColors();
      expect(colors[0]).toBe('#36693d');
    });
  });

  // ============================================
  // getRagChartColor Tests
  // ============================================
  describe('getRagChartColor', () => {
    it('should return RAG chart color', () => {
      const color = getRagChartColor();
      expect(color).toBe('#36693d');
    });

    it('should cache color after first call', () => {
      getRagChartColor();
      getRagChartColor();
      getRagChartColor();

      expect(mockGetComputedStyle).toHaveBeenCalledTimes(1);
    });

    it('should use default when CSS var empty', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: vi.fn(() => ''),
      });

      const color = getRagChartColor();
      expect(color).toBe('#36693d');
    });

    it('should trim whitespace from color value', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: vi.fn(() => '  #36693d  '),
      });

      const color = getRagChartColor();
      expect(color).toBe('#36693d');
    });
  });

  // ============================================
  // getRegularChartColor Tests
  // ============================================
  describe('getRegularChartColor', () => {
    it('should return regular chart color', () => {
      const color = getRegularChartColor();
      expect(color).toBe('#5e9167');
    });

    it('should cache color after first call', () => {
      getRegularChartColor();
      getRegularChartColor();
      getRegularChartColor();

      expect(mockGetComputedStyle).toHaveBeenCalledTimes(1);
    });

    it('should use default when CSS var empty', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: vi.fn(() => ''),
      });

      const color = getRegularChartColor();
      expect(color).toBe('#5e9167');
    });

    it('should trim whitespace from color value', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: vi.fn(() => '  #5e9167  '),
      });

      const color = getRegularChartColor();
      expect(color).toBe('#5e9167');
    });
  });

  // ============================================
  // getImageGenChartColor Tests
  // ============================================
  describe('getImageGenChartColor', () => {
    it('should return image generation chart color', () => {
      const color = getImageGenChartColor();
      expect(color).toBe('#a3c4ab');
    });

    it('should cache color after first call', () => {
      getImageGenChartColor();
      getImageGenChartColor();
      getImageGenChartColor();

      expect(mockGetComputedStyle).toHaveBeenCalledTimes(1);
    });

    it('should use default when CSS var empty', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: vi.fn(() => ''),
      });

      const color = getImageGenChartColor();
      expect(color).toBe('#a3c4ab');
    });

    it('should trim whitespace from color value', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: vi.fn(() => '  #a3c4ab  '),
      });

      const color = getImageGenChartColor();
      expect(color).toBe('#a3c4ab');
    });
  });

  // ============================================
  // resetThemeColorCache Tests
  // ============================================
  describe('resetThemeColorCache', () => {
    it('should reset theme colors cache', () => {
      // First call - populates cache
      getThemeColors();
      expect(mockGetComputedStyle).toHaveBeenCalledTimes(1);

      // Second call - uses cache
      getThemeColors();
      expect(mockGetComputedStyle).toHaveBeenCalledTimes(1);

      // Reset cache
      resetThemeColorCache();

      // Third call - repopulates cache
      getThemeColors();
      expect(mockGetComputedStyle).toHaveBeenCalledTimes(2);
    });

    it('should reset RAG chart color cache', () => {
      getRagChartColor();
      expect(mockGetComputedStyle).toHaveBeenCalledTimes(1);

      resetThemeColorCache();

      getRagChartColor();
      expect(mockGetComputedStyle).toHaveBeenCalledTimes(2);
    });

    it('should reset regular chart color cache', () => {
      getRegularChartColor();
      expect(mockGetComputedStyle).toHaveBeenCalledTimes(1);

      resetThemeColorCache();

      getRegularChartColor();
      expect(mockGetComputedStyle).toHaveBeenCalledTimes(2);
    });

    it('should reset image gen chart color cache', () => {
      getImageGenChartColor();
      expect(mockGetComputedStyle).toHaveBeenCalledTimes(1);

      resetThemeColorCache();

      getImageGenChartColor();
      expect(mockGetComputedStyle).toHaveBeenCalledTimes(2);
    });

    it('should reset all caches at once', () => {
      // Populate all caches
      getThemeColors();
      getRagChartColor();
      getRegularChartColor();
      getImageGenChartColor();

      const initialCalls = mockGetComputedStyle.mock.calls.length;

      // Reset all
      resetThemeColorCache();

      // Repopulate all
      getThemeColors();
      getRagChartColor();
      getRegularChartColor();
      getImageGenChartColor();

      // Should have double the initial calls
      expect(mockGetComputedStyle.mock.calls.length).toBe(initialCalls * 2);
    });
  });

  // ============================================
  // Integration Tests
  // ============================================
  describe('integration', () => {
    it('should work with theme changes', () => {
      // Initial theme
      const initialColors = getThemeColors();
      expect(initialColors[0]).toBe('#36693d');

      // Simulate theme change
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: vi.fn((property: string) => {
          const darkColors: Record<string, string> = {
            '--color-brand-600': '#1a4d1a',
            '--color-brand-500': '#2d5f2d',
            '--color-brand-700': '#0f330f',
            '--color-brand-400': '#408040',
            '--color-brand-300': '#5aa35a',
            '--color-brand-800': '#0a220a',
          };
          return darkColors[property] || '';
        }),
      });

      // Reset cache to pick up new theme
      resetThemeColorCache();

      const newColors = getThemeColors();
      expect(newColors[0]).toBe('#1a4d1a');
    });

    it('should handle document.documentElement access', () => {
      // Verify getComputedStyle is called with document.documentElement
      getThemeColors();

      expect(mockGetComputedStyle).toHaveBeenCalledWith(document.documentElement);
    });

    it('should maintain separate caches for each function', () => {
      // Each function has its own cache
      getThemeColors();
      expect(mockGetComputedStyle).toHaveBeenCalledTimes(1);

      // These should create new cache entries, not use theme colors cache
      getRagChartColor();
      expect(mockGetComputedStyle).toHaveBeenCalledTimes(2);

      getRegularChartColor();
      expect(mockGetComputedStyle).toHaveBeenCalledTimes(3);

      getImageGenChartColor();
      expect(mockGetComputedStyle).toHaveBeenCalledTimes(4);
    });
  });
});
