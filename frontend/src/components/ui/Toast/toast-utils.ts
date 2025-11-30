/**
 * Toast Utilities
 * Shared utilities and singleton reference for toast system
 */

import { ToastContextValue } from './ToastContext';

// Store reference to context functions for use outside React components
let toastContextRef: ToastContextValue | null = null;

export function setToastContextRef(context: ToastContextValue | null): void {
  toastContextRef = context;
}

export function getToastContextRef(): ToastContextValue | null {
  return toastContextRef;
}

