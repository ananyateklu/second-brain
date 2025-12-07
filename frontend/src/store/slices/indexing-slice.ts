/**
 * Indexing Store Slice
 * Manages global indexing state for background indexing notifications
 * Supports multiple simultaneous indexing jobs (one per vector store)
 * Persists across page reloads via localStorage
 */

import type { SliceCreator } from '../types';
import type { IndexingJobResponse } from '../../types/rag';
import { ragService } from '../../services';

// LocalStorage key for persisting active jobs
const ACTIVE_INDEXING_JOBS_KEY = 'indexing_active_jobs_v3';

// ============================================
// Types
// ============================================

export interface StoredIndexingJob {
  jobId: string;
  vectorStore: string;
  embeddingProvider: string;
  userId: string;
  startedAt: number;
}

export interface IndexingJobInfo {
  jobId: string;
  status: IndexingJobResponse | null;
  vectorStore: string;
  embeddingProvider: string;
  userId: string;
}

export interface IndexingSliceState {
  // Map of vector store -> job info (supports multiple simultaneous jobs)
  activeJobs: Record<string, IndexingJobInfo>;

  // UI state
  isRestoring: boolean;
  isNotificationVisible: boolean;
}

export interface IndexingSliceActions {
  // Job management
  startIndexingJob: (job: IndexingJobResponse, vectorStore: string, embeddingProvider: string, userId: string) => void;
  restoreIndexingJob: (job: IndexingJobResponse, vectorStore: string, embeddingProvider: string, userId: string) => void;
  updateJobStatus: (status: IndexingJobResponse, vectorStore: string) => void;
  clearJob: (vectorStore: string) => void;
  clearAllJobs: () => void;

  // Restoration
  restoreActiveJobs: (userId: string) => Promise<void>;
  setIsRestoring: (isRestoring: boolean) => void;

  // Notification UI
  showNotification: () => void;
  hideNotification: () => void;

  // Legacy compatibility
  clearActiveJob: () => void;
}

export type IndexingSlice = IndexingSliceState & IndexingSliceActions;

// ============================================
// Initial State
// ============================================

const initialState: IndexingSliceState = {
  activeJobs: {},
  isRestoring: false,
  isNotificationVisible: false,
};

// ============================================
// Helper Functions
// ============================================

function persistJobs(jobs: Record<string, StoredIndexingJob>): void {
  localStorage.setItem(ACTIVE_INDEXING_JOBS_KEY, JSON.stringify(jobs));
}

function getStoredJobs(): Record<string, StoredIndexingJob> {
  try {
    const stored = localStorage.getItem(ACTIVE_INDEXING_JOBS_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as Record<string, StoredIndexingJob>;
  } catch {
    return {};
  }
}

function addStoredJob(jobId: string, vectorStore: string, embeddingProvider: string, userId: string): void {
  const jobs = getStoredJobs();
  jobs[vectorStore] = {
    jobId,
    vectorStore,
    embeddingProvider,
    userId,
    startedAt: Date.now(),
  };
  persistJobs(jobs);
}

function removeStoredJob(vectorStore: string): void {
  const jobs = getStoredJobs();
  delete jobs[vectorStore];
  persistJobs(jobs);
}

function clearAllStoredJobs(): void {
  localStorage.removeItem(ACTIVE_INDEXING_JOBS_KEY);
}

// ============================================
// Slice Creator
// ============================================

export const createIndexingSlice: SliceCreator<IndexingSlice> = (set, get) => ({
  ...initialState,

  startIndexingJob: (job, vectorStore, embeddingProvider, userId) => {
    // Persist to localStorage for page reload recovery
    addStoredJob(job.id, vectorStore, embeddingProvider, userId);

    set((state) => ({
      activeJobs: {
        ...state.activeJobs,
        [vectorStore]: {
          jobId: job.id,
          status: job,
          vectorStore,
          embeddingProvider,
          userId,
        },
      },
      isNotificationVisible: true,
    }));
  },

  restoreIndexingJob: (job, vectorStore, embeddingProvider, userId) => {
    // Restore without re-persisting to localStorage (job info already exists)
    set((state) => ({
      activeJobs: {
        ...state.activeJobs,
        [vectorStore]: {
          jobId: job.id,
          status: job,
          vectorStore,
          embeddingProvider,
          userId,
        },
      },
      isNotificationVisible: true,
    }));
  },

  updateJobStatus: (status, vectorStore) => {
    const state = get();
    const job = state.activeJobs[vectorStore];

    // Only update if this is for the correct job
    if (job && status.id === job.jobId) {
      set((state) => ({
        activeJobs: {
          ...state.activeJobs,
          [vectorStore]: {
            ...state.activeJobs[vectorStore],
            status,
          },
        },
      }));

      // If job is complete, failed, or cancelled, remove from localStorage
      if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
        removeStoredJob(vectorStore);
      }
    }
  },

  clearJob: (vectorStore) => {
    removeStoredJob(vectorStore);
    set((state) => {
      const newJobs = { ...state.activeJobs };
      delete newJobs[vectorStore];
      return {
        activeJobs: newJobs,
        // Hide notification if no more active jobs
        isNotificationVisible: Object.keys(newJobs).length > 0,
      };
    });
  },

  clearAllJobs: () => {
    clearAllStoredJobs();
    set({
      activeJobs: {},
      isNotificationVisible: false,
    });
  },

  // Legacy compatibility
  clearActiveJob: () => {
    get().clearAllJobs();
  },

  restoreActiveJobs: async (userId) => {
    const state = get();

    // Don't restore if already restoring
    if (state.isRestoring) return;

    set({ isRestoring: true });

    try {
      const storedJobs = getStoredJobs();
      const TEN_MINUTES = 10 * 60 * 1000;
      const restoredJobs: Record<string, IndexingJobInfo> = {};

      for (const [vectorStore, storedJob] of Object.entries(storedJobs)) {
        // Verify the stored job is for this user and not too old
        if (storedJob.userId !== userId || Date.now() - storedJob.startedAt > TEN_MINUTES) {
          removeStoredJob(vectorStore);
          continue;
        }

        try {
          // Fetch current status from backend
          const jobStatus = await ragService.getIndexingStatus(storedJob.jobId);

          if (jobStatus.status === 'running' || jobStatus.status === 'pending') {
            // Job is still active, add to restored jobs
            restoredJobs[vectorStore] = {
              jobId: storedJob.jobId,
              status: jobStatus,
              vectorStore: storedJob.vectorStore,
              embeddingProvider: storedJob.embeddingProvider,
              userId: storedJob.userId,
            };
          } else {
            // Job is complete/failed, clean up
            removeStoredJob(vectorStore);
          }
        } catch {
          // Job not found or error - clean up
          removeStoredJob(vectorStore);
        }
      }

      set({
        activeJobs: restoredJobs,
        isNotificationVisible: Object.keys(restoredJobs).length > 0,
        isRestoring: false,
      });
    } catch {
      set({ isRestoring: false });
    }
  },

  setIsRestoring: (isRestoring) => {
    set({ isRestoring });
  },

  showNotification: () => {
    set({ isNotificationVisible: true });
  },

  hideNotification: () => {
    set({ isNotificationVisible: false });
  },
});

