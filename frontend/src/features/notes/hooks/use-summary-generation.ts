/**
 * Hooks for background summary generation
 * 
 * IMPORTANT: All invalidations use noteKeys.all (not noteKeys.lists()) because
 * the useNotes() hook uses noteKeys.all as its query key. Using noteKeys.lists()
 * would not invalidate the correct queries and the UI wouldn't update.
 */

import { useQueryClient } from '@tanstack/react-query';
import { notesService } from '../../../services';
import { noteKeys } from '../../../lib/query-keys';
import { useConditionalQuery } from '../../../hooks/use-api-query';
import { useApiMutation } from '../../../hooks/use-api-mutation';
import type { SummaryJobResponse } from '../../../types/notes';

/**
 * Query key factory for summary jobs
 */
export const summaryJobKeys = {
  all: ['summary-jobs'] as const,
  job: (jobId: string) => [...summaryJobKeys.all, 'job', jobId] as const,
};

/**
 * Hook to start a background summary generation job
 */
export const useStartSummaryGeneration = () => {
  const queryClient = useQueryClient();

  return useApiMutation<SummaryJobResponse, string[]>(
    async (noteIds) => {
      return notesService.startSummaryGeneration(noteIds);
    },
    {
      onSuccess: () => {
        // Invalidate notes to pick up new summaries as they're generated
        void queryClient.invalidateQueries({ queryKey: noteKeys.all });
      },
    }
  );
};

/**
 * Hook to poll for summary job status
 * @param jobId The job ID to poll
 * @param enabled Whether polling is enabled (default: true if jobId is provided)
 */
export const useSummaryJobStatus = (jobId: string | null, enabled = true) => {
  return useConditionalQuery<SummaryJobResponse>(
    enabled && !!jobId,
    summaryJobKeys.job(jobId || ''),
    () => {
      if (!jobId) throw new Error('Job ID is required');
      return notesService.getSummaryJobStatus(jobId);
    },
    {
      refetchInterval: (query) => {
        const data = query.state.data;
        // Continue polling if job is still running or pending
        if (data?.status === 'running' || data?.status === 'pending') {
          return 1000; // Poll every 1 second for fast updates
        }
        // Stop polling for completed/failed/cancelled
        return false;
      },
      refetchOnWindowFocus: true,
    }
  );
};

/**
 * Hook to cancel an active summary generation job
 */
export const useCancelSummaryJob = () => {
  const queryClient = useQueryClient();

  return useApiMutation<{ message: string }, string>(
    (jobId) => notesService.cancelSummaryJob(jobId),
    {
      onSuccess: (_, jobId) => {
        // Invalidate the job query to get updated status
        void queryClient.invalidateQueries({ queryKey: summaryJobKeys.job(jobId) });
        // Invalidate notes to show any completed summaries
        void queryClient.invalidateQueries({ queryKey: noteKeys.all });
      },
    }
  );
};
