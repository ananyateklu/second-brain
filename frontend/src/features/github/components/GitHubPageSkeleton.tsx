/**
 * GitHubPageSkeleton Component
 * Shows a pulsing skeleton placeholder while GitHub page data is loading
 * Matches the exact styling of GitHubPage components
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';
import { useTitleBarHeight } from '../../../components/layout/use-title-bar-height';

function SkeletonHeader() {
  return (
    <div className="flex-shrink-0 px-6 pt-6 pb-4">
      <div className="flex items-center gap-4 mb-4">
        {/* GitHub Icon */}
        <ShimmerBlock
          className="w-12 h-12 rounded-xl"
          style={{ backgroundColor: 'var(--surface-elevated)' }}
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
        className="flex items-center gap-1 p-1 rounded-xl w-fit"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
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

function SkeletonListItem() {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg border"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
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
      <div className="flex-shrink-0 flex items-center gap-2 mb-4">
        <ShimmerBlock className="h-8 w-20 rounded-lg" />
        <ShimmerBlock className="h-8 w-20 rounded-lg" />
        <ShimmerBlock className="h-8 w-20 rounded-lg" />
        <div className="flex-1" />
        <ShimmerBlock className="h-8 w-8 rounded-lg" />
      </div>

      {/* List items - Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-2 thin-scrollbar">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonListItem key={i} />
        ))}
      </div>

      {/* Pagination - Fixed at bottom */}
      <div className="flex-shrink-0 flex items-center justify-center gap-4 pt-4 mt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <ShimmerBlock className="h-8 w-20 rounded-lg" />
        <ShimmerBlock className="h-4 w-12" />
        <ShimmerBlock className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function GitHubPageSkeleton() {
  const titleBarHeight = useTitleBarHeight();

  return (
    <>
      <ShimmerStyles />
      <div
        className="flex flex-col rounded-3xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-2xl)',
          height: `calc(100vh - ${titleBarHeight}px - 2rem)`,
          maxHeight: `calc(100vh - ${titleBarHeight}px - 2rem)`,
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
