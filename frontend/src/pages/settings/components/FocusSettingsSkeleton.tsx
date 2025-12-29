/**
 * FocusSettingsSkeleton Component
 * Shows a pulsing skeleton placeholder while Focus settings are loading
 * Matches the exact styling of FocusSettings components
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

function SkeletonProviderSection() {
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
        {/* Header with icon */}
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
        </div>

        {/* Provider Label */}
        <div className="flex items-center gap-2">
          <ShimmerBlock className="h-3 w-14" />
        </div>

        {/* Provider Buttons */}
        <div className="flex flex-wrap gap-2">
          {['OpenAI', 'Anthropic', 'Gemini', 'xAI', 'Ollama'].map((_, i) => (
            <ShimmerBlock key={i} className="px-3 py-2 rounded-xl h-[38px] w-[85px]" />
          ))}
        </div>

        {/* Model Label */}
        <div className="flex items-center gap-2 mt-2">
          <ShimmerBlock className="h-3 w-10" />
        </div>

        {/* Model Dropdown */}
        <ShimmerBlock className="h-[42px] w-full rounded-xl" />
      </div>
    </section>
  );
}

function SkeletonSliderSetting() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShimmerBlock className="h-3 w-24" />
          <ShimmerBlock className="h-3 w-3 rounded-full" />
        </div>
        <ShimmerBlock className="h-5 w-12 rounded-md" />
      </div>
      <ShimmerBlock className="h-2 w-full rounded-full" />
      <div className="flex justify-between">
        <ShimmerBlock className="h-2 w-4" />
        <ShimmerBlock className="h-2 w-4" />
      </div>
    </div>
  );
}

function SkeletonGenerationSection() {
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
        {/* Header with icon */}
        <div className="flex items-start gap-3">
          <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShimmerBlock className="h-[10px] w-16" />
              <ShimmerBlock className="h-[10px] w-2" />
              <ShimmerBlock className="h-[14px] w-32" />
            </div>
            <ShimmerBlock className="h-3 w-56" />
          </div>
        </div>

        {/* Two slider settings in a grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonSliderSetting />
          <SkeletonSliderSetting />
        </div>
      </div>
    </section>
  );
}

function SkeletonRAGSection() {
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
        {/* Header with icon */}
        <div className="flex items-start gap-3">
          <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShimmerBlock className="h-[10px] w-14" />
              <ShimmerBlock className="h-[10px] w-2" />
              <ShimmerBlock className="h-[14px] w-36" />
            </div>
            <ShimmerBlock className="h-3 w-64" />
          </div>
        </div>

        {/* Two slider settings in a grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonSliderSetting />
          <SkeletonSliderSetting />
        </div>
      </div>
    </section>
  );
}

function SkeletonSuggestionSection() {
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
        {/* Header with icon */}
        <div className="flex items-start gap-3">
          <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShimmerBlock className="h-[10px] w-20" />
              <ShimmerBlock className="h-[10px] w-2" />
              <ShimmerBlock className="h-[14px] w-40" />
            </div>
            <ShimmerBlock className="h-3 w-60" />
          </div>
        </div>

        {/* Two slider settings in a grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonSliderSetting />
          <SkeletonSliderSetting />
        </div>
      </div>
    </section>
  );
}

export function FocusSettingsSkeleton() {
  return (
    <div className="space-y-4">
      <ShimmerStyles />

      {/* AI Provider & Model Section */}
      <SkeletonProviderSection />

      {/* Generation Settings Section */}
      <SkeletonGenerationSection />

      {/* RAG Settings Section */}
      <SkeletonRAGSection />

      {/* Suggestion Settings Section */}
      <SkeletonSuggestionSection />
    </div>
  );
}
