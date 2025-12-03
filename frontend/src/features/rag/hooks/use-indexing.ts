import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { ragService } from '../../../services';
import { IndexingJobResponse, IndexStatsResponse, VectorStoreProvider, EmbeddingProvider } from '../../../types/rag';
import { QUERY_KEYS } from '../../../lib/constants';
import { useApiQuery, useConditionalQuery } from '../../../hooks/use-api-query';
import { useApiMutation } from '../../../hooks/use-api-mutation';

export const useStartIndexing = () => {
  const queryClient = useQueryClient();

  return useApiMutation<IndexingJobResponse, { userId?: string; embeddingProvider?: EmbeddingProvider; vectorStoreProvider?: VectorStoreProvider }>(
    async ({ userId, embeddingProvider, vectorStoreProvider }) => {
      const job = await ragService.startIndexing({ userId, embeddingProvider, vectorStoreProvider });

      // Store the vector store provider for this job in localStorage so we can track it
      if (job.id && vectorStoreProvider) {
        localStorage.setItem(`indexing_job_${job.id}`, JSON.stringify({
          vectorStoreProvider,
          userId,
        }));
      }

      return job;
    },
    {
      onSuccess: (job, variables) => {
        // Invalidate stats query for the specific user to refresh after indexing starts
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.indexing.stats(variables.userId) });

        // Set up cleanup for when job completes
        const cleanup = setInterval(() => {
          const jobData = queryClient.getQueryData<IndexingJobResponse>(QUERY_KEYS.indexing.job(job.id));
          if (jobData && (jobData.status === 'completed' || jobData.status === 'partially_completed' || jobData.status === 'failed')) {
            localStorage.removeItem(`indexing_job_${job.id}`);
            clearInterval(cleanup);
          }
        }, 2000);

        // Also clean up after 5 minutes as a safety measure
        setTimeout(() => {
          clearInterval(cleanup);
          localStorage.removeItem(`indexing_job_${job.id}`);
        }, 5 * 60 * 1000);
      },
    }
  );
};

export const useIndexingStatus = (jobId: string | null, enabled: boolean = true) => {
  return useConditionalQuery<IndexingJobResponse>(
    enabled && !!jobId,
    QUERY_KEYS.indexing.job(jobId || ''),
    () => ragService.getIndexingStatus(jobId!),
    {
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
    }
  );
};

export const useIndexStats = (userId: string = 'default-user') => {
  return useApiQuery<IndexStatsResponse>(
    QUERY_KEYS.indexing.stats(userId),
    () => ragService.getIndexStats(userId),
    {
      staleTime: 30000, // Consider data fresh for 30 seconds
    }
  );
};

export const useReindexNote = () => {
  return useApiMutation<void, string>(
    (noteId) => ragService.reindexNote(noteId),
    {
      invalidateQueries: [QUERY_KEYS.indexing.all],
    }
  );
};

export const useDeleteIndexedNotes = () => {
  const queryClient = useQueryClient();

  return useApiMutation<void, { userId: string; vectorStoreProvider: VectorStoreProvider }>(
    ({ vectorStoreProvider }) => ragService.deleteIndexedNotes(vectorStoreProvider),
    {
      onSuccess: (_, variables) => {
        // Invalidate stats query for the specific user to refresh after deletion
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.indexing.stats(variables.userId) });
      },
    }
  );
};

/**
 * Hook to track active indexing jobs and their vector stores
 * Returns a Set of vector store providers that are currently being indexed
 */
export const useActiveIndexingVectorStores = (): Set<VectorStoreProvider> => {
  const [activeVectorStores, setActiveVectorStores] = useState<Set<VectorStoreProvider>>(new Set());
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkActiveJobs = () => {
      const vectorStores = new Set<VectorStoreProvider>();

      // Get all indexing job queries from cache
      const cache = queryClient.getQueryCache();
      cache.getAll().forEach((query) => {
        const queryKey = query.queryKey;
        // Check if this is an indexing job query: ['indexing', 'job', jobId]
        if (Array.isArray(queryKey) && queryKey[0] === 'indexing' && queryKey[1] === 'job' && queryKey[2]) {
          const jobId = queryKey[2] as string;
          const jobData = query.state.data as IndexingJobResponse | undefined;

          // If job is active, check localStorage for vector store
          if (jobData && (jobData.status === 'running' || jobData.status === 'pending')) {
            const storedJob = localStorage.getItem(`indexing_job_${jobId}`);
            if (storedJob) {
              try {
                const { vectorStoreProvider } = JSON.parse(storedJob);
                if (vectorStoreProvider) {
                  if (vectorStoreProvider === 'Both') {
                    vectorStores.add('PostgreSQL');
                    vectorStores.add('Pinecone');
                  } else if (vectorStoreProvider === 'PostgreSQL' || vectorStoreProvider === 'Pinecone') {
                    vectorStores.add(vectorStoreProvider as VectorStoreProvider);
                  }
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          } else if (jobData && (jobData.status === 'completed' || jobData.status === 'partially_completed' || jobData.status === 'failed')) {
            // Clean up completed jobs
            localStorage.removeItem(`indexing_job_${jobId}`);
          }
        }
      });

      setActiveVectorStores(vectorStores);
    };

    // Check immediately
    checkActiveJobs();

    // Set up interval to check for active jobs every second
    const interval = setInterval(checkActiveJobs, 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return activeVectorStores;
};
