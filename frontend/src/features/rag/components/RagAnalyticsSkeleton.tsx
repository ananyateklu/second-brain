/**
 * RagAnalyticsSkeleton Component
 * Shows a pulsing skeleton placeholder while RAG analytics data is loading
 * Matches the exact styling of RAG Analytics page components
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

function SkeletonStatCard() {
  return (
    <div
      className="rounded-2xl border p-5 relative overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="relative z-10">
        {/* Header row with icon and title */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ShimmerBlock className="h-10 w-10 rounded-xl" />
            <ShimmerBlock className="h-4 w-24" />
          </div>
          <ShimmerBlock className="h-5 w-16 rounded-full" />
        </div>

        {/* Main stat value */}
        <ShimmerBlock className="h-8 w-32 mb-2" />

        {/* Subtitle/description */}
        <ShimmerBlock className="h-3 w-40" />
      </div>
    </div>
  );
}

function SkeletonCorrelationCard() {
  return (
    <div
      className="rounded-2xl border p-5 relative overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <ShimmerBlock className="h-5 w-5 rounded" />
          <ShimmerBlock className="h-5 w-48" />
        </div>

        {/* Scatter plot area */}
        <ShimmerBlock
          className="w-full rounded-xl mb-4"
          style={{ height: '250px' }}
        />

        {/* Legend/footer items */}
        <div className="flex items-center justify-center gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <ShimmerBlock className="h-3 w-3 rounded-full" />
              <ShimmerBlock className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonFeedbackCard() {
  return (
    <div
      className="rounded-2xl border p-5 relative overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <ShimmerBlock className="h-5 w-5 rounded" />
          <ShimmerBlock className="h-5 w-40" />
        </div>

        {/* Pie chart area */}
        <div className="flex items-center justify-center mb-4">
          <ShimmerBlock
            className="rounded-full"
            style={{ width: '200px', height: '200px' }}
          />
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl p-3"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <ShimmerBlock className="h-3 w-16 mb-2" />
              <ShimmerBlock className="h-6 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RagAnalyticsSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <ShimmerStyles />

      <div className="pt-4 flex-1 overflow-auto">
        <div className="flex flex-col min-h-full gap-4 overflow-visible">
          {/* Stats Cards - 2x2 Grid */}
          <div className="flex-shrink-0 overflow-visible">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonStatCard key={i} />
              ))}
            </div>
          </div>

          {/* Score Correlation & Feedback Summary - Side by side */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-visible">
            <SkeletonCorrelationCard />
            <SkeletonFeedbackCard />
          </div>
        </div>
      </div>
    </div>
  );
}
