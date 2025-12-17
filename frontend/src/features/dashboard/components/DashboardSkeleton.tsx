/**
 * DashboardSkeleton Component
 * Shows a pulsing skeleton placeholder while dashboard data is loading
 * Matches the exact styling of DashboardPage components
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl border p-3 flex flex-col h-full relative overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        minHeight: '80px',
      }}
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-1">
          <ShimmerBlock
            className="h-[11px] flex-1 min-w-0 mr-2"
            style={{ maxWidth: '100px' }}
          />
          <ShimmerBlock className="w-6 h-6 rounded flex-shrink-0" />
        </div>
        <div className="flex-grow" />
        <ShimmerBlock className="h-[14px] w-20" />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div
      className="rounded-3xl border p-6 relative overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShimmerBlock className="h-5 w-5" />
            <ShimmerBlock className="h-7 w-48" />
          </div>

          {/* Time Range Filters - 6 buttons */}
          <div className="flex items-center gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <ShimmerBlock
                key={i}
                className="h-7 w-12 rounded-lg"
              />
            ))}
          </div>
        </div>

        {/* Chart area - height 192px */}
        <div className="min-w-0">
          <ShimmerBlock
            className="w-full rounded-xl"
            style={{ height: '192px' }}
          />
        </div>
      </div>
    </div>
  );
}

function SkeletonModelUsage() {
  return (
    <div className="space-y-3">
      <div
        className="rounded-3xl border p-5 relative overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShimmerBlock className="h-5 w-5" />
              <ShimmerBlock className="h-6 w-48" />
            </div>

            {/* Time Range Filters - 6 buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <ShimmerBlock
                  key={i}
                  className="h-7 w-12 rounded-lg"
                />
              ))}
            </div>
          </div>

          {/* Content Layout - matches ModelUsageSection structure */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left sidebar - Models by Provider */}
              <div className="lg:col-span-1 h-64">
                <div
                  className="h-full rounded-lg p-4"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <ShimmerBlock
                          className="h-4 w-24 mb-2"
                          style={{ backgroundColor: 'var(--surface-card)' }}
                        />
                        <div className="space-y-1.5">
                          {[1, 2].map((j) => (
                            <div
                              key={j}
                              className="flex items-center gap-2"
                              style={{ height: '20px' }}
                            >
                              <ShimmerBlock
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: 'var(--surface-card)' }}
                              />
                              <ShimmerBlock
                                className="h-3 flex-1"
                                style={{ backgroundColor: 'var(--surface-card)' }}
                              />
                              <ShimmerBlock
                                className="h-3 w-12"
                                style={{ backgroundColor: 'var(--surface-card)' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right side - Charts and Legend */}
              <div className="lg:col-span-2 flex flex-col gap-3">
                {/* Two Pie Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex flex-col min-w-0">
                      <ShimmerBlock className="h-4 w-24 mx-auto mb-2" />
                      <div className="min-w-0">
                        <ShimmerBlock
                          className="w-full rounded-lg"
                          style={{ height: '200px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Interactive Legend */}
                <div
                  className="flex flex-nowrap gap-3 justify-center items-center px-4 py-1.5 rounded-lg overflow-x-auto thin-scrollbar"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                  }}
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ShimmerBlock
                      key={i}
                      className="rounded-lg flex-shrink-0"
                      style={{
                        height: '28px',
                        width: '100px',
                        backgroundColor: 'var(--surface-card)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 dashboard-container">
      <ShimmerStyles />

      {/* Stats Cards Grid - matches StatCardsGrid flex layout */}
      <div
        className="flex gap-2 dashboard-stats-grid"
        style={{
          flexWrap: 'wrap',
        }}
      >
        {Array.from({ length: 13 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: '1 1 0',
              minWidth: '150px',
              maxWidth: '100%',
            }}
          >
            <SkeletonCard />
          </div>
        ))}
      </div>

      {/* Charts Section - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>

      {/* Model Usage Distribution */}
      <SkeletonModelUsage />
    </div>
  );
}
