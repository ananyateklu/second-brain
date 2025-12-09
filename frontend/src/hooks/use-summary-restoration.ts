/**
 * Hook to restore active summary generation job on app initialization
 * This runs independently and handles the restoration logic robustly
 */

import { useEffect, useRef } from 'react';
import { useBoundStore } from '../store/bound-store';
import { notesService } from '../services';
import { getStoredSummaryJob } from '../store/slices/summary-slice';

// LocalStorage key - must match the one in summary-slice
const ACTIVE_SUMMARY_JOB_KEY = 'summary_active_job_v1';

function clearStoredJob(): void {
  try {
    localStorage.removeItem(ACTIVE_SUMMARY_JOB_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Hook that runs once on app mount to restore any active summary job
 * This is independent of auth state to ensure restoration happens early
 */
export function useSummaryRestoration() {
  const hasRestoredRef = useRef(false);
  const {
    activeJob: activeSummaryJob,
    isRestoring: isSummaryRestoring,
    restoreSummaryJob,
    setIsSummaryRestoring,
  } = useBoundStore();

  useEffect(() => {
    // Only run once
    if (hasRestoredRef.current) return;

    // Don't run if already have active job or already restoring
    if (activeSummaryJob !== null || isSummaryRestoring) return;

    hasRestoredRef.current = true;

    const restoreJob = async () => {
      const storedJob = getStoredSummaryJob();

      if (!storedJob) {
        return;
      }

      setIsSummaryRestoring(true);

      // Extended timeout - 30 minutes for longer jobs
      const THIRTY_MINUTES = 30 * 60 * 1000;

      try {
        // Check if job is too old
        if (Date.now() - storedJob.startedAt > THIRTY_MINUTES) {
          clearStoredJob();
          return;
        }

        try {
          // Fetch current status from backend
          const jobStatus = await notesService.getSummaryJobStatus(storedJob.jobId);

          if (jobStatus.status === 'running' || jobStatus.status === 'pending') {
            // Job is still active - restore it
            restoreSummaryJob(jobStatus, storedJob.userId);
          } else {
            // Job is complete/failed, clean up localStorage
            clearStoredJob();
          }
        } catch (error) {
          console.warn('Failed to restore summary job:', error);
          // Job not found or error - clean up localStorage
          clearStoredJob();
        }
      } finally {
        setIsSummaryRestoring(false);
      }
    };

    void restoreJob();
  }, [activeSummaryJob, isSummaryRestoring, restoreSummaryJob, setIsSummaryRestoring]);
}
