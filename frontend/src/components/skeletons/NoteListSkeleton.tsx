/**
 * NoteListSkeleton
 * Skeleton placeholder for the notes grid/list
 */

import { useMemo } from 'react';

interface NoteListSkeletonProps {
  /** Number of skeleton cards to show */
  count?: number;
  /** View mode - grid or list */
  viewMode?: 'grid' | 'list';
}

// Deterministic pseudo-random based on index (stable across renders)
function getStableWidth(index: number, min: number, range: number): number {
  // Use a simple hash based on index to create varied but stable widths
  const hash = ((index * 1237) % 97) / 97; // Returns 0-1
  return min + hash * range;
}

// Get a deterministic tag count based on index
function getStableTagCount(index: number): number {
  return ((index * 7) % 3) + 1; // Returns 1-3
}

export function NoteListSkeleton({ count = 9, viewMode = 'grid' }: NoteListSkeletonProps) {
  // Pre-generate stable widths for list view skeleton items
  const listItems = useMemo(() =>
    Array.from({ length: count }).map((_, i) => ({
      titleWidth: getStableWidth(i * 2, 30, 40),
      contentWidth: getStableWidth(i * 2 + 1, 50, 30),
    })),
    [count]);

  // Pre-generate stable widths for grid view skeleton items
  const gridItems = useMemo(() =>
    Array.from({ length: count }).map((_, i) => ({
      titleWidth: getStableWidth(i * 4, 50, 40),
      line2Width: getStableWidth(i * 4 + 1, 70, 20),
      line3Width: getStableWidth(i * 4 + 2, 40, 30),
      tagCount: getStableTagCount(i),
      tagWidths: Array.from({ length: 3 }).map((_, j) =>
        getStableWidth(i * 10 + j, 40, 30)
      ),
    })),
    [count]);

  if (viewMode === 'list') {
    return (
      <div className="space-y-3 p-4">
        {listItems.map((item, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl p-4 flex items-center gap-4"
            style={{
              backgroundColor: 'var(--surface-card)',
              animationDelay: `${i * 50}ms`,
            }}
          >
            {/* Checkbox area */}
            <div
              className="h-5 w-5 rounded"
              style={{ backgroundColor: 'var(--surface-hover)' }}
            />
            {/* Content */}
            <div className="flex-1 space-y-2">
              <div
                className="h-5 rounded"
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  width: `${item.titleWidth}%`,
                }}
              />
              <div
                className="h-3 rounded"
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  width: `${item.contentWidth}%`,
                }}
              />
            </div>
            {/* Tags */}
            <div className="flex gap-2">
              <div
                className="h-6 w-16 rounded-full"
                style={{ backgroundColor: 'var(--surface-hover)' }}
              />
              <div
                className="h-6 w-12 rounded-full"
                style={{ backgroundColor: 'var(--surface-hover)' }}
              />
            </div>
            {/* Date */}
            <div
              className="h-4 w-24"
              style={{ backgroundColor: 'var(--surface-hover)' }}
            />
          </div>
        ))}
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {gridItems.map((item, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl p-4 space-y-3"
          style={{
            backgroundColor: 'var(--surface-card)',
            animationDelay: `${i * 75}ms`,
          }}
        >
          {/* Title */}
          <div
            className="h-5 rounded"
            style={{
              backgroundColor: 'var(--surface-hover)',
              width: `${item.titleWidth}%`,
            }}
          />

          {/* Content preview */}
          <div className="space-y-2">
            <div
              className="h-3 rounded"
              style={{ backgroundColor: 'var(--surface-hover)' }}
            />
            <div
              className="h-3 rounded"
              style={{
                backgroundColor: 'var(--surface-hover)',
                width: `${item.line2Width}%`,
              }}
            />
            <div
              className="h-3 rounded"
              style={{
                backgroundColor: 'var(--surface-hover)',
                width: `${item.line3Width}%`,
              }}
            />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 pt-2">
            {Array.from({ length: item.tagCount }).map((_, tagIdx) => (
              <div
                key={tagIdx}
                className="h-6 rounded-full"
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  width: `${item.tagWidths[tagIdx]}px`,
                }}
              />
            ))}
          </div>

          {/* Footer - date */}
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <div
              className="h-3 w-24 rounded"
              style={{ backgroundColor: 'var(--surface-hover)' }}
            />
            <div
              className="h-6 w-6 rounded"
              style={{ backgroundColor: 'var(--surface-hover)' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
