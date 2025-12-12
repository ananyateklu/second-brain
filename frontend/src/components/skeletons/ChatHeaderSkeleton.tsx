/**
 * ChatHeaderSkeleton
 * Skeleton placeholder for the chat header with provider/model selectors
 * Matches ChatHeader: px-8 (2rem), pt-4.5 pb-4.5 (~18px)
 */

import { ShimmerBlock } from '../ui/Shimmer';

export function ChatHeaderSkeleton() {
  return (
    <div
      className="flex-shrink-0 flex items-center gap-3 border-b z-10"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--surface-card)',
        paddingLeft: '2rem',
        paddingRight: '2rem',
        paddingTop: '1.125rem',
        paddingBottom: '1.125rem',
      }}
    >
      {/* Left side - Model Selector and Feature Pills */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Combined Model Selector */}
        <ShimmerBlock className="h-9 w-48 rounded-xl" />

        {/* Separator */}
        <div
          className="h-6 w-px flex-shrink-0"
          style={{ backgroundColor: 'var(--border)' }}
        />

        {/* RAG pill */}
        <ShimmerBlock className="h-8 w-16 rounded-full" />
        {/* Agent pill */}
        <ShimmerBlock className="h-8 w-20 rounded-full" />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side - Context usage */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ShimmerBlock className="h-7 w-28 rounded-lg" />
      </div>
    </div>
  );
}
