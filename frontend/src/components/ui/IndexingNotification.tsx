/**
 * Indexing Notification Component
 * A floating notification that shows indexing progress at the top-right
 * Supports multiple simultaneous indexing jobs (one per vector store)
 * Persists across page reloads and auto-dismisses when complete
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useBoundStore } from '../../store/bound-store';
import { useIndexingStatus, useCancelIndexing } from '../../features/rag/hooks/use-indexing';
import { toast } from '../../hooks/use-toast';
import { router } from '../../lib/router';
import { indexingKeys } from '../../lib/query-keys';
import { DEFAULT_USER_ID } from '../../lib/constants';
import type { IndexingJobInfo } from '../../store/slices/indexing-slice';

// Note: Job restoration is handled by useIndexingRestoration hook in App.tsx

// ============================================
// Icons
// ============================================

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

function DatabaseIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function CheckCircleIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function XCircleIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

function XIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SettingsIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function StopIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function StopCircleIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

// ============================================
// Single Job Card Component
// ============================================

interface JobCardProps {
  job: IndexingJobInfo;
  onClear: (vectorStore: string) => void;
  onRefreshStats: () => void;
}

function JobCard({ job, onClear, onRefreshStats }: JobCardProps) {
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
      className="rounded-lg overflow-hidden"
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
            className="text-xs px-1.5 py-0.5 rounded"
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
                <svg className="animate-spin w-3 h-3" style={{ color: storeColor }} viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
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
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
                color: 'var(--color-error)',
              }}
            >
              {isCancelling ? (
                <>
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
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

// ============================================
// Main Component
// ============================================

export function IndexingNotification() {
  const queryClient = useQueryClient();
  const {
    activeJobs,
    isNotificationVisible,
    clearJob,
    clearAllJobs,
    hideNotification,
  } = useBoundStore();

  // Get user from auth store for stats invalidation
  const user = useBoundStore((state) => state.user);
  const userId = user?.userId ?? DEFAULT_USER_ID;

  const jobs = Object.values(activeJobs);
  const hasActiveJobs = jobs.length > 0;
  const anyIndexing = jobs.some((job) =>
    job.status?.status === 'running' || job.status?.status === 'pending'
  );

  const handleRefreshStats = useCallback(() => {
    const statsQueryKey = indexingKeys.stats({ userId });
    void queryClient.invalidateQueries({ queryKey: statsQueryKey });
    void queryClient.refetchQueries({ queryKey: statsQueryKey });
  }, [queryClient, userId]);

  const handleClearJob = useCallback((vectorStore: string) => {
    clearJob(vectorStore);
  }, [clearJob]);

  const handleDismiss = useCallback(() => {
    if (anyIndexing) {
      // Just hide the notification, jobs continue in background
      hideNotification();
    } else {
      // Clear completely for completed/failed jobs
      clearAllJobs();
    }
  }, [anyIndexing, hideNotification, clearAllJobs]);

  const handleGoToSettings = useCallback(() => {
    hideNotification();
    void router.navigate('/settings/rag');
  }, [hideNotification]);

  // Don't render if no active jobs or notification is hidden
  if (!hasActiveJobs || !isNotificationVisible) {
    return null;
  }

  return createPortal(
    <div
      className="fixed top-4 right-4 z-[9998] w-80"
      style={{
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      <style>
        {`
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>

      <div
        className="rounded-xl shadow-2xl overflow-hidden backdrop-blur-md"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--surface-elevated) 95%, transparent)',
          border: '1px solid var(--border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-2">
            <DatabaseIcon className="w-5 h-5" style={{ color: 'var(--color-brand-500)' }} />
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {anyIndexing ? 'Indexing Notes' : 'Indexing Complete'}
            </span>
            {jobs.length > 1 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--color-brand-500)',
                  color: 'white',
                }}
              >
                {jobs.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleGoToSettings}
              className="p-1 rounded-md transition-colors hover:bg-[var(--surface-hover)]"
              title="Go to RAG Settings"
            >
              <SettingsIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-md transition-colors hover:bg-[var(--surface-hover)]"
              title={anyIndexing ? 'Hide (continues in background)' : 'Dismiss'}
            >
              <XIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>

        {/* Job Cards */}
        <div className="p-3 space-y-2">
          {jobs.map((job) => (
            <JobCard
              key={job.vectorStore}
              job={job}
              onClear={handleClearJob}
              onRefreshStats={handleRefreshStats}
            />
          ))}
        </div>

        {/* Footer hint for running jobs */}
        {anyIndexing && (
          <div
            className="px-4 py-2 text-xs text-center"
            style={{
              backgroundColor: 'var(--surface-hover)',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border)',
            }}
          >
            Indexing continues even if you navigate away
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
