/**
 * Toast Notifications Hook
 * Enhanced toast system with API error handling
 * Uses custom toast implementation for full UI flexibility
 */

import { getToastContextRef, ToastType, ToastOptions as BaseToastOptions } from '../components/ui/Toast';
import { ApiError, ApiErrorCode, isApiError } from '../types/api';
import { getStore } from '../store/store-registry';

// ============================================
// Types
// ============================================

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Default durations
const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 5000;

// ============================================
// Notification Settings Helper
// ============================================

/**
 * Check if notifications are enabled in user settings.
 * Returns true if setting not yet loaded (default enabled).
 */
function areNotificationsEnabled(): boolean {
  try {
    const store = getStore();
    const state = store.getState();
    return state.enableNotifications ?? true;
  } catch {
    // Store not initialized yet, default to enabled
    return true;
  }
}

// ============================================
// Toast Helper
// ============================================

function showToast(
  type: ToastType,
  title: string,
  options?: BaseToastOptions & { bypassNotificationSetting?: boolean }
): string | null {
  // Check if notifications are enabled (unless bypassed for critical messages)
  // Always show errors and loading states regardless of setting
  const isCritical = type === 'error' || type === 'loading' || options?.bypassNotificationSetting;
  if (!isCritical && !areNotificationsEnabled()) {
    return null;
  }

  const context = getToastContextRef();
  if (!context) {
    console.error('Toast context not available. Make sure ToastProvider is mounted.');
    return null;
  }

  const duration = options?.duration ?? (type === 'error' ? ERROR_DURATION : DEFAULT_DURATION);

  return context.addToast({
    type,
    title,
    description: options?.description,
    duration,
    action: options?.action,
    cancel: options?.cancel,
    onDismiss: options?.onDismiss,
    onAutoClose: options?.onAutoClose,
  });
}

// ============================================
// Toast Functions
// ============================================

export const toast = {
  /**
   * Show success toast
   */
  success: (message: string, description?: string, options?: Omit<ToastOptions, 'description'>): string | null => {
    return showToast('success', message, {
      description,
      duration: options?.duration,
      action: options?.action,
    });
  },

  /**
   * Show error toast
   */
  error: (message: string, description?: string, options?: Omit<ToastOptions, 'description'>): string | null => {
    return showToast('error', message, {
      description,
      duration: options?.duration ?? ERROR_DURATION,
      action: options?.action,
    });
  },

  /**
   * Show error toast from ApiError
   */
  apiError: (error: unknown, fallbackMessage?: string): string | null => {
    if (isApiError(error)) {
      const { title, message } = getApiErrorDisplay(error);
      return showToast('error', title, {
        description: message,
        duration: ERROR_DURATION,
      });
    } else if (error instanceof Error) {
      return showToast('error', fallbackMessage || 'Error', {
        description: error.message,
        duration: ERROR_DURATION,
      });
    } else {
      return showToast('error', fallbackMessage || 'An unexpected error occurred', {
        duration: ERROR_DURATION,
      });
    }
  },

  /**
   * Show info toast
   */
  info: (message: string, description?: string, options?: Omit<ToastOptions, 'description'>): string | null => {
    return showToast('info', message, {
      description,
      duration: options?.duration,
      action: options?.action,
    });
  },

  /**
   * Show warning toast
   */
  warning: (message: string, description?: string, options?: Omit<ToastOptions, 'description'>): string | null => {
    return showToast('warning', message, {
      description,
      duration: options?.duration,
      action: options?.action,
    });
  },

  /**
   * Show loading toast (returns toast id for later dismissal/update)
   */
  loading: (message: string): string | null => {
    return showToast('loading', message, {
      duration: Infinity,
    });
  },

  /**
   * Dismiss a specific toast or all toasts
   */
  dismiss: (toastId?: string | null) => {
    const context = getToastContextRef();
    if (!context) return;

    if (toastId) {
      context.removeToast(toastId);
    } else {
      context.clearAll();
    }
  },

  /**
   * Show promise toast with loading/success/error states
   */
  promise: <T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ): Promise<T> => {
    const context = getToastContextRef();
    if (!context) {
      return promise;
    }

    const loadingId = showToast('loading', loading, { duration: Infinity });

    promise
      .then((data) => {
        if (loadingId) {
          context.removeToast(loadingId);
        }
        const successMessage = typeof success === 'function' ? success(data) : success;
        showToast('success', successMessage);
      })
      .catch((err: Error) => {
        if (loadingId) {
          context.removeToast(loadingId);
        }
        let errorMessage: string;
        if (isApiError(err)) {
          const display = getApiErrorDisplay(err);
          errorMessage = `${display.title}: ${display.message}`;
        } else {
          errorMessage = typeof error === 'function' ? error(err) : error;
        }
        showToast('error', errorMessage);
      });

    return promise;
  },

  /**
   * Show confirmation toast
   */
  confirm: ({
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
  }: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      showToast('default', title, {
        description,
        duration: Infinity,
        action: {
          label: confirmText,
          onClick: () => { resolve(true); },
        },
        cancel: {
          label: cancelText,
          onClick: () => { resolve(false); },
        },
        onDismiss: () => { resolve(false); },
        onAutoClose: () => { resolve(false); },
      });
    });
  },

  /**
   * Show custom toast
   */
  custom: (message: string, options?: ToastOptions): string | null => {
    return showToast('default', message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action,
    });
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get display title and message for API error
 */
function getApiErrorDisplay(error: ApiError): { title: string; message: string } {
  switch (error.code) {
    case ApiErrorCode.UNAUTHORIZED:
      return {
        title: 'Session Expired',
        message: 'Please sign in again to continue.',
      };

    case ApiErrorCode.FORBIDDEN:
      return {
        title: 'Access Denied',
        message: 'You do not have permission to perform this action.',
      };

    case ApiErrorCode.NOT_FOUND:
      return {
        title: 'Not Found',
        message: error.message || 'The requested resource was not found.',
      };

    case ApiErrorCode.VALIDATION_ERROR:
    case ApiErrorCode.INVALID_INPUT:
      return {
        title: 'Invalid Input',
        message: error.message || 'Please check your input and try again.',
      };

    case ApiErrorCode.ALREADY_EXISTS:
      return {
        title: 'Already Exists',
        message: error.message || 'This item already exists.',
      };

    case ApiErrorCode.NETWORK_ERROR:
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
      };

    case ApiErrorCode.TIMEOUT:
      return {
        title: 'Request Timeout',
        message: 'The request took too long. Please try again.',
      };

    case ApiErrorCode.SERVICE_UNAVAILABLE:
      return {
        title: 'Service Unavailable',
        message: 'The service is temporarily unavailable. Please try again later.',
      };

    case ApiErrorCode.INTERNAL_ERROR:
      return {
        title: 'Server Error',
        message: 'An unexpected error occurred. Please try again later.',
      };

    default:
      return {
        title: 'Error',
        message: error.message || 'An unexpected error occurred.',
      };
  }
}

// ============================================
// Hook
// ============================================

/**
 * Hook to access toast functions
 */
export function useToast() {
  return toast;
}

export default toast;