// ============================================
// Selectors
// ============================================

export const selectActiveJobs = (state: IndexingSlice): IndexingJobInfo[] => {
  return Object.values(state.activeJobs);
};

export const selectHasActiveJobs = (state: IndexingSlice): boolean => {
  return Object.keys(state.activeJobs).length > 0;
};

export const selectIsAnyJobIndexing = (state: IndexingSlice): boolean => {
  return Object.values(state.activeJobs).some(
    (job) => job.status?.status === 'running' || job.status?.status === 'pending'
  );
};

export const selectJobByVectorStore = (state: IndexingSlice, vectorStore: string): IndexingJobInfo | undefined => {
  return state.activeJobs[vectorStore];
};

// Legacy selectors for backward compatibility
export const selectIsIndexing = (state: IndexingSlice): boolean => {
  return selectIsAnyJobIndexing(state);
};

export const selectIsIndexingComplete = (state: IndexingSlice): boolean => {
  const jobs = Object.values(state.activeJobs);
  return jobs.length > 0 && jobs.every((job) => job.status?.status === 'completed');
};

export const selectIsIndexingFailed = (state: IndexingSlice): boolean => {
  return Object.values(state.activeJobs).some((job) => job.status?.status === 'failed');
};

export const selectIsIndexingCancelled = (state: IndexingSlice): boolean => {
  return Object.values(state.activeJobs).some((job) => job.status?.status === 'cancelled');
};

export const selectIndexingProgress = (state: IndexingSlice): number => {
  const jobs = Object.values(state.activeJobs);
  if (jobs.length === 0) return 0;
  const totalProgress = jobs.reduce((sum, job) => sum + (job.status?.progressPercentage ?? 0), 0);
  return Math.round(totalProgress / jobs.length);
};

// Legacy selectors for backward compatibility (replacements for removed getters)
export const selectActiveJobId = (state: IndexingSlice): string | null => {
  const jobs = Object.values(state.activeJobs);
  return jobs.length > 0 ? jobs[0].jobId : null;
};

export const selectActiveJobStatus = (state: IndexingSlice): IndexingJobResponse | null => {
  const jobs = Object.values(state.activeJobs);
  return jobs.length > 0 ? jobs[0].status : null;
};

export const selectVectorStore = (state: IndexingSlice): string => {
  const jobs = Object.values(state.activeJobs);
  return jobs.length > 0 ? jobs[0].vectorStore : 'PostgreSQL';
};

export const selectEmbeddingProvider = (state: IndexingSlice): string => {
  const jobs = Object.values(state.activeJobs);
  return jobs.length > 0 ? jobs[0].embeddingProvider : 'OpenAI';
};
