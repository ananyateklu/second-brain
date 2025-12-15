/**
 * use-github-mutations Tests
 * Unit tests for GitHub mutation hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
    useRerunWorkflow,
    useCancelWorkflowRun,
    useRefreshGitHubData,
} from '../use-github-mutations';
import { githubService } from '../../../../services/github.service';

// Mock the github service
vi.mock('../../../../services/github.service', () => ({
    githubService: {
        rerunWorkflow: vi.fn(),
        cancelWorkflowRun: vi.fn(),
    },
}));

// Create a wrapper component with QueryClient
function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    });

    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(QueryClientProvider, { client: queryClient }, children);
    };
}

describe('use-github-mutations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ============================================
    // useRerunWorkflow Tests
    // ============================================
    describe('useRerunWorkflow', () => {
        it('should call githubService.rerunWorkflow with runId', async () => {
            // Arrange
            vi.mocked(githubService.rerunWorkflow).mockResolvedValue(undefined);

            // Act
            const { result } = renderHook(() => useRerunWorkflow('owner', 'repo'), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync(12345);
            });

            // Assert
            expect(githubService.rerunWorkflow).toHaveBeenCalledWith(12345, 'owner', 'repo');
        });

        it('should call githubService.rerunWorkflow without owner/repo when not provided', async () => {
            // Arrange
            vi.mocked(githubService.rerunWorkflow).mockResolvedValue(undefined);

            // Act
            const { result } = renderHook(() => useRerunWorkflow(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync(67890);
            });

            // Assert
            expect(githubService.rerunWorkflow).toHaveBeenCalledWith(67890, undefined, undefined);
        });

        it('should invalidate queries on success', async () => {
            // Arrange
            vi.mocked(githubService.rerunWorkflow).mockResolvedValue(undefined);

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            });

            const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            // Act
            const { result } = renderHook(() => useRerunWorkflow('owner', 'repo'), { wrapper });

            await act(async () => {
                await result.current.mutateAsync(12345);
            });

            // Assert - should invalidate workflow run and workflow runs list
            await waitFor(() => {
                expect(invalidateQueriesSpy).toHaveBeenCalled();
            });
        });

        it('should handle rerun error', async () => {
            // Arrange
            vi.mocked(githubService.rerunWorkflow).mockRejectedValue(new Error('Rerun failed'));

            // Act
            const { result } = renderHook(() => useRerunWorkflow('owner', 'repo'), {
                wrapper: createWrapper(),
            });

            // Assert
            await expect(
                act(async () => {
                    await result.current.mutateAsync(12345);
                })
            ).rejects.toThrow('Rerun failed');
        });
    });

    // ============================================
    // useCancelWorkflowRun Tests
    // ============================================
    describe('useCancelWorkflowRun', () => {
        it('should call githubService.cancelWorkflowRun with runId', async () => {
            // Arrange
            vi.mocked(githubService.cancelWorkflowRun).mockResolvedValue(undefined);

            // Act
            const { result } = renderHook(() => useCancelWorkflowRun('owner', 'repo'), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync(12345);
            });

            // Assert
            expect(githubService.cancelWorkflowRun).toHaveBeenCalledWith(12345, 'owner', 'repo');
        });

        it('should call githubService.cancelWorkflowRun without owner/repo when not provided', async () => {
            // Arrange
            vi.mocked(githubService.cancelWorkflowRun).mockResolvedValue(undefined);

            // Act
            const { result } = renderHook(() => useCancelWorkflowRun(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync(54321);
            });

            // Assert
            expect(githubService.cancelWorkflowRun).toHaveBeenCalledWith(54321, undefined, undefined);
        });

        it('should invalidate queries on success', async () => {
            // Arrange
            vi.mocked(githubService.cancelWorkflowRun).mockResolvedValue(undefined);

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            });

            const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            // Act
            const { result } = renderHook(() => useCancelWorkflowRun('owner', 'repo'), { wrapper });

            await act(async () => {
                await result.current.mutateAsync(12345);
            });

            // Assert
            await waitFor(() => {
                expect(invalidateQueriesSpy).toHaveBeenCalled();
            });
        });

        it('should handle cancel error', async () => {
            // Arrange
            vi.mocked(githubService.cancelWorkflowRun).mockRejectedValue(new Error('Cancel failed'));

            // Act
            const { result } = renderHook(() => useCancelWorkflowRun('owner', 'repo'), {
                wrapper: createWrapper(),
            });

            // Assert
            await expect(
                act(async () => {
                    await result.current.mutateAsync(12345);
                })
            ).rejects.toThrow('Cancel failed');
        });
    });

    // ============================================
    // useRefreshGitHubData Tests
    // ============================================
    describe('useRefreshGitHubData', () => {
        it('should invalidate all github queries', async () => {
            // Arrange
            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            });

            const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            // Act
            const { result } = renderHook(() => useRefreshGitHubData(), { wrapper });

            await act(async () => {
                await result.current.mutateAsync();
            });

            // Assert
            expect(invalidateQueriesSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    queryKey: ['github'],
                })
            );
        });

        it('should complete successfully without errors', async () => {
            // Act
            const { result } = renderHook(() => useRefreshGitHubData(), {
                wrapper: createWrapper(),
            });

            // Assert - should not throw
            await expect(
                act(async () => {
                    await result.current.mutateAsync();
                })
            ).resolves.toBeUndefined();
        });

        it('should set isSuccess after completion', async () => {
            // Act
            const { result } = renderHook(() => useRefreshGitHubData(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync();
            });

            // Assert - wait for success state
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
        });
    });

    // ============================================
    // Query Invalidation Tests
    // ============================================
    describe('query invalidation', () => {
        it('useRerunWorkflow should use predicate to filter workflowRuns queries', async () => {
            // Arrange
            vi.mocked(githubService.rerunWorkflow).mockResolvedValue(undefined);

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            });

            // Set up some queries
            queryClient.setQueryData(['github', 'workflowRuns', 'owner', 'repo'], []);
            queryClient.setQueryData(['github', 'issues', 'owner', 'repo'], []);

            const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            // Act
            const { result } = renderHook(() => useRerunWorkflow('owner', 'repo'), { wrapper });

            await act(async () => {
                await result.current.mutateAsync(12345);
            });

            // Assert - should have called invalidateQueries
            await waitFor(() => {
                expect(invalidateQueriesSpy).toHaveBeenCalled();
            });
        });

        it('useCancelWorkflowRun should use predicate to filter workflowRuns queries', async () => {
            // Arrange
            vi.mocked(githubService.cancelWorkflowRun).mockResolvedValue(undefined);

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            });

            // Set up some queries
            queryClient.setQueryData(['github', 'workflowRuns', 'owner', 'repo'], []);

            const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            // Act
            const { result } = renderHook(() => useCancelWorkflowRun('owner', 'repo'), { wrapper });

            await act(async () => {
                await result.current.mutateAsync(12345);
            });

            // Assert
            await waitFor(() => {
                expect(invalidateQueriesSpy).toHaveBeenCalled();
            });
        });
    });
});
