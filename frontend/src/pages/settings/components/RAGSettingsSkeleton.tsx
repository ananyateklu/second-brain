/**
 * RAGSettingsSkeleton Component
 * Shows a pulsing skeleton placeholder while RAG settings are loading
 * Matches the exact styling of RAGSettings components
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

function SkeletonRerankingProvider() {
  return (
    <section
      className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
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
            <ShimmerBlock className="h-[14px] w-20 mb-1" />
            <ShimmerBlock className="h-3 w-56" />
          </div>
        </div>

        {/* Provider + Model inline */}
        <div className="flex items-center gap-2">
          <div
            className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl flex-1"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            {['OpenAI', 'Anthropic', 'Gemini', 'xAI', 'Cohere'].map((_, i) => (
              <ShimmerBlock key={i} className="px-2 py-1 rounded-lg h-[26px] w-[60px]" />
            ))}
          </div>
          {/* Model Dropdown */}
          <ShimmerBlock className="h-[30px] w-[140px] rounded-lg" />
        </div>
      </div>
    </section>
  );
}

function SkeletonHydeProvider() {
  return (
    <section
      className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
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
            <ShimmerBlock className="h-[14px] w-12 mb-1" />
            <ShimmerBlock className="h-3 w-64" />
          </div>
        </div>

        {/* Provider + Model inline */}
        <div className="flex items-center gap-2">
          <div
            className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl flex-1"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            {['OpenAI', 'Anthropic', 'Gemini', 'xAI', 'Ollama'].map((_, i) => (
              <ShimmerBlock key={i} className="px-2 py-1 rounded-lg h-[26px] w-[60px]" />
            ))}
          </div>
          {/* Model Dropdown */}
          <ShimmerBlock className="h-[30px] w-[140px] rounded-lg" />
        </div>
      </div>
    </section>
  );
}

function SkeletonQueryExpansionProvider() {
  return (
    <section
      className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
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
            <ShimmerBlock className="h-[14px] w-28 mb-1" />
            <ShimmerBlock className="h-3 w-52" />
          </div>
        </div>

        {/* Provider + Model inline */}
        <div className="flex items-center gap-2">
          <div
            className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl flex-1"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            {['OpenAI', 'Anthropic', 'Gemini', 'xAI', 'Ollama'].map((_, i) => (
              <ShimmerBlock key={i} className="px-2 py-1 rounded-lg h-[26px] w-[60px]" />
            ))}
          </div>
          {/* Model Dropdown */}
          <ShimmerBlock className="h-[30px] w-[140px] rounded-lg" />
        </div>
      </div>
    </section>
  );
}

function SkeletonVectorStore() {
  return (
    <section
      className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
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
            <ShimmerBlock className="h-[14px] w-24 mb-1" />
            <ShimmerBlock className="h-3 w-44" />
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-2 p-1 rounded-xl"
          style={{ backgroundColor: 'var(--surface-elevated)' }}
        >
          {['PostgreSQL', 'Pinecone'].map((_, i) => (
            <ShimmerBlock key={i} className="px-2.5 py-1.5 rounded-lg h-[32px] w-[100px]" />
          ))}
        </div>
      </div>
    </section>
  );
}

function SkeletonPipelineFeatures() {
  return (
    <section
      className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="flex flex-col gap-3">
        {/* Header with icon */}
        <div className="flex items-center gap-3">
          <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <ShimmerBlock className="h-[14px] w-28 mb-1" />
            <ShimmerBlock className="h-3 w-44" />
          </div>
        </div>

        {/* Inline button-style toggles */}
        <div
          className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl"
          style={{ backgroundColor: 'var(--surface-elevated)' }}
        >
          {['HyDE', 'Query Expansion', 'Hybrid Search', 'Reranking', 'Analytics'].map((_, i) => (
            <ShimmerBlock key={i} className="px-2 py-1 rounded-lg h-[26px] w-[85px]" />
          ))}
        </div>
      </div>
    </section>
  );
}

function SkeletonAdvancedSettings() {
  return (
    <section
      className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="flex flex-col gap-4">
        {/* Section Header with Collapse Toggle */}
        <div className="flex items-start gap-3">
          <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShimmerBlock className="h-[10px] w-20" />
              <ShimmerBlock className="h-[10px] w-2" />
              <ShimmerBlock className="h-[14px] w-28" />
            </div>
            <ShimmerBlock className="h-3 w-72" />
          </div>
          <ShimmerBlock className="h-5 w-5 flex-shrink-0" />
        </div>

        {/* Tier 1: Core Retrieval Settings */}
        <div className="flex flex-col gap-3 pt-2">
          <ShimmerBlock className="h-3 w-32" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex flex-col gap-3 p-4 rounded-2xl border"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-center gap-1">
                  <ShimmerBlock className="h-3 w-28" />
                  <ShimmerBlock className="h-3 w-3 rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <ShimmerBlock className="h-[10px] w-6" />
                  <ShimmerBlock className="flex-1 h-2 rounded-full" />
                  <ShimmerBlock className="h-[10px] w-6" />
                </div>
                <ShimmerBlock className="h-[10px] w-12 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Tier 2: Hybrid Search Settings */}
        <div className="flex flex-col gap-3">
          <ShimmerBlock className="h-3 w-40" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-col gap-3 p-4 rounded-2xl border"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-center gap-1">
                  <ShimmerBlock className="h-3 w-24" />
                  <ShimmerBlock className="h-3 w-3 rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <ShimmerBlock className="h-[10px] w-4" />
                  <ShimmerBlock className="flex-1 h-2 rounded-full" />
                  <ShimmerBlock className="h-[10px] w-4" />
                </div>
                <ShimmerBlock className="h-[10px] w-16 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function RAGSettingsSkeleton() {
  return (
    <div className="space-y-4">
      <ShimmerStyles />

      {/* First Row: Reranking, HyDE, Query Expansion Providers (3 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SkeletonRerankingProvider />
        <SkeletonHydeProvider />
        <SkeletonQueryExpansionProvider />
      </div>

      {/* Second Row: Vector Store + Pipeline Features (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonVectorStore />
        <SkeletonPipelineFeatures />
      </div>

      {/* Third Section: Advanced Settings */}
      <SkeletonAdvancedSettings />
    </div>
  );
}
