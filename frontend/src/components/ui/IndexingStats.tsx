import { useIndexStats, useDeleteIndexedNotes } from '../../features/rag/hooks/use-indexing';
import { IndexStatsData } from '../../features/rag/types';
import { toast } from '../../hooks/use-toast';

interface IndexingStatsProps {
  userId?: string;
}

function StatsCard({ title, stats, userId, vectorStoreProvider }: { title: string; stats: IndexStatsData | undefined; userId: string; vectorStoreProvider: import('../../types/rag').VectorStoreProvider }) {
  const deleteIndexedNotesMutation = useDeleteIndexedNotes();
  const isDeleting = deleteIndexedNotesMutation.isPending;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await toast.confirm({
      title: `Delete from ${title}`,
      description: `Are you sure you want to delete all notes?`,
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
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
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
      minute: '2-digit'
    });
  };

  if (!stats) {
    return (
      <div
        className="relative p-4 rounded-xl border overflow-hidden group transition-all duration-300"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Background gradient */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            background: 'linear-gradient(135deg, var(--color-brand-500) 0%, transparent 100%)',
          }}
        />

        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h4>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: 'var(--text-secondary)',
                  opacity: 0.5,
                }}
                title="No data"
              />
            </div>
            <div
              className="px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)',
                color: 'var(--text-secondary)',
              }}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              No data
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isHealthy = stats.totalEmbeddings > 0 && stats.lastIndexedAt !== null;
  const healthColor = isHealthy ? 'var(--color-success)' : 'var(--color-warning)';

  return (
    <div
      className={`relative p-4 rounded-xl border overflow-hidden group transition-all duration-300 ${isDeleting ? '' : 'hover:shadow-md hover:-translate-y-0.5'}`}
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: isDeleting ? 'color-mix(in srgb, var(--color-error) 40%, var(--border))' : 'var(--border)',
      }}
    >
      {/* Background gradient */}
      <div
        className={`absolute inset-0 transition-opacity ${isDeleting ? 'opacity-0' : 'opacity-5 group-hover:opacity-8'}`}
        style={{
          background: 'linear-gradient(135deg, var(--color-brand-500) 0%, transparent 100%)',
        }}
      />

      {/* Deletion Loading Overlay */}
      {isDeleting && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--surface-elevated) 85%, transparent)',
          }}
        >
          {/* Animated spinner */}
          <div className="relative mb-3">
            <div
              className="w-10 h-10 rounded-full border-2 animate-spin"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-error) 20%, transparent)',
                borderTopColor: 'var(--color-error)',
              }}
            />
            <div
              className="absolute inset-0 flex items-center justify-center"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                style={{ color: 'var(--color-error)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>

          {/* Status text */}
          <p
            className="text-sm font-semibold mb-1 text-center"
            style={{ color: 'var(--text-primary)' }}
          >
            Deleting {title} Index...
          </p>
          <p
            className="text-xs text-center mb-2 px-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            Removing {stats?.totalEmbeddings?.toLocaleString() ?? 0} embeddings from {stats?.uniqueNotes?.toLocaleString() ?? 0} notes
          </p>
          <p
            className="text-[10px] text-center px-4 flex items-center gap-1"
            style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Please don&apos;t navigate away
          </p>
        </div>
      )}

      <div className={`relative ${isDeleting ? 'opacity-30 pointer-events-none' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h4>
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: healthColor,
                boxShadow: `0 0 0 2px color-mix(in srgb, ${healthColor} 20%, transparent)`,
              }}
              title={isHealthy ? 'Healthy' : 'Needs attention'}
            />
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded-md font-medium border"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                color: 'var(--color-brand-600)',
              }}
            >
              {stats.vectorStoreProvider}
            </span>
            {stats.totalEmbeddings > 0 && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteIndexedNotesMutation.isPending}
                className="flex items-center justify-center w-6 h-6 rounded-md transition-all duration-200 hover:bg-opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                style={{
                  backgroundColor: deleteIndexedNotesMutation.isPending
                    ? 'color-mix(in srgb, var(--color-error) 20%, transparent)'
                    : 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                  color: 'var(--color-error)',
                  border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
                  opacity: deleteIndexedNotesMutation.isPending ? 0.6 : 1,
                  cursor: deleteIndexedNotesMutation.isPending ? 'not-allowed' : 'pointer',
                }}
                title={`Delete all indexed notes from ${title}`}
                onMouseEnter={(e) => {
                  if (!deleteIndexedNotesMutation.isPending) {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-error) 20%, transparent)';
                    e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-error) 50%, transparent)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!deleteIndexedNotesMutation.isPending) {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-error) 10%, transparent)';
                    e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-error) 30%, transparent)';
                  }
                }}
              >
                {deleteIndexedNotesMutation.isPending ? (
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs font-medium mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Total Embeddings
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {stats.totalEmbeddings.toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Unique Notes
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {stats.uniqueNotes.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div
          className="pt-3 border-t flex flex-wrap items-center gap-x-4 gap-y-2 text-xs"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ color: 'var(--text-secondary)' }}>Last Indexed:</span>
            <span
              className="font-semibold"
              style={{ color: 'var(--text-primary)' }}
              title={formatFullDate(stats.lastIndexedAt)}
            >
              {formatDate(stats.lastIndexedAt)}
            </span>
          </div>

          {stats.embeddingProvider && (
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span style={{ color: 'var(--text-secondary)' }}>Model:</span>
              <span
                className="font-semibold capitalize"
                style={{ color: 'var(--text-primary)' }}
              >
                {stats.embeddingProvider}
              </span>
            </div>
          )}

          {stats.uniqueNotes > 0 && (
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span style={{ color: 'var(--text-secondary)' }}>Avg. chunks:</span>
              <span className="font-semibold" style={{ color: 'var(--color-brand-600)' }}>
                {(stats.totalEmbeddings / stats.uniqueNotes).toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function IndexingStats({ userId = 'default-user' }: IndexingStatsProps) {
  const { data: stats, isLoading } = useIndexStats(userId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl border animate-pulse"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="h-4 rounded w-1/3"
                style={{ backgroundColor: 'var(--surface-card)' }}
              />
              <div
                className="h-5 rounded w-20"
                style={{ backgroundColor: 'var(--surface-card)' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div
                  className="h-3 rounded w-3/4 mb-1"
                  style={{ backgroundColor: 'var(--surface-card)' }}
                />
                <div
                  className="h-6 rounded w-1/2"
                  style={{ backgroundColor: 'var(--surface-card)' }}
                />
              </div>
              <div>
                <div
                  className="h-3 rounded w-3/4 mb-1"
                  style={{ backgroundColor: 'var(--surface-card)' }}
                />
                <div
                  className="h-6 rounded w-1/2"
                  style={{ backgroundColor: 'var(--surface-card)' }}
                />
              </div>
            </div>
            <div
              className="pt-3 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex gap-3">
                <div
                  className="h-3 rounded w-1/4"
                  style={{ backgroundColor: 'var(--surface-card)' }}
                />
                <div
                  className="h-3 rounded w-1/4"
                  style={{ backgroundColor: 'var(--surface-card)' }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div
        className="p-6 rounded-xl border text-center"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex justify-center mb-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
            }}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          No Stats Available
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Run your first indexing job to see stats appear here
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <StatsCard title="PostgreSQL" stats={stats.postgreSQL} userId={userId} vectorStoreProvider="PostgreSQL" />
      <StatsCard title="Pinecone" stats={stats.pinecone} userId={userId} vectorStoreProvider="Pinecone" />
    </div>
  );
}
