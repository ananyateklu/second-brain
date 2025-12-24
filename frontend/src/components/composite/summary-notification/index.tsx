/**
 * Summary Notification Component
 * A floating notification that shows summary generation progress at the top-right.
 * Persists across page reloads and auto-dismisses when complete.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useBoundStore } from '../../../store/bound-store';
import {
  useSummaryJobStatus,
  useCancelSummaryJob,
} from '../../../features/notes/hooks/use-summary-generation';
import { toast } from '../../../hooks/use-toast';
import { noteKeys } from '../../../lib/query-keys';
import {
  FileTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  XIcon,
  StopCircleIcon,
} from './SummaryIcons';
import { SummaryProgress } from './SummaryProgress';
import { SummaryStatusDisplay } from './SummaryStatus';

// ============================================
// Animation Styles
// ============================================

const ANIMATION_STYLES = `
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
`;

// ============================================
// Header Component
// ============================================

interface HeaderProps {
  isGenerating: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  isFailed: boolean;
  onDismiss: () => void;
}

function NotificationHeader({
  isGenerating,
  isCompleted,
  isCancelled,
  isFailed,
  onDismiss,
}: HeaderProps) {
  const getTitle = () => {
    if (isGenerating) return 'Generating Summaries';
    if (isCompleted) return 'Summaries Complete';
    if (isCancelled) return 'Generation Stopped';
    return 'Generation Failed';
  };

  const getHeaderBackground = () => {
    if (isCompleted) {
      return 'color-mix(in srgb, var(--color-success) 15%, transparent)';
    }
    if (isFailed) {
      return 'color-mix(in srgb, var(--color-error) 15%, transparent)';
    }
    if (isCancelled) {
      return 'color-mix(in srgb, var(--color-warning) 15%, transparent)';
    }
    return 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)';
  };

  return (
    <div
      className="px-4 py-3 flex items-center justify-between"
      style={{
        backgroundColor: getHeaderBackground(),
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2">
        {isGenerating ? (
          <div className="relative">
            <FileTextIcon
              className="w-5 h-5"
              style={{ color: 'var(--color-brand-500)' }}
            />
            <div
              className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: 'var(--color-brand-500)',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
          </div>
        ) : isCompleted ? (
          <CheckCircleIcon
            className="w-5 h-5"
            style={{ color: 'var(--color-success)' }}
          />
        ) : isCancelled ? (
          <StopCircleIcon
            className="w-5 h-5"
            style={{ color: 'var(--color-warning)' }}
          />
        ) : (
          <XCircleIcon
            className="w-5 h-5"
            style={{ color: 'var(--color-error)' }}
          />
        )}
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {getTitle()}
        </span>
      </div>
      <button
        onClick={onDismiss}
        className={cn(
          'p-1 rounded-md transition-colors',
          'hover:bg-[var(--surface-hover)]'
        )}
        title={isGenerating ? 'Hide (continues in background)' : 'Dismiss'}
      >
        <XIcon
          className="w-4 h-4"
          style={{ color: 'var(--text-secondary)' }}
        />
      </button>
    </div>
  );
}

// ============================================
// Footer Component
// ============================================

function NotificationFooter() {
  return (
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
  const isGenerating =
    status?.status === 'running' || status?.status === 'pending';
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
  }, [
    status,
    jobId,
    isCompleted,
    isFailed,
    isCancelled,
    queryClient,
    clearSummaryJob,
  ]);

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
      <style>{ANIMATION_STYLES}</style>

      <div
        className={cn(
          'rounded-xl shadow-2xl overflow-hidden backdrop-blur-md'
        )}
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--surface-elevated) 95%, transparent)',
          border: '1px solid var(--border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <NotificationHeader
          isGenerating={isGenerating}
          isCompleted={isCompleted}
          isCancelled={isCancelled}
          isFailed={isFailed}
          onDismiss={handleDismiss}
        />

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {/* Progress section */}
          {isGenerating && (
            <SummaryProgress
              processedNotes={processedNotes}
              totalNotes={totalNotes}
              progress={progress}
              isCancelling={isCancelling}
              onStopGeneration={handleStopGeneration}
            />
          )}

          {/* Status displays */}
          {status && (isCompleted || isFailed || isCancelled) && (
            <SummaryStatusDisplay
              status={status}
              statusType={status.status}
            />
          )}
        </div>

        {/* Footer hint for running jobs */}
        {isGenerating && <NotificationFooter />}
      </div>
    </div>,
    document.body
  );
}

// Re-export components for flexibility
export { SummaryProgress } from './SummaryProgress';
export { SummaryStatusDisplay } from './SummaryStatus';
export * from './SummaryIcons';
export type * from './types';
