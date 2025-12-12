/**
 * ChatSidebarSkeleton
 * Skeleton placeholder for the chat sidebar conversation list
 * Matches ChatSidebar: w-72 md:w-[23rem], py-4.5 header padding
 */

import { useMemo } from 'react';
import { ShimmerBlock } from '../ui/Shimmer';

// Deterministic pseudo-random based on index (stable across renders)
function getStableWidth(index: number, min: number, range: number): number {
  // Use a simple hash based on index to create varied but stable widths
  const hash = ((index * 1237) % 97) / 97; // Returns 0-1
  return min + hash * range;
}

export function ChatSidebarSkeleton() {
  // Pre-generate stable widths for skeleton items
  const skeletonItems = useMemo(() =>
    Array.from({ length: 8 }).map((_, i) => ({
      titleWidth: getStableWidth(i * 2, 60, 30),
      previewWidth: getStableWidth(i * 2 + 1, 40, 40),
    })),
    []);

  return (
    <div
      className="flex flex-col h-full flex-shrink-0 w-72 md:w-[23rem]"
      style={{
        borderRightWidth: '0.5px',
        borderRightStyle: 'solid',
        borderRightColor: 'var(--border)',
      }}
    >
      {/* Header skeleton - matches ChatSidebar: px-4 py-4.5 */}
      <div
        className="flex-shrink-0 px-4 flex items-center justify-between"
        style={{
          paddingTop: '1.125rem',
          paddingBottom: '1.125rem',
          borderBottomWidth: '1px',
          borderBottomStyle: 'solid',
          borderBottomColor: 'var(--border)',
        }}
      >
        {/* "Conversations" title */}
        <ShimmerBlock className="h-6 w-32" />
        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          {/* Selection mode toggle */}
          <ShimmerBlock className="h-9 w-9 rounded-xl" />
          {/* Sidebar toggle */}
          <ShimmerBlock className="h-9 w-9 rounded-xl" />
        </div>
      </div>

      {/* New chat button skeleton */}
      <div className="p-3 flex-shrink-0">
        <ShimmerBlock className="h-10 w-full rounded-xl" />
      </div>

      {/* Conversation list skeleton */}
      <div className="flex-1 overflow-hidden px-2 py-1 space-y-1">
        {skeletonItems.map((item, i) => (
          <div
            key={i}
            className="p-3 rounded-xl"
            style={{
              backgroundColor: 'var(--surface-hover)',
            }}
          >
            <div className="flex items-start gap-3">
              {/* Provider icon */}
              <ShimmerBlock className="h-8 w-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                {/* Title */}
                <ShimmerBlock
                  className="h-4 rounded"
                  style={{ width: `${item.titleWidth}%` }}
                />
                {/* Preview text */}
                <ShimmerBlock
                  className="h-3 rounded"
                  style={{ width: `${item.previewWidth}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
