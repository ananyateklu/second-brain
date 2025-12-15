/**
 * useToastContext Hook Tests
 * Unit tests for the toast context hook
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useToastContext } from '../use-toast-context';
import { ToastProvider } from '../ToastContext';

describe('useToastContext', () => {
    it('should throw error when used outside ToastProvider', () => {
        // The hook should throw when used outside provider
        expect(() => {
            renderHook(() => useToastContext());
        }).toThrow('useToastContext must be used within a ToastProvider');
    });

    it('should return context when used within ToastProvider', () => {
        // Create wrapper with provider
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <ToastProvider>{children}</ToastProvider>
        );

        const { result } = renderHook(() => useToastContext(), { wrapper });

        // Should return the context value
        expect(result.current).toBeDefined();
        expect(result.current.toasts).toBeDefined();
        expect(typeof result.current.addToast).toBe('function');
        expect(typeof result.current.removeToast).toBe('function');
    });
});
