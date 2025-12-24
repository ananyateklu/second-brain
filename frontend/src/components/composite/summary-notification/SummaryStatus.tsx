/**
 * Summary Status Display Components
 * Shows completion, failure, and cancellation status summaries.
 */

import type { SummaryStatusDisplayProps } from './types';

/**
 * Displays the completed status with success/skipped/failure counts.
 */
function CompletedStatus({ status }: SummaryStatusDisplayProps) {
  return (
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
  );
}

/**
 * Displays the failed status with error message.
 */
function FailedStatus({ status }: SummaryStatusDisplayProps) {
  return (
    <div
      className="text-sm text-center py-1"
      style={{ color: 'var(--color-error)' }}
    >
      {status.errors[0] || 'An error occurred'}
    </div>
  );
}

/**
 * Displays the cancelled status with processed/remaining counts.
 */
function CancelledStatus({ status }: SummaryStatusDisplayProps) {
  const remaining = status.totalNotes - status.processedNotes;

  return (
    <div className="flex items-center justify-center gap-4 text-sm py-1">
      <span style={{ color: 'var(--text-secondary)' }}>
        <strong>{status.processedNotes}</strong> processed,{' '}
        <strong>{remaining}</strong> remaining
      </span>
    </div>
  );
}

/**
 * Main status display component that renders the appropriate status based on type.
 */
export function SummaryStatusDisplay({
  status,
  statusType,
}: SummaryStatusDisplayProps) {
  switch (statusType) {
    case 'completed':
      return <CompletedStatus status={status} statusType={statusType} />;
    case 'failed':
      return <FailedStatus status={status} statusType={statusType} />;
    case 'cancelled':
      return <CancelledStatus status={status} statusType={statusType} />;
    default:
      return null;
  }
}
