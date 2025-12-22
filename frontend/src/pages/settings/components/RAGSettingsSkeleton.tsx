/**
 * RAGSettingsSkeleton Component
 * Shows a pulsing skeleton placeholder while RAG settings are loading
 * Matches the exact styling of RAGSettings components
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

function SkeletonRerankingProvider() {
  return (
    <section
      className="rounded-3xl border p-4"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="flex flex-col gap-3">
        {/* Header with icon */}
        <div className="flex items-start gap-3">
          <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShimmerBlock className="h-[10px] w-24" />
              <ShimmerBlock className="h-[10px] w-2" />
              <ShimmerBlock className="h-[14px] w-28" />
            </div>
            <ShimmerBlock className="h-3 w-72" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div
            className="flex flex-wrap items-center gap-2 p-1 rounded-xl"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            {['OpenAI', 'Anthropic', 'Gemini', 'Grok', 'Cohere'].map((_, i) => (
              <ShimmerBlock key={i} className="px-3 py-2 rounded-xl h-[36px] w-[90px]" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SkeletonVectorStore() {
  return (
    <section
      className="rounded-3xl border p-4"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="flex flex-col gap-3">
        {/* Header with icon */}
        <div className="flex items-start gap-3">
          <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShimmerBlock className="h-[10px] w-24" />
              <ShimmerBlock className="h-[10px] w-2" />
              <ShimmerBlock className="h-[14px] w-36" />
            </div>
            <ShimmerBlock className="h-3 w-64" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div
            className="flex flex-wrap items-center gap-2 p-1 rounded-xl"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            {['PostgreSQL', 'Pinecone'].map((_, i) => (
              <ShimmerBlock key={i} className="px-3 py-2 rounded-xl h-[36px] w-[110px]" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SkeletonFeatureToggle() {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-2xl border"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Feature Icon */}
      <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />

      {/* Feature Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <ShimmerBlock className="h-[14px] w-24" />
          {/* Toggle Switch */}
          <ShimmerBlock className="h-5 w-9 rounded-full flex-shrink-0" />
        </div>
        <ShimmerBlock className="h-[11px] w-full" />
        <ShimmerBlock className="h-[11px] w-3/4 mt-1" />
      </div>
    </div>
  );
}

function SkeletonFeatureToggles() {
  return (
    <section
      className="rounded-3xl border p-4"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="flex flex-col gap-4">
        {/* Section Header */}
        <div className="flex items-start gap-3">
          <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShimmerBlock className="h-[10px] w-20" />
              <ShimmerBlock className="h-[10px] w-2" />
              <ShimmerBlock className="h-[14px] w-28" />
            </div>
            <ShimmerBlock className="h-3 w-80" />
          </div>
        </div>

        {/* Feature Toggle Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {['HyDE', 'Query Expansion', 'Hybrid Search', 'Reranking', 'Analytics'].map((_, i) => (
            <SkeletonFeatureToggle key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function RAGSettingsSkeleton() {
  return (
    <div className="space-y-4">
      <ShimmerStyles />

      {/* RAG Settings Grid - Side by Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Side: Reranking Provider Selection */}
        <SkeletonRerankingProvider />

        {/* Right Side: Vector Store Provider Selection */}
        <SkeletonVectorStore />
      </div>

      {/* RAG Feature Toggles Section */}
      <SkeletonFeatureToggles />
    </div>
  );
}
