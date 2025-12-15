/**
 * Toast Item Component Tests
 * Unit tests for individual toast notifications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastItem } from '../ToastItem';
import { Toast, ToastContext, ToastContextValue } from '../ToastContext';

// Mock useToastContext
const mockRemoveToast = vi.fn();
const mockContextValue: ToastContextValue = {
  toasts: [],
  addToast: vi.fn(),
  removeToast: mockRemoveToast,
  updateToast: vi.fn(),
  clearAll: vi.fn(),
};

// Helper to render ToastItem with context
const renderWithContext = (toast: Toast, index: number = 0) => {
  return render(
    <ToastContext.Provider value={mockContextValue}>
      <ToastItem toast={toast} index={index} />
    </ToastContext.Provider>
  );
};

// Helper to create a mock toast
const createMockToast = (overrides: Partial<Toast> = {}): Toast => ({
  id: 'toast-1',
  type: 'info',
  title: 'Test Toast',
  description: undefined,
  duration: 5000,
  createdAt: Date.now(),
  isExiting: false,
  ...overrides,
});

describe('ToastItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render toast with title', () => {
      const toast = createMockToast({ title: 'Test Title' });
      renderWithContext(toast);

      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should render toast with description', () => {
      const toast = createMockToast({
        title: 'Title',
        description: 'Test Description',
      });
      renderWithContext(toast);

      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      const toast = createMockToast({ title: 'Title', description: undefined });
      renderWithContext(toast);

      expect(screen.queryByText('undefined')).not.toBeInTheDocument();
    });

    it('should render with role="alert"', () => {
      const toast = createMockToast();
      renderWithContext(toast);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should apply aria-live="polite"', () => {
      const toast = createMockToast();
      renderWithContext(toast);

      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
    });
  });

  // ============================================
  // Type Variant Tests
  // ============================================
  describe('toast types', () => {
    it('should render success toast with correct styling', () => {
      const toast = createMockToast({ type: 'success', title: 'Success!' });
      renderWithContext(toast);

      expect(screen.getByText('Success!')).toBeInTheDocument();
      // Check for success icon (checkmark)
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-[var(--color-brand-600)]');
    });

    it('should render error toast with correct styling', () => {
      const toast = createMockToast({ type: 'error', title: 'Error!' });
      renderWithContext(toast);

      expect(screen.getByText('Error!')).toBeInTheDocument();
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-[var(--color-error-border)]');
    });

    it('should render warning toast with correct styling', () => {
      const toast = createMockToast({ type: 'warning', title: 'Warning!' });
      renderWithContext(toast);

      expect(screen.getByText('Warning!')).toBeInTheDocument();
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-amber-500');
    });

    it('should render info toast with correct styling', () => {
      const toast = createMockToast({ type: 'info', title: 'Info!' });
      renderWithContext(toast);

      expect(screen.getByText('Info!')).toBeInTheDocument();
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-[var(--color-accent-blue)]');
    });

    it('should render loading toast with correct styling', () => {
      const toast = createMockToast({ type: 'loading', title: 'Loading...' });
      renderWithContext(toast);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-[var(--border)]');
    });

    it('should render default toast with correct styling', () => {
      const toast = createMockToast({ type: 'default', title: 'Default' });
      renderWithContext(toast);

      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });

  // ============================================
  // Close Button Tests
  // ============================================
  describe('close button', () => {
    it('should render close button for non-loading toast', () => {
      const toast = createMockToast({ type: 'info' });
      renderWithContext(toast);

      expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
    });

    it('should not render close button for loading toast', () => {
      const toast = createMockToast({ type: 'loading' });
      renderWithContext(toast);

      expect(screen.queryByLabelText('Dismiss notification')).not.toBeInTheDocument();
    });

    it('should call removeToast when close button is clicked', () => {
      const toast = createMockToast({ type: 'info' });
      renderWithContext(toast);

      fireEvent.click(screen.getByLabelText('Dismiss notification'));

      expect(mockRemoveToast).toHaveBeenCalledWith('toast-1');
    });

    it('should call onDismiss callback when close button is clicked', () => {
      const onDismiss = vi.fn();
      const toast = createMockToast({ type: 'info', onDismiss });
      renderWithContext(toast);

      fireEvent.click(screen.getByLabelText('Dismiss notification'));

      expect(onDismiss).toHaveBeenCalled();
    });
  });

  // ============================================
  // Action Button Tests
  // ============================================
  describe('action buttons', () => {
    it('should render action button when provided', () => {
      const toast = createMockToast({
        action: { label: 'Confirm', onClick: vi.fn() },
      });
      renderWithContext(toast);

      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('should call action onClick and dismiss when action button clicked', () => {
      const actionClick = vi.fn();
      const toast = createMockToast({
        action: { label: 'Confirm', onClick: actionClick },
      });
      renderWithContext(toast);

      fireEvent.click(screen.getByText('Confirm'));

      expect(actionClick).toHaveBeenCalled();
      expect(mockRemoveToast).toHaveBeenCalledWith('toast-1');
    });

    it('should render cancel button when provided', () => {
      const toast = createMockToast({
        cancel: { label: 'Cancel', onClick: vi.fn() },
      });
      renderWithContext(toast);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should call cancel onClick and dismiss when cancel button clicked', () => {
      const cancelClick = vi.fn();
      const toast = createMockToast({
        cancel: { label: 'Cancel', onClick: cancelClick },
      });
      renderWithContext(toast);

      fireEvent.click(screen.getByText('Cancel'));

      expect(cancelClick).toHaveBeenCalled();
      expect(mockRemoveToast).toHaveBeenCalledWith('toast-1');
    });

    it('should render both action and cancel buttons', () => {
      const toast = createMockToast({
        action: { label: 'Confirm', onClick: vi.fn() },
        cancel: { label: 'Cancel', onClick: vi.fn() },
      });
      renderWithContext(toast);

      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  // ============================================
  // Exit Animation Tests
  // ============================================
  describe('exit animation', () => {
    it('should apply toast-enter class when not exiting', () => {
      const toast = createMockToast({ isExiting: false });
      renderWithContext(toast);

      expect(screen.getByRole('alert')).toHaveClass('toast-enter');
    });

    it('should apply toast-exit class when exiting', () => {
      const toast = createMockToast({ isExiting: true });
      renderWithContext(toast);

      expect(screen.getByRole('alert')).toHaveClass('toast-exit');
    });
  });

  // ============================================
  // Index Positioning Tests
  // ============================================
  describe('positioning', () => {
    it('should apply transform based on index', () => {
      const toast = createMockToast();
      renderWithContext(toast, 2);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveStyle({ transform: 'translateY(8px)' });
    });

    it('should apply z-index based on index', () => {
      const toast = createMockToast();
      renderWithContext(toast, 3);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveStyle({ zIndex: 97 });
    });
  });

  // ============================================
  // Progress Bar Tests
  // ============================================
  describe('progress bar', () => {
    it('should not render progress bar for loading toast', () => {
      const toast = createMockToast({ type: 'loading' });
      const { container } = renderWithContext(toast);

      const progressBar = container.querySelector('[style*="width"]');
      expect(progressBar).toBeNull();
    });

    it('should not render progress bar for infinite duration', () => {
      const toast = createMockToast({ duration: Infinity });
      const { container } = renderWithContext(toast);

      // The progress bar div shouldn't exist for infinite duration
      const bottomElements = container.querySelectorAll('.absolute.bottom-0');
      expect(bottomElements.length).toBe(0);
    });
  });

  // ============================================
  // Mouse Interaction Tests
  // ============================================
  describe('mouse interactions', () => {
    it('should pause on mouse enter for non-loading toast', () => {
      const toast = createMockToast({ type: 'info', duration: 5000 });
      renderWithContext(toast);

      const alert = screen.getByRole('alert');
      fireEvent.mouseEnter(alert);

      // Toast should still be visible (paused)
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    });

    it('should resume on mouse leave', () => {
      const toast = createMockToast({ type: 'info', duration: 5000 });
      renderWithContext(toast);

      const alert = screen.getByRole('alert');
      fireEvent.mouseEnter(alert);
      fireEvent.mouseLeave(alert);

      // Toast should still be visible
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    });

    it('should not pause loading toast on mouse enter', () => {
      const toast = createMockToast({ type: 'loading' });
      renderWithContext(toast);

      const alert = screen.getByRole('alert');
      fireEvent.mouseEnter(alert);

      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    });

    it('should not pause infinite duration toast on mouse enter', () => {
      const toast = createMockToast({ duration: Infinity });
      renderWithContext(toast);

      const alert = screen.getByRole('alert');
      fireEvent.mouseEnter(alert);

      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    });
  });

  // ============================================
  // Icon Tests
  // ============================================
  describe('icons', () => {
    it('should render icon for success type', () => {
      const toast = createMockToast({ type: 'success' });
      const { container } = renderWithContext(toast);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render icon for error type', () => {
      const toast = createMockToast({ type: 'error' });
      const { container } = renderWithContext(toast);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render icon for warning type', () => {
      const toast = createMockToast({ type: 'warning' });
      const { container } = renderWithContext(toast);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render icon for info type', () => {
      const toast = createMockToast({ type: 'info' });
      const { container } = renderWithContext(toast);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render spinning icon for loading type', () => {
      const toast = createMockToast({ type: 'loading' });
      const { container } = renderWithContext(toast);

      const svg = container.querySelector('svg.animate-spin');
      expect(svg).toBeInTheDocument();
    });

    it('should not render icon for default type', () => {
      const toast = createMockToast({ type: 'default' });
      const { container } = renderWithContext(toast);

      // Default type should not have an icon container
      const iconContainers = container.querySelectorAll('.w-7.h-7');
      expect(iconContainers.length).toBe(0);
    });
  });

  // ============================================
  // Auto Close Tests
  // ============================================
  describe('auto close', () => {
    it('should call onAutoClose when timer expires', () => {
      const onAutoClose = vi.fn();
      const toast = createMockToast({
        type: 'info',
        duration: 1000,
        onAutoClose,
      });
      renderWithContext(toast);

      // Advance timers past the duration
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      expect(onAutoClose).toHaveBeenCalled();
      expect(mockRemoveToast).toHaveBeenCalledWith('toast-1');
    });

    it('should not auto-close loading toasts', () => {
      const onAutoClose = vi.fn();
      const toast = createMockToast({
        type: 'loading',
        duration: 1000,
        onAutoClose,
      });
      renderWithContext(toast);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onAutoClose).not.toHaveBeenCalled();
      expect(mockRemoveToast).not.toHaveBeenCalled();
    });

    it('should not auto-close infinite duration toasts', () => {
      const onAutoClose = vi.fn();
      const toast = createMockToast({
        type: 'info',
        duration: Infinity,
        onAutoClose,
      });
      renderWithContext(toast);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onAutoClose).not.toHaveBeenCalled();
      expect(mockRemoveToast).not.toHaveBeenCalled();
    });
  });
});
