/**
 * Summary Generation Indicator Component
 * A compact header indicator that shows when summary generation is in progress
 * Click to re-open the full notification panel
 */

import { useBoundStore } from '../../store/bound-store';

export function SummaryIndicator() {
  const {
    activeJob: activeSummaryJob,
    isNotificationVisible: isSummaryNotificationVisible,
    showSummaryNotification,
  } = useBoundStore();

  const hasJob = activeSummaryJob !== null;

  // Don't render if no active job
  if (!hasJob) {
    return null;
  }

  const status = activeSummaryJob?.status;
  const isGenerating = status?.status === 'running' || status?.status === 'pending';
  const isCompleted = status?.status === 'completed';
  const isFailed = status?.status === 'failed';
  const isCancelled = status?.status === 'cancelled';

  // Calculate progress
  const progress = status?.progressPercentage ?? 0;

  const handleClick = () => {
    showSummaryNotification();
  };

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
      title={isGenerating ? `Generating summaries: ${progress}%` : isCompleted ? 'Summaries complete' : isCancelled ? 'Summary generation stopped' : 'Summary generation failed'}
    >
      {/* Icon with progress */}
      {isGenerating ? (
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
              strokeDasharray={`${(progress / 100) * 56.55} 56.55`}
              style={{
                transition: 'stroke-dasharray 0.3s ease-out',
              }}
            />
          </svg>
          {/* Document icon in center */}
          <svg
            className="absolute inset-0 w-6 h-6 p-1.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-brand-500)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
            <path d="M10 9H8" />
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

      {/* Text label */}
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
        {isGenerating ? `Summaries ${progress}%` : isCompleted ? 'Summaries Done' : isCancelled ? 'Stopped' : 'Failed'}
      </span>

      {/* Tooltip on hover if notification is hidden */}
      {!isSummaryNotificationVisible && (
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
