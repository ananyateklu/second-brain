import { cn } from '@/lib/utils';
import type { StatsCardGridProps } from './types';

/**
 * Grid display of indexing statistics.
 */
export function StatsCardGrid({ stats, isIndexing }: StatsCardGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-2.5">
      {/* Total Notes */}
      <StatCell
        icon={
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        }
        label="Total Notes"
        value={stats.totalNotesInSystem.toLocaleString()}
        isIndexing={isIndexing}
      />

      {/* Indexed Notes */}
      <StatCell
        icon={
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        }
        label="Indexed"
        value={stats.uniqueNotes.toLocaleString()}
        isIndexing={isIndexing}
        isSuccess={stats.uniqueNotes === stats.totalNotesInSystem && stats.totalNotesInSystem > 0}
      />

      {/* Not Indexed */}
      <StatCell
        icon={
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        }
        label="Not Indexed"
        value={stats.notIndexedCount.toLocaleString()}
        isIndexing={isIndexing}
        variant={stats.notIndexedCount > 0 ? 'warning' : 'success'}
      />

      {/* Needs Update */}
      <StatCell
        icon={
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        }
        label="Needs Update"
        value={stats.staleNotesCount.toLocaleString()}
        isIndexing={isIndexing}
        variant={stats.staleNotesCount > 0 ? 'warning' : 'success'}
      />
    </div>
  );
}

interface StatCellProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  isIndexing: boolean;
  isSuccess?: boolean;
  variant?: 'default' | 'warning' | 'success';
}

function StatCell({ icon, label, value, isIndexing, isSuccess, variant = 'default' }: StatCellProps) {
  const getValueColor = () => {
    if (isSuccess) return 'var(--color-success)';
    if (variant === 'warning') return 'var(--color-warning)';
    if (variant === 'success') return 'var(--color-success)';
    return 'var(--text-primary)';
  };

  return (
    <div
      className="p-2 rounded-xl"
      style={{
        backgroundColor:
          isSuccess || variant === 'success'
            ? 'color-mix(in srgb, var(--color-success) 8%, transparent)'
            : 'color-mix(in srgb, var(--color-brand-600) 5%, transparent)',
      }}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <svg
          className="h-3 w-3 flex-shrink-0 text-[var(--text-secondary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {icon}
        </svg>
        <p className="text-xs font-medium text-[var(--text-secondary)]">{label}</p>
      </div>
      <p
        className={cn('text-base font-bold', isIndexing && 'animate-pulse')}
        style={{ color: getValueColor() }}
      >
        {value}
      </p>
    </div>
  );
}
