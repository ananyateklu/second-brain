/**
 * ChatSidebarSkeleton
 * Skeleton placeholder for the chat sidebar conversation list
 */

import { useMemo } from 'react';

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
      className="w-80 border-r flex flex-col"
      style={{
        backgroundColor: 'var(--surface-secondary)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header skeleton */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div
            className="h-6 w-32 rounded animate-pulse"
            style={{ backgroundColor: 'var(--surface-hover)' }}
          />
          <div
            className="h-8 w-8 rounded animate-pulse"
            style={{ backgroundColor: 'var(--surface-hover)' }}
          />
        </div>
      </div>

      {/* New chat button skeleton */}
      <div className="p-3">
        <div
          className="h-10 w-full rounded-lg animate-pulse"
          style={{ backgroundColor: 'var(--surface-hover)' }}
        />
      </div>

      {/* Conversation list skeleton */}
      <div className="flex-1 overflow-hidden p-2 space-y-2">
        {skeletonItems.map((item, i) => (
          <div
            key={i}
            className="p-3 rounded-lg animate-pulse"
            style={{
              backgroundColor: 'var(--surface-hover)',
              animationDelay: `${i * 100}ms`,
            }}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div
                className="h-8 w-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: 'var(--surface-tertiary)' }}
              />
              <div className="flex-1 min-w-0 space-y-2">
                {/* Title */}
                <div
                  className="h-4 rounded"
                  style={{
                    backgroundColor: 'var(--surface-tertiary)',
                    width: `${item.titleWidth}%`,
                  }}
                />
                {/* Preview text */}
                <div
                  className="h-3 rounded"
                  style={{
                    backgroundColor: 'var(--surface-tertiary)',
                    width: `${item.previewWidth}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
