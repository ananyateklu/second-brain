import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface StatusFooterProps {
  isHealthy: boolean;
  issueCount: number;
  lastIndexedAt: string | null;
  embeddingProvider: string;
  /** Whether indexing is in progress (shows indexing status instead of healthy/warning) */
  isIndexing?: boolean;
}

/**
 * Footer showing health status, last indexed time, and provider.
 * Uses icons + text for accessibility (not just color).
 */
export function StatusFooter({
  isHealthy,
  issueCount,
  lastIndexedAt,
  embeddingProvider,
  isIndexing = false,
}: StatusFooterProps) {
  const formattedTime = lastIndexedAt
    ? formatDistanceToNow(new Date(lastIndexedAt), { addSuffix: true })
    : 'Never';

  // Determine status variant: indexing > healthy > warning
  const getStatusVariant = () => {
    if (isIndexing) return 'indexing';
    if (isHealthy) return 'success';
    return 'warning';
  };
  const variant = getStatusVariant();

  const getBackgroundColor = () => {
    if (variant === 'indexing') return 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)';
    if (variant === 'success') return 'color-mix(in srgb, var(--color-success) 8%, transparent)';
    return 'color-mix(in srgb, var(--color-warning) 8%, transparent)';
  };

  const getBorderColor = () => {
    if (variant === 'indexing') return 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)';
    if (variant === 'success') return 'color-mix(in srgb, var(--color-success) 20%, transparent)';
    return 'color-mix(in srgb, var(--color-warning) 20%, transparent)';
  };

  const getIconColor = () => {
    if (variant === 'indexing') return 'var(--color-brand-600)';
    if (variant === 'success') return 'var(--color-success)';
    return 'var(--color-warning)';
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2.5 py-2 rounded-xl'
      )}
      style={{
        backgroundColor: getBackgroundColor(),
        border: `1px solid ${getBorderColor()}`,
      }}
    >
      {/* Status icon */}
      {variant === 'indexing' ? (
        <svg
          className="h-3.5 w-3.5 flex-shrink-0 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          style={{ color: getIconColor() }}
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : variant === 'success' ? (
        <svg
          className="h-3.5 w-3.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          style={{ color: getIconColor() }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          className="h-3.5 w-3.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          style={{ color: getIconColor() }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      )}

      {/* Status text */}
      <span
        className="text-xs font-medium flex-shrink-0"
        style={{ color: getIconColor() }}
      >
        {variant === 'indexing' ? 'Indexing...' : isHealthy ? 'Healthy' : `${issueCount} need${issueCount === 1 ? 's' : ''} attention`}
      </span>

      {/* Separator */}
      <span className="text-[var(--text-secondary)] opacity-40">•</span>

      {/* Last indexed */}
      <span className="text-[10px] text-[var(--text-secondary)] truncate">
        {formattedTime}
      </span>

      {/* Separator */}
      {embeddingProvider && (
        <>
          <span className="text-[var(--text-secondary)] opacity-40">•</span>
          <span className="text-[10px] text-[var(--text-secondary)] truncate">
            {embeddingProvider}
          </span>
        </>
      )}
    </div>
  );
}
