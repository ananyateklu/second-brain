import { cn } from '@/lib/utils';
import type { RefreshButtonProps } from './types';

/**
 * Refresh button for reloading providers and models.
 */
export function RefreshButton({
  onRefresh,
  isRefreshing,
  disabled,
}: RefreshButtonProps) {
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRefreshing) {
      await onRefresh();
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        void handleClick(e);
      }}
      disabled={isRefreshing || disabled}
      className={cn(
        'p-2 rounded-lg transition-all duration-200',
        'hover:scale-105 active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
      style={{
        backgroundColor: 'var(--surface-card)',
        color: isRefreshing ? 'var(--color-primary)' : 'var(--text-secondary)',
        border: '1px solid var(--border)',
      }}
      title={
        isRefreshing ? 'Refreshing providers...' : 'Refresh providers & models'
      }
    >
      <svg
        className={cn('w-4 h-4', isRefreshing && 'animate-spin')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  );
}
