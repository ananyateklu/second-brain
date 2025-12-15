/**
 * Toast Hook Tests
 * Unit tests for useToast hook and toast utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toast, useToast } from '../use-toast';
import * as toastUtilsModule from '../../components/ui/Toast/toast-utils';
import * as storeRegistry from '../../store/store-registry';
import { ApiError, ApiErrorCode } from '../../types/api';
import type { ToastContextValue, Toast } from '../../components/ui/Toast/ToastContext';

// Mock the toast context ref
vi.mock('../../components/ui/Toast/toast-utils', () => ({
  getToastContextRef: vi.fn(),
  setToastContextRef: vi.fn(),
}));

// Mock store registry
vi.mock('../../store/store-registry', () => ({
  getStore: vi.fn(),
}));

// Mock context type that allows vi.fn() methods
type MockToastContextValue = {
  toasts: Toast[];
  addToast: ReturnType<typeof vi.fn> & ((toast: Omit<Toast, 'id' | 'createdAt'>) => string);
  removeToast: ReturnType<typeof vi.fn>;
  updateToast: ReturnType<typeof vi.fn>;
  clearAll: ReturnType<typeof vi.fn>;
};

describe('use-toast', () => {
  let mockContext: MockToastContextValue;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      toasts: [] as Toast[],
      addToast: vi.fn(() => 'toast-id-123'),
      removeToast: vi.fn(),
      updateToast: vi.fn(),
      clearAll: vi.fn(),
    };

    vi.mocked(toastUtilsModule.getToastContextRef).mockReturnValue(mockContext as unknown as ToastContextValue);
    vi.mocked(storeRegistry.getStore).mockReturnValue({
      getState: () => ({ enableNotifications: true }),
    } as unknown as ReturnType<typeof storeRegistry.getStore>);

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // useToast Hook Tests
  // ============================================
  describe('useToast', () => {
    it('should return toast object', () => {
      const result = useToast();
      expect(result).toBe(toast);
    });

    it('should have all toast methods', () => {
      const result = useToast();
      expect(typeof result.success).toBe('function');
      expect(typeof result.error).toBe('function');
      expect(typeof result.info).toBe('function');
      expect(typeof result.warning).toBe('function');
      expect(typeof result.loading).toBe('function');
      expect(typeof result.dismiss).toBe('function');
      expect(typeof result.promise).toBe('function');
      expect(typeof result.confirm).toBe('function');
      expect(typeof result.custom).toBe('function');
      expect(typeof result.apiError).toBe('function');
    });
  });

  // ============================================
  // toast.success Tests
  // ============================================
  describe('toast.success', () => {
    it('should add success toast', () => {
      const id = toast.success('Success!');

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Success!',
      }));
      expect(id).toBe('toast-id-123');
    });

    it('should include description when provided', () => {
      toast.success('Success!', 'Additional details');

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Success!',
        description: 'Additional details',
      }));
    });

    it('should include action when provided', () => {
      const actionFn = vi.fn();
      toast.success('Success!', undefined, { action: { label: 'Undo', onClick: actionFn } });

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        action: { label: 'Undo', onClick: actionFn },
      }));
    });

    it('should return null when notifications disabled', () => {
      vi.mocked(storeRegistry.getStore).mockReturnValue({
        getState: () => ({ enableNotifications: false }),
      } as unknown as ReturnType<typeof storeRegistry.getStore>);

      const id = toast.success('Success!');
      expect(id).toBeNull();
      expect(mockContext.addToast).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // toast.error Tests
  // ============================================
  describe('toast.error', () => {
    it('should add error toast', () => {
      const id = toast.error('Error!');

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        title: 'Error!',
      }));
      expect(id).toBe('toast-id-123');
    });

    it('should use ERROR_DURATION by default', () => {
      toast.error('Error!');

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        duration: 5000,
      }));
    });

    it('should show errors even when notifications disabled', () => {
      vi.mocked(storeRegistry.getStore).mockReturnValue({
        getState: () => ({ enableNotifications: false }),
      } as unknown as ReturnType<typeof storeRegistry.getStore>);

      const id = toast.error('Error!');
      expect(id).toBe('toast-id-123');
      expect(mockContext.addToast).toHaveBeenCalled();
    });
  });

  // ============================================
  // toast.info Tests
  // ============================================
  describe('toast.info', () => {
    it('should add info toast', () => {
      const id = toast.info('Info message');

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'info',
        title: 'Info message',
      }));
      expect(id).toBe('toast-id-123');
    });
  });

  // ============================================
  // toast.warning Tests
  // ============================================
  describe('toast.warning', () => {
    it('should add warning toast', () => {
      const id = toast.warning('Warning message');

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'warning',
        title: 'Warning message',
      }));
      expect(id).toBe('toast-id-123');
    });
  });

  // ============================================
  // toast.loading Tests
  // ============================================
  describe('toast.loading', () => {
    it('should add loading toast with infinite duration', () => {
      const id = toast.loading('Loading...');

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'loading',
        title: 'Loading...',
        duration: Infinity,
      }));
      expect(id).toBe('toast-id-123');
    });

    it('should show loading even when notifications disabled', () => {
      vi.mocked(storeRegistry.getStore).mockReturnValue({
        getState: () => ({ enableNotifications: false }),
      } as unknown as ReturnType<typeof storeRegistry.getStore>);

      const id = toast.loading('Loading...');
      expect(id).toBe('toast-id-123');
      expect(mockContext.addToast).toHaveBeenCalled();
    });
  });

  // ============================================
  // toast.dismiss Tests
  // ============================================
  describe('toast.dismiss', () => {
    it('should remove specific toast by id', () => {
      toast.dismiss('toast-123');
      expect(mockContext.removeToast).toHaveBeenCalledWith('toast-123');
    });

    it('should clear all toasts when no id provided', () => {
      toast.dismiss();
      expect(mockContext.clearAll).toHaveBeenCalled();
    });

    it('should handle null id by clearing all', () => {
      toast.dismiss(null);
      expect(mockContext.clearAll).toHaveBeenCalled();
    });

    it('should do nothing if no context', () => {
      vi.mocked(toastUtilsModule.getToastContextRef).mockReturnValue(null);
      toast.dismiss('toast-123');
      expect(mockContext.removeToast).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // toast.custom Tests
  // ============================================
  describe('toast.custom', () => {
    it('should add default type toast', () => {
      const id = toast.custom('Custom message');

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'default',
        title: 'Custom message',
      }));
      expect(id).toBe('toast-id-123');
    });

    it('should include all options', () => {
      const actionFn = vi.fn();
      toast.custom('Custom', {
        description: 'Details',
        duration: 3000,
        action: { label: 'Action', onClick: actionFn },
      });

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        description: 'Details',
        duration: 3000,
        action: { label: 'Action', onClick: actionFn },
      }));
    });
  });

  // ============================================
  // toast.apiError Tests
  // ============================================
  describe('toast.apiError', () => {
    it('should handle ApiError with UNAUTHORIZED', () => {
      const error = new ApiError('Unauthorized', ApiErrorCode.UNAUTHORIZED, 401);

      toast.apiError(error);

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        title: 'Session Expired',
        description: 'Please sign in again to continue.',
      }));
    });

    it('should handle ApiError with FORBIDDEN', () => {
      const error = new ApiError('Forbidden', ApiErrorCode.FORBIDDEN, 403);

      toast.apiError(error);

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Access Denied',
        description: 'You do not have permission to perform this action.',
      }));
    });

    it('should handle ApiError with NOT_FOUND', () => {
      const error = new ApiError('Resource not found', ApiErrorCode.NOT_FOUND, 404);

      toast.apiError(error);

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Not Found',
        description: 'Resource not found',
      }));
    });

    it('should handle ApiError with VALIDATION_ERROR', () => {
      const error = new ApiError('Invalid email format', ApiErrorCode.VALIDATION_ERROR, 400);

      toast.apiError(error);

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Invalid Input',
        description: 'Invalid email format',
      }));
    });

    it('should handle ApiError with NETWORK_ERROR', () => {
      const error = new ApiError('Network error', ApiErrorCode.NETWORK_ERROR, 0);

      toast.apiError(error);

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Connection Error',
        description: 'Unable to connect to the server. Please check your internet connection.',
      }));
    });

    it('should handle ApiError with TIMEOUT', () => {
      const error = new ApiError('Request timeout', ApiErrorCode.TIMEOUT, 408);

      toast.apiError(error);

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Request Timeout',
        description: 'The request took too long. Please try again.',
      }));
    });

    it('should handle ApiError with SERVICE_UNAVAILABLE', () => {
      const error = new ApiError('Service unavailable', ApiErrorCode.SERVICE_UNAVAILABLE, 503);

      toast.apiError(error);

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Service Unavailable',
        description: 'The service is temporarily unavailable. Please try again later.',
      }));
    });

    it('should handle ApiError with INTERNAL_ERROR', () => {
      const error = new ApiError('Internal error', ApiErrorCode.INTERNAL_ERROR, 500);

      toast.apiError(error);

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Server Error',
        description: 'An unexpected error occurred. Please try again later.',
      }));
    });

    it('should handle ApiError with ALREADY_EXISTS', () => {
      const error = new ApiError('Item already exists', ApiErrorCode.ALREADY_EXISTS, 409);

      toast.apiError(error);

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Already Exists',
        description: 'Item already exists',
      }));
    });

    it('should handle regular Error with fallback message', () => {
      const error = new Error('Something went wrong');

      toast.apiError(error, 'Operation Failed');

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        title: 'Operation Failed',
        description: 'Something went wrong',
      }));
    });

    it('should handle unknown error type', () => {
      toast.apiError('Unknown error');

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        title: 'An unexpected error occurred',
      }));
    });

    it('should use fallback message for unknown error', () => {
      toast.apiError({}, 'Custom fallback');

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Custom fallback',
      }));
    });
  });

  // ============================================
  // toast.promise Tests
  // ============================================
  describe('toast.promise', () => {
    // Helper to flush promises
    const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

    it('should handle successful promise', async () => {
      const successPromise = Promise.resolve('data');

      const result = toast.promise(successPromise, {
        loading: 'Loading...',
        success: 'Success!',
        error: 'Error!',
      });

      // Initially shows loading
      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'loading',
        title: 'Loading...',
      }));

      await result;
      // Wait for .then() callback to execute
      await flushPromises();

      // Then shows success
      expect(mockContext.removeToast).toHaveBeenCalled();
      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Success!',
      }));
    });

    it('should handle promise with function success message', async () => {
      const successPromise = Promise.resolve({ name: 'Test' });

      await toast.promise(successPromise, {
        loading: 'Loading...',
        success: (data) => `Created ${data.name}`,
        error: 'Error!',
      });
      // Wait for .then() callback to execute
      await flushPromises();

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Created Test',
      }));
    });

    it('should handle failed promise', async () => {
      const error = new Error('Failed!');
      const failPromise = Promise.reject(error);

      try {
        await toast.promise(failPromise, {
          loading: 'Loading...',
          success: 'Success!',
          error: 'Something went wrong',
        });
      } catch {
        // Expected
      }
      // Wait for .catch() callback to execute
      await flushPromises();

      expect(mockContext.removeToast).toHaveBeenCalled();
      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        title: 'Something went wrong',
      }));
    });

    it('should handle promise with function error message', async () => {
      const error = new Error('Network failed');
      const failPromise = Promise.reject(error);

      try {
        await toast.promise(failPromise, {
          loading: 'Loading...',
          success: 'Success!',
          error: (err) => `Error: ${err.message}`,
        });
      } catch {
        // Expected
      }
      // Wait for .catch() callback to execute
      await flushPromises();

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        title: 'Error: Network failed',
      }));
    });

    it('should handle ApiError in promise rejection', async () => {
      const apiError = new ApiError('Unauthorized', ApiErrorCode.UNAUTHORIZED, 401);
      const failPromise = Promise.reject(apiError);

      try {
        await toast.promise(failPromise, {
          loading: 'Loading...',
          success: 'Success!',
          error: 'Error!',
        });
      } catch {
        // Expected
      }
      // Wait for .catch() callback to execute
      await flushPromises();

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        title: 'Session Expired: Please sign in again to continue.',
      }));
    });

    it('should return promise for chaining', async () => {
      const data = { id: 123 };
      const successPromise = Promise.resolve(data);

      const result = await toast.promise(successPromise, {
        loading: 'Loading...',
        success: 'Done!',
        error: 'Error!',
      });

      expect(result).toEqual(data);
    });

    it('should work without context', async () => {
      vi.mocked(toastUtilsModule.getToastContextRef).mockReturnValue(null);

      const data = { id: 123 };
      const result = await toast.promise(Promise.resolve(data), {
        loading: 'Loading...',
        success: 'Done!',
        error: 'Error!',
      });

      expect(result).toEqual(data);
    });
  });

  // ============================================
  // toast.confirm Tests
  // ============================================
  describe('toast.confirm', () => {
    it('should show confirmation toast', () => {
      void toast.confirm({
        title: 'Are you sure?',
        description: 'This action cannot be undone.',
      });

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'default',
        title: 'Are you sure?',
        description: 'This action cannot be undone.',
        duration: Infinity,
      }));
    });

    it('should use default button labels', () => {
      void toast.confirm({ title: 'Confirm?' });

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        action: expect.objectContaining({ label: 'Confirm' }),
        cancel: expect.objectContaining({ label: 'Cancel' }),
      }));
    });

    it('should use custom button labels', () => {
      void toast.confirm({
        title: 'Delete item?',
        confirmText: 'Delete',
        cancelText: 'Keep',
      });

      expect(mockContext.addToast).toHaveBeenCalledWith(expect.objectContaining({
        action: expect.objectContaining({ label: 'Delete' }),
        cancel: expect.objectContaining({ label: 'Keep' }),
      }));
    });

    it('should resolve true on confirm click', async () => {
      let capturedAction: { onClick: () => void } | undefined;
      mockContext.addToast.mockImplementation((options: Omit<Toast, 'id' | 'createdAt'>) => {
        capturedAction = options.action;
        return 'toast-id';
      });

      const confirmPromise = toast.confirm({ title: 'Confirm?' });

      // Simulate clicking confirm
      capturedAction?.onClick();

      const result = await confirmPromise;
      expect(result).toBe(true);
    });

    it('should resolve false on cancel click', async () => {
      let capturedCancel: { onClick: () => void } | undefined;
      mockContext.addToast.mockImplementation((options: Omit<Toast, 'id' | 'createdAt'>) => {
        capturedCancel = options.cancel;
        return 'toast-id';
      });

      const confirmPromise = toast.confirm({ title: 'Confirm?' });

      // Simulate clicking cancel
      capturedCancel?.onClick();

      const result = await confirmPromise;
      expect(result).toBe(false);
    });

    it('should resolve false on dismiss', async () => {
      let capturedOnDismiss: (() => void) | undefined;
      mockContext.addToast.mockImplementation((options: Omit<Toast, 'id' | 'createdAt'>) => {
        capturedOnDismiss = options.onDismiss;
        return 'toast-id';
      });

      const confirmPromise = toast.confirm({ title: 'Confirm?' });

      // Simulate dismissing
      capturedOnDismiss?.();

      const result = await confirmPromise;
      expect(result).toBe(false);
    });
  });

  // ============================================
  // Context Not Available Tests
  // ============================================
  describe('context not available', () => {
    it('should return null and log error when context unavailable', () => {
      vi.mocked(toastUtilsModule.getToastContextRef).mockReturnValue(null);

      const id = toast.success('Test');

      expect(id).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Toast context not available. Make sure ToastProvider is mounted.'
      );
    });
  });

  // ============================================
  // Notification Settings Tests
  // ============================================
  describe('notification settings', () => {
    it('should default to enabled when store throws', () => {
      vi.mocked(storeRegistry.getStore).mockImplementation(() => {
        throw new Error('Store not initialized');
      });

      const id = toast.success('Test');
      expect(id).toBe('toast-id-123');
    });

    it('should default to enabled when enableNotifications undefined', () => {
      vi.mocked(storeRegistry.getStore).mockReturnValue({
        getState: () => ({ enableNotifications: undefined }),
      } as unknown as ReturnType<typeof storeRegistry.getStore>);

      const id = toast.success('Test');
      expect(id).toBe('toast-id-123');
    });
  });
});
