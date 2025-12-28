/**
 * RagAnalyticsSkeleton Component
 * Shows a pulsing skeleton placeholder while RAG analytics data is loading
 * Matches the exact styling of RAG Analytics page components
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

function SkeletonStatCard() {
  return (
    <div
      className="rounded-2xl border p-3 relative overflow-hidden backdrop-blur-md hover:-translate-y-0.5 transition-transform duration-200"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        minHeight: '80px',
        boxShadow: 'var(--shadow-lg), 0 0 40px -15px var(--color-primary-alpha)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10">
        {/* Icon positioned top-right */}
        <div className="absolute top-0 right-0">
          <ShimmerBlock className="h-5 w-5 rounded" />
        </div>

        {/* Title */}
        <ShimmerBlock className="h-3 w-20 mb-2" />

        {/* Main stat value */}
        <ShimmerBlock className="h-6 w-24 mb-1" />

        {/* Subtitle/description */}
        <ShimmerBlock className="h-2 w-16" />
      </div>
    </div>
  );
}

function SkeletonCorrelationCard() {
  return (
    <div
      className="rounded-2xl border p-4 relative overflow-hidden backdrop-blur-md hover:-translate-y-0.5 transition-transform duration-200 group"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg), 0 0 40px -15px var(--color-primary-alpha)',
      }}
    >
      <div className="relative z-10">
        {/* Header with icon wrapper */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className="p-2.5 rounded-xl"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            <ShimmerBlock className="h-5 w-5 rounded" />
          </div>
          <ShimmerBlock className="h-5 w-48" />
        </div>

        {/* Correlation bar sections */}
        <div className="space-y-4">
          {/* First correlation bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <ShimmerBlock className="h-3 w-32" />
              <ShimmerBlock className="h-3 w-12" />
            </div>
            <ShimmerBlock className="h-2 w-40" />
            <ShimmerBlock className="h-2 w-full rounded-full" />
          </div>

          {/* Second correlation bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <ShimmerBlock className="h-3 w-28" />
              <ShimmerBlock className="h-3 w-12" />
            </div>
            <ShimmerBlock className="h-2 w-36" />
            <ShimmerBlock className="h-2 w-full rounded-full" />
          </div>
        </div>

        {/* Footer text */}
        <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <ShimmerBlock className="h-2 w-48" />
        </div>
      </div>
    </div>
  );
}

function SkeletonFeedbackCard() {
  return (
    <div
      className="rounded-2xl border p-3 relative overflow-hidden backdrop-blur-md hover:-translate-y-0.5 transition-transform duration-200 group"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg), 0 0 40px -15px var(--color-primary-alpha)',
      }}
    >
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <ShimmerBlock className="h-5 w-5 rounded" />
          <ShimmerBlock className="h-5 w-40" />
        </div>

        {/* Subtitle */}
        <ShimmerBlock className="h-3 w-32 mb-4" />

        {/* Progress bar sections */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <ShimmerBlock className="h-3 w-20" />
                <ShimmerBlock className="h-3 w-10" />
              </div>
              <ShimmerBlock className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>

        {/* Footer text with border-top */}
        <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <ShimmerBlock className="h-2 w-36" />
        </div>
      </div>
    </div>
  );
}

export function RagAnalyticsSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <ShimmerStyles />

      <div className="pt-4 flex-1 overflow-auto thin-scrollbar">
        <div className="flex flex-col min-h-full gap-3 overflow-visible">
          {/* Stats Cards - 2x2 Grid */}
          <div className="flex-shrink-0 overflow-visible">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonStatCard key={i} />
              ))}
            </div>
          </div>

          {/* Score Correlation & Feedback Summary - Side by side */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-visible">
            <SkeletonCorrelationCard />
            <SkeletonFeedbackCard />
          </div>
        </div>
      </div>
    </div>
  );
}
