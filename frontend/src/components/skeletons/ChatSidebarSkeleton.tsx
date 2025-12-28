/**
 * ChatSidebarSkeleton
 * Skeleton placeholder for the chat sidebar conversation list
 * Matches ChatSidebar: w-72 md:w-[23rem], just conversation list (header controls moved to Header)
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
    Array.from({ length: 10 }).map((_, i) => ({
      titleWidth: getStableWidth(i * 2, 60, 30),
      previewWidth: getStableWidth(i * 2 + 1, 40, 40),
    })),
    []);

  return (
    <div
      className="flex flex-col h-full flex-shrink-0 w-72 md:w-[23rem] transition-all duration-300 ease-out"
      style={{
        borderRightWidth: '0.5px',
        borderRightStyle: 'solid',
        borderRightColor: 'var(--border)',
      }}
    >
      {/* Conversation list skeleton - header controls now in Header component */}
      <div className="flex-1 overflow-y-auto min-h-0 thin-scrollbar">
        <div className="pb-2">
          {skeletonItems.map((item, i) => (
            <div
              key={i}
              className="px-4 py-2"
              style={{
                borderTopWidth: '0.1px',
                borderTopColor: 'color-mix(in srgb, var(--border) 30%, transparent)',
                borderBottomWidth: '0.1px',
                borderBottomColor: 'color-mix(in srgb, var(--border) 30%, transparent)',
              }}
            >
              {/* Two-row layout matching ConversationListItem */}
              <div className="flex flex-col gap-1">
                {/* Title row */}
                <div className="flex items-center gap-2">
                  <ShimmerBlock
                    className="h-4 rounded flex-1"
                    style={{ width: `${item.titleWidth}%` }}
                  />
                </div>
                {/* Metadata row: provider badge + date */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {/* Provider badge with small logo */}
                    <ShimmerBlock
                      className="h-4 rounded"
                      style={{ width: `${item.previewWidth}%`, minWidth: '60px', maxWidth: '100px' }}
                    />
                  </div>
                  {/* Date */}
                  <ShimmerBlock className="h-3 w-12 rounded flex-shrink-0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
