import { useQueryClient } from '@tanstack/react-query';
import { IndexingButton } from '../../features/rag/components/indexing';
import { IndexHealthDashboard } from '../../components/data-display/index-health';
import { useBoundStore } from '../../store/bound-store';
import { indexingKeys } from '../../lib/query-keys';

export function IndexingSettings() {
  const queryClient = useQueryClient();
  const user = useBoundStore((state) => state.user);

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
        className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
          borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
              <span className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                Manual Indexing
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 hidden sm:flex items-center gap-1"
                style={{
                  border: '1px solid color-mix(in srgb, var(--color-brand-500) 30%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                  color: 'var(--color-brand-600)',
                }}
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Weekly
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="sm:hidden">Regenerate embeddings for your notes.</span>
              <span className="hidden sm:inline">Regenerate embeddings for your notes. Choose the vector store and provider below.</span>
            </p>
          </div>
        </div>

        <IndexingButton userId={user.userId} />
      </section>

      {/* Stats */}
      <section
        className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
          borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                Index Health
              </span>
              <button
                type="button"
                onClick={() => {
                  const statsQueryKey = indexingKeys.stats({ userId: user.userId });
                  void queryClient.invalidateQueries({ queryKey: statsQueryKey });
                  void queryClient.refetchQueries({ queryKey: statsQueryKey });
                }}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all duration-200 hover:-translate-y-0.5 shrink-0 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)]"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  borderColor: 'var(--btn-primary-border)',
                  color: 'var(--btn-primary-text)',
                }}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="sm:hidden">Vector store statistics and status.</span>
              <span className="hidden sm:inline">Track totals, last run dates, and providers across PostgreSQL and Pinecone.</span>
            </p>
          </div>
        </div>

        <IndexHealthDashboard userId={user.userId} />
      </section>
    </div>
  );
}

