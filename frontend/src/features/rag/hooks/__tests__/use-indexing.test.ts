/**
 * Use Indexing Hooks Tests
 * Unit tests for the RAG indexing hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useEmbeddingProviders,
  useStartIndexing,
  useIndexingStatus,
  useIndexStats,
  useReindexNote,
  useDeleteIndexedNotes,
  useCancelIndexing,
  useActiveIndexingVectorStores,
} from '../use-indexing';

// Mock the rag service
vi.mock('../../../../services', () => ({
  ragService: {
    getEmbeddingProviders: vi.fn(),
    startIndexing: vi.fn(),
    getIndexingStatus: vi.fn(),
    getIndexStats: vi.fn(),
    reindexNote: vi.fn(),
    deleteIndexedNotes: vi.fn(),
    cancelIndexing: vi.fn(),
  },
}));

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('use-indexing hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ============================================
  // useEmbeddingProviders Tests
  // ============================================
  describe('useEmbeddingProviders', () => {
    it('should fetch embedding providers', async () => {
      const { ragService } = await import('../../../../services');
      vi.mocked(ragService.getEmbeddingProviders).mockResolvedValue([
        {
          name: 'OpenAI',
          isEnabled: true,
          currentModel: 'text-embedding-3-small',
          currentDimensions: 1536,
          availableModels: [
            { modelId: 'text-embedding-3-small', displayName: 'Text Embedding 3 Small', dimensions: 1536, supportsPinecone: true, isDefault: true },
          ],
        },
      ]);

      const { result } = renderHook(() => useEmbeddingProviders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].name).toBe('OpenAI');
    });

    it('should have error state property', async () => {
      const { ragService } = await import('../../../../services');
      vi.mocked(ragService.getEmbeddingProviders).mockResolvedValue([]);

      const { result } = renderHook(() => useEmbeddingProviders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Error state should be false on success
      expect(result.current.isError).toBe(false);
    });
  });

  // ============================================
  // useStartIndexing Tests
  // ============================================
  describe('useStartIndexing', () => {
    it('should start indexing job', async () => {
      const { ragService } = await import('../../../../services');
      const mockJob = {
        id: 'job-123',
        status: 'pending' as const,
        totalNotes: 100,
        processedNotes: 0,
        skippedNotes: 0,
        deletedNotes: 0,
        totalChunks: 0,
        processedChunks: 0,
        errors: [],
        embeddingProvider: 'OpenAI',
        embeddingModel: 'text-embedding-3-small',
        startedAt: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        progressPercentage: 0,
      };
      vi.mocked(ragService.startIndexing).mockResolvedValue(mockJob);

      const { result } = renderHook(() => useStartIndexing(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          userId: 'user-1',
          embeddingProvider: 'OpenAI',
          vectorStoreProvider: 'PostgreSQL',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.id).toBe('job-123');
    });

    it('should call startIndexing with vectorStoreProvider', async () => {
      const { ragService } = await import('../../../../services');
      const mockJob = {
        id: 'job-456',
        status: 'pending' as const,
        totalNotes: 100,
        processedNotes: 0,
        skippedNotes: 0,
        deletedNotes: 0,
        totalChunks: 0,
        processedChunks: 0,
        errors: [],
        embeddingProvider: 'OpenAI',
        embeddingModel: 'text-embedding-3-small',
        startedAt: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        progressPercentage: 0,
      };
      vi.mocked(ragService.startIndexing).mockResolvedValue(mockJob);

      const { result } = renderHook(() => useStartIndexing(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          userId: 'user-1',
          vectorStoreProvider: 'Pinecone',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(ragService.startIndexing).toHaveBeenCalledWith({
        userId: 'user-1',
        vectorStoreProvider: 'Pinecone',
        embeddingProvider: undefined,
        embeddingModel: undefined,
      });
    });

    it('should handle indexing error', async () => {
      const { ragService } = await import('../../../../services');
      vi.mocked(ragService.startIndexing).mockRejectedValue(new Error('Indexing failed'));

      const { result } = renderHook(() => useStartIndexing(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ userId: 'user-1' });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // ============================================
  // useIndexingStatus Tests
  // ============================================
  describe('useIndexingStatus', () => {
    it('should fetch indexing status for a job', async () => {
      const { ragService } = await import('../../../../services');
      vi.mocked(ragService.getIndexingStatus).mockResolvedValue({
        id: 'job-123',
        status: 'running',
        totalNotes: 100,
        processedNotes: 50,
        skippedNotes: 0,
        deletedNotes: 0,
        totalChunks: 200,
        processedChunks: 100,
        errors: [],
        embeddingProvider: 'OpenAI',
        embeddingModel: 'text-embedding-3-small',
        startedAt: new Date().toISOString(),
        completedAt: null,
        createdAt: new Date().toISOString(),
        progressPercentage: 50,
      });

      const { result } = renderHook(() => useIndexingStatus('job-123', true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.status).toBe('running');
      expect(result.current.data?.progressPercentage).toBe(50);
    });

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() => useIndexingStatus('job-123', false), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
    });

    it('should not fetch when jobId is null', () => {
      const { result } = renderHook(() => useIndexingStatus(null, true), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
    });
  });

  // ============================================
  // useIndexStats Tests
  // ============================================
  describe('useIndexStats', () => {
    it('should fetch index stats', async () => {
      const { ragService } = await import('../../../../services');
      vi.mocked(ragService.getIndexStats).mockResolvedValue({
        postgreSQL: {
          totalEmbeddings: 500,
          uniqueNotes: 100,
          lastIndexedAt: new Date().toISOString(),
          embeddingProvider: 'OpenAI',
          vectorStoreProvider: 'PostgreSQL',
          totalNotesInSystem: 100,
          notIndexedCount: 0,
          staleNotesCount: 0,
        },
      });

      const { result } = renderHook(() => useIndexStats('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.postgreSQL?.uniqueNotes).toBe(100);
      expect(result.current.data?.postgreSQL?.totalEmbeddings).toBe(500);
    });

    it('should use default userId if not provided', async () => {
      const { ragService } = await import('../../../../services');
      vi.mocked(ragService.getIndexStats).mockResolvedValue({
        postgreSQL: {
          totalEmbeddings: 200,
          uniqueNotes: 50,
          lastIndexedAt: null,
          embeddingProvider: 'OpenAI',
          vectorStoreProvider: 'PostgreSQL',
          totalNotesInSystem: 50,
          notIndexedCount: 0,
          staleNotesCount: 0,
        },
      });

      const { result } = renderHook(() => useIndexStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(ragService.getIndexStats).toHaveBeenCalledWith('default-user');
    });
  });

  // ============================================
  // useReindexNote Tests
  // ============================================
  describe('useReindexNote', () => {
    it('should reindex a single note', async () => {
      const { ragService } = await import('../../../../services');
      vi.mocked(ragService.reindexNote).mockResolvedValue(undefined);

      const { result } = renderHook(() => useReindexNote(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate('note-123');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(ragService.reindexNote).toHaveBeenCalledWith('note-123');
    });

    it('should handle reindex error', async () => {
      const { ragService } = await import('../../../../services');
      vi.mocked(ragService.reindexNote).mockRejectedValue(new Error('Note not found'));

      const { result } = renderHook(() => useReindexNote(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate('invalid-note');
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // ============================================
  // useDeleteIndexedNotes Tests
  // ============================================
  describe('useDeleteIndexedNotes', () => {
    it('should delete indexed notes', async () => {
      const { ragService } = await import('../../../../services');
      vi.mocked(ragService.deleteIndexedNotes).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteIndexedNotes(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ userId: 'user-1', vectorStoreProvider: 'PostgreSQL' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(ragService.deleteIndexedNotes).toHaveBeenCalledWith('PostgreSQL');
    });
  });

  // ============================================
  // useCancelIndexing Tests
  // ============================================
  describe('useCancelIndexing', () => {
    it('should cancel indexing job', async () => {
      const { ragService } = await import('../../../../services');
      vi.mocked(ragService.cancelIndexing).mockResolvedValue({ message: 'Job cancelled' });

      const { result } = renderHook(() => useCancelIndexing(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ jobId: 'job-123', userId: 'user-1' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(ragService.cancelIndexing).toHaveBeenCalledWith('job-123');
    });
  });

  // ============================================
  // useActiveIndexingVectorStores Tests
  // ============================================
  describe('useActiveIndexingVectorStores', () => {
    it('should return empty set when no active jobs', () => {
      const { result } = renderHook(() => useActiveIndexingVectorStores(), {
        wrapper: createWrapper(),
      });

      expect(result.current.size).toBe(0);
    });

    it('should return set type', () => {
      const { result } = renderHook(() => useActiveIndexingVectorStores(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeInstanceOf(Set);
    });
  });
});
