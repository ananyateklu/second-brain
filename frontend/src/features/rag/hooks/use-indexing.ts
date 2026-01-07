import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { ragService } from '../../../services';
import { IndexingJobResponse, IndexStatsResponse, VectorStoreProvider, EmbeddingProvider, EmbeddingProviderResponse } from '../../../types/rag';
import { indexingKeys } from '../../../lib/query-keys';
import { useApiQuery, useConditionalQuery } from '../../../hooks/use-api-query';
import { useApiMutation } from '../../../hooks/use-api-mutation';
import { useBoundStore } from '../../../store/bound-store';
import {
  indexingStreamManager,
  type StreamingProgress,
  type StreamingStats,
  type StartIndexingParams,
} from '../services/indexing-stream-manager';

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

  return useApiMutation<IndexingJobResponse, { userId?: string; embeddingProvider?: EmbeddingProvider; vectorStoreProvider?: VectorStoreProvider; embeddingModel?: string; customDimensions?: number }>(
    async ({ userId, embeddingProvider, vectorStoreProvider, embeddingModel, customDimensions }) => {
      const job = await ragService.startIndexing({ userId, embeddingProvider, vectorStoreProvider, embeddingModel, customDimensions });

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

// ============================================
// SSE Streaming Types (re-exported from manager)
// ============================================

// Re-export types for consumers
export type { StreamingProgress, StreamingStats };
export type StartIndexingStreamParams = StartIndexingParams;

export interface IndexingStreamState {
  isStreaming: boolean;
  vectorStore: VectorStoreProvider | null;
  progress: StreamingProgress | null;
  streamingStats: StreamingStats | null;
}

// Snapshot of streaming state for a specific vector store
interface VectorStoreStreamSnapshot {
  isStreaming: boolean;
  progress: StreamingProgress | null;
  stats: StreamingStats | null;
}

// Cache for snapshots to avoid creating new objects on every call
// This is necessary for useSyncExternalStore to work correctly
const snapshotCache = new Map<VectorStoreProvider, VectorStoreStreamSnapshot>();

// Create a snapshot of the manager's state for a specific vector store
// Returns cached snapshot if nothing has changed
function getVectorStoreSnapshot(vectorStore: VectorStoreProvider): VectorStoreStreamSnapshot {
  const isStreaming = indexingStreamManager.isStreaming(vectorStore);
  const progress = indexingStreamManager.getProgress(vectorStore);
  const stats = indexingStreamManager.getStats(vectorStore);

  const cached = snapshotCache.get(vectorStore);

  // Return cached if nothing changed (reference equality for progress/stats from manager)
  if (cached?.isStreaming === isStreaming &&
      cached?.progress === progress &&
      cached?.stats === stats) {
    return cached;
  }

  // Create new snapshot and cache it
  const snapshot: VectorStoreStreamSnapshot = { isStreaming, progress, stats };
  snapshotCache.set(vectorStore, snapshot);
  return snapshot;
}

// Subscribe function for useSyncExternalStore
function subscribeToManager(callback: () => void): () => void {
  // The manager's subscribe notifies on any change, we just need to trigger a re-render
  return indexingStreamManager.subscribe(() => callback());
}

// Stable getSnapshot functions for each vector store
const getPostgresSnapshot = () => getVectorStoreSnapshot('PostgreSQL');
const getPineconeSnapshot = () => getVectorStoreSnapshot('Pinecone');

/**
 * Hook to get streaming state for a specific vector store.
 * Uses useSyncExternalStore to properly sync with the global manager.
 */
export function useVectorStoreStream(vectorStore: VectorStoreProvider): VectorStoreStreamSnapshot {
  // Use stable function references based on vector store
  const getSnapshot = vectorStore === 'PostgreSQL' ? getPostgresSnapshot : getPineconeSnapshot;

  return useSyncExternalStore(
    subscribeToManager,
    getSnapshot,
    getSnapshot // Server snapshot (same as client for this use case)
  );
}

/**
 * Hook for SSE-based real-time indexing progress updates.
 * Uses global IndexingStreamManager to persist streams across page navigation.
 * Uses useSyncExternalStore for proper React synchronization.
 */
export function useIndexingStream() {
  const queryClient = useQueryClient();

  // Track query invalidation after completion
  const [lastCompletedStore, setLastCompletedStore] = useState<VectorStoreProvider | null>(null);

  // Subscribe to manager for completion events to update cache with final stats
  useEffect(() => {
    const unsubscribe = indexingStreamManager.subscribe((vectorStore, progress, stats, finalStats) => {
      if (progress === null && stats === null) {
        // Stream ended
        setLastCompletedStore(vectorStore);

        // If we have finalStats, update the cache directly (no slow refetch needed)
        if (finalStats) {
          // Get userId from store to match the query key used by useIndexStats
          const user = useBoundStore.getState().user;
          const userId = user?.userId ?? 'default-user';

          // Update the stats cache with the final stats from SSE
          queryClient.setQueryData<IndexStatsResponse>(
            indexingKeys.stats({ userId }),
            (oldData) => {
              if (!oldData) return oldData;

              const storeKey = vectorStore === 'PostgreSQL' ? 'postgreSQL' : 'pinecone';

              // Map IndexingStatsEvent to IndexStatsData
              // IMPORTANT: Preserve certain values from old cache when synthetic finalStats
              // may have incorrect fallbacks (e.g., totalNotes = job count, not system total)
              const newStatsData = {
                totalEmbeddings: finalStats.indexedCount,
                uniqueNotes: finalStats.indexedCount,
                lastIndexedAt: finalStats.lastIndexedAt,
                embeddingProvider: oldData[storeKey]?.embeddingProvider ?? '',
                vectorStoreProvider: finalStats.vectorStore,
                // Preserve totalNotesInSystem from cache - finalStats.totalNotes may be
                // the job count (notes being indexed) not the actual system total
                totalNotesInSystem: oldData[storeKey]?.totalNotesInSystem ?? finalStats.totalNotes,
                // Preserve notIndexedCount from cache - finalStats.pendingCount is job-based
                // (remaining in current job), not the actual "not indexed" system count
                notIndexedCount: oldData[storeKey]?.notIndexedCount ?? finalStats.pendingCount,
                staleNotesCount: 0, // After fresh indexing, no stale notes
                // Preserve dimensions from cache if finalStats has 0 (no stats event received)
                dimensions: finalStats.dimensions || oldData[storeKey]?.dimensions || 0,
              };

              return {
                ...oldData,
                [storeKey]: newStatsData,
              };
            }
          );
          // Don't invalidate when we have finalStats - we already have the correct data
          // This prevents the slow endpoint from overwriting our cache
        } else {
          // Only invalidate if we don't have finalStats (error case, etc.)
          void queryClient.invalidateQueries({ queryKey: indexingKeys.all });
        }
      }
    });
    return unsubscribe;
  }, [queryClient]);

  // Get current streaming state for both stores
  const postgresStream = useVectorStoreStream('PostgreSQL');
  const pineconeStream = useVectorStoreStream('Pinecone');

  // Aggregate state
  const isStreaming = postgresStream.isStreaming || pineconeStream.isStreaming;
  const vectorStore: VectorStoreProvider | null =
    postgresStream.isStreaming ? 'PostgreSQL' :
    pineconeStream.isStreaming ? 'Pinecone' : null;

  const startIndexing = useCallback(async (params: StartIndexingStreamParams) => {
    // Start stream via global manager - persists across navigation
    await indexingStreamManager.startStream(params);
  }, []);

  const cancelIndexing = useCallback(async (vs?: VectorStoreProvider): Promise<void> => {
    const targetStore = vs || vectorStore;
    if (targetStore) {
      await indexingStreamManager.stopStream(targetStore);
    }
  }, [vectorStore]);

  // Check if a specific vector store is streaming (reactive)
  const isStreamingVectorStore = useCallback((vs: VectorStoreProvider): boolean => {
    return vs === 'PostgreSQL' ? postgresStream.isStreaming : pineconeStream.isStreaming;
  }, [postgresStream.isStreaming, pineconeStream.isStreaming]);

  // Get progress for a specific vector store (reactive)
  const getProgressForVectorStore = useCallback((vs: VectorStoreProvider): StreamingProgress | null => {
    return vs === 'PostgreSQL' ? postgresStream.progress : pineconeStream.progress;
  }, [postgresStream.progress, pineconeStream.progress]);

  // Get stats for a specific vector store (reactive)
  const getStatsForVectorStore = useCallback((vs: VectorStoreProvider): StreamingStats | null => {
    return vs === 'PostgreSQL' ? postgresStream.stats : pineconeStream.stats;
  }, [postgresStream.stats, pineconeStream.stats]);

  return {
    isStreaming,
    vectorStore,
    progress: vectorStore === 'PostgreSQL' ? postgresStream.progress : pineconeStream.progress,
    streamingStats: vectorStore === 'PostgreSQL' ? postgresStream.stats : pineconeStream.stats,
    startIndexing,
    cancelIndexing,
    isStreamingVectorStore,
    getProgressForVectorStore,
    getStatsForVectorStore,
    lastCompletedStore,
  };
}
