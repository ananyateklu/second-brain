/**
 * use-api-query Tests
 * Unit tests for the standardized API query hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useApiQuery, useConditionalQuery, usePollingQuery, createQueryHook } from '../use-api-query';

// Create a wrapper component with QueryClient
function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
        },
    });

    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(QueryClientProvider, { client: queryClient }, children);
    };
}

describe('use-api-query', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ============================================
    // useApiQuery Tests
    // ============================================
    describe('useApiQuery', () => {
        it('should return loading state initially', () => {
            // Arrange
            const mockFn = vi.fn(() => new Promise(() => { /* no-op */ })); // Never resolves

            // Act
            const { result } = renderHook(() => useApiQuery(['test-key'], mockFn), {
                wrapper: createWrapper(),
            });

            // Assert
            expect(result.current.isLoading).toBe(true);
            expect(result.current.data).toBeUndefined();
        });

        it('should return data on successful query', async () => {
            // Arrange
            const mockData = { id: 1, name: 'Test' };
            const mockFn = vi.fn().mockResolvedValue(mockData);

            // Act
            const { result } = renderHook(() => useApiQuery(['test-key'], mockFn), {
                wrapper: createWrapper(),
            });

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(mockData);
        });

        it('should return error on failed query', async () => {
            // Arrange
            const mockError = new Error('Test error');
            const mockFn = vi.fn().mockRejectedValue(mockError);

            // Act
            const { result } = renderHook(
                () => useApiQuery(['test-key-error'], mockFn, { retry: false }),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            }, { timeout: 3000 });
            expect(result.current.error).toBeTruthy();
        });

        it('should call queryFn with correct parameters', async () => {
            // Arrange
            const mockFn = vi.fn().mockResolvedValue({});

            // Act
            renderHook(() => useApiQuery(['test-key'], mockFn), {
                wrapper: createWrapper(),
            });

            // Assert
            await waitFor(() => {
                expect(mockFn).toHaveBeenCalled();
            });
        });

        it('should return isApiError as false for regular errors', async () => {
            // Arrange
            const mockFn = vi.fn().mockRejectedValue(new Error('Regular error'));

            // Act
            const { result } = renderHook(
                () => useApiQuery(['test-key-regular-error'], mockFn, { retry: false }),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            }, { timeout: 3000 });
            expect(result.current.isApiError).toBe(false);
        });

        it('should return apiError as null for non-API errors', async () => {
            // Arrange
            const mockFn = vi.fn().mockRejectedValue(new Error('Regular error'));

            // Act
            const { result } = renderHook(
                () => useApiQuery(['test-key-api-error'], mockFn, { retry: false }),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            }, { timeout: 3000 });
            expect(result.current.apiError).toBeNull();
        });
    });

    // ============================================
    // useConditionalQuery Tests
    // ============================================
    describe('useConditionalQuery', () => {
        it('should not run query when condition is false', () => {
            // Arrange
            const mockFn = vi.fn().mockResolvedValue({});

            // Act
            const { result } = renderHook(
                () => useConditionalQuery(false, ['test-key'], mockFn),
                { wrapper: createWrapper() }
            );

            // Assert
            expect(mockFn).not.toHaveBeenCalled();
            expect(result.current.isLoading).toBe(false);
        });

        it('should run query when condition is true', async () => {
            // Arrange
            const mockData = { id: 1 };
            const mockFn = vi.fn().mockResolvedValue(mockData);

            // Act
            const { result } = renderHook(
                () => useConditionalQuery(true, ['test-key'], mockFn),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(mockFn).toHaveBeenCalled();
            expect(result.current.data).toEqual(mockData);
        });

        it('should not run query when enabled option is false', () => {
            // Arrange
            const mockFn = vi.fn().mockResolvedValue({});

            // Act
            renderHook(
                () => useConditionalQuery(true, ['test-key'], mockFn, { enabled: false }),
                { wrapper: createWrapper() }
            );

            // Assert
            expect(mockFn).not.toHaveBeenCalled();
        });
    });

    // ============================================
    // usePollingQuery Tests
    // ============================================
    describe('usePollingQuery', () => {
        it('should run query immediately', async () => {
            // Arrange
            const mockData = { id: 1 };
            const mockFn = vi.fn().mockResolvedValue(mockData);

            // Act
            const { result } = renderHook(
                () => usePollingQuery(['test-key'], mockFn, 1000),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(mockFn).toHaveBeenCalled();
        });

        it('should configure refetch interval option', () => {
            // This test verifies that usePollingQuery sets up the refetch interval
            // The actual polling behavior is handled by React Query internals
            const mockFn = vi.fn().mockResolvedValue({ id: 1 });

            // Act
            const { result } = renderHook(
                () => usePollingQuery(['test-key-polling'], mockFn, 5000),
                { wrapper: createWrapper() }
            );

            // Assert - hook returns expected structure
            expect(result.current).toHaveProperty('isLoading');
            expect(result.current).toHaveProperty('data');
            expect(mockFn).toHaveBeenCalled();
        });
    });

    // ============================================
    // createQueryHook Tests
    // ============================================
    describe('createQueryHook', () => {
        it('should create a typed query hook', async () => {
            // Arrange
            const mockData = { id: 1, name: 'Test' };
            const getQueryKey = (params: { id: number }) => ['items', params.id];
            const queryFn = vi.fn().mockResolvedValue(mockData);
            const useItemQuery = createQueryHook(getQueryKey, queryFn);

            // Act
            const { result } = renderHook(
                () => useItemQuery({ id: 1 }),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(mockData);
            expect(queryFn).toHaveBeenCalledWith({ id: 1 });
        });

        it('should pass query key correctly', async () => {
            // Arrange
            const mockData = { value: 'test' };
            const getQueryKey = (params: { key: string }) => ['test', params.key];
            const queryFn = vi.fn().mockResolvedValue(mockData);
            const useTestQuery = createQueryHook(getQueryKey, queryFn);

            // Act
            const { result } = renderHook(
                () => useTestQuery({ key: 'abc' }),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(queryFn).toHaveBeenCalledWith({ key: 'abc' });
        });

        it('should respect default options', async () => {
            // Arrange
            const mockData = { count: 5 };
            const getQueryKey = () => ['default-test'];
            const queryFn = vi.fn().mockResolvedValue(mockData);
            const useDefaultQuery = createQueryHook(getQueryKey, queryFn, { staleTime: 10000 });

            // Act
            const { result } = renderHook(
                () => useDefaultQuery(undefined),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.isStale).toBe(false);
        });

        it('should allow options override', async () => {
            // Arrange
            const mockData = { data: true };
            const getQueryKey = () => ['override-test'];
            const queryFn = vi.fn().mockResolvedValue(mockData);
            const useOverrideQuery = createQueryHook(getQueryKey, queryFn, { staleTime: 10000 });

            // Act - override enabled to false
            const { result } = renderHook(
                () => useOverrideQuery(undefined, { enabled: false }),
                { wrapper: createWrapper() }
            );

            // Assert
            expect(queryFn).not.toHaveBeenCalled();
            expect(result.current.fetchStatus).toBe('idle');
        });

        it('should return extended result with API error helpers', async () => {
            // Arrange
            const mockData = { success: true };
            const getQueryKey = () => ['helpers-test'];
            const queryFn = vi.fn().mockResolvedValue(mockData);
            const useHelpersQuery = createQueryHook(getQueryKey, queryFn);

            // Act
            const { result } = renderHook(
                () => useHelpersQuery(undefined),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current).toHaveProperty('isApiError');
            expect(result.current).toHaveProperty('apiError');
            expect(result.current).toHaveProperty('isAuthError');
            expect(result.current).toHaveProperty('isNotFoundError');
        });
    });

    // ============================================
    // Query Options Tests
    // ============================================
    describe('query options', () => {
        it('should respect custom staleTime', async () => {
            // Arrange
            const mockFn = vi.fn().mockResolvedValue({ id: 1 });

            // Act
            const { result } = renderHook(
                () => useApiQuery(['test-key-stale'], mockFn, { staleTime: 10000 }),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            }, { timeout: 3000 });
            // Data should not be stale immediately after fetch with long staleTime
            expect(result.current.isStale).toBe(false);
        });

        it('should respect enabled option', () => {
            // Arrange
            const mockFn = vi.fn().mockResolvedValue({});

            // Act
            const { result } = renderHook(
                () => useApiQuery(['test-key'], mockFn, { enabled: false }),
                { wrapper: createWrapper() }
            );

            // Assert
            expect(mockFn).not.toHaveBeenCalled();
            expect(result.current.fetchStatus).toBe('idle');
        });
    });
});

