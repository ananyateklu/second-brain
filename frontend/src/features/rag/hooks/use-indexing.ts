import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { ragService } from '../../../services';
import { IndexingJobResponse, IndexStatsResponse, VectorStoreProvider, EmbeddingProvider, EmbeddingProviderResponse } from '../../../types/rag';
import { indexingKeys } from '../../../lib/query-keys';
import { useApiQuery, useConditionalQuery } from '../../../hooks/use-api-query';
import { useApiMutation } from '../../../hooks/use-api-mutation';

// Store active timers for cleanup on unmount
const activeTimers = new Map<string, { interval: ReturnType<typeof setInterval>; timeout: ReturnType<typeof setTimeout> }>();

// Cleanup function to clear timers for a specific job
function clearJobTimers(jobId: string): void {
  const timers = activeTimers.get(jobId);
  if (timers) {
    clearInterval(timers.interval);
    clearTimeout(timers.timeout);
    activeTimers.delete(jobId);
  }
}

// Export cleanup function for all active timers (for component unmount)
export function clearAllIndexingTimers(): void {
  activeTimers.forEach((_, jobId) => clearJobTimers(jobId));
}

/**
 * Hook to fetch available embedding providers and their models.
 * Models are fetched dynamically from provider APIs.
 */
export const useEmbeddingProviders = () => {
  return useApiQuery<EmbeddingProviderResponse[]>(
    [...indexingKeys.all, 'embedding-providers'],
    () => ragService.getEmbeddingProviders(),
    {
      staleTime: 60 * 1000, // 1 minute - Ollama models can change locally
      refetchOnWindowFocus: true, // Refetch when user returns to tab
    }
  );
};

export const useStartIndexing = () => {
  const queryClient = useQueryClient();

  return useApiMutation<IndexingJobResponse, { userId?: string; embeddingProvider?: EmbeddingProvider; vectorStoreProvider?: VectorStoreProvider; embeddingModel?: string }>(
    async ({ userId, embeddingProvider, vectorStoreProvider, embeddingModel }) => {
      const job = await ragService.startIndexing({ userId, embeddingProvider, vectorStoreProvider, embeddingModel });

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
        void queryClient.invalidateQueries({ queryKey: indexingKeys.stats({ userId: variables.userId }) });

        // Clear any existing timers for this job (in case of retry)
        clearJobTimers(job.id);

        // Set up cleanup for when job completes
        const interval = setInterval(() => {
          const jobData = queryClient.getQueryData<IndexingJobResponse>(indexingKeys.job(job.id));
          if (jobData && (jobData.status === 'completed' || jobData.status === 'failed')) {
            localStorage.removeItem(`indexing_job_${job.id}`);
            clearJobTimers(job.id);
          }
        }, 2000);

        // Also clean up after 5 minutes as a safety measure
        const timeout = setTimeout(() => {
          clearJobTimers(job.id);
          localStorage.removeItem(`indexing_job_${job.id}`);
        }, 5 * 60 * 1000);

        // Store timers for cleanup on unmount
        activeTimers.set(job.id, { interval, timeout });
      },
    }
  );
};

export const useIndexingStatus = (jobId: string | null, enabled = true) => {
  return useConditionalQuery<IndexingJobResponse>(
    enabled && !!jobId,
    indexingKeys.job(jobId || ''),
    () => {
      if (!jobId) throw new Error('Job ID is required');
      return ragService.getIndexingStatus(jobId);
    },
    {
      refetchInterval: (query) => {
        const data = query.state.data;
        // Continue polling if job is still running or pending
        if (data?.status === 'running' || data?.status === 'pending') {
          return 1000; // Poll every 1 second for faster updates
        }
        // For completed/failed status, stop polling
        if (data?.status === 'completed' || data?.status === 'failed') {
          return false; // Stop polling after final status is confirmed
        }
        return false; // Stop polling for unknown statuses
      },
      refetchOnWindowFocus: true, // Refetch when window regains focus to catch any updates
    }
  );
};

export const useIndexStats = (userId = 'default-user', isIndexing = false) => {
  return useApiQuery<IndexStatsResponse>(
    indexingKeys.stats({ userId }),
    () => ragService.getIndexStats(userId),
    {
      staleTime: isIndexing ? 0 : 30000, // No stale time during indexing
      refetchInterval: isIndexing ? 2000 : false, // Poll every 2s during indexing
    }
  );
};

export const useReindexNote = () => {
  return useApiMutation<unknown, string>(
    (noteId) => ragService.reindexNote(noteId),
    {
      invalidateQueries: [indexingKeys.all],
    }
  );
};

export const useDeleteIndexedNotes = () => {
  const queryClient = useQueryClient();

  return useApiMutation<unknown, { userId: string; vectorStoreProvider: VectorStoreProvider }>(
    ({ vectorStoreProvider }) => ragService.deleteIndexedNotes(vectorStoreProvider),
    {
      onSuccess: (_, variables) => {
        // Invalidate stats query for the specific user to refresh after deletion
        void queryClient.invalidateQueries({ queryKey: indexingKeys.stats({ userId: variables.userId }) });
      },
    }
  );
};

export const useCancelIndexing = () => {
  const queryClient = useQueryClient();

  return useApiMutation<{ message: string }, { jobId: string; userId?: string }>(
    ({ jobId }) => ragService.cancelIndexing(jobId),
    {
      onSuccess: (_, variables) => {
        // Invalidate the job query to get the updated status
        void queryClient.invalidateQueries({ queryKey: indexingKeys.job(variables.jobId) });
        // Invalidate stats query if userId is provided
        if (variables.userId) {
          void queryClient.invalidateQueries({ queryKey: indexingKeys.stats({ userId: variables.userId }) });
        }
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
                const parsed: unknown = JSON.parse(storedJob);
                if (
                  typeof parsed === 'object' &&
                  parsed !== null &&
                  'vectorStoreProvider' in parsed &&
                  typeof (parsed as { vectorStoreProvider: unknown }).vectorStoreProvider === 'string'
                ) {
                  const { vectorStoreProvider } = parsed as { vectorStoreProvider: string };
                  if (vectorStoreProvider === 'Both') {
                    vectorStores.add('PostgreSQL');
                    vectorStores.add('Pinecone');
                  } else if (vectorStoreProvider === 'PostgreSQL' || vectorStoreProvider === 'Pinecone') {
                    vectorStores.add(vectorStoreProvider as VectorStoreProvider);
                  }
                }
              } catch {
                // Ignore parse errors
              }
            }
          } else if (jobData && (jobData.status === 'completed' || jobData.status === 'failed')) {
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

    return () => { clearInterval(interval); };
  }, [queryClient]);

  return activeVectorStores;
};
