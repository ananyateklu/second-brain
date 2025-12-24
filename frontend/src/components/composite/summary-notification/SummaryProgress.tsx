/**
 * Summary Progress Component
 * Displays the progress bar and stop button during summary generation.
 */

import { cn } from '@/lib/utils';
import { SpinnerIcon, StopIcon } from './SummaryIcons';
import type { SummaryProgressProps } from './types';

/**
 * Progress bar component for summary generation.
 */
function ProgressBar({ progress }: { progress: number }) {
  return (
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
  );
}

/**
 * Preparing state when notes haven't been loaded yet.
 */
function PreparingState() {
  return (
    <div
      className="flex items-center gap-2 text-sm"
      style={{ color: 'var(--text-secondary)' }}
    >
      <SpinnerIcon
        className="animate-spin w-4 h-4"
        style={{ color: 'var(--color-brand-500)' }}
      />
      <span>Preparing notes...</span>
    </div>
  );
}

/**
 * Stop generation button.
 */
function StopButton({
  isCancelling,
  onClick,
}: {
  isCancelling: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isCancelling}
      className={cn(
        'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg',
        'text-sm font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'hover:bg-[color-mix(in_srgb,var(--color-error)_18%,transparent)]'
      )}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
        color: 'var(--color-error)',
      }}
    >
      {isCancelling ? (
        <>
          <SpinnerIcon className="animate-spin w-4 h-4" />
          <span>Stopping...</span>
        </>
      ) : (
        <>
          <StopIcon className="w-4 h-4" />
          <span>Stop Generation</span>
        </>
      )}
    </button>
  );
}

/**
 * Main progress component that shows the progress bar, note count, and stop button.
 */
export function SummaryProgress({
  processedNotes,
  totalNotes,
  progress,
  isCancelling,
  onStopGeneration,
}: SummaryProgressProps) {
  // Show preparing state when no notes loaded yet
  if (totalNotes === 0) {
    return (
      <div className="space-y-3">
        <PreparingState />
        <StopButton isCancelling={isCancelling} onClick={onStopGeneration} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress bar section */}
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
        <ProgressBar progress={progress} />
      </div>

      {/* Stop button */}
      <StopButton isCancelling={isCancelling} onClick={onStopGeneration} />
    </div>
  );
}
