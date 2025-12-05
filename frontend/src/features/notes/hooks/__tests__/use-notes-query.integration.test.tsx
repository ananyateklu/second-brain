/**
 * Integration tests for useNotes hook using MSW
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../use-notes-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../test/mocks/server';
import { mockNotes } from '../../../../test/mocks/handlers';
import { ReactNode } from 'react';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
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
}

// Wrapper component with providers
function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useNotes hook integration tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  describe('useNotes', () => {
    it('should fetch notes successfully', async () => {
      const { result } = renderHook(() => useNotes(), {
        wrapper: createWrapper(queryClient),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify data matches mock
      expect(result.current.data).toEqual(mockNotes);
      expect(result.current.data).toHaveLength(2);
    });

    it('should handle server error gracefully', async () => {
      // Override handler for this test
      server.use(
        http.get('/api/notes', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { result } = renderHook(() => useNotes(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should handle empty notes list', async () => {
      server.use(
        http.get('/api/notes', () => {
          return HttpResponse.json([]);
        })
      );

      const { result } = renderHook(() => useNotes(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useCreateNote', () => {
    it('should create a new note', async () => {
      const { result } = renderHook(() => useCreateNote(), {
        wrapper: createWrapper(queryClient),
      });

      const newNote = {
        title: 'New Test Note',
        content: 'This is test content',
        tags: ['test'],
        isArchived: false,
      };

      // Trigger mutation
      result.current.mutate(newNote);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the returned note has an ID
      expect(result.current.data?.id).toBeDefined();
      expect(result.current.data?.title).toBe('New Test Note');
    });

    it('should handle validation error', async () => {
      server.use(
        http.post('/api/notes', () => {
          return HttpResponse.json(
            { error: 'Title is required' },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useCreateNote(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        title: '',
        content: 'Content without title',
        tags: [],
        isArchived: false,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useUpdateNote', () => {
    it('should update an existing note', async () => {
      const { result } = renderHook(() => useUpdateNote(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        id: 'note-1',
        data: {
          title: 'Updated Title',
          content: 'Updated content',
          tags: ['updated'],
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.title).toBe('Updated Title');
    });

    it('should handle note not found', async () => {
      server.use(
        http.put('/api/notes/:id', () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      const { result } = renderHook(() => useUpdateNote(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        id: 'non-existent',
        data: {
          title: 'Title',
          content: 'Content',
          tags: [],
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useDeleteNote', () => {
    it('should delete a note', async () => {
      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate('note-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle delete of non-existent note', async () => {
      server.use(
        http.delete('/api/notes/:id', () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate('non-existent');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
