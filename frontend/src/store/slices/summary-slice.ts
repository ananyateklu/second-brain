/**
 * Summary Generation Store Slice
 * Manages global state for background summary generation jobs
 * Persists across page reloads via localStorage
 */

import type { SliceCreator } from '../types';

// LocalStorage key for persisting active job
const ACTIVE_SUMMARY_JOB_KEY = 'summary_active_job_v1';

// ============================================
// Types
// ============================================

export interface SummaryJobResponse {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  totalNotes: number;
  processedNotes: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  errors: string[];
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  progressPercentage: number;
}

export interface StoredSummaryJob {
  jobId: string;
  userId: string;
  startedAt: number;
}

export interface SummaryJobInfo {
  jobId: string;
  status: SummaryJobResponse | null;
  userId: string;
}

export interface SummarySliceState {
  // Current active job (only one at a time)
  activeJob: SummaryJobInfo | null;

  // UI state
  isRestoring: boolean;
  isNotificationVisible: boolean;
}

export interface SummarySliceActions {
  // Job management
  startSummaryJob: (job: SummaryJobResponse, userId: string) => void;
  restoreSummaryJob: (job: SummaryJobResponse, userId: string) => void;
  updateSummaryJobStatus: (status: SummaryJobResponse) => void;
  clearSummaryJob: () => void;

  // Restoration
  restoreActiveSummaryJob: (userId: string) => Promise<void>;
  setIsSummaryRestoring: (isRestoring: boolean) => void;

  // Notification UI
  showSummaryNotification: () => void;
  hideSummaryNotification: () => void;
}

export type SummarySlice = SummarySliceState & SummarySliceActions;

// ============================================
// Initial State
// ============================================

const initialState: SummarySliceState = {
  activeJob: null,
  isRestoring: false,
  isNotificationVisible: false,
};

// ============================================
// Helper Functions
// ============================================

function persistJob(job: StoredSummaryJob | null): void {
  if (job) {
    localStorage.setItem(ACTIVE_SUMMARY_JOB_KEY, JSON.stringify(job));
  } else {
    localStorage.removeItem(ACTIVE_SUMMARY_JOB_KEY);
  }
}

export function getStoredSummaryJob(): StoredSummaryJob | null {
  try {
    const stored = localStorage.getItem(ACTIVE_SUMMARY_JOB_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as StoredSummaryJob;
  } catch {
    return null;
  }
}

function clearStoredJob(): void {
  localStorage.removeItem(ACTIVE_SUMMARY_JOB_KEY);
}

// ============================================
// Slice Creator
// ============================================

export const createSummarySlice: SliceCreator<SummarySlice> = (set, get) => ({
  ...initialState,

  startSummaryJob: (job, userId) => {
    // Persist to localStorage for page reload recovery
    persistJob({
      jobId: job.id,
      userId,
      startedAt: Date.now(),
    });

    set({
      activeJob: {
        jobId: job.id,
        status: job,
        userId,
      },
      isNotificationVisible: true,
    });
  },

  restoreSummaryJob: (job, userId) => {
    // Restore without re-persisting to localStorage (job info already exists)
    set({
      activeJob: {
        jobId: job.id,
        status: job,
        userId,
      },
      isNotificationVisible: true,
    });
  },

  updateSummaryJobStatus: (status) => {
    const state = get();

    // Only update if this is for the correct job
    if (state.activeJob && status.id === state.activeJob.jobId) {
      set({
        activeJob: {
          ...state.activeJob,
          status,
        },
      });

      // If job is complete, failed, or cancelled, remove from localStorage
      if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
        clearStoredJob();
      }
    }
  },

  clearSummaryJob: () => {
    clearStoredJob();
    set({
      activeJob: null,
      isNotificationVisible: false,
    });
  },

  restoreActiveSummaryJob: async (userId) => {
    const state = get();

    // Don't restore if already restoring
    if (state.isRestoring) return;

    set({ isRestoring: true });

    try {
      const storedJob = getStoredSummaryJob();

      if (!storedJob) {
        set({ isRestoring: false });
        return;
      }

      const TEN_MINUTES = 10 * 60 * 1000;

      // Verify the stored job is for this user and not too old
      if (storedJob.userId !== userId || Date.now() - storedJob.startedAt > TEN_MINUTES) {
        clearStoredJob();
        set({ isRestoring: false });
        return;
      }

      try {
        // Fetch current status from backend
        const { notesService } = await import('../../services');
        const jobStatus = await notesService.getSummaryJobStatus(storedJob.jobId);

        if (jobStatus.status === 'running' || jobStatus.status === 'pending') {
          // Job is still active, restore it
          set({
            activeJob: {
              jobId: storedJob.jobId,
              status: jobStatus,
              userId: storedJob.userId,
            },
            isNotificationVisible: true,
            isRestoring: false,
          });
        } else {
          // Job is complete/failed, clean up
          clearStoredJob();
          set({ isRestoring: false });
        }
      } catch {
        // Job not found or error - clean up
        clearStoredJob();
        set({ isRestoring: false });
      }
    } catch {
      set({ isRestoring: false });
    }
  },

  setIsSummaryRestoring: (isRestoring) => {
    set({ isRestoring });
  },

  showSummaryNotification: () => {
    set({ isNotificationVisible: true });
  },

  hideSummaryNotification: () => {
    set({ isNotificationVisible: false });
  },
});

// ============================================
// Selectors
// ============================================

export const selectActiveSummaryJob = (state: SummarySlice): SummaryJobInfo | null => {
  return state.activeJob;
};

export const selectHasActiveSummaryJob = (state: SummarySlice): boolean => {
  return state.activeJob !== null;
};

export const selectIsSummaryJobRunning = (state: SummarySlice): boolean => {
  return state.activeJob?.status?.status === 'running' || state.activeJob?.status?.status === 'pending';
};

export const selectSummaryJobProgress = (state: SummarySlice): number => {
  return state.activeJob?.status?.progressPercentage ?? 0;
};

export const selectSummaryJobStatus = (state: SummarySlice): string | null => {
  return state.activeJob?.status?.status ?? null;
};
