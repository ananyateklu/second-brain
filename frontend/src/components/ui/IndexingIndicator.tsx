/**
 * Indexing Indicator Component
 * A compact header indicator that shows when indexing is in progress
 * Supports multiple simultaneous jobs
 * Click to re-open the full notification panel
 */

import { useBoundStore } from '../../store/bound-store';
import { selectActiveJobs } from '../../store/slices/indexing-slice';

export function IndexingIndicator() {
  const {
    activeJobs,
    isNotificationVisible,
    showNotification,
  } = useBoundStore();

  const jobs = Object.values(activeJobs);
  const hasJobs = jobs.length > 0;

  // Calculate aggregate status
  const anyIndexing = jobs.some((job) => 
    job.status?.status === 'running' || job.status?.status === 'pending'
  );
  const allCompleted = jobs.length > 0 && jobs.every((job) => job.status?.status === 'completed');
  const anyFailed = jobs.some((job) => job.status?.status === 'failed');
  const anyCancelled = jobs.some((job) => job.status?.status === 'cancelled');

  // Calculate average progress (with fallback calculation from processedNotes/totalNotes)
  const totalProgress = jobs.reduce((sum, job) => {
    const progressPercentage = job.status?.progressPercentage;
    if (progressPercentage !== undefined && progressPercentage > 0) {
      return sum + progressPercentage;
    }
    // Fallback: calculate from processedNotes/totalNotes
    const processed = job.status?.processedNotes ?? 0;
    const total = job.status?.totalNotes ?? 0;
    return sum + (total > 0 ? Math.round((processed / total) * 100) : 0);
  }, 0);
  const avgProgress = jobs.length > 0 ? Math.round(totalProgress / jobs.length) : 0;

  // Don't render if no active jobs
  if (!hasJobs) {
    return null;
  }

  const handleClick = () => {
    showNotification();
  };

  // Determine overall status for styling
  const isIndexing = anyIndexing;
  const isCompleted = allCompleted;
  const isFailed = anyFailed && !anyIndexing;
  const isCancelled = anyCancelled && !anyIndexing && !anyFailed;

  return (
    <button
      onClick={handleClick}
      className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 group"
      style={{
        backgroundColor: isCompleted
          ? 'color-mix(in srgb, var(--color-success) 15%, var(--surface-elevated))'
          : isFailed
            ? 'color-mix(in srgb, var(--color-error) 15%, var(--surface-elevated))'
            : isCancelled
              ? 'color-mix(in srgb, var(--color-warning) 15%, var(--surface-elevated))'
              : 'color-mix(in srgb, var(--color-brand-600) 15%, var(--surface-elevated))',
        border: '1px solid',
        borderColor: isCompleted
          ? 'color-mix(in srgb, var(--color-success) 40%, var(--border))'
          : isFailed
            ? 'color-mix(in srgb, var(--color-error) 40%, var(--border))'
            : isCancelled
              ? 'color-mix(in srgb, var(--color-warning) 40%, var(--border))'
              : 'color-mix(in srgb, var(--color-brand-600) 40%, var(--border))',
        height: '36px',
      }}
      title={isIndexing ? `Indexing in progress: ${avgProgress}%` : isCompleted ? 'Indexing complete' : isCancelled ? 'Indexing stopped' : 'Indexing failed'}
    >
      {/* Icon with progress */}
      {isIndexing ? (
        <div className="relative w-6 h-6">
          {/* Circular progress indicator */}
          <svg
            className="w-6 h-6 -rotate-90"
            viewBox="0 0 24 24"
          >
            {/* Background circle */}
            <circle
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke="var(--border)"
              strokeWidth="3"
            />
            {/* Progress circle */}
            <circle
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke="var(--color-brand-500)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(avgProgress / 100) * 56.55} 56.55`}
              style={{
                transition: 'stroke-dasharray 0.3s ease-out',
              }}
            />
          </svg>
          {/* Database icon in center */}
          <svg
            className="absolute inset-0 w-6 h-6 p-1.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-brand-500)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <ellipse cx="12" cy="6" rx="7" ry="2.5" />
            <path d="M19 12c0 1.38-3.13 2.5-7 2.5S5 13.38 5 12" />
            <path d="M5 6v12c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5V6" />
          </svg>
        </div>
      ) : isCompleted ? (
        <svg
          className="h-4 w-4"
          style={{ color: 'var(--color-success)' }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ) : isCancelled ? (
        <svg
          className="h-4 w-4"
          style={{ color: 'var(--color-warning)' }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          style={{ color: 'var(--color-error)' }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
      )}

      {/* Text label and job count */}
      <span
        className="text-xs font-medium"
        style={{
          color: isCompleted
            ? 'var(--color-success)'
            : isFailed
              ? 'var(--color-error)'
              : isCancelled
                ? 'var(--color-warning)'
                : 'var(--color-brand-600)',
        }}
      >
        {isIndexing ? `${avgProgress}%` : isCompleted ? 'Done' : isCancelled ? 'Stopped' : 'Failed'}
      </span>

      {/* Job count badge for multiple jobs */}
      {jobs.length > 1 && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{
            backgroundColor: isIndexing ? 'var(--color-brand-500)' : 'var(--text-muted)',
            color: 'white',
          }}
        >
          {jobs.length}
        </span>
      )}

      {/* Tooltip on hover if notification is hidden */}
      {!isNotificationVisible && (
        <span
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            backgroundColor: 'var(--surface-card)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          Click to show details
        </span>
      )}
    </button>
  );
}
