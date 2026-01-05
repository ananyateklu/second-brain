interface MetricCellProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  variant?: 'default' | 'success' | 'warning';
}

function MetricCell({ icon, label, value, variant = 'default' }: MetricCellProps) {
  const getValueColor = () => {
    if (variant === 'success') return 'var(--color-success)';
    if (variant === 'warning') return 'var(--color-warning)';
    return 'var(--text-primary)';
  };

  const getBgColor = () => {
    if (variant === 'success') return 'color-mix(in srgb, var(--color-success) 8%, transparent)';
    if (variant === 'warning') return 'color-mix(in srgb, var(--color-warning) 8%, transparent)';
    return 'color-mix(in srgb, var(--text-primary) 5%, transparent)';
  };

  return (
    <div
      className="p-2 rounded-xl text-center"
      style={{ backgroundColor: getBgColor() }}
    >
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <span className="text-[var(--text-secondary)]">{icon}</span>
      </div>
      <p
        className="text-base font-bold"
        style={{ color: getValueColor() }}
      >
        {value}
      </p>
      <p className="text-[10px] font-medium text-[var(--text-secondary)] leading-tight mt-0.5">
        {label}
      </p>
    </div>
  );
}

interface MetricsRowProps {
  notIndexedCount: number;
  staleNotesCount: number;
  totalEmbeddings: number;
  dimensions?: number;
}

/**
 * Format large numbers with K/M suffix
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * Grid of 4 metrics: Not Indexed, Stale, Embeddings, Dimensions
 */
export function MetricsRow({
  notIndexedCount,
  staleNotesCount,
  totalEmbeddings,
  dimensions,
}: MetricsRowProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      <MetricCell
        icon={
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        }
        label="Not Indexed"
        value={notIndexedCount}
        variant={notIndexedCount > 0 ? 'warning' : 'success'}
      />
      <MetricCell
        icon={
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        }
        label="Stale"
        value={staleNotesCount}
        variant={staleNotesCount > 0 ? 'warning' : 'success'}
      />
      <MetricCell
        icon={
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
        label="Embeddings"
        value={formatNumber(totalEmbeddings)}
      />
      <MetricCell
        icon={
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        }
        label="Dimensions"
        value={dimensions ? dimensions.toLocaleString() : '—'}
      />
    </div>
  );
}
