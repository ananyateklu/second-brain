/**
 * Toast Context
 * Global state management for toast notifications
 */

import { createContext, useReducer, useCallback, ReactNode, useRef, useEffect, useMemo } from 'react';
import { setToastContextRef } from './toast-utils';

// ============================================
// Types
// ============================================

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'default';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
  action?: ToastAction;
  cancel?: ToastAction;
  onDismiss?: () => void;
  onAutoClose?: () => void;
  createdAt: number;
  isExiting?: boolean;
}

export interface ToastOptions {
  description?: string;
  duration?: number;
  action?: ToastAction;
  cancel?: ToastAction;
  onDismiss?: () => void;
  onAutoClose?: () => void;
}

interface ToastState {
  toasts: Toast[];
}

type ToastActionType =
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'UPDATE_TOAST'; payload: { id: string; updates: Partial<Toast> } }
  | { type: 'MARK_EXITING'; payload: string }
  | { type: 'CLEAR_ALL' };

// ============================================
// Context
// ============================================

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
  clearAll: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ToastContext = createContext<ToastContextValue | null>(null);

// ============================================
// Reducer
// ============================================

const toastReducer = (state: ToastState, action: ToastActionType): ToastState => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.payload],
      };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.payload),
      };
    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((toast) =>
          toast.id === action.payload.id
            ? { ...toast, ...action.payload.updates }
            : toast
        ),
      };
    case 'MARK_EXITING':
      return {
        ...state,
        toasts: state.toasts.map((toast) =>
          toast.id === action.payload ? { ...toast, isExiting: true } : toast
        ),
      };
    case 'CLEAR_ALL':
      return {
        ...state,
        toasts: [],
      };
    default:
      return state;
  }
};

// ============================================
// Provider
// ============================================

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });
  const toastIdCounter = useRef(0);

  const generateId = useCallback(() => {
    toastIdCounter.current += 1;
    return `toast-${toastIdCounter.current}-${Date.now()}`;
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id' | 'createdAt'>): string => {
      const id = generateId();
      const newToast: Toast = {
        ...toast,
        id,
        createdAt: Date.now(),
      };

      dispatch({ type: 'ADD_TOAST', payload: newToast });

      return id;
    },
    [generateId]
  );

  // Remove oldest toasts if exceeding max
  useEffect(() => {
    if (state.toasts.length > maxToasts) {
      const oldestToast = state.toasts[0];
      if (oldestToast) {
        dispatch({ type: 'REMOVE_TOAST', payload: oldestToast.id });
      }
    }
  }, [state.toasts.length, maxToasts, state.toasts]);

  const removeToast = useCallback((id: string) => {
    // First mark as exiting for animation
    dispatch({ type: 'MARK_EXITING', payload: id });
    
    // Then remove after animation completes
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: id });
    }, 300); // Match animation duration
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    dispatch({ type: 'UPDATE_TOAST', payload: { id, updates } });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toasts: state.toasts,
        addToast,
        removeToast,
        updateToast,
        clearAll,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

// ============================================
// Provider with Ref (for external access)
// ============================================

// Provider wrapper that sets the context ref
export function ToastProviderWithRef({ children, maxToasts = 5 }: ToastProviderProps) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });
  const toastIdCounter = useRef(0);

  const generateId = useCallback(() => {
    toastIdCounter.current += 1;
    return `toast-${toastIdCounter.current}-${Date.now()}`;
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id' | 'createdAt'>): string => {
      const id = generateId();
      const newToast: Toast = {
        ...toast,
        id,
        createdAt: Date.now(),
      };

      dispatch({ type: 'ADD_TOAST', payload: newToast });

      return id;
    },
    [generateId]
  );

  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'MARK_EXITING', payload: id });
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: id });
    }, 300);
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    dispatch({ type: 'UPDATE_TOAST', payload: { id, updates } });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<ToastContextValue>(
    () => ({
      toasts: state.toasts,
      addToast,
      removeToast,
      updateToast,
      clearAll,
    }),
    [state.toasts, addToast, removeToast, updateToast, clearAll]
  );

  // Set the ref for external access
  useEffect(() => {
    setToastContextRef(contextValue);
    return () => {
      setToastContextRef(null);
    };
  }, [contextValue]);

  // Limit toasts to maxToasts
  useEffect(() => {
    if (state.toasts.length > maxToasts) {
      const toastsToRemove = state.toasts.slice(0, state.toasts.length - maxToasts);
      toastsToRemove.forEach((toast) => {
        removeToast(toast.id);
      });
    }
  }, [state.toasts.length, maxToasts, removeToast, state.toasts]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
    </ToastContext.Provider>
  );
}

