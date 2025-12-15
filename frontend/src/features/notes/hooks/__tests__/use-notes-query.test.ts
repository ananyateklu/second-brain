/**
 * use-notes-query Tests
 * Unit tests for notes query hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
    useNotes,
    useNote,
    useNotesPaged,
    useCreateNote,
    useUpdateNote,
    useDeleteNote,
    useBulkDeleteNotes,
    useArchiveNote,
    useUnarchiveNote,
    useMoveToFolder,
    useGenerateSummaries,
} from '../use-notes-query';
import { notesService } from '../../../../services';
import { toast } from '../../../../hooks/use-toast';

// Mock the notes service
vi.mock('../../../../services', () => ({
    notesService: {
        getAll: vi.fn(),
        getById: vi.fn(),
        getPaged: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        bulkDelete: vi.fn(),
        archive: vi.fn(),
        unarchive: vi.fn(),
        generateSummaries: vi.fn(),
    },
}));

// Mock toast
vi.mock('../../../../hooks/use-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Helper to create a mock note
function createMockNote(overrides = {}) {
    return {
        id: 'note-1',
        title: 'Test Note',
        content: 'Test content',
        tags: ['test'],
        isArchived: false,
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        ...overrides,
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

describe('use-notes-query', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ============================================
    // useNotes Tests
    // ============================================
    describe('useNotes', () => {
        it('should return loading state initially', () => {
            // Arrange
            vi.mocked(notesService.getAll).mockImplementation(() => new Promise(() => { /* no-op */ }));

            // Act
            const { result } = renderHook(() => useNotes(), {
                wrapper: createWrapper(),
            });

            // Assert
            expect(result.current.isLoading).toBe(true);
        });

        it('should return notes on success', async () => {
            // Arrange
            const mockNotes = [createMockNote({ id: '1' }), createMockNote({ id: '2' })];
            vi.mocked(notesService.getAll).mockResolvedValue(mockNotes);

            // Act
            const { result } = renderHook(() => useNotes(), {
                wrapper: createWrapper(),
            });

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(mockNotes);
        });

        it('should call notesService.getAll', async () => {
            // Arrange
            vi.mocked(notesService.getAll).mockResolvedValue([]);

            // Act
            renderHook(() => useNotes(), {
                wrapper: createWrapper(),
            });

            // Assert
            await waitFor(() => {
                expect(notesService.getAll).toHaveBeenCalled();
            });
        });
    });

    // ============================================
    // useNote Tests
    // ============================================
    describe('useNote', () => {
        it('should return note by id on success', async () => {
            // Arrange
            const mockNote = createMockNote({ id: 'note-123' });
            vi.mocked(notesService.getById).mockResolvedValue(mockNote);

            // Act
            const { result } = renderHook(() => useNote('note-123'), {
                wrapper: createWrapper(),
            });

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(mockNote);
        });

        it('should call notesService.getById with correct id', async () => {
            // Arrange
            vi.mocked(notesService.getById).mockResolvedValue(createMockNote());

            // Act
            renderHook(() => useNote('test-id'), {
                wrapper: createWrapper(),
            });

            // Assert
            await waitFor(() => {
                expect(notesService.getById).toHaveBeenCalledWith('test-id');
            });
        });

        it('should not fetch when id is empty', () => {
            // Act
            const { result } = renderHook(() => useNote(''), {
                wrapper: createWrapper(),
            });

            // Assert
            expect(result.current.fetchStatus).toBe('idle');
            expect(notesService.getById).not.toHaveBeenCalled();
        });
    });

    // ============================================
    // useCreateNote Tests
    // ============================================
    describe('useCreateNote', () => {
        it('should call notesService.create with note data', async () => {
            // Arrange
            const newNote = { title: 'New Note', content: 'Content', tags: [], isArchived: false };
            const createdNote = createMockNote({ ...newNote, id: 'new-id' });
            vi.mocked(notesService.create).mockResolvedValue(createdNote);

            // Act
            const { result } = renderHook(() => useCreateNote(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync(newNote);
            });

            // Assert
            expect(notesService.create).toHaveBeenCalledWith(newNote);
        });

        it('should show success toast on successful creation', async () => {
            // Arrange
            const newNote = { title: 'New Note', content: 'Content', tags: [], isArchived: false };
            vi.mocked(notesService.create).mockResolvedValue(createMockNote());

            // Act
            const { result } = renderHook(() => useCreateNote(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync(newNote);
            });

            // Assert
            expect(toast.success).toHaveBeenCalledWith('Note created successfully');
        });

        it('should show error toast on failed creation', async () => {
            // Arrange
            const newNote = { title: 'New Note', content: 'Content', tags: [], isArchived: false };
            vi.mocked(notesService.create).mockRejectedValue(new Error('Creation failed'));

            // Act
            const { result } = renderHook(() => useCreateNote(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                try {
                    await result.current.mutateAsync(newNote);
                } catch {
                    // Expected error
                }
            });

            // Assert
            expect(toast.error).toHaveBeenCalledWith('Failed to create note', 'Creation failed');
        });
    });

    // ============================================
    // useUpdateNote Tests
    // ============================================
    describe('useUpdateNote', () => {
        it('should call notesService.update with correct parameters', async () => {
            // Arrange
            const updateData = { title: 'Updated Title' };
            vi.mocked(notesService.update).mockResolvedValue(createMockNote({ title: 'Updated Title' }));

            // Act
            const { result } = renderHook(() => useUpdateNote(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({ id: 'note-1', data: updateData });
            });

            // Assert
            expect(notesService.update).toHaveBeenCalledWith('note-1', updateData);
        });

        it('should show success toast on successful update', async () => {
            // Arrange
            vi.mocked(notesService.update).mockResolvedValue(createMockNote());

            // Act
            const { result } = renderHook(() => useUpdateNote(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({ id: 'note-1', data: { title: 'New' } });
            });

            // Assert
            expect(toast.success).toHaveBeenCalledWith('Note updated successfully');
        });

        it('should show error toast on failed update', async () => {
            // Arrange
            vi.mocked(notesService.update).mockRejectedValue(new Error('Update failed'));

            // Act
            const { result } = renderHook(() => useUpdateNote(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                try {
                    await result.current.mutateAsync({ id: 'note-1', data: { title: 'New' } });
                } catch {
                    // Expected error
                }
            });

            // Assert
            expect(toast.error).toHaveBeenCalledWith('Failed to update note', 'Update failed');
        });
    });

    // ============================================
    // useDeleteNote Tests
    // ============================================
    describe('useDeleteNote', () => {
        it('should call notesService.delete with note id', async () => {
            // Arrange
            vi.mocked(notesService.delete).mockResolvedValue(undefined);

            // Act
            const { result } = renderHook(() => useDeleteNote(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync('note-to-delete');
            });

            // Assert
            expect(notesService.delete).toHaveBeenCalledWith('note-to-delete');
        });

        it('should show success toast on successful deletion', async () => {
            // Arrange
            vi.mocked(notesService.delete).mockResolvedValue(undefined);

            // Act
            const { result } = renderHook(() => useDeleteNote(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync('note-1');
            });

            // Assert
            expect(toast.success).toHaveBeenCalledWith('Note deleted successfully');
        });

        it('should show error toast on failed deletion', async () => {
            // Arrange
            vi.mocked(notesService.delete).mockRejectedValue(new Error('Delete failed'));

            // Act
            const { result } = renderHook(() => useDeleteNote(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                try {
                    await result.current.mutateAsync('note-1');
                } catch {
                    // Expected error
                }
            });

            // Assert
            expect(toast.error).toHaveBeenCalledWith('Failed to delete note', 'Delete failed');
        });
    });

    // ============================================
    // useBulkDeleteNotes Tests
    // ============================================
    describe('useBulkDeleteNotes', () => {
        it('should call notesService.bulkDelete with note ids', async () => {
            // Arrange
            const noteIds = ['note-1', 'note-2', 'note-3'];
            vi.mocked(notesService.bulkDelete).mockResolvedValue({
                deletedCount: 3,
                message: 'Successfully deleted 3 note(s)',
            });

            // Act
            const { result } = renderHook(() => useBulkDeleteNotes(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync(noteIds);
            });

            // Assert
            expect(notesService.bulkDelete).toHaveBeenCalledWith(noteIds);
        });

        it('should return deleted count on success', async () => {
            // Arrange
            const noteIds = ['note-1', 'note-2'];
            vi.mocked(notesService.bulkDelete).mockResolvedValue({
                deletedCount: 2,
                message: 'Successfully deleted 2 note(s)',
            });

            // Act
            const { result } = renderHook(() => useBulkDeleteNotes(), {
                wrapper: createWrapper(),
            });

            let response;
            await act(async () => {
                response = await result.current.mutateAsync(noteIds);
            });

            // Assert
            expect(response).toEqual({
                deletedCount: 2,
                message: 'Successfully deleted 2 note(s)',
            });
        });

        it('should handle bulk deletion error', async () => {
            // Arrange
            vi.mocked(notesService.bulkDelete).mockRejectedValue(
                new Error('Bulk delete failed')
            );

            // Act
            const { result } = renderHook(() => useBulkDeleteNotes(), {
                wrapper: createWrapper(),
            });

            // Assert
            await expect(
                act(async () => {
                    await result.current.mutateAsync(['note-1', 'note-2']);
                })
            ).rejects.toThrow('Bulk delete failed');
        });
    });

    // ============================================
    // Optimistic Updates Tests
    // ============================================
    describe('optimistic updates', () => {
        it('should optimistically add new note to cache on create', async () => {
            // Arrange
            const existingNotes = [createMockNote({ id: '1' })];
            const newNoteData = { title: 'New Note', content: 'Content', tags: [], isArchived: false };

            vi.mocked(notesService.getAll).mockResolvedValue(existingNotes);
            vi.mocked(notesService.create).mockImplementation(
                () => new Promise((resolve) => setTimeout(() => { resolve(createMockNote({ id: '2', ...newNoteData })); }, 100))
            );

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            });

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            // Prefill cache
            queryClient.setQueryData(['notes'], existingNotes);

            // Act
            const { result } = renderHook(() => useCreateNote(), { wrapper });

            act(() => {
                result.current.mutate(newNoteData);
            });

            // Assert - optimistic update should happen immediately
            await waitFor(() => {
                const cachedNotes = queryClient.getQueryData<unknown[]>(['notes']);
                expect(cachedNotes?.length).toBe(2);
            });
        });
    });

    // ============================================
    // useNotesPaged Tests
    // ============================================
    describe('useNotesPaged', () => {
        it('should return loading state initially', () => {
            // Arrange
            vi.mocked(notesService.getPaged).mockImplementation(() => new Promise(() => { /* pending */ }));

            // Act
            const { result } = renderHook(() => useNotesPaged({ page: 1, pageSize: 20 }), {
                wrapper: createWrapper(),
            });

            // Assert
            expect(result.current.isLoading).toBe(true);
        });

        it('should return paginated notes on success', async () => {
            // Arrange
            const mockResponse = {
                items: [createMockNote({ id: '1' }), createMockNote({ id: '2' })],
                totalCount: 10,
                page: 1,
                pageSize: 20,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            };
            vi.mocked(notesService.getPaged).mockResolvedValue(mockResponse);

            // Act
            const { result } = renderHook(() => useNotesPaged({ page: 1, pageSize: 20 }), {
                wrapper: createWrapper(),
            });

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data?.items).toHaveLength(2);
            expect(result.current.data?.totalCount).toBe(10);
        });

        it('should call notesService.getPaged with correct params', async () => {
            // Arrange
            vi.mocked(notesService.getPaged).mockResolvedValue({
                items: [],
                totalCount: 0,
                page: 2,
                pageSize: 10,
                totalPages: 0,
                hasNextPage: false,
                hasPreviousPage: true,
            });

            // Act
            renderHook(() => useNotesPaged({ page: 2, pageSize: 10, folder: 'work' }), {
                wrapper: createWrapper(),
            });

            // Assert
            await waitFor(() => {
                expect(notesService.getPaged).toHaveBeenCalledWith({ page: 2, pageSize: 10, folder: 'work' });
            });
        });

        it('should not fetch when disabled', () => {
            // Act
            const { result } = renderHook(() => useNotesPaged({ page: 1, pageSize: 20 }, false), {
                wrapper: createWrapper(),
            });

            // Assert
            expect(result.current.fetchStatus).toBe('idle');
            expect(notesService.getPaged).not.toHaveBeenCalled();
        });
    });

    // ============================================
    // useArchiveNote Tests
    // ============================================
    describe('useArchiveNote', () => {
        it('should call notesService.archive with note id', async () => {
            // Arrange
            const archivedNote = createMockNote({ id: 'note-1', isArchived: true, folder: 'Archived' });
            vi.mocked(notesService.archive).mockResolvedValue(archivedNote);

            // Act
            const { result } = renderHook(() => useArchiveNote(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync('note-1');
            });

            // Assert
            expect(notesService.archive).toHaveBeenCalledWith('note-1');
        });

        it('should show success toast on successful archive', async () => {
            // Arrange
            vi.mocked(notesService.archive).mockResolvedValue(createMockNote({ isArchived: true }));

            // Act
            const { result } = renderHook(() => useArchiveNote(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync('note-1');
            });

            // Assert
            expect(toast.success).toHaveBeenCalledWith('Note archived');
        });

        it('should show error toast on failed archive', async () => {
            // Arrange
            vi.mocked(notesService.archive).mockRejectedValue(new Error('Archive failed'));

            // Act
            const { result } = renderHook(() => useArchiveNote(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                try {
                    await result.current.mutateAsync('note-1');
                } catch {
                    // Expected error
                }
            });

            // Assert
            expect(toast.error).toHaveBeenCalledWith('Failed to archive note', 'Archive failed');
        });

        it('should optimistically update notes list to archived state', async () => {
            // Arrange
            const existingNotes = [
                createMockNote({ id: 'note-1', isArchived: false, folder: 'work' }),
                createMockNote({ id: 'note-2', isArchived: false }),
            ];

            vi.mocked(notesService.archive).mockImplementation(
                () => new Promise((resolve) => setTimeout(() => {
                    resolve(createMockNote({ id: 'note-1', isArchived: true, folder: 'Archived' }));
                }, 100))
            );

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            });

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            queryClient.setQueryData(['notes'], existingNotes);

            // Act
            const { result } = renderHook(() => useArchiveNote(), { wrapper });

            act(() => {
                result.current.mutate('note-1');
            });

            // Assert - optimistic update should set isArchived and folder immediately
            await waitFor(() => {
                const cachedNotes = queryClient.getQueryData<Array<{ id: string; isArchived: boolean; folder?: string }>>(['notes']);
                const note = cachedNotes?.find(n => n.id === 'note-1');
                expect(note?.isArchived).toBe(true);
                expect(note?.folder).toBe('Archived');
            });
        });
    });

    // ============================================
    // useUnarchiveNote Tests
    // ============================================
    describe('useUnarchiveNote', () => {
        it('should call notesService.unarchive with note id', async () => {
            // Arrange
            const unarchivedNote = createMockNote({ id: 'note-1', isArchived: false, folder: undefined });
            vi.mocked(notesService.unarchive).mockResolvedValue(unarchivedNote);

            // Act
            const { result } = renderHook(() => useUnarchiveNote(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync('note-1');
            });

            // Assert
            expect(notesService.unarchive).toHaveBeenCalledWith('note-1');
        });

        it('should show success toast on successful unarchive', async () => {
            // Arrange
            vi.mocked(notesService.unarchive).mockResolvedValue(createMockNote({ isArchived: false }));

            // Act
            const { result } = renderHook(() => useUnarchiveNote(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync('note-1');
            });

            // Assert
            expect(toast.success).toHaveBeenCalledWith('Note restored from archive');
        });

        it('should show error toast on failed unarchive', async () => {
            // Arrange
            vi.mocked(notesService.unarchive).mockRejectedValue(new Error('Unarchive failed'));

            // Act
            const { result } = renderHook(() => useUnarchiveNote(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                try {
                    await result.current.mutateAsync('note-1');
                } catch {
                    // Expected error
                }
            });

            // Assert
            expect(toast.error).toHaveBeenCalledWith('Failed to restore note', 'Unarchive failed');
        });

        it('should optimistically update notes list to unarchived state', async () => {
            // Arrange
            const existingNotes = [
                createMockNote({ id: 'note-1', isArchived: true, folder: 'Archived' }),
                createMockNote({ id: 'note-2', isArchived: false }),
            ];

            vi.mocked(notesService.unarchive).mockImplementation(
                () => new Promise((resolve) => setTimeout(() => {
                    resolve(createMockNote({ id: 'note-1', isArchived: false, folder: undefined }));
                }, 100))
            );

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            });

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            queryClient.setQueryData(['notes'], existingNotes);

            // Act
            const { result } = renderHook(() => useUnarchiveNote(), { wrapper });

            act(() => {
                result.current.mutate('note-1');
            });

            // Assert - optimistic update should set isArchived to false
            await waitFor(() => {
                const cachedNotes = queryClient.getQueryData<Array<{ id: string; isArchived: boolean; folder?: string }>>(['notes']);
                const note = cachedNotes?.find(n => n.id === 'note-1');
                expect(note?.isArchived).toBe(false);
            });
        });
    });

    // ============================================
    // useMoveToFolder Tests
    // ============================================
    describe('useMoveToFolder', () => {
        it('should call notesService.update with folder parameter', async () => {
            // Arrange
            vi.mocked(notesService.update).mockResolvedValue(createMockNote({ folder: 'work' }));

            // Act
            const { result } = renderHook(() => useMoveToFolder(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({ id: 'note-1', folder: 'work' });
            });

            // Assert
            expect(notesService.update).toHaveBeenCalledWith('note-1', { folder: 'work', updateFolder: true });
        });

        it('should show success toast with folder name on successful move', async () => {
            // Arrange
            vi.mocked(notesService.update).mockResolvedValue(createMockNote({ folder: 'Projects' }));

            // Act
            const { result } = renderHook(() => useMoveToFolder(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({ id: 'note-1', folder: 'Projects' });
            });

            // Assert
            expect(toast.success).toHaveBeenCalledWith('Moved to folder "Projects"');
        });

        it('should show success toast for removing from folder', async () => {
            // Arrange
            vi.mocked(notesService.update).mockResolvedValue(createMockNote({ folder: undefined }));

            // Act
            const { result } = renderHook(() => useMoveToFolder(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({ id: 'note-1', folder: null });
            });

            // Assert
            expect(toast.success).toHaveBeenCalledWith('Removed from folder');
        });

        it('should show error toast on failed move', async () => {
            // Arrange
            vi.mocked(notesService.update).mockRejectedValue(new Error('Move failed'));

            // Act
            const { result } = renderHook(() => useMoveToFolder(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                try {
                    await result.current.mutateAsync({ id: 'note-1', folder: 'work' });
                } catch {
                    // Expected error
                }
            });

            // Assert
            expect(toast.error).toHaveBeenCalledWith('Failed to move note', 'Move failed');
        });

        it('should optimistically update notes list folder', async () => {
            // Arrange
            const existingNotes = [
                createMockNote({ id: 'note-1', folder: undefined }),
                createMockNote({ id: 'note-2', folder: 'work' }),
            ];

            vi.mocked(notesService.update).mockImplementation(
                () => new Promise((resolve) => setTimeout(() => {
                    resolve(createMockNote({ id: 'note-1', folder: 'projects' }));
                }, 100))
            );

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            });

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            queryClient.setQueryData(['notes'], existingNotes);

            // Act
            const { result } = renderHook(() => useMoveToFolder(), { wrapper });

            act(() => {
                result.current.mutate({ id: 'note-1', folder: 'projects' });
            });

            // Assert - optimistic update should set folder immediately
            await waitFor(() => {
                const cachedNotes = queryClient.getQueryData<Array<{ id: string; folder?: string }>>(['notes']);
                const note = cachedNotes?.find(n => n.id === 'note-1');
                expect(note?.folder).toBe('projects');
            });
        });
    });

    // ============================================
    // useGenerateSummaries Tests
    // ============================================
    describe('useGenerateSummaries', () => {
        it('should call notesService.generateSummaries with note ids', async () => {
            // Arrange
            const mockResponse = {
                totalProcessed: 2,
                successCount: 2,
                failureCount: 0,
                skippedCount: 0,
                results: [
                    { noteId: 'note-1', title: 'Note 1', success: true, summary: 'Summary 1', skipped: false },
                    { noteId: 'note-2', title: 'Note 2', success: true, summary: 'Summary 2', skipped: false },
                ],
            };
            vi.mocked(notesService.generateSummaries).mockResolvedValue(mockResponse);

            // Act
            const { result } = renderHook(() => useGenerateSummaries(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync(['note-1', 'note-2']);
            });

            // Assert
            expect(notesService.generateSummaries).toHaveBeenCalledWith(['note-1', 'note-2']);
        });

        it('should return generated summaries on success', async () => {
            // Arrange
            const mockResponse = {
                totalProcessed: 3,
                successCount: 3,
                failureCount: 0,
                skippedCount: 0,
                results: [
                    { noteId: 'note-1', title: 'Note 1', success: true, summary: 'First summary', skipped: false },
                    { noteId: 'note-2', title: 'Note 2', success: true, summary: 'Second summary', skipped: false },
                    { noteId: 'note-3', title: 'Note 3', success: true, summary: 'Third summary', skipped: false },
                ],
            };
            vi.mocked(notesService.generateSummaries).mockResolvedValue(mockResponse);

            // Act
            const { result } = renderHook(() => useGenerateSummaries(), {
                wrapper: createWrapper(),
            });

            let response;
            await act(async () => {
                response = await result.current.mutateAsync(['note-1', 'note-2', 'note-3']);
            });

            // Assert
            expect(response).toEqual(mockResponse);
        });

        it('should show error toast on failed generation', async () => {
            // Arrange
            vi.mocked(notesService.generateSummaries).mockRejectedValue(new Error('Generation failed'));

            // Act
            const { result } = renderHook(() => useGenerateSummaries(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                try {
                    await result.current.mutateAsync(['note-1']);
                } catch {
                    // Expected error
                }
            });

            // Assert
            expect(toast.error).toHaveBeenCalledWith('Failed to generate summaries', 'Generation failed');
        });

        it('should handle empty note ids array', async () => {
            // Arrange
            const mockResponse = {
                totalProcessed: 0,
                successCount: 0,
                failureCount: 0,
                skippedCount: 0,
                results: [],
            };
            vi.mocked(notesService.generateSummaries).mockResolvedValue(mockResponse);

            // Act
            const { result } = renderHook(() => useGenerateSummaries(), {
                wrapper: createWrapper(),
            });

            let response: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
            await act(async () => {
                response = await result.current.mutateAsync([]);
            });

            // Assert
            expect(notesService.generateSummaries).toHaveBeenCalledWith([]);
            expect(response?.totalProcessed).toBe(0);
        });
    });

    // ============================================
    // Rollback Tests
    // ============================================
    describe('rollback on error', () => {
        it('should rollback notes list on update error', async () => {
            // Arrange
            const existingNotes = [createMockNote({ id: 'note-1', title: 'Original Title' })];

            vi.mocked(notesService.update).mockRejectedValue(new Error('Update failed'));

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            });

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            queryClient.setQueryData(['notes'], existingNotes);

            // Act
            const { result } = renderHook(() => useUpdateNote(), { wrapper });

            await act(async () => {
                try {
                    await result.current.mutateAsync({ id: 'note-1', data: { title: 'New Title' } });
                } catch {
                    // Expected error
                }
            });

            // Assert - should rollback to original state
            await waitFor(() => {
                const cachedNotes = queryClient.getQueryData<Array<{ id: string; title: string }>>(['notes']);
                const note = cachedNotes?.find(n => n.id === 'note-1');
                expect(note?.title).toBe('Original Title');
            });
        });

        it('should rollback on archive error', async () => {
            // Arrange
            const existingNotes = [createMockNote({ id: 'note-1', isArchived: false, folder: 'work' })];

            vi.mocked(notesService.archive).mockRejectedValue(new Error('Archive failed'));

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            });

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            queryClient.setQueryData(['notes'], existingNotes);

            // Act
            const { result } = renderHook(() => useArchiveNote(), { wrapper });

            await act(async () => {
                try {
                    await result.current.mutateAsync('note-1');
                } catch {
                    // Expected error
                }
            });

            // Assert - should rollback to original state (not archived)
            await waitFor(() => {
                const cachedNotes = queryClient.getQueryData<Array<{ id: string; isArchived: boolean; folder?: string }>>(['notes']);
                const note = cachedNotes?.find(n => n.id === 'note-1');
                expect(note?.isArchived).toBe(false);
                expect(note?.folder).toBe('work');
            });
        });

        it('should rollback on move to folder error', async () => {
            // Arrange
            const existingNotes = [createMockNote({ id: 'note-1', folder: 'original' })];

            vi.mocked(notesService.update).mockRejectedValue(new Error('Move failed'));

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            });

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            queryClient.setQueryData(['notes'], existingNotes);

            // Act
            const { result } = renderHook(() => useMoveToFolder(), { wrapper });

            await act(async () => {
                try {
                    await result.current.mutateAsync({ id: 'note-1', folder: 'new-folder' });
                } catch {
                    // Expected error
                }
            });

            // Assert - should rollback to original folder
            await waitFor(() => {
                const cachedNotes = queryClient.getQueryData<Array<{ id: string; folder?: string }>>(['notes']);
                const note = cachedNotes?.find(n => n.id === 'note-1');
                expect(note?.folder).toBe('original');
            });
        });
    });
});

