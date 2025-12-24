import type { StatsCardFooterProps } from './types';

/**
 * Footer with metadata: last indexed, avg chunks, model.
 */
export function StatsCardFooter({ stats }: StatsCardFooterProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatFullDate = (dateString: string | null) => {
    if (!dateString) return 'Never indexed';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const avgChunks =
    stats.uniqueNotes > 0 ? (stats.totalEmbeddings / stats.uniqueNotes).toFixed(1) : '0';

  return (
    <div
      className="pt-2 border-t grid grid-cols-3 gap-1"
      style={{ borderColor: 'var(--border)' }}
    >
      <FooterCell
        label="Last Indexed"
        value={formatDate(stats.lastIndexedAt)}
        title={formatFullDate(stats.lastIndexedAt)}
      />
      <FooterCell
        label="Avg. Chunks"
        value={avgChunks}
        valueColor="var(--color-brand-600)"
      />
      <FooterCell
        label="Model"
        value={stats.embeddingProvider || 'N/A'}
        capitalize
      />
    </div>
  );
}

interface FooterCellProps {
  label: string;
  value: string;
  title?: string;
  valueColor?: string;
  capitalize?: boolean;
}

function FooterCell({ label, value, title, valueColor, capitalize }: FooterCellProps) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-medium text-[var(--text-secondary)]">{label}</p>
      <p
        className={`text-[11px] font-semibold truncate ${capitalize ? 'capitalize' : ''}`}
        style={{ color: valueColor || 'var(--text-primary)' }}
        title={title}
      >
        {value}
      </p>
    </div>
  );
}
