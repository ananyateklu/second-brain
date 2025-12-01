import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ragService } from '../../../services';
import { IndexingJobResponse, IndexStatsResponse, VectorStoreProvider, EmbeddingProvider } from '../../../types/rag';
import { QUERY_KEYS } from '../../../lib/constants';

export const useStartIndexing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, embeddingProvider, vectorStoreProvider }: { userId?: string; embeddingProvider?: EmbeddingProvider; vectorStoreProvider?: VectorStoreProvider }) =>
      ragService.startIndexing({ userId, embeddingProvider, vectorStoreProvider }),
    onSuccess: (_, variables) => {
      // Invalidate stats query for the specific user to refresh after indexing starts
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.indexing.stats(variables.userId) });
    },
  });
};

export const useIndexingStatus = (jobId: string | null, enabled: boolean = true) => {
  return useQuery<IndexingJobResponse>({
    queryKey: QUERY_KEYS.indexing.job(jobId || ''),
    queryFn: () => ragService.getIndexingStatus(jobId!),
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Continue polling if job is still running or pending
      if (data?.status === 'running' || data?.status === 'pending') {
        return 1000; // Poll every 1 second for faster updates
      }
      // For completed/failed status, do one final refetch after a short delay
      // to ensure we have the latest status before stopping
      if (data?.status === 'completed' || data?.status === 'partially_completed' || data?.status === 'failed') {
        // Return a small interval to allow one more refetch, then stop
        // This ensures we capture the final status update
        return false; // Stop polling after final status is confirmed
      }
      return false; // Stop polling for unknown statuses
    },
    refetchOnWindowFocus: true, // Refetch when window regains focus to catch any updates
  });
};

export const useIndexStats = (userId: string = 'default-user') => {
  return useQuery<IndexStatsResponse>({
    queryKey: QUERY_KEYS.indexing.stats(userId),
    queryFn: () => ragService.getIndexStats(userId),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
};

export const useReindexNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => ragService.reindexNote(noteId),
    onSuccess: () => {
      // Invalidate stats query to refresh after reindexing
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.indexing.all });
    },
  });
};

export const useDeleteIndexedNotes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vectorStoreProvider }: { userId: string; vectorStoreProvider: VectorStoreProvider }) =>
      ragService.deleteIndexedNotes(vectorStoreProvider),
    onSuccess: (_, variables) => {
      // Invalidate stats query for the specific user to refresh after deletion
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.indexing.stats(variables.userId) });
    },
  });
};
