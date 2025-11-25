import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ragApi } from '../api/rag-api';
import { IndexingJobResponse, IndexStatsResponse } from '../types';

export const useStartIndexing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, embeddingProvider, vectorStoreProvider }: { userId?: string; embeddingProvider?: string; vectorStoreProvider?: string }) =>
      ragApi.startIndexing(userId, embeddingProvider, vectorStoreProvider),
    onSuccess: (_, variables) => {
      // Invalidate stats query for the specific user to refresh after indexing starts
      if (variables.userId) {
        queryClient.invalidateQueries({ queryKey: ['indexStats', variables.userId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['indexStats'] });
      }
    },
  });
};

export const useIndexingStatus = (jobId: string | null, enabled: boolean = true) => {
  return useQuery<IndexingJobResponse>({
    queryKey: ['indexingStatus', jobId],
    queryFn: () => ragApi.getIndexingStatus(jobId!),
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Continue polling if job is still running or pending
      if (data?.status === 'running' || data?.status === 'pending') {
        return 1000; // Poll every 1 second for faster updates
      }
      return false; // Stop polling
    },
  });
};

export const useIndexStats = (userId: string = 'default-user') => {
  return useQuery<IndexStatsResponse>({
    queryKey: ['indexStats', userId],
    queryFn: () => ragApi.getIndexStats(userId),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
};

export const useReindexNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => ragApi.reindexNote(noteId),
    onSuccess: () => {
      // Invalidate stats query to refresh after reindexing
      queryClient.invalidateQueries({ queryKey: ['indexStats'] });
    },
  });
};

export const useDeleteIndexedNotes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vectorStoreProvider }: { userId: string; vectorStoreProvider: string }) =>
      ragApi.deleteIndexedNotes(vectorStoreProvider),
    onSuccess: (_, variables) => {
      // Invalidate stats query for the specific user to refresh after deletion
      queryClient.invalidateQueries({ queryKey: ['indexStats', variables.userId] });
    },
  });
};
