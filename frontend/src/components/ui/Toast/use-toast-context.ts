/**
 * Toast Context Hook
 * Hook for consuming toast context in components
 */

import { useContext } from 'react';
import { ToastContext, ToastContextValue } from './ToastContext';

export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}

