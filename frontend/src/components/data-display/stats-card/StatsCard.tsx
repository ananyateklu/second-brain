import { cn } from '@/lib/utils';
import { useDeleteIndexedNotes } from '../../../features/rag/hooks/use-indexing';
import { toast } from '../../../hooks/use-toast';
import { HealthIndicator } from './HealthIndicator';
import { DeleteButton } from './DeleteButton';
import { StatsCardGrid } from './StatsCardGrid';
import { StatsCardFooter } from './StatsCardFooter';
import type { StatsCardProps } from './types';

/**
 * Card displaying indexing statistics for a vector store.
 * Uses CSS hover classes instead of inline handlers.
 */
export function StatsCard({
  title,
  stats,
  userId,
  vectorStoreProvider,
  isIndexing,
}: StatsCardProps) {
  const deleteIndexedNotesMutation = useDeleteIndexedNotes();
  const isDeleting = deleteIndexedNotesMutation.isPending;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await toast.confirm({
      title: `Delete from ${title}`,
      description: 'Are you sure you want to delete all notes?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      deleteIndexedNotesMutation.mutate(
        { userId, vectorStoreProvider },
        {
          onSuccess: () => {
            toast.success(
              `Successfully deleted ${title} index`,
              `Removed ${stats?.totalEmbeddings?.toLocaleString() ?? 0} embeddings from ${stats?.uniqueNotes?.toLocaleString() ?? 0} notes.`
            );
          },
          onError: (error) => {
            toast.error(
              `Failed to delete ${title} index`,
              error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
            );
          },
        }
      );
    }
  };

  // Empty state
  if (!stats) {
    return <EmptyStatsCard title={title} />;
  }

  const hasIssues = stats.notIndexedCount > 0 || stats.staleNotesCount > 0;
  const isHealthy = stats.totalEmbeddings > 0 && stats.lastIndexedAt !== null && !hasIssues;

  return (
    <div
      className={cn(
        'relative p-3 rounded-2xl border overflow-hidden group transition-all duration-300',
        !isDeleting && 'hover:shadow-md hover:-translate-y-0.5',
        isIndexing && 'animate-pulse'
      )}
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: isDeleting
          ? 'color-mix(in srgb, var(--color-error) 40%, var(--border))'
          : isIndexing
            ? 'color-mix(in srgb, var(--color-brand-600) 40%, var(--border))'
            : 'var(--border)',
      }}
    >
      {/* Background gradient */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity',
          isDeleting
            ? 'opacity-0'
            : isIndexing
              ? 'opacity-10 animate-pulse'
              : 'opacity-5 group-hover:opacity-[0.08]'
        )}
        style={{
          background: 'linear-gradient(135deg, var(--color-brand-500) 0%, transparent 100%)',
        }}
      />

      {/* Indexing indicator overlay */}
      {isIndexing && (
        <div
          className="absolute inset-0 opacity-15 animate-pulse pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, var(--color-brand-400) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Deletion Loading Overlay */}
      {isDeleting && <DeletionOverlay title={title} stats={stats} />}

      <div className={cn('relative', isDeleting && 'opacity-30 pointer-events-none')}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-[var(--text-primary)]">{title}</h4>
            <HealthIndicator isHealthy={isHealthy} hasData />
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded-xl font-medium border"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                color: 'var(--color-brand-600)',
              }}
            >
              {stats.vectorStoreProvider}
            </span>
            {stats.totalEmbeddings > 0 && (
              <DeleteButton
                isDeleting={isDeleting}
                onClick={(e) => void handleDelete(e)}
                title={title}
              />
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <StatsCardGrid stats={stats} isIndexing={isIndexing} />

        {/* Embeddings Info Row */}
        <div
          className="flex items-center justify-between p-2 rounded-xl mb-2.5"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 5%, transparent)',
          }}
        >
          <div className="flex items-center gap-1">
            <svg
              className="h-3 w-3 flex-shrink-0 text-[var(--text-secondary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Total Embeddings
            </span>
          </div>
          <span
            className={cn('text-xs font-bold text-[var(--text-primary)]', isIndexing && 'animate-pulse')}
          >
            {stats.totalEmbeddings.toLocaleString()}
          </span>
        </div>

        {/* Status Indicator */}
        {stats.totalNotesInSystem > 0 && (
          <StatusIndicator isHealthy={isHealthy} stats={stats} />
        )}

        {/* Footer */}
        <StatsCardFooter stats={stats} />
      </div>
    </div>
  );
}

/** Empty state card */
function EmptyStatsCard({ title }: { title: string }) {
  return (
    <div
      className="relative p-3 rounded-2xl border overflow-hidden group transition-all duration-300"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: 'linear-gradient(135deg, var(--color-brand-500) 0%, transparent 100%)',
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-base text-[var(--text-primary)]">{title}</h4>
            <HealthIndicator isHealthy={false} hasData={false} />
          </div>
          <div
            className="px-1.5 py-0.5 rounded-xl text-[10px] font-medium flex items-center gap-1"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)',
              color: 'var(--text-secondary)',
            }}
          >
            <svg
              className="h-2.5 w-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            No data
          </div>
        </div>
      </div>
    </div>
  );
}

/** Deletion overlay with spinner */
function DeletionOverlay({
  title,
  stats,
}: {
  title: string;
  stats: { totalEmbeddings: number; uniqueNotes: number };
}) {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--surface-elevated) 85%, transparent)',
      }}
    >
      <div className="relative mb-3">
        <div
          className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-error) 20%, transparent)',
            borderTopColor: 'var(--color-error)',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="h-4 w-4 text-[var(--color-error)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </div>
      </div>
      <p className="text-sm font-semibold mb-1 text-center text-[var(--text-primary)]">
        Deleting {title} Index...
      </p>
      <p className="text-xs text-center mb-2 px-4 text-[var(--text-secondary)]">
        Removing {stats.totalEmbeddings.toLocaleString()} embeddings from{' '}
        {stats.uniqueNotes.toLocaleString()} notes
      </p>
      <p
        className="text-[10px] text-center px-4 flex items-center gap-1"
        style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
      >
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        Please don&apos;t navigate away
      </p>
    </div>
  );
}

/** Health status indicator bar */
function StatusIndicator({
  isHealthy,
  stats,
}: {
  isHealthy: boolean;
  stats: { notIndexedCount: number; staleNotesCount: number };
}) {
  const issueCount = stats.notIndexedCount + stats.staleNotesCount;
  const color = isHealthy ? 'var(--color-success)' : 'var(--color-warning)';

  return (
    <div
      className="flex items-center gap-1.5 p-1.5 rounded-xl mb-2.5"
      style={{
        backgroundColor: isHealthy
          ? 'color-mix(in srgb, var(--color-success) 8%, transparent)'
          : 'color-mix(in srgb, var(--color-warning) 8%, transparent)',
        border: `1px solid ${isHealthy ? 'color-mix(in srgb, var(--color-success) 20%, transparent)' : 'color-mix(in srgb, var(--color-warning) 20%, transparent)'}`,
      }}
    >
      <svg
        className="h-3.5 w-3.5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        style={{ color }}
      >
        {isHealthy ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        )}
      </svg>
      <span className="text-xs font-medium" style={{ color }}>
        {isHealthy
          ? 'All notes indexed and up to date'
          : `${issueCount} note${issueCount !== 1 ? 's' : ''} need${issueCount === 1 ? 's' : ''} attention`}
      </span>
    </div>
  );
}
