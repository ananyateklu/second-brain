/**
 * IndexingSettingsSkeleton Component
 * Shows a pulsing skeleton placeholder while indexing settings are loading
 * Matches the exact styling of IndexingSettings components
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

function SkeletonManualIndexing() {
  return (
    <section
      className="rounded-3xl border p-4"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShimmerBlock className="h-[10px] w-24" />
              <ShimmerBlock className="h-[10px] w-2" />
              <ShimmerBlock className="h-[14px] w-52" />
            </div>
            <ShimmerBlock className="h-3 w-full max-w-lg" />
            <ShimmerBlock className="h-3 w-3/4 max-w-md mt-1" />
          </div>
        </div>
        {/* Recommended Weekly badge */}
        <ShimmerBlock className="px-3 py-1.5 rounded-full h-[28px] w-40 shrink-0" />
      </div>

      {/* IndexingButton placeholder */}
      <div
        className="rounded-xl border p-4"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Provider Selection Row */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* Vector Store Selection */}
          <div className="flex items-center gap-2">
            <ShimmerBlock className="h-3.5 w-3.5" />
            <ShimmerBlock className="h-3 w-20" />
            <div className="flex gap-2">
              {['PostgreSQL', 'Pinecone'].map((_, i) => (
                <ShimmerBlock key={i} className="px-3 py-1.5 rounded-xl h-[30px] w-[90px]" />
              ))}
            </div>
          </div>

          {/* Embedding Provider Selection */}
          <div className="flex items-center gap-2">
            <ShimmerBlock className="h-3.5 w-3.5" />
            <ShimmerBlock className="h-3 w-28" />
            <div className="flex gap-2">
              {['OpenAI', 'Gemini', 'Ollama', 'Cohere'].map((_, i) => (
                <ShimmerBlock key={i} className="px-3 py-1.5 rounded-xl h-[30px] w-[70px]" />
              ))}
            </div>
          </div>
        </div>

        {/* Scope Selection Row */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <ShimmerBlock className="h-3.5 w-3.5" />
            <ShimmerBlock className="h-3 w-12" />
            <div className="flex gap-2">
              {['All Notes', 'Unindexed Only'].map((_, i) => (
                <ShimmerBlock key={i} className="px-3 py-1.5 rounded-xl h-[30px] w-[100px]" />
              ))}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <ShimmerBlock className="h-[38px] w-full rounded-xl" />
      </div>
    </section>
  );
}

function SkeletonStatsCard() {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <ShimmerBlock className="h-6 w-6 rounded-xl" />
        <ShimmerBlock className="h-4 w-24" />
      </div>

      {/* Stats grid */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <ShimmerBlock className="h-3 w-24" />
            <ShimmerBlock className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonIndexHealth() {
  return (
    <section
      className="rounded-3xl border p-4"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShimmerBlock className="h-[10px] w-20" />
              <ShimmerBlock className="h-[10px] w-2" />
              <ShimmerBlock className="h-[14px] w-28" />
            </div>
            <ShimmerBlock className="h-3 w-full max-w-lg" />
            <ShimmerBlock className="h-3 w-3/4 max-w-md mt-1" />
          </div>
        </div>
        {/* Refresh button */}
        <ShimmerBlock className="px-3 py-1.5 rounded-xl h-[32px] w-24 shrink-0" />
      </div>

      {/* IndexingStats placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonStatsCard />
        <SkeletonStatsCard />
      </div>
    </section>
  );
}

export function IndexingSettingsSkeleton() {
  return (
    <div className="space-y-4">
      <ShimmerStyles />

      {/* Manual indexing */}
      <SkeletonManualIndexing />

      {/* Stats */}
      <SkeletonIndexHealth />
    </div>
  );
}
