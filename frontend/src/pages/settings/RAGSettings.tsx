import { useQueryClient } from '@tanstack/react-query';
import { IndexingButton } from '../../components/ui/IndexingButton';
import { IndexingStats } from '../../components/ui/IndexingStats';
import { useAuthStore } from '../../store/auth-store';
import { indexingKeys } from '../../lib/query-keys';

export function RAGSettings() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading user data...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Manual indexing */}
      <section
        className="rounded-2xl border p-4 transition-all duration-200 hover:shadow-xl"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg border flex-shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
              }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Manual Indexing
              </span>
              <h2 className="text-lg font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                Keep embeddings fresh across every store
              </h2>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Kick off a job to regenerate embeddings for the notes you care about. Choose the vector store and embedding provider before you run the job.
              </p>
            </div>
          </div>
          <span
            className="px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5"
            style={{
              border: '1px solid color-mix(in srgb, var(--color-brand-500) 30%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
              color: 'var(--color-brand-600)',
            }}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recommended Weekly
          </span>
        </div>

        <IndexingButton userId={user.userId} />
      </section>

      {/* Stats */}
      <section
        className="rounded-2xl border p-4 transition-all duration-200 hover:shadow-xl"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg border flex-shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
              }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Index Health
              </span>
              <h2 className="text-lg font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                Storage overview
              </h2>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Track totals, last run dates, and embedding providers across PostgreSQL and Pinecone. Each store maintains its own embedding vectors for semantic search.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const statsQueryKey = indexingKeys.stats({ userId: user.userId });
              void queryClient.invalidateQueries({ queryKey: statsQueryKey });
              void queryClient.refetchQueries({ queryKey: statsQueryKey });
            }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg shrink-0 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)]"
            style={{
              borderColor: 'var(--color-brand-600)',
              color: 'var(--color-brand-600)',
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)';
              e.currentTarget.style.borderColor = 'var(--color-brand-700)';
              e.currentTarget.style.color = 'var(--color-brand-700)';
              e.currentTarget.style.boxShadow = '0 4px 12px color-mix(in srgb, var(--color-brand-900) 15%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)';
              e.currentTarget.style.borderColor = 'var(--color-brand-600)';
              e.currentTarget.style.color = 'var(--color-brand-600)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        <IndexingStats userId={user.userId} />
      </section>
    </div>
  );
}

