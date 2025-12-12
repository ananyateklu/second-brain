/**
 * Summary Notification Component
 * A floating notification that shows summary generation progress at the top-right
 * Persists across page reloads and auto-dismisses when complete
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useBoundStore } from '../../store/bound-store';
import { useSummaryJobStatus, useCancelSummaryJob } from '../../features/notes/hooks/use-summary-generation';
import { toast } from '../../hooks/use-toast';
import { noteKeys } from '../../lib/query-keys';

// ============================================
// Icons
// ============================================

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

function FileTextIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
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
// Main Component
// ============================================

export function SummaryNotification() {
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);
  const completionHandledRef = useRef<string | null>(null);
  const cancelMutation = useCancelSummaryJob();

  const {
    activeJob: activeSummaryJob,
    isNotificationVisible: isSummaryNotificationVisible,
    updateSummaryJobStatus,
    clearSummaryJob,
    hideSummaryNotification,
  } = useBoundStore();

  const hasJob = activeSummaryJob !== null;
  const jobId = activeSummaryJob?.jobId ?? null;

  // Poll for status updates
  const { data: polledStatus } = useSummaryJobStatus(jobId);

  // Update store when polled status changes
  useEffect(() => {
    if (polledStatus && jobId) {
      updateSummaryJobStatus(polledStatus);
    }
  }, [polledStatus, jobId, updateSummaryJobStatus]);

  const status = activeSummaryJob?.status;
  const isGenerating = status?.status === 'running' || status?.status === 'pending';
  const isCompleted = status?.status === 'completed';
  const isFailed = status?.status === 'failed';
  const isCancelled = status?.status === 'cancelled';

  // Handle completion/failure/cancellation
  useEffect(() => {
    if (!status || !jobId) return;

    const statusKey = `${jobId}_${status.status}`;

    if (completionHandledRef.current !== statusKey) {
      if (isCompleted || isFailed || isCancelled) {
        completionHandledRef.current = statusKey;

        // Invalidate notes list to show new summaries
        // IMPORTANT: Use noteKeys.all because useNotes() uses noteKeys.all, not noteKeys.lists()
        void queryClient.invalidateQueries({ queryKey: noteKeys.all });

        // Force refetch to ensure UI updates immediately
        void queryClient.refetchQueries({ queryKey: noteKeys.all });

        // Only show toast for failures (progress bar handles success/cancel states visually)
        if (isFailed) {
          toast.error(
            'Summary Generation Failed',
            status.errors[0] || 'An error occurred'
          );
        }

        // Auto-clear job after 5 seconds
        setTimeout(() => {
          clearSummaryJob();
        }, 5000);
      }
    }
  }, [status, jobId, isCompleted, isFailed, isCancelled, queryClient, clearSummaryJob]);

  const handleStopGeneration = useCallback(() => {
    if (!jobId || isCancelling) return;

    setIsCancelling(true);
    void cancelMutation
      .mutateAsync(jobId)
      .catch(() => {
        toast.error('Failed to Stop', 'Could not stop summary generation');
      })
      .finally(() => setIsCancelling(false));
  }, [jobId, isCancelling, cancelMutation]);

  const handleDismiss = useCallback(() => {
    if (isGenerating) {
      // Just hide the notification, job continues in background
      hideSummaryNotification();
    } else {
      // Clear completely for completed/failed jobs
      clearSummaryJob();
    }
  }, [isGenerating, hideSummaryNotification, clearSummaryJob]);

  // Don't render if no active job or notification is hidden
  if (!hasJob || !isSummaryNotificationVisible) {
    return null;
  }

  const processedNotes = status?.processedNotes ?? 0;
  const totalNotes = status?.totalNotes ?? 0;
  const progress = status?.progressPercentage ?? 0;

  return createPortal(
    <div
      className="fixed top-4 right-4 z-[9997] w-80"
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
            backgroundColor: isCompleted
              ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
              : isFailed
                ? 'color-mix(in srgb, var(--color-error) 15%, transparent)'
                : isCancelled
                  ? 'color-mix(in srgb, var(--color-warning) 15%, transparent)'
                  : 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <div className="relative">
                <FileTextIcon className="w-5 h-5" style={{ color: 'var(--color-brand-500)' }} />
                <div
                  className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--color-brand-500)',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
              </div>
            ) : isCompleted ? (
              <CheckCircleIcon className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
            ) : isCancelled ? (
              <StopCircleIcon className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
            ) : (
              <XCircleIcon className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
            )}
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {isGenerating ? 'Generating Summaries' : isCompleted ? 'Summaries Complete' : isCancelled ? 'Generation Stopped' : 'Generation Failed'}
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md transition-colors hover:bg-[var(--surface-hover)]"
            title={isGenerating ? 'Hide (continues in background)' : 'Dismiss'}
          >
            <XIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {/* Progress section */}
          {isGenerating && (
            <>
              {totalNotes === 0 ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <svg className="animate-spin w-4 h-4" style={{ color: 'var(--color-brand-500)' }} viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Preparing notes...</span>
                </div>
              ) : (
                <>
                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {processedNotes} of {totalNotes} notes
                      </span>
                      <span
                        className="font-semibold"
                        style={{ color: 'var(--color-brand-500)' }}
                      >
                        {progress}%
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--border)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: 'var(--color-brand-500)',
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Stop button */}
              <button
                onClick={handleStopGeneration}
                disabled={isCancelling}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
                  color: 'var(--color-error)',
                }}
              >
                {isCancelling ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Stopping...</span>
                  </>
                ) : (
                  <>
                    <StopIcon className="w-4 h-4" />
                    <span>Stop Generation</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Completed summary */}
          {isCompleted && status && (
            <div className="flex items-center justify-center gap-4 text-sm py-1">
              {status.successCount > 0 && (
                <span style={{ color: 'var(--color-success)' }}>
                  <strong>{status.successCount}</strong> generated
                </span>
              )}
              {status.skippedCount > 0 && (
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong>{status.skippedCount}</strong> skipped
                </span>
              )}
              {status.failureCount > 0 && (
                <span style={{ color: 'var(--color-error)' }}>
                  <strong>{status.failureCount}</strong> failed
                </span>
              )}
            </div>
          )}

          {/* Failed message */}
          {isFailed && status && (
            <div className="text-sm text-center py-1" style={{ color: 'var(--color-error)' }}>
              {status.errors[0] || 'An error occurred'}
            </div>
          )}

          {/* Cancelled summary */}
          {isCancelled && status && (
            <div className="flex items-center justify-center gap-4 text-sm py-1">
              <span style={{ color: 'var(--text-secondary)' }}>
                <strong>{status.processedNotes}</strong> processed, <strong>{status.totalNotes - status.processedNotes}</strong> remaining
              </span>
            </div>
          )}
        </div>

        {/* Footer hint for running jobs */}
        {isGenerating && (
          <div
            className="px-4 py-2 text-xs text-center"
            style={{
              backgroundColor: 'var(--surface-hover)',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border)',
            }}
          >
            Generation continues even if you navigate away
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
