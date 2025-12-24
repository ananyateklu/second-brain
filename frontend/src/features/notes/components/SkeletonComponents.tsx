/**
 * Shared Skeleton Components for Notes
 * Reusable skeleton components for notes-related loading states
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

// Re-export shimmer components for convenience
export { ShimmerBlock, ShimmerStyles };

/**
 * NoteCardSkeleton - Skeleton placeholder for a note card
 * Matches the exact styling of NoteCard component
 */
export function NoteCardSkeleton() {
  return (
    <div
      className="rounded-3xl border flex flex-col relative overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        borderWidth: '1px',
        padding: '22px',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="relative z-10 flex flex-col h-full">
        {/* Title */}
        <div className="mb-3.5">
          <ShimmerBlock
            className="h-5 rounded"
            style={{ width: '65%' }}
          />
        </div>

        {/* Content Preview - 3 lines (matches line-clamp-3) */}
        <div className="space-y-1.5 mb-4" style={{ lineHeight: '1.5' }}>
          <ShimmerBlock className="h-3.5 w-full rounded" />
          <ShimmerBlock className="h-3.5 w-[92%] rounded" />
          <ShimmerBlock className="h-3.5 w-[78%] rounded" />
        </div>

        {/* Spacer to push footer to bottom */}
        <div className="flex-grow" />

        {/* Footer Info - Tags and Date */}
        <div className="flex items-end justify-between mt-auto pt-2.5">
          {/* Left side: Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            <ShimmerBlock
              className="h-4 rounded-md"
              style={{ width: '55px' }}
            />
            <ShimmerBlock
              className="h-4 rounded-md"
              style={{ width: '70px' }}
            />
            <ShimmerBlock
              className="h-4 rounded-md"
              style={{ width: '48px' }}
            />
          </div>

          {/* Right side: Created Date */}
          <div className="flex-shrink-0 ml-auto">
            <ShimmerBlock
              className="h-3 rounded"
              style={{ width: '100px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * NoteCardsGridSkeleton - A grid of note card skeletons
 * @param count - Number of skeleton cards to show (default: 9)
 */
export function NoteCardsGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <NoteCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * PaginationSkeleton - Skeleton placeholder for pagination controls
 */
export function PaginationSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4">
      {/* Page info */}
      <ShimmerBlock className="h-4 w-32" />

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <ShimmerBlock
            key={i}
            className="w-9 h-9 rounded-lg"
          />
        ))}
      </div>
    </div>
  );
}
