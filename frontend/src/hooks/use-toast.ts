/**
 * Toast Notifications Hook
 * Enhanced toast system with API error handling
 */

import { toast as sonnerToast } from 'sonner';
import { ApiError, ApiErrorCode, isApiError } from '../types/api';

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

// ============================================
// Toast Functions
// ============================================

export const toast = {
  /**
   * Show success toast
   */
  success: (message: string, description?: string, options?: Omit<ToastOptions, 'description'>) => {
    sonnerToast.success(message, {
      description,
      duration: options?.duration ?? 4000,
      action: options?.action,
    });
  },

  /**
   * Show error toast
   */
  error: (message: string, description?: string, options?: Omit<ToastOptions, 'description'>) => {
    sonnerToast.error(message, {
      description,
      duration: options?.duration ?? 5000,
      action: options?.action,
    });
  },

  /**
   * Show error toast from ApiError
   */
  apiError: (error: unknown, fallbackMessage?: string) => {
    if (isApiError(error)) {
      const { title, message } = getApiErrorDisplay(error);
      sonnerToast.error(title, {
        description: message,
        duration: 5000,
      });
    } else if (error instanceof Error) {
      sonnerToast.error(fallbackMessage || 'Error', {
        description: error.message,
        duration: 5000,
      });
    } else {
      sonnerToast.error(fallbackMessage || 'An unexpected error occurred', {
        duration: 5000,
      });
    }
  },

  /**
   * Show info toast
   */
  info: (message: string, description?: string, options?: Omit<ToastOptions, 'description'>) => {
    sonnerToast.info(message, {
      description,
      duration: options?.duration ?? 4000,
      action: options?.action,
    });
  },

  /**
   * Show warning toast
   */
  warning: (message: string, description?: string, options?: Omit<ToastOptions, 'description'>) => {
    sonnerToast.warning(message, {
      description,
      duration: options?.duration ?? 4000,
      action: options?.action,
    });
  },

  /**
   * Show loading toast (returns dismiss function)
   */
  loading: (message: string): string | number => {
    return sonnerToast.loading(message);
  },

  /**
   * Dismiss a specific toast or all toasts
   */
  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
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
    return sonnerToast.promise(promise, {
      loading,
      success,
      error: (err: Error) => {
        if (isApiError(err)) {
          const display = getApiErrorDisplay(err);
          return `${display.title}: ${display.message}`;
        }
        return typeof error === 'function' ? error(err) : error;
      },
    });
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
      sonnerToast(title, {
        description,
        duration: Infinity,
        action: {
          label: confirmText,
          onClick: () => resolve(true),
        },
        cancel: {
          label: cancelText,
          onClick: () => resolve(false),
        },
        onDismiss: () => resolve(false),
        onAutoClose: () => resolve(false),
      });
    });
  },

  /**
   * Show custom toast
   */
  custom: (message: string, options?: ToastOptions) => {
    sonnerToast(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
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
