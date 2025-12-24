/**
 * Job Card Component
 * Displays a single indexing job with progress and controls
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useBoundStore } from '../../../store/bound-store';
import { useIndexingStatus, useCancelIndexing } from '../../../features/rag/hooks/use-indexing';
import { toast } from '../../../hooks/use-toast';
import {
  DatabaseIcon,
  CheckCircleIcon,
  XCircleIcon,
  StopIcon,
  StopCircleIcon,
  SpinnerIcon,
} from './IndexingNotificationIcons';
import type { JobCardProps } from './types';

export function JobCard({ job, onClear, onRefreshStats }: JobCardProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const completionHandledRef = useRef<string | null>(null);
  const cancelMutation = useCancelIndexing();
  const { updateJobStatus } = useBoundStore();

  // Poll for status updates
  const { data: polledStatus } = useIndexingStatus(job.jobId, !!job.jobId);

  // Update store when polled status changes
  useEffect(() => {
    if (polledStatus && job.jobId) {
      updateJobStatus(polledStatus, job.vectorStore);
    }
  }, [polledStatus, job.jobId, job.vectorStore, updateJobStatus]);

  const status = job.status;
  const isIndexing = status?.status === 'running' || status?.status === 'pending';
  const isCompleted = status?.status === 'completed';
  const isFailed = status?.status === 'failed';
  const isCancelled = status?.status === 'cancelled';

  // Handle completion/failure/cancellation
  useEffect(() => {
    if (!status) return;

    const statusKey = `${job.jobId}_${status.status}`;

    if (completionHandledRef.current !== statusKey) {
      if (isCompleted || isFailed || isCancelled) {
        completionHandledRef.current = statusKey;

        // Refresh stats
        onRefreshStats();

        // Auto-clear this job after 5 seconds
        setTimeout(() => {
          onClear(job.vectorStore);
        }, 5000);
      }
    }
  }, [status, job.jobId, job.vectorStore, isCompleted, isFailed, isCancelled, onClear, onRefreshStats]);

  const handleStopIndexing = useCallback(() => {
    if (!job.jobId || isCancelling) return;

    setIsCancelling(true);
    void cancelMutation
      .mutateAsync({ jobId: job.jobId })
      .catch(() => {
        toast.error('Failed to Stop', 'Could not stop the indexing job');
      })
      .finally(() => setIsCancelling(false));
  }, [job.jobId, isCancelling, cancelMutation]);

  const processedNotes = status?.processedNotes ?? 0;
  const totalNotes = status?.totalNotes ?? 0;
  // Calculate progress from processedNotes/totalNotes if progressPercentage is not available or is 0
  const progress = (status?.progressPercentage && status.progressPercentage > 0)
    ? status.progressPercentage
    : (totalNotes > 0 ? Math.round((processedNotes / totalNotes) * 100) : 0);

  // Get color based on vector store
  const storeColor = job.vectorStore === 'PostgreSQL' ? 'var(--color-brand-500)' : 'var(--color-success)';
  const storeBgColor = job.vectorStore === 'PostgreSQL'
    ? 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)'
    : 'color-mix(in srgb, var(--color-success) 15%, transparent)';

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Job Header */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{
          backgroundColor: isCompleted
            ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
            : isFailed
              ? 'color-mix(in srgb, var(--color-error) 15%, transparent)'
              : isCancelled
                ? 'color-mix(in srgb, var(--color-warning) 15%, transparent)'
                : storeBgColor,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          {isIndexing ? (
            <div className="relative">
              <DatabaseIcon className="w-4 h-4" style={{ color: storeColor }} />
              <div
                className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: storeColor,
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
            </div>
          ) : isCompleted ? (
            <CheckCircleIcon className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
          ) : isCancelled ? (
            <StopCircleIcon className="w-4 h-4" style={{ color: 'var(--color-warning)' }} />
          ) : (
            <XCircleIcon className="w-4 h-4" style={{ color: 'var(--color-error)' }} />
          )}
          <span
            className="text-xs font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {job.vectorStore}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-lg"
            style={{
              backgroundColor: 'var(--surface-hover)',
              color: 'var(--text-secondary)',
            }}
          >
            {job.embeddingProvider}
          </span>
        </div>
        {isIndexing && (
          <span
            className="text-xs font-semibold"
            style={{ color: storeColor }}
          >
            {progress}%
          </span>
        )}
      </div>

      {/* Job Content */}
      <div className="px-3 py-2 space-y-2">
        {/* Progress section */}
        {isIndexing && (
          <>
            {totalNotes === 0 ? (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <SpinnerIcon className="w-3 h-3" style={{ color: storeColor }} />
                <span>Analyzing notes...</span>
              </div>
            ) : (
              <>
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {processedNotes} of {totalNotes} notes
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--border)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: storeColor,
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Stop button */}
            <button
              onClick={handleStopIndexing}
              disabled={isCancelling}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
                color: 'var(--color-error)',
              }}
            >
              {isCancelling ? (
                <>
                  <SpinnerIcon className="w-3 h-3" />
                  <span>Stopping...</span>
                </>
              ) : (
                <>
                  <StopIcon className="w-3 h-3" />
                  <span>Stop</span>
                </>
              )}
            </button>
          </>
        )}

        {/* Completed summary */}
        {isCompleted && status && (
          <div className="flex items-center gap-3 text-xs">
            {status.processedNotes > 0 && (
              <span style={{ color: 'var(--color-success)' }}>
                <strong>{status.processedNotes}</strong> indexed
              </span>
            )}
            {status.skippedNotes > 0 && (
              <span style={{ color: 'var(--text-secondary)' }}>
                <strong>{status.skippedNotes}</strong> up to date
              </span>
            )}
          </div>
        )}

        {/* Failed message */}
        {isFailed && status && (
          <div className="text-xs" style={{ color: 'var(--color-error)' }}>
            {status.errors[0] || 'An error occurred'}
          </div>
        )}

        {/* Cancelled summary */}
        {isCancelled && status && (
          <div className="flex items-center gap-3 text-xs">
            <span style={{ color: 'var(--color-warning)' }}>Stopped</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              <strong>{status.processedNotes}</strong> indexed, <strong>{status.totalNotes - status.processedNotes}</strong> remaining
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
