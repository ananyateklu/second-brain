import { cn } from '@/lib/utils';
import { useDeleteIndexedNotes, type StreamingProgress, type StreamingStats } from '@/features/rag/hooks/use-indexing';
import { toast } from '@/hooks/use-toast';
import type { IndexStatsData } from '@/types/rag';
import { RingProgress } from './RingProgress';
import { MetricsRow } from './MetricsRow';
import { StorageEstimate } from './StorageEstimate';
import { ActivitySparkline } from './ActivitySparkline';
import { StatusFooter } from './StatusFooter';

interface IndexHealthCardProps {
  title: string;
  stats: IndexStatsData | undefined;
  userId: string;
  vectorStoreProvider: 'PostgreSQL' | 'Pinecone';
  isIndexing: boolean;
  /** Callback to start indexing for this vector store */
  onStartIndexing?: () => void;
  /** Callback to stop indexing for this vector store */
  onStopIndexing?: () => void;
  /** Whether indexing is currently starting (before stream begins) */
  isStartingIndexing?: boolean;
  /** Whether stop is in progress */
  isStoppingIndexing?: boolean;
  /** Real-time streaming progress data */
  streamingProgress?: StreamingProgress | null;
  /** Real-time streaming stats data for live metric updates */
  streamingStats?: StreamingStats | null;
}

/**
 * Modern index health card with ring progress, metrics grid,
 * storage estimate, activity sparkline, and status footer.
 */
