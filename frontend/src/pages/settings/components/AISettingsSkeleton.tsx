/**
 * AISettingsSkeleton Component
 * Shows a pulsing skeleton placeholder while AI settings are loading
 * Matches the exact styling of AISettings components
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

function SkeletonProviderCard() {
  return (
    <div
      className="rounded-3xl border px-4 py-4"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:gap-4">
        <div className="flex items-center gap-2 min-w-0">
          {/* Logo container with status indicator */}
          <div className="relative">
            <ShimmerBlock className="h-12 w-12 rounded-xl" />
            <ShimmerBlock
              className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full"
              style={{ border: '2px solid var(--surface-elevated)' }}
            />
          </div>
          <div className="min-w-0">
            <ShimmerBlock className="h-3 w-16 mb-1.5" />
            <ShimmerBlock className="h-[18px] w-14 rounded-full" />
          </div>
        </div>

        <div className="flex flex-1 flex-wrap gap-x-6 gap-y-2">
          {/* Latency */}
          <div className="flex items-center gap-1.5">
            <ShimmerBlock className="h-3 w-3" />
            <ShimmerBlock className="h-3 w-12" />
            <ShimmerBlock className="h-3 w-10" />
          </div>
          {/* Checked */}
          <div className="flex items-center gap-1.5">
            <ShimmerBlock className="h-3 w-3" />
            <ShimmerBlock className="h-3 w-14" />
            <ShimmerBlock className="h-3 w-12" />
          </div>
          {/* Models */}
          <div className="flex items-center gap-1.5">
            <ShimmerBlock className="h-3 w-3" />
            <ShimmerBlock className="h-3 w-12" />
            <ShimmerBlock className="h-3 w-16" />
          </div>
        </div>

        {/* Details link */}
        <div className="flex items-center gap-1">
          <ShimmerBlock className="h-3 w-10" />
          <ShimmerBlock className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}

function SkeletonProviderGrid() {
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
        <div className="flex items-start gap-3">
          <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShimmerBlock className="h-[10px] w-20" />
              <ShimmerBlock className="h-[10px] w-2" />
              <ShimmerBlock className="h-[14px] w-32" />
            </div>
            <ShimmerBlock className="h-3 w-80" />
          </div>
        </div>
        {/* Health badge */}
        <ShimmerBlock className="px-3 py-1 rounded-full h-[26px] w-32" />
      </div>

      {/* Provider cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonProviderCard key={i} />
        ))}
      </div>
    </section>
  );
}

function SkeletonNoteSummarySettings() {
  return (
    <section
      className="rounded-3xl border p-4"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShimmerBlock className="h-[10px] w-16" />
              <ShimmerBlock className="h-[10px] w-2" />
              <ShimmerBlock className="h-[14px] w-24" />
              <ShimmerBlock className="w-4 h-4 rounded-full" />
            </div>
            <ShimmerBlock className="h-3 w-56" />
          </div>
        </div>
      </div>

      {/* Inline Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
          {/* Toggle */}
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShimmerBlock className="h-7 w-7 rounded-xl flex-shrink-0" />
              <ShimmerBlock className="h-3 w-64" />
            </div>
            <ShimmerBlock className="h-7 w-13 rounded-full ml-2" />
          </div>

          {/* Provider and Model grouped */}
          <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center flex-shrink-0">
            {/* Provider Selection */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <ShimmerBlock className="h-3.5 w-3.5" />
                <ShimmerBlock className="h-3 w-16" />
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <ShimmerBlock key={i} className="px-3 py-2 rounded-2xl h-[34px] w-[80px]" />
                ))}
              </div>
            </div>

            {/* Model Selection */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <ShimmerBlock className="h-3.5 w-3.5" />
                <ShimmerBlock className="h-3 w-12" />
              </div>
              <ShimmerBlock className="w-56 h-[38px] rounded-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Backfill Section */}
      <div className="mt-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <ShimmerBlock className="h-3 w-40 mt-0.5" />
            {/* Select All Toggle */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl ml-2"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <ShimmerBlock className="w-4 h-4 rounded-xl" />
              <ShimmerBlock className="h-3 w-16" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <ShimmerBlock className="px-3 py-1.5 rounded-xl h-[30px] w-36" />
            <ShimmerBlock className="px-3 py-1.5 rounded-xl h-[30px] w-24" />
          </div>
        </div>

        {/* Notes Grid */}
        <div
          className="max-h-[18.2rem] overflow-hidden rounded-xl p-1.5"
          style={{ backgroundColor: 'var(--surface-elevated)' }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="relative rounded-xl border p-1.5"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  borderColor: 'var(--border)',
                }}
              >
                {/* Checkbox */}
                <ShimmerBlock className="absolute top-1 right-1 w-3 h-3 rounded-xl" />

                {/* Note Icon and Title */}
                <div className="flex items-start gap-1 mb-0.5 pr-3">
                  <ShimmerBlock className="w-5 h-5 rounded-xl flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <ShimmerBlock className="h-[10px] w-full mb-1" />
                    <ShimmerBlock className="h-[10px] w-3/4 mb-0.5" />
                    {/* Date */}
                    <div className="flex items-center gap-0.5">
                      <ShimmerBlock className="w-2 h-2" />
                      <ShimmerBlock className="h-[8px] w-16" />
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-0.5 mt-0.5">
                  <ShimmerBlock className="px-1 py-0.5 rounded-xl h-[14px] w-12" />
                  <ShimmerBlock className="px-1 py-0.5 rounded-xl h-[14px] w-6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AISettingsSkeleton() {
  return (
    <div className="space-y-4">
      <ShimmerStyles />

      <div className="grid gap-4 xl:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          {/* Provider Grid */}
          <SkeletonProviderGrid />
        </div>
      </div>

      {/* Note Summary Settings */}
      <SkeletonNoteSummarySettings />
    </div>
  );
}
