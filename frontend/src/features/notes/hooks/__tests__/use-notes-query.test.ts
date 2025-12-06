/**
 * use-notes-query Tests
 * Unit tests for notes query hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useNotes, useNote, useCreateNote, useUpdateNote, useDeleteNote, useBulkDeleteNotes } from '../use-notes-query';
import { notesService } from '../../../../services';
import { toast } from '../../../../hooks/use-toast';

// Mock the notes service
vi.mock('../../../../services', () => ({
    notesService: {
        getAll: vi.fn(),
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        bulkDelete: vi.fn(),
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
});