export function IndexHealthCard({
  title,
  stats,
  userId,
  vectorStoreProvider,
  isIndexing,
  onStartIndexing,
  onStopIndexing,
  isStartingIndexing = false,
  isStoppingIndexing = false,
  streamingProgress,
  streamingStats,
}: IndexHealthCardProps) {
  const deleteIndexedNotesMutation = useDeleteIndexedNotes();
  const isDeleting = deleteIndexedNotesMutation.isPending;
  const canStartIndexing = !isIndexing && !isDeleting && !isStartingIndexing;
  const canStopIndexing = isIndexing && !isStoppingIndexing;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!stats) return;

    const confirmed = await toast.confirm({
      title: `Delete ${title} Index`,
      description: `This will remove all ${stats.totalEmbeddings.toLocaleString()} embeddings from ${stats.uniqueNotes.toLocaleString()} notes. This action cannot be undone.`,
      confirmText: 'Delete Index',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      deleteIndexedNotesMutation.mutate(
        { userId, vectorStoreProvider },
        {
          onSuccess: () => {
            toast.success(
              'Index deleted',
              `Removed ${stats.totalEmbeddings.toLocaleString()} embeddings from ${title}.`
            );
          },
          onError: (error) => {
            toast.error(
              'Failed to delete index',
              error instanceof Error ? error.message : 'An unexpected error occurred.'
            );
          },
        }
      );
    }
  };

  // Empty state
  if (!stats) {
    return <EmptyIndexHealthCard title={title} />;
  }

  // Use streaming progress for real-time updates (updates every note, not every 5)
  const isActivelyStreaming = !!streamingProgress;

  // During streaming: base stats + progress from current job
  // processedCount = notes processed so far in current job
  // totalCount = total notes being indexed in current job
  const displayUniqueNotes = isActivelyStreaming
    ? stats.uniqueNotes + streamingProgress.processedCount
    : (streamingStats?.indexedCount ?? stats.uniqueNotes);

  const displayTotalNotes = stats.totalNotesInSystem;

  const displayTotalEmbeddings = isActivelyStreaming
    ? stats.totalEmbeddings + streamingProgress.embeddingsCreated
    : (streamingStats?.totalEmbeddings ?? stats.totalEmbeddings);

  // Not indexed = remaining in current job, or base stats
  const displayNotIndexedCount = isActivelyStreaming
    ? streamingProgress.totalCount - streamingProgress.processedCount
    : (streamingStats?.pendingCount ?? stats.notIndexedCount);

  const displayDimensions = streamingStats?.dimensions ?? stats.dimensions;

  // For the ring, show overall indexed percentage
  const indexedPercentage =
    displayTotalNotes > 0
      ? Math.round((displayUniqueNotes / displayTotalNotes) * 100)
      : 0;

  // During streaming, we're actively indexing so treat as "in progress" not unhealthy
  const hasIssues = !isActivelyStreaming && !streamingStats && (stats.notIndexedCount > 0 || stats.staleNotesCount > 0);
  const isHealthy = displayTotalEmbeddings > 0 && stats.lastIndexedAt !== null && !hasIssues;
  const issueCount = isActivelyStreaming
    ? (streamingProgress.totalCount - streamingProgress.processedCount)
    : (streamingStats?.pendingCount ?? (stats.notIndexedCount + stats.staleNotesCount));

  return (
    <div
      className={cn(
        'relative p-4 rounded-2xl border overflow-hidden group transition-all duration-300',
        !isDeleting && 'hover:shadow-lg hover:-translate-y-0.5'
      )}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
        borderColor: isDeleting
          ? 'color-mix(in srgb, var(--color-error) 40%, transparent)'
          : isIndexing
            ? 'color-mix(in srgb, var(--color-brand-600) 40%, transparent)'
            : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      {/* Background gradient */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity',
          isDeleting ? 'opacity-0' : isIndexing ? 'opacity-10' : 'opacity-5 group-hover:opacity-[0.08]'
        )}
        style={{
          background: 'linear-gradient(135deg, var(--text-primary) 0%, transparent 100%)',
        }}
      />

      {/* Indexing overlay */}
      {isIndexing && (
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, var(--color-brand-400) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Deletion overlay */}
      {isDeleting && <DeletionOverlay title={title} stats={stats} />}

      {/* Main content */}
      <div className={cn('relative space-y-3', isDeleting && 'opacity-30 pointer-events-none')}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-[var(--text-primary)]">{title}</h4>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
                borderColor: 'color-mix(in srgb, var(--text-primary) 15%, transparent)',
                color: 'var(--text-secondary)',
              }}
            >
              {stats.vectorStoreProvider}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Start/Stop Indexing Button */}
            {isIndexing && onStopIndexing ? (
              // Stop button when indexing is in progress
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStopIndexing();
                }}
                disabled={!canStopIndexing}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200',
                  canStopIndexing
                    ? 'bg-[color-mix(in_srgb,var(--color-error)_15%,transparent)] text-[var(--color-error)] hover:bg-[color-mix(in_srgb,var(--color-error)_25%,transparent)]'
                    : 'opacity-50 cursor-not-allowed text-[var(--text-secondary)]'
                )}
                title="Stop indexing"
              >
                {isStoppingIndexing ? (
                  <svg
                    className="h-3 w-3 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
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
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                    />
                  </svg>
                )}
                <span>{isStoppingIndexing ? 'Stopping...' : 'Stop'}</span>
              </button>
            ) : onStartIndexing ? (
              // Start button when not indexing
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartIndexing();
                }}
                disabled={!canStartIndexing}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200',
                  canStartIndexing
                    ? 'bg-[color-mix(in_srgb,var(--color-brand-600)_15%,transparent)] text-[var(--color-brand-600)] hover:bg-[color-mix(in_srgb,var(--color-brand-600)_25%,transparent)]'
                    : 'opacity-50 cursor-not-allowed text-[var(--text-secondary)]'
                )}
                title="Start indexing"
              >
                {isStartingIndexing ? (
                  <svg
                    className="h-3 w-3 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
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
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
                <span>{isStartingIndexing ? 'Starting...' : 'Index'}</span>
              </button>
            ) : null}
            {/* Delete Button */}
            {stats.totalEmbeddings > 0 && (
              <button
                type="button"
                onClick={(e) => void handleDelete(e)}
                disabled={isDeleting || isIndexing}
                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)] disabled:opacity-30"
                title="Delete index"
              >
                <svg
                  className="h-3.5 w-3.5 text-[var(--text-secondary)] hover:text-[var(--color-error)]"
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
              </button>
            )}
          </div>
        </div>

        {/* Ring progress and main stat */}
        <div className="flex items-center gap-4">
          <RingProgress
            value={indexedPercentage}
            size={72}
            thickness={7}
            label="Indexed"
            variant={isHealthy ? 'success' : hasIssues ? 'warning' : 'default'}
            isLoading={isActivelyStreaming}
          />
          <div className="flex-1">
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {displayUniqueNotes}/{displayTotalNotes}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              Notes indexed
            </div>
          </div>
        </div>

        {/* Metrics row */}
        <MetricsRow
          notIndexedCount={displayNotIndexedCount}
          staleNotesCount={streamingStats ? 0 : stats.staleNotesCount}
          totalEmbeddings={displayTotalEmbeddings}
          dimensions={displayDimensions}
        />

        {/* Streaming Progress */}
        {streamingProgress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)]">
                {streamingProgress.currentNoteTitle
                  ? `Processing: ${streamingProgress.currentNoteTitle.slice(0, 30)}${streamingProgress.currentNoteTitle.length > 30 ? '...' : ''}`
                  : 'Processing notes...'}
              </span>
              <span className="font-medium text-[var(--color-brand-600)]">
                {streamingProgress.processedCount}/{streamingProgress.totalCount}
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${streamingProgress.progressPercent}%`,
                  backgroundColor: 'var(--color-brand-600)',
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
              <span>{streamingProgress.embeddingsCreated} embeddings created</span>
              <span>{Math.round(streamingProgress.progressPercent)}%</span>
            </div>
          </div>
        )}

        {/* Storage and sparkline row */}
        <div className="flex items-center justify-between gap-2">
          <StorageEstimate
            totalEmbeddings={displayTotalEmbeddings}
            dimensions={displayDimensions}
          />
          <ActivitySparkline lastIndexedAt={streamingStats?.lastIndexedAt ?? stats.lastIndexedAt} />
        </div>

        {/* Status footer */}
        <StatusFooter
          isHealthy={isHealthy}
          issueCount={issueCount}
          lastIndexedAt={streamingStats?.lastIndexedAt ?? stats.lastIndexedAt}
          embeddingProvider={stats.embeddingProvider}
          isIndexing={!!streamingStats}
        />
      </div>
    </div>
  );
}

/** Empty state card */
function EmptyIndexHealthCard({ title }: { title: string }) {
  return (
    <div
      className="relative p-4 rounded-2xl border overflow-hidden"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: 'linear-gradient(135deg, var(--text-primary) 0%, transparent 100%)',
        }}
      />
      <div className="relative flex flex-col items-center justify-center py-6 text-center">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl border mb-3"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
            borderColor: 'color-mix(in srgb, var(--text-primary) 10%, transparent)',
          }}
        >
          <svg
            className="h-6 w-6 text-[var(--text-secondary)]"
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
        </div>
        <h4 className="font-semibold text-sm text-[var(--text-primary)] mb-1">{title}</h4>
        <p className="text-xs text-[var(--text-secondary)]">
          No embeddings yet. Run indexing to get started.
        </p>
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
      <p className="text-xs text-center px-4 text-[var(--text-secondary)]">
        Removing {stats.totalEmbeddings.toLocaleString()} embeddings from{' '}
        {stats.uniqueNotes.toLocaleString()} notes
      </p>
    </div>
  );
}
