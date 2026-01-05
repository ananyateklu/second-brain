/**
 * GitHubPageSkeleton Component
 * Shows a pulsing skeleton placeholder while GitHub page data is loading
 * Matches the exact styling of GitHubPage components
 */

import { ShimmerBlock } from '../../../components/ui/Shimmer';
import { useTitleBarHeight } from '../../../components/layout/use-title-bar-height';

// Enhanced shimmer styles with staggered delays
function EnhancedShimmerStyles() {
  return (
    <style>
      {`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes skeleton-fade-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .skeleton-stagger-1 { animation: skeleton-fade-in 0.4s ease-out 0.05s both, skeleton-pulse 2s ease-in-out infinite; }
        .skeleton-stagger-2 { animation: skeleton-fade-in 0.4s ease-out 0.1s both, skeleton-pulse 2s ease-in-out 0.1s infinite; }
        .skeleton-stagger-3 { animation: skeleton-fade-in 0.4s ease-out 0.15s both, skeleton-pulse 2s ease-in-out 0.2s infinite; }
        .skeleton-stagger-4 { animation: skeleton-fade-in 0.4s ease-out 0.2s both, skeleton-pulse 2s ease-in-out 0.3s infinite; }
        .skeleton-stagger-5 { animation: skeleton-fade-in 0.4s ease-out 0.25s both, skeleton-pulse 2s ease-in-out 0.4s infinite; }
      `}
    </style>
  );
}

function SkeletonHeader() {
  return (
    <div className="flex-shrink-0 px-6 pt-6 pb-4">
      <div className="flex items-center gap-4 mb-4 skeleton-stagger-1">
        {/* GitHub Icon */}
        <ShimmerBlock
          className="w-12 h-12 rounded-xl"
          style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}
        />

        <div className="flex-1">
          {/* Title */}
          <ShimmerBlock className="h-7 w-24 mb-2" />
          {/* Subtitle */}
          <ShimmerBlock className="h-4 w-64" />
        </div>

        {/* Repository Selector */}
        <ShimmerBlock className="h-10 w-48 rounded-xl" />
      </div>

      {/* Tab Navigation */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl w-fit skeleton-stagger-2"
        style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <ShimmerBlock
            key={i}
            className="h-9 rounded-lg"
            style={{ width: i === 0 ? '120px' : i === 1 ? '80px' : i === 2 ? '90px' : i === 3 ? '95px' : '100px' }}
          />
        ))}
      </div>
    </div>
  );
}

function SkeletonListItem({ index = 0 }: { index?: number }) {
  const staggerClass = `skeleton-stagger-${Math.min(index + 1, 5)}`;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${staggerClass}`}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      {/* Status indicator */}
      <ShimmerBlock className="h-7 w-7 rounded-md flex-shrink-0" />

      {/* Title */}
      <ShimmerBlock className="h-4 flex-1" style={{ maxWidth: '300px' }} />

      {/* Badge */}
      <ShimmerBlock className="h-5 w-10 rounded-full flex-shrink-0" />

      {/* Meta info */}
      <ShimmerBlock className="h-3 w-20 flex-shrink-0" />

      {/* Avatar */}
      <ShimmerBlock className="h-5 w-5 rounded-full flex-shrink-0" />
    </div>
  );
}

function SkeletonContentArea() {
  return (
    <div className="flex-1 min-h-0 px-6 pb-6 flex flex-col">
      {/* Filter/toolbar row - Fixed at top */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-4 skeleton-stagger-3">
        <ShimmerBlock className="h-8 w-20 rounded-lg" />
        <ShimmerBlock className="h-8 w-20 rounded-lg" />
        <ShimmerBlock className="h-8 w-20 rounded-lg" />
        <div className="flex-1" />
        <ShimmerBlock className="h-8 w-8 rounded-lg" />
      </div>

      {/* List items - Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-2 thin-scrollbar">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonListItem key={i} index={i} />
        ))}
      </div>

      {/* Pagination - Fixed at bottom */}
      <div className="flex-shrink-0 flex items-center justify-center gap-4 pt-4 mt-4 border-t" style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}>
        <ShimmerBlock className="h-8 w-20 rounded-lg" />
        <ShimmerBlock className="h-4 w-12" />
        <ShimmerBlock className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function GitHubPageSkeleton() {
  const titleBarHeight = useTitleBarHeight();
  const headerHeight = 80; // Match GitHubPage header height

  return (
    <>
      <EnhancedShimmerStyles />
      <div
        className="flex flex-col overflow-hidden transform-gpu"
        style={{
          backgroundColor: 'transparent',
          height: `calc(100vh - ${titleBarHeight}px - ${headerHeight}px)`,
          maxHeight: `calc(100vh - ${titleBarHeight}px - ${headerHeight}px)`,
        }}
      >
        {/* Header with tabs - Fixed */}
        <SkeletonHeader />

        {/* Content - Scrollable */}
        <SkeletonContentArea />
      </div>
    </>
  );
}
