import { useState } from 'react';
import { useIndexStats, useDeleteIndexedNotes, useActiveIndexingVectorStores } from '../../features/rag/hooks/use-indexing';
import { IndexStatsData } from '../../types/rag';
import { toast } from '../../hooks/use-toast';
import { isTauri } from '../../lib/native-notifications';
import { TauriPineconeSetupModal } from './TauriPineconeSetupModal';
import { usePineconeConfigured } from './use-pinecone-configured';

interface IndexingStatsProps {
  userId?: string;
}

function StatsCard({ title, stats, userId, vectorStoreProvider, isIndexing }: { title: string; stats: IndexStatsData | undefined; userId: string; vectorStoreProvider: import('../../types/rag').VectorStoreProvider; isIndexing: boolean }) {
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
        className="relative p-3 rounded-xl border overflow-hidden group transition-all duration-300"
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
              <h4 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
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
              className="px-1.5 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)',
                color: 'var(--text-secondary)',
              }}
            >
              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              No data
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasIssues = stats.notIndexedCount > 0 || stats.staleNotesCount > 0;
  const isHealthy = stats.totalEmbeddings > 0 && stats.lastIndexedAt !== null && !hasIssues;
  const healthColor = isHealthy ? 'var(--color-success)' : 'var(--color-warning)';

  return (
    <div
      className={`relative p-3 rounded-xl border overflow-hidden group transition-all duration-300 ${isDeleting ? '' : 'hover:shadow-md hover:-translate-y-0.5'} ${isIndexing ? 'animate-pulse' : ''}`}
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: isDeleting ? 'color-mix(in srgb, var(--color-error) 40%, var(--border))' : isIndexing ? 'color-mix(in srgb, var(--color-brand-600) 40%, var(--border))' : 'var(--border)',
      }}
    >
      {/* Background gradient */}
      <div
        className={`absolute inset-0 transition-opacity ${isDeleting ? 'opacity-0' : isIndexing ? 'opacity-10 animate-pulse' : 'opacity-5 group-hover:opacity-8'}`}
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
        <div className="flex items-center justify-between mb-2.5">
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
                onClick={(e) => { void handleDelete(e); }}
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

        {/* Main Stats Grid - 4 columns inline layout */}
        <div className="grid grid-cols-4 gap-2 mb-2.5">
          {/* Total Notes */}
          <div
            className="p-2 rounded-md"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 5%, transparent)',
            }}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Total Notes
              </p>
            </div>
            <p className={`text-base font-bold ${isIndexing ? 'animate-pulse' : ''}`} style={{ color: 'var(--text-primary)' }}>
              {stats.totalNotesInSystem.toLocaleString()}
            </p>
          </div>

          {/* Indexed Notes */}
          <div
            className="p-2 rounded-md"
            style={{
              backgroundColor: stats.uniqueNotes === stats.totalNotesInSystem && stats.totalNotesInSystem > 0
                ? 'color-mix(in srgb, var(--color-success) 8%, transparent)'
                : 'color-mix(in srgb, var(--color-brand-600) 5%, transparent)',
            }}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Indexed
              </p>
            </div>
            <p className={`text-base font-bold ${isIndexing ? 'animate-pulse' : ''}`} style={{ color: stats.uniqueNotes === stats.totalNotesInSystem && stats.totalNotesInSystem > 0 ? 'var(--color-success)' : 'var(--text-primary)' }}>
              {stats.uniqueNotes.toLocaleString()}
            </p>
          </div>

          {/* Not Indexed */}
          <div
            className="p-2 rounded-md"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 5%, transparent)',
            }}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Not Indexed
              </p>
            </div>
            <p
              className={`text-base font-bold ${isIndexing ? 'animate-pulse' : ''}`}
              style={{
                color: stats.notIndexedCount > 0 ? 'var(--color-warning)' : 'var(--color-success)',
              }}
            >
              {stats.notIndexedCount.toLocaleString()}
            </p>
          </div>

          {/* Needs Update */}
          <div
            className="p-2 rounded-md"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 5%, transparent)',
            }}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Needs Update
              </p>
            </div>
            <p
              className={`text-base font-bold ${isIndexing ? 'animate-pulse' : ''}`}
              style={{
                color: stats.staleNotesCount > 0 ? 'var(--color-warning)' : 'var(--color-success)',
              }}
            >
              {stats.staleNotesCount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Embeddings Info Row */}
        <div
          className="flex items-center justify-between p-2 rounded-md mb-2.5"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 5%, transparent)',
          }}
        >
          <div className="flex items-center gap-1">
            <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Total Embeddings
            </span>
          </div>
          <span className={`text-xs font-bold ${isIndexing ? 'animate-pulse' : ''}`} style={{ color: 'var(--text-primary)' }}>
            {stats.totalEmbeddings.toLocaleString()}
          </span>
        </div>

        {/* Status Indicator */}
        {stats.totalNotesInSystem > 0 && (
          <div
            className="flex items-center gap-1.5 p-1.5 rounded-md mb-2.5"
            style={{
              backgroundColor: isHealthy
                ? 'color-mix(in srgb, var(--color-success) 8%, transparent)'
                : 'color-mix(in srgb, var(--color-warning) 8%, transparent)',
              border: `1px solid ${isHealthy
                ? 'color-mix(in srgb, var(--color-success) 20%, transparent)'
                : 'color-mix(in srgb, var(--color-warning) 20%, transparent)'}`,
            }}
          >
            <svg
              className="h-3.5 w-3.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{ color: isHealthy ? 'var(--color-success)' : 'var(--color-warning)' }}
            >
              {isHealthy ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              )}
            </svg>
            <span
              className="text-xs font-medium"
              style={{ color: isHealthy ? 'var(--color-success)' : 'var(--color-warning)' }}
            >
              {isHealthy
                ? 'All notes indexed and up to date'
                : `${stats.notIndexedCount + stats.staleNotesCount} note${stats.notIndexedCount + stats.staleNotesCount !== 1 ? 's' : ''} need${stats.notIndexedCount + stats.staleNotesCount === 1 ? 's' : ''} attention`}
            </span>
          </div>
        )}

        {/* Additional Info */}
        <div
          className="pt-2 border-t grid grid-cols-3 gap-1"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="text-center">
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Last Indexed
            </p>
            <p
              className="text-[11px] font-semibold truncate"
              style={{ color: 'var(--text-primary)' }}
              title={formatFullDate(stats.lastIndexedAt)}
            >
              {formatDate(stats.lastIndexedAt)}
            </p>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Avg. Chunks
            </p>
            <p className="text-[11px] font-semibold" style={{ color: 'var(--color-brand-600)' }}>
              {stats.uniqueNotes > 0 ? (stats.totalEmbeddings / stats.uniqueNotes).toFixed(1) : '0'}
            </p>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Model
            </p>
            <p className="text-[11px] font-semibold capitalize truncate" style={{ color: 'var(--text-primary)' }}>
              {stats.embeddingProvider || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IndexingStats({ userId = 'default-user' }: IndexingStatsProps) {
  const { data: stats, isLoading } = useIndexStats(userId);
  const activeVectorStores = useActiveIndexingVectorStores();
  const { isConfigured: isPineconeConfigured, refetch: refetchPineconeConfig } = usePineconeConfigured();
  const [showPineconeSetup, setShowPineconeSetup] = useState(false);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-3 rounded-xl border animate-pulse"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="h-3.5 rounded w-1/3"
                style={{ backgroundColor: 'var(--surface-card)' }}
              />
              <div
                className="h-4 rounded w-16"
                style={{ backgroundColor: 'var(--surface-card)' }}
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="p-2 rounded-md" style={{ backgroundColor: 'var(--surface-card)', opacity: 0.3 }}>
                  <div className="h-2.5 rounded w-2/3 mb-1" style={{ backgroundColor: 'var(--surface-elevated)' }} />
                  <div className="h-4 rounded w-1/2" style={{ backgroundColor: 'var(--surface-elevated)' }} />
                </div>
              ))}
            </div>
            <div
              className="pt-2 border-t grid grid-cols-3 gap-1"
              style={{ borderColor: 'var(--border)' }}
            >
              {[1, 2, 3].map((k) => (
                <div key={k} className="text-center">
                  <div className="h-2 rounded w-2/3 mx-auto mb-0.5" style={{ backgroundColor: 'var(--surface-card)' }} />
                  <div className="h-3 rounded w-1/2 mx-auto" style={{ backgroundColor: 'var(--surface-card)' }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div
        className="p-4 rounded-xl border text-center"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex justify-center mb-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
            }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
          No Stats Available
        </p>
        <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          Run your first indexing job to see stats appear here
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StatsCard
          title="PostgreSQL"
          stats={stats.postgreSQL}
          userId={userId}
          vectorStoreProvider="PostgreSQL"
          isIndexing={activeVectorStores.has('PostgreSQL')}
        />
        {/* Pinecone Card - Show setup button if not configured in Tauri mode */}
        {isTauri() && !isPineconeConfigured ? (
          <div
            className="relative p-3 rounded-xl border overflow-hidden group transition-all duration-300"
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Pinecone
                  </h4>
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: '#f59e0b',
                      opacity: 0.8,
                    }}
                    title="Not configured"
                  />
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-md font-medium border"
                  style={{
                    backgroundColor: 'color-mix(in srgb, #f59e0b 10%, transparent)',
                    borderColor: 'color-mix(in srgb, #f59e0b 30%, transparent)',
                    color: '#f59e0b',
                  }}
                >
                  Not Configured
                </span>
              </div>

              <div className="text-center py-4">
                <div
                  className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl border mb-3"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
                  }}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Pinecone Not Setup
                </p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Configure Pinecone for scalable vector storage
                </p>
                <button
                  type="button"
                  onClick={() => { setShowPineconeSetup(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: 'var(--color-brand-600)',
                    color: 'white',
                  }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                  Setup Pinecone
                </button>
              </div>
            </div>
          </div>
        ) : (
          <StatsCard
            title="Pinecone"
            stats={stats.pinecone}
            userId={userId}
            vectorStoreProvider="Pinecone"
            isIndexing={activeVectorStores.has('Pinecone')}
          />
        )}
      </div>

      {/* Pinecone Setup Modal */}
      <TauriPineconeSetupModal
        isOpen={showPineconeSetup}
        onClose={() => { setShowPineconeSetup(false); }}
        onSaveSuccess={() => {
          void refetchPineconeConfig();
        }}
      />
    </>
  );
}
