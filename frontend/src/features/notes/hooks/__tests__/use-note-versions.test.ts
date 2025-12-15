/**
 * use-note-versions Tests
 * Unit tests for note version history hooks (PostgreSQL 18 temporal tables)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
    useNoteVersionHistory,
    useNoteVersionAtTime,
    useNoteVersionDiff,
    useRestoreNoteVersion,
    usePrefetchVersionHistory,
    useInvalidateVersionQueries,
} from '../use-note-versions';
import { notesService } from '../../../../services';
import { toast } from '../../../../hooks/use-toast';

// Mock the notes service
vi.mock('../../../../services', () => ({
    notesService: {
        getVersionHistory: vi.fn(),
        getVersionAtTime: vi.fn(),
        getVersionDiff: vi.fn(),
        restoreVersion: vi.fn(),
    },
}));

// Mock toast
vi.mock('../../../../hooks/use-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Helper to create mock version history
function createMockVersionHistory(noteId: string) {
    return {
        noteId,
        totalVersions: 3,
        currentVersion: 3,
        versions: [
            {
                noteId,
                versionNumber: 3,
                isCurrent: true,
                title: 'Latest Version',
                content: 'Latest content',
                validFrom: '2024-01-03T12:00:00Z',
                validTo: null,
                tags: [],
                isArchived: false,
                folder: null,
                modifiedBy: 'user-1',
                changeSummary: null,
                source: 'web' as const,
                imageIds: [],
                createdAt: '2024-01-03T12:00:00Z',
            },
            {
                noteId,
                versionNumber: 2,
                isCurrent: false,
                title: 'Second Version',
                content: 'Second content',
                validFrom: '2024-01-02T12:00:00Z',
                validTo: '2024-01-03T12:00:00Z',
                tags: [],
                isArchived: false,
                folder: null,
                modifiedBy: 'user-1',
                changeSummary: null,
                source: 'web' as const,
                imageIds: [],
                createdAt: '2024-01-02T12:00:00Z',
            },
            {
                noteId,
                versionNumber: 1,
                isCurrent: false,
                title: 'First Version',
                content: 'First content',
                validFrom: '2024-01-01T12:00:00Z',
                validTo: '2024-01-02T12:00:00Z',
                tags: [],
                isArchived: false,
                folder: null,
                modifiedBy: 'user-1',
                changeSummary: null,
                source: 'web' as const,
                imageIds: [],
                createdAt: '2024-01-01T12:00:00Z',
            },
        ],
    };
}

// Helper to create mock version
function createMockVersion(overrides: Record<string, unknown> = {}) {
    return {
        noteId: 'note-1',
        versionNumber: 1,
        isCurrent: false,
        title: 'Test Note',
        content: 'Test content',
        validFrom: '2024-01-01T12:00:00Z',
        validTo: '2024-01-02T12:00:00Z',
        tags: [],
        isArchived: false,
        folder: null,
        modifiedBy: 'user-1',
        changeSummary: null,
        source: 'web' as const,
        imageIds: [],
        createdAt: '2024-01-01T12:00:00Z',
        ...overrides,
    };
}

// Helper to create mock version diff
function createMockVersionDiff(fromVersionNum: number, toVersionNum: number) {
    return {
        noteId: 'note-1',
        fromVersion: createMockVersion({ versionNumber: fromVersionNum, title: 'Old Title', content: 'Old content' }),
        toVersion: createMockVersion({ versionNumber: toVersionNum, isCurrent: true, title: 'New Title', content: 'New content' }),
        titleChanged: true,
        contentChanged: true,
        tagsChanged: false,
        archivedChanged: false,
        folderChanged: false,
        imagesChanged: false,
        tagsAdded: [],
        tagsRemoved: [],
        imagesAdded: [],
        imagesRemoved: [],
    };
}

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

describe('use-note-versions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ============================================
    // useNoteVersionHistory Tests
    // ============================================
    describe('useNoteVersionHistory', () => {
        it('should return loading state initially', () => {
            // Arrange
            vi.mocked(notesService.getVersionHistory).mockImplementation(() => new Promise(() => { /* pending */ }));

            // Act
            const { result } = renderHook(() => useNoteVersionHistory('note-1'), {
                wrapper: createWrapper(),
            });

            // Assert
            expect(result.current.isLoading).toBe(true);
        });

        it('should return version history on success', async () => {
            // Arrange
            const mockHistory = createMockVersionHistory('note-1');
            vi.mocked(notesService.getVersionHistory).mockResolvedValue(mockHistory);

            // Act
            const { result } = renderHook(() => useNoteVersionHistory('note-1'), {
                wrapper: createWrapper(),
            });

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(mockHistory);
            expect(result.current.data?.versions).toHaveLength(3);
        });

        it('should call notesService.getVersionHistory with noteId', async () => {
            // Arrange
            vi.mocked(notesService.getVersionHistory).mockResolvedValue(createMockVersionHistory('test-note'));

            // Act
            renderHook(() => useNoteVersionHistory('test-note'), {
                wrapper: createWrapper(),
            });

            // Assert
            await waitFor(() => {
                expect(notesService.getVersionHistory).toHaveBeenCalledWith('test-note');
            });
        });

        it('should not fetch when noteId is empty', () => {
            // Act
            const { result } = renderHook(() => useNoteVersionHistory(''), {
                wrapper: createWrapper(),
            });

            // Assert
            expect(result.current.fetchStatus).toBe('idle');
            expect(notesService.getVersionHistory).not.toHaveBeenCalled();
        });

        it('should not fetch when enabled is false', () => {
            // Act
            const { result } = renderHook(() => useNoteVersionHistory('note-1', false), {
                wrapper: createWrapper(),
            });

            // Assert
            expect(result.current.fetchStatus).toBe('idle');
            expect(notesService.getVersionHistory).not.toHaveBeenCalled();
        });
    });

    // ============================================
    // useNoteVersionAtTime Tests
    // ============================================
    describe('useNoteVersionAtTime', () => {
        it('should return version at specific time', async () => {
            // Arrange
            const mockVersion = createMockVersion({ versionNumber: 2 });
            vi.mocked(notesService.getVersionAtTime).mockResolvedValue(mockVersion);

            // Act
            const { result } = renderHook(
                () => useNoteVersionAtTime('note-1', '2024-01-02T14:00:00Z'),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(mockVersion);
        });

        it('should call notesService.getVersionAtTime with correct params', async () => {
            // Arrange
            vi.mocked(notesService.getVersionAtTime).mockResolvedValue(createMockVersion());

            // Act
            renderHook(
                () => useNoteVersionAtTime('note-1', '2024-01-15T10:30:00Z'),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(notesService.getVersionAtTime).toHaveBeenCalledWith('note-1', '2024-01-15T10:30:00Z');
            });
        });

        it('should not fetch when noteId is empty', () => {
            // Act
            const { result } = renderHook(
                () => useNoteVersionAtTime('', '2024-01-01T00:00:00Z'),
                { wrapper: createWrapper() }
            );

            // Assert
            expect(result.current.fetchStatus).toBe('idle');
            expect(notesService.getVersionAtTime).not.toHaveBeenCalled();
        });

        it('should not fetch when timestamp is empty', () => {
            // Act
            const { result } = renderHook(
                () => useNoteVersionAtTime('note-1', ''),
                { wrapper: createWrapper() }
            );

            // Assert
            expect(result.current.fetchStatus).toBe('idle');
            expect(notesService.getVersionAtTime).not.toHaveBeenCalled();
        });

        it('should not fetch when enabled is false', () => {
            // Act
            const { result } = renderHook(
                () => useNoteVersionAtTime('note-1', '2024-01-01T00:00:00Z', false),
                { wrapper: createWrapper() }
            );

            // Assert
            expect(result.current.fetchStatus).toBe('idle');
            expect(notesService.getVersionAtTime).not.toHaveBeenCalled();
        });
    });

    // ============================================
    // useNoteVersionDiff Tests
    // ============================================
    describe('useNoteVersionDiff', () => {
        it('should return version diff on success', async () => {
            // Arrange
            const mockDiff = createMockVersionDiff(1, 2);
            vi.mocked(notesService.getVersionDiff).mockResolvedValue(mockDiff);

            // Act
            const { result } = renderHook(
                () => useNoteVersionDiff('note-1', 1, 2),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(mockDiff);
            expect(result.current.data?.titleChanged).toBe(true);
        });

        it('should call notesService.getVersionDiff with correct params', async () => {
            // Arrange
            vi.mocked(notesService.getVersionDiff).mockResolvedValue(createMockVersionDiff(2, 5));

            // Act
            renderHook(
                () => useNoteVersionDiff('note-1', 2, 5),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(notesService.getVersionDiff).toHaveBeenCalledWith('note-1', 2, 5);
            });
        });

        it('should not fetch when noteId is empty', () => {
            // Act
            const { result } = renderHook(
                () => useNoteVersionDiff('', 1, 2),
                { wrapper: createWrapper() }
            );

            // Assert
            expect(result.current.fetchStatus).toBe('idle');
            expect(notesService.getVersionDiff).not.toHaveBeenCalled();
        });

        it('should not fetch when fromVersion is 0', () => {
            // Act
            const { result } = renderHook(
                () => useNoteVersionDiff('note-1', 0, 2),
                { wrapper: createWrapper() }
            );

            // Assert
            expect(result.current.fetchStatus).toBe('idle');
            expect(notesService.getVersionDiff).not.toHaveBeenCalled();
        });

        it('should not fetch when toVersion is 0', () => {
            // Act
            const { result } = renderHook(
                () => useNoteVersionDiff('note-1', 1, 0),
                { wrapper: createWrapper() }
            );

            // Assert
            expect(result.current.fetchStatus).toBe('idle');
            expect(notesService.getVersionDiff).not.toHaveBeenCalled();
        });

        it('should not fetch when versions are equal', () => {
            // Act
            const { result } = renderHook(
                () => useNoteVersionDiff('note-1', 2, 2),
                { wrapper: createWrapper() }
            );

            // Assert
            expect(result.current.fetchStatus).toBe('idle');
            expect(notesService.getVersionDiff).not.toHaveBeenCalled();
        });

        it('should not fetch when enabled is false', () => {
            // Act
            const { result } = renderHook(
                () => useNoteVersionDiff('note-1', 1, 2, false),
                { wrapper: createWrapper() }
            );

            // Assert
            expect(result.current.fetchStatus).toBe('idle');
            expect(notesService.getVersionDiff).not.toHaveBeenCalled();
        });
    });

    // ============================================
    // useRestoreNoteVersion Tests
    // ============================================
    describe('useRestoreNoteVersion', () => {
        it('should call notesService.restoreVersion with correct params', async () => {
            // Arrange
            const mockResponse = { message: 'Note restored to version 2', newVersionNumber: 4, noteId: 'note-1' };
            vi.mocked(notesService.restoreVersion).mockResolvedValue(mockResponse);

            // Act
            const { result } = renderHook(() => useRestoreNoteVersion(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({ noteId: 'note-1', targetVersion: 2 });
            });

            // Assert
            expect(notesService.restoreVersion).toHaveBeenCalledWith('note-1', 2);
        });

        it('should return restore response on success', async () => {
            // Arrange
            const mockResponse = { message: 'Note restored to version 1', newVersionNumber: 5, noteId: 'note-1' };
            vi.mocked(notesService.restoreVersion).mockResolvedValue(mockResponse);

            // Act
            const { result } = renderHook(() => useRestoreNoteVersion(), {
                wrapper: createWrapper(),
            });

            let response;
            await act(async () => {
                response = await result.current.mutateAsync({ noteId: 'note-1', targetVersion: 1 });
            });

            // Assert
            expect(response).toEqual(mockResponse);
        });

        it('should show success toast on successful restore', async () => {
            // Arrange
            const mockResponse = { message: 'Restored successfully', newVersionNumber: 3, noteId: 'note-1' };
            vi.mocked(notesService.restoreVersion).mockResolvedValue(mockResponse);

            // Act
            const { result } = renderHook(() => useRestoreNoteVersion(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({ noteId: 'note-1', targetVersion: 1 });
            });

            // Assert
            expect(toast.success).toHaveBeenCalledWith('Restored successfully');
        });

        it('should show error toast on failed restore', async () => {
            // Arrange
            vi.mocked(notesService.restoreVersion).mockRejectedValue(new Error('Restore failed'));

            // Act
            const { result } = renderHook(() => useRestoreNoteVersion(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                try {
                    await result.current.mutateAsync({ noteId: 'note-1', targetVersion: 1 });
                } catch {
                    // Expected error
                }
            });

            // Assert
            expect(toast.error).toHaveBeenCalledWith('Failed to restore note version', 'Restore failed');
        });

        it('should rollback on error', async () => {
            // Arrange
            const mockHistory = createMockVersionHistory('note-1');
            vi.mocked(notesService.restoreVersion).mockRejectedValue(new Error('Restore failed'));

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            });

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            // Pre-populate cache
            queryClient.setQueryData(['noteVersions', 'history', 'note-1'], mockHistory);

            // Act
            const { result } = renderHook(() => useRestoreNoteVersion(), { wrapper });

            await act(async () => {
                try {
                    await result.current.mutateAsync({ noteId: 'note-1', targetVersion: 1 });
                } catch {
                    // Expected error
                }
            });

            // Assert - cache should still have original data
            const cachedHistory = queryClient.getQueryData(['noteVersions', 'history', 'note-1']);
            expect(cachedHistory).toEqual(mockHistory);
        });
    });

    // ============================================
    // usePrefetchVersionHistory Tests
    // ============================================
    describe('usePrefetchVersionHistory', () => {
        it('should return a prefetch function', () => {
            // Act
            const { result } = renderHook(() => usePrefetchVersionHistory(), {
                wrapper: createWrapper(),
            });

            // Assert
            expect(typeof result.current).toBe('function');
        });

        it('should call prefetchQuery when prefetch function is invoked', async () => {
            // Arrange
            const mockHistory = createMockVersionHistory('note-1');
            vi.mocked(notesService.getVersionHistory).mockResolvedValue(mockHistory);

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false } },
            });

            const prefetchQuerySpy = vi.spyOn(queryClient, 'prefetchQuery');

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            // Act
            const { result } = renderHook(() => usePrefetchVersionHistory(), { wrapper });

            await act(async () => {
                result.current('note-123');
            });

            // Assert
            expect(prefetchQuerySpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    queryKey: ['noteVersions', 'history', 'note-123'],
                })
            );
        });
    });

    // ============================================
    // useInvalidateVersionQueries Tests
    // ============================================
    describe('useInvalidateVersionQueries', () => {
        it('should return an invalidate function', () => {
            // Act
            const { result } = renderHook(() => useInvalidateVersionQueries(), {
                wrapper: createWrapper(),
            });

            // Assert
            expect(typeof result.current).toBe('function');
        });

        it('should call invalidateQueries when invoked', async () => {
            // Arrange
            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false } },
            });

            const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            // Act
            const { result } = renderHook(() => useInvalidateVersionQueries(), { wrapper });

            await act(async () => {
                result.current('note-456');
            });

            // Assert - should invalidate history and diff queries
            expect(invalidateQueriesSpy).toHaveBeenCalledTimes(2);
            expect(invalidateQueriesSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    queryKey: ['noteVersions', 'history', 'note-456'],
                })
            );
        });
    });

    // ============================================
    // Error Handling Tests
    // ============================================
    describe('error handling', () => {
        it('should handle version history fetch error', async () => {
            // Arrange
            vi.mocked(notesService.getVersionHistory).mockRejectedValue(new Error('Fetch failed'));

            // Act
            const { result } = renderHook(() => useNoteVersionHistory('note-1'), {
                wrapper: createWrapper(),
            });

            // Assert
            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            }, { timeout: 5000 });
            expect(result.current.error).toBeTruthy();
        });

        it('should handle version at time fetch error', async () => {
            // Arrange
            vi.mocked(notesService.getVersionAtTime).mockRejectedValue(new Error('Version not found'));

            // Act
            const { result } = renderHook(
                () => useNoteVersionAtTime('note-1', '2024-01-01T00:00:00Z'),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            }, { timeout: 5000 });
        });

        it('should handle version diff fetch error', async () => {
            // Arrange
            vi.mocked(notesService.getVersionDiff).mockRejectedValue(new Error('Diff failed'));

            // Act
            const { result } = renderHook(
                () => useNoteVersionDiff('note-1', 1, 2),
                { wrapper: createWrapper() }
            );

            // Assert
            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            }, { timeout: 5000 });
        });
    });
});
