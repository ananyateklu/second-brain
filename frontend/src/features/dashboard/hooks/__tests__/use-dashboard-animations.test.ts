/**
 * Use Dashboard Animations Hook Tests
 * Unit tests for the dashboard animation hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardAnimations, useAnimatedVisibility } from '../use-dashboard-animations';

// Mock matchMedia
const mockMatchMedia = vi.fn();

beforeEach(() => {
  // Setup matchMedia mock
  window.matchMedia = mockMatchMedia;
  mockMatchMedia.mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  // Clear Tauri detection
  delete (window as unknown as { __TAURI__?: unknown }).__TAURI__;
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('useDashboardAnimations', () => {
  // ============================================
  // Basic Return Value Tests
  // ============================================
  describe('return value', () => {
    it('should return isReady state', () => {
      const { result } = renderHook(() => useDashboardAnimations(true));

      expect(typeof result.current.isReady).toBe('boolean');
    });

    it('should return getItemAnimation function', () => {
      const { result } = renderHook(() => useDashboardAnimations(true));

      expect(typeof result.current.getItemAnimation).toBe('function');
    });

    it('should return getSectionAnimation function', () => {
      const { result } = renderHook(() => useDashboardAnimations(true));

      expect(typeof result.current.getSectionAnimation).toBe('function');
    });

    it('should return config object', () => {
      const { result } = renderHook(() => useDashboardAnimations(true));

      expect(result.current.config).toBeDefined();
      expect(typeof result.current.config.duration).toBe('number');
    });

    it('should return triggerAnimations function', () => {
      const { result } = renderHook(() => useDashboardAnimations(true));

      expect(typeof result.current.triggerAnimations).toBe('function');
    });

    it('should return blurAmount string', () => {
      const { result } = renderHook(() => useDashboardAnimations(true));

      expect(typeof result.current.blurAmount).toBe('string');
    });

    it('should return showGlow boolean', () => {
      const { result } = renderHook(() => useDashboardAnimations(true));

      expect(typeof result.current.showGlow).toBe('boolean');
    });
  });

  // ============================================
  // isReady State Tests
  // ============================================
  describe('isReady state', () => {
    it('should be false initially when data not loaded', () => {
      const { result } = renderHook(() => useDashboardAnimations(false));

      expect(result.current.isReady).toBe(false);
    });

    it('should become true when data is loaded', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useDashboardAnimations(true));

      // Fast-forward timers
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.isReady).toBe(true);
    });

    it('should reset to false when data unloads', async () => {
      vi.useFakeTimers();
      const { result, rerender } = renderHook(
        ({ loaded }) => useDashboardAnimations(loaded),
        { initialProps: { loaded: true } }
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.isReady).toBe(true);

      rerender({ loaded: false });

      expect(result.current.isReady).toBe(false);
    });
  });

  // ============================================
  // getItemAnimation Tests
  // ============================================
  describe('getItemAnimation', () => {
    it('should return animation state for item', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useDashboardAnimations(true, 5));

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const animation = result.current.getItemAnimation(0);

      expect(animation).toHaveProperty('isVisible');
      expect(animation).toHaveProperty('delay');
      expect(animation).toHaveProperty('style');
      expect(animation).toHaveProperty('className');
    });

    it('should return style with opacity', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useDashboardAnimations(true, 5));

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const animation = result.current.getItemAnimation(0);

      expect(animation.style).toHaveProperty('opacity');
    });

    it('should return visible class when ready', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useDashboardAnimations(true, 5));

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const animation = result.current.getItemAnimation(0);

      expect(animation.className).toBe('dashboard-item-visible');
    });

    it('should return hidden class when not ready', () => {
      const { result } = renderHook(() => useDashboardAnimations(false, 5));

      const animation = result.current.getItemAnimation(0);

      expect(animation.className).toBe('dashboard-item-hidden');
    });
  });

  // ============================================
  // getSectionAnimation Tests
  // ============================================
  describe('getSectionAnimation', () => {
    it('should return animation state for section', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useDashboardAnimations(true));

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const animation = result.current.getSectionAnimation(0);

      expect(animation).toHaveProperty('isVisible');
      expect(animation).toHaveProperty('delay');
      expect(animation).toHaveProperty('style');
      expect(animation).toHaveProperty('className');
    });

    it('should return section-specific class names', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useDashboardAnimations(true));

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const animation = result.current.getSectionAnimation(0);

      expect(animation.className).toBe('dashboard-section-visible');
    });
  });

  // ============================================
  // triggerAnimations Tests
  // ============================================
  describe('triggerAnimations', () => {
    it('should reset isReady when called', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useDashboardAnimations(true));

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.isReady).toBe(true);

      act(() => {
        result.current.triggerAnimations();
      });

      expect(result.current.isReady).toBe(false);
    });

    it('should re-trigger animations after reset', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useDashboardAnimations(true));

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      act(() => {
        result.current.triggerAnimations();
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.isReady).toBe(true);
    });
  });

  // ============================================
  // Reduced Motion Tests
  // ============================================
  describe('reduced motion preference', () => {
    it('should respect reduced motion preference', () => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useDashboardAnimations(true));

      expect(result.current.config.reduceMotion).toBe(true);
      expect(result.current.config.duration).toBe(0);
    });

    it('should set duration to 0 when reduced motion is enabled', () => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useDashboardAnimations(true));

      expect(result.current.config.staggerDelay).toBe(0);
    });

    it('should disable glow when reduced motion is enabled', () => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useDashboardAnimations(true));

      expect(result.current.showGlow).toBe(false);
    });
  });

  // ============================================
  // Tauri Detection Tests
  // ============================================
  describe('Tauri detection', () => {
    it('should detect Tauri environment', () => {
      (window as unknown as { __TAURI__?: unknown }).__TAURI__ = {};

      const { result } = renderHook(() => useDashboardAnimations(true));

      expect(result.current.config.isTauri).toBe(true);
    });

    it('should use reduced blur in Tauri', () => {
      (window as unknown as { __TAURI__?: unknown }).__TAURI__ = {};

      const { result } = renderHook(() => useDashboardAnimations(true));

      expect(result.current.blurAmount).toBe('8px');
    });

    it('should disable glow in Tauri', () => {
      (window as unknown as { __TAURI__?: unknown }).__TAURI__ = {};

      const { result } = renderHook(() => useDashboardAnimations(true));

      expect(result.current.showGlow).toBe(false);
    });

    it('should use larger blur when not in Tauri', () => {
      const { result } = renderHook(() => useDashboardAnimations(true));

      expect(result.current.blurAmount).toBe('16px');
    });
  });
});

// ============================================
// useAnimatedVisibility Tests
// ============================================
describe('useAnimatedVisibility', () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia;
    mockMatchMedia.mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    delete (window as unknown as { __TAURI__?: unknown }).__TAURI__;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return style object', () => {
    const { result } = renderHook(() => useAnimatedVisibility(true));

    expect(typeof result.current).toBe('object');
    expect(result.current).toHaveProperty('opacity');
  });

  it('should have opacity 0 when not visible', () => {
    const { result } = renderHook(() => useAnimatedVisibility(false));

    expect(result.current.opacity).toBe(0);
  });

  it('should animate to visible after delay', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAnimatedVisibility(true, 100));

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.opacity).toBe(1);
  });

  it('should include transform when not using reduced motion', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAnimatedVisibility(true, 0));

    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    expect(result.current.transform).toBeDefined();
  });

  it('should only use opacity when reduced motion is preferred', async () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    vi.useFakeTimers();
    const { result } = renderHook(() => useAnimatedVisibility(true, 0));

    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    expect(result.current.transform).toBeUndefined();
    expect(result.current.transition).toBeUndefined();
  });
});
