/**
 * Toast Context Tests
 * Unit tests for ToastContext, ToastProvider, and toast-utils
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useContext, useEffect } from 'react';
import {
  ToastContext,
  ToastProvider,
  ToastProviderWithRef,
  ToastType,
  ToastContextValue,
} from '../ToastContext';
import { getToastContextRef, setToastContextRef } from '../toast-utils';

// Helper component to access context
function TestConsumer({ onContext }: { onContext: (ctx: ToastContextValue | null) => void }) {
  const context = useContext(ToastContext);
  useEffect(() => {
    onContext(context);
  }, [context, onContext]);
  return null;
}

// Helper to get context value with proper typing
function getContextValue(contextValue: ToastContextValue | null): ToastContextValue {
  if (!contextValue) {
    throw new Error('Context value is null');
  }
  return contextValue;
}

describe('ToastContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setToastContextRef(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
    setToastContextRef(null);
  });

  // ============================================
  // ToastContext Tests
  // ============================================
  describe('ToastContext', () => {
    it('should have null default value', () => {
      let contextValue: ToastContextValue | null = null;
      render(
        <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
      );
      expect(contextValue).toBeNull();
    });
  });

  // ============================================
  // ToastProvider Tests
  // ============================================
  describe('ToastProvider', () => {
    it('should provide context with empty toasts initially', () => {
      let contextValue: ToastContextValue | null = null;
      render(
        <ToastProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </ToastProvider>
      );

      expect(contextValue).not.toBeNull();
      const ctx = getContextValue(contextValue);
      expect(ctx.toasts).toEqual([]);
    });

    it('should render children', () => {
      render(
        <ToastProvider>
          <div data-testid="child">Child Content</div>
        </ToastProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should add toast via addToast', () => {
      let contextValue: ToastContextValue | null = null;
      render(
        <ToastProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </ToastProvider>
      );

      expect(contextValue).not.toBeNull();

      act(() => {
        getContextValue(contextValue).addToast({
          type: 'success',
          title: 'Test Toast',
          description: 'Test description',
          duration: 5000,
        });
      });

      expect(getContextValue(contextValue).toasts.length).toBe(1);
      expect(getContextValue(contextValue).toasts[0].title).toBe('Test Toast');
      expect(getContextValue(contextValue).toasts[0].type).toBe('success');
    });

    it('should generate unique toast IDs', () => {
      let contextValue: ToastContextValue | null = null;
      render(
        <ToastProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </ToastProvider>
      );

      const id1 = getContextValue(contextValue).addToast({
        type: 'info',
        title: 'Toast 1',
        duration: 5000,
      });

      const id2 = getContextValue(contextValue).addToast({
        type: 'info',
        title: 'Toast 2',
        duration: 5000,
      });

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^toast-/);
      expect(id2).toMatch(/^toast-/);
    });

    it('should update toast via updateToast', () => {
      let contextValue: ToastContextValue | null = null;
      render(
        <ToastProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </ToastProvider>
      );

      act(() => {
        getContextValue(contextValue).addToast({
          type: 'info',
          title: 'Original Title',
          duration: 5000,
        });
      });

      const toastId = getContextValue(contextValue).toasts[0].id;

      act(() => {
        getContextValue(contextValue).updateToast(toastId, { title: 'Updated Title', type: 'success' });
      });

      expect(getContextValue(contextValue).toasts[0].title).toBe('Updated Title');
      expect(getContextValue(contextValue).toasts[0].type).toBe('success');
    });

    it('should clear all toasts via clearAll', () => {
      let contextValue: ToastContextValue | null = null;
      render(
        <ToastProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </ToastProvider>
      );

      // Add multiple toasts
      act(() => {
        getContextValue(contextValue).addToast({ type: 'info', title: 'Toast 1', duration: 5000 });
        getContextValue(contextValue).addToast({ type: 'success', title: 'Toast 2', duration: 5000 });
        getContextValue(contextValue).addToast({ type: 'error', title: 'Toast 3', duration: 5000 });
      });

      expect(getContextValue(contextValue).toasts.length).toBe(3);

      act(() => {
        getContextValue(contextValue).clearAll();
      });

      expect(getContextValue(contextValue).toasts.length).toBe(0);
    });

    it('should add timestamp to toasts', () => {
      let contextValue: ToastContextValue | null = null;
      const beforeTime = Date.now();

      render(
        <ToastProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </ToastProvider>
      );

      act(() => {
        getContextValue(contextValue).addToast({
          type: 'info',
          title: 'Test Toast',
          duration: 5000,
        });
      });

      expect(getContextValue(contextValue).toasts[0].createdAt).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should mark toast as exiting on removeToast', () => {
      vi.useFakeTimers();
      let contextValue: ToastContextValue | null = null;
      render(
        <ToastProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </ToastProvider>
      );

      act(() => {
        getContextValue(contextValue).addToast({
          type: 'info',
          title: 'Test Toast',
          duration: 5000,
        });
      });

      const toastId = getContextValue(contextValue).toasts[0].id;

      act(() => {
        getContextValue(contextValue).removeToast(toastId);
      });

      // Toast should be marked as exiting
      expect(getContextValue(contextValue).toasts[0]?.isExiting).toBe(true);

      // Advance timers to complete removal
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(getContextValue(contextValue).toasts.length).toBe(0);
      vi.useRealTimers();
    });
  });

  // ============================================
  // ToastProviderWithRef Tests
  // ============================================
  describe('ToastProviderWithRef', () => {
    it('should set context ref on mount', () => {
      expect(getToastContextRef()).toBeNull();

      render(
        <ToastProviderWithRef>
          <div>Content</div>
        </ToastProviderWithRef>
      );

      expect(getToastContextRef()).not.toBeNull();
    });

    it('should clear context ref on unmount', () => {
      const { unmount } = render(
        <ToastProviderWithRef>
          <div>Content</div>
        </ToastProviderWithRef>
      );

      expect(getToastContextRef()).not.toBeNull();

      unmount();

      expect(getToastContextRef()).toBeNull();
    });

    it('should allow adding toasts via ref', () => {
      render(
        <ToastProviderWithRef>
          <div>Content</div>
        </ToastProviderWithRef>
      );

      expect(getToastContextRef()).not.toBeNull();

      const contextRef = getToastContextRef();
      if (contextRef) {
        act(() => {
          contextRef.addToast({
            type: 'success',
            title: 'Via Ref',
            duration: 5000,
          });
        });

        // Get fresh ref after state update since contextRef holds stale reference
        const freshRef = getToastContextRef();
        expect(freshRef?.toasts.length).toBe(1);
      }
    });
  });

  // ============================================
  // toast-utils Tests
  // ============================================
  describe('toast-utils', () => {
    it('should return null when no ref set', () => {
      expect(getToastContextRef()).toBeNull();
    });

    it('should set and get context ref', () => {
      const mockContext: ToastContextValue = {
        toasts: [],
        addToast: vi.fn(),
        removeToast: vi.fn(),
        updateToast: vi.fn(),
        clearAll: vi.fn(),
      };

      setToastContextRef(mockContext);
      expect(getToastContextRef()).toBe(mockContext);
    });

    it('should allow clearing ref with null', () => {
      const mockContext: ToastContextValue = {
        toasts: [],
        addToast: vi.fn(),
        removeToast: vi.fn(),
        updateToast: vi.fn(),
        clearAll: vi.fn(),
      };

      setToastContextRef(mockContext);
      expect(getToastContextRef()).not.toBeNull();

      setToastContextRef(null);
      expect(getToastContextRef()).toBeNull();
    });
  });

  // ============================================
  // Toast Types Tests
  // ============================================
  describe('Toast types', () => {
    const testTypes: ToastType[] = ['success', 'error', 'warning', 'info', 'loading', 'default'];

    testTypes.forEach((type) => {
      it(`should support ${type} type`, () => {
        let contextValue: ToastContextValue | null = null;
        render(
          <ToastProvider>
            <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
          </ToastProvider>
        );

        act(() => {
          getContextValue(contextValue).addToast({
            type,
            title: `${type} Toast`,
            duration: 5000,
          });
        });

        expect(getContextValue(contextValue).toasts[0].type).toBe(type);
      });
    });
  });

  // ============================================
  // Toast Options Tests
  // ============================================
  describe('Toast options', () => {
    it('should support action button', () => {
      let contextValue: ToastContextValue | null = null;
      const actionFn = vi.fn();

      render(
        <ToastProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </ToastProvider>
      );

      act(() => {
        getContextValue(contextValue).addToast({
          type: 'info',
          title: 'With Action',
          duration: 5000,
          action: {
            label: 'Click Me',
            onClick: actionFn,
          },
        });
      });

      expect(getContextValue(contextValue).toasts[0].action?.label).toBe('Click Me');
    });

    it('should support cancel button', () => {
      let contextValue: ToastContextValue | null = null;
      const cancelFn = vi.fn();

      render(
        <ToastProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </ToastProvider>
      );

      act(() => {
        getContextValue(contextValue).addToast({
          type: 'info',
          title: 'With Cancel',
          duration: 5000,
          cancel: {
            label: 'Cancel',
            onClick: cancelFn,
          },
        });
      });

      expect(getContextValue(contextValue).toasts[0].cancel?.label).toBe('Cancel');
    });

    it('should support onDismiss callback', () => {
      let contextValue: ToastContextValue | null = null;
      const dismissFn = vi.fn();

      render(
        <ToastProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </ToastProvider>
      );

      act(() => {
        getContextValue(contextValue).addToast({
          type: 'info',
          title: 'With Dismiss',
          duration: 5000,
          onDismiss: dismissFn,
        });
      });

      expect(getContextValue(contextValue).toasts[0].onDismiss).toBe(dismissFn);
    });

    it('should support onAutoClose callback', () => {
      let contextValue: ToastContextValue | null = null;
      const autoCloseFn = vi.fn();

      render(
        <ToastProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </ToastProvider>
      );

      act(() => {
        getContextValue(contextValue).addToast({
          type: 'info',
          title: 'With AutoClose',
          duration: 5000,
          onAutoClose: autoCloseFn,
        });
      });

      expect(getContextValue(contextValue).toasts[0].onAutoClose).toBe(autoCloseFn);
    });
  });

  // ============================================
  // Reducer Edge Cases
  // ============================================
  describe('Reducer edge cases', () => {
    it('should handle updating non-existent toast', () => {
      let contextValue: ToastContextValue | null = null;
      render(
        <ToastProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </ToastProvider>
      );

      act(() => {
        getContextValue(contextValue).addToast({
          type: 'info',
          title: 'Original',
          duration: 5000,
        });
      });

      expect(getContextValue(contextValue).toasts.length).toBe(1);

      // Try to update a non-existent toast
      act(() => {
        getContextValue(contextValue).updateToast('non-existent-id', { title: 'Updated' });
      });

      // Original toast should be unchanged
      expect(getContextValue(contextValue).toasts[0].title).toBe('Original');
    });
  });
});
