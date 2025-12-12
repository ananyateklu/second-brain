/**
 * NotesSkeleton Component
 * Shows a pulsing skeleton placeholder while notes data is loading
 * Matches the exact styling of NotesPage components
 */

import { ShimmerStyles, NoteCardsGridSkeleton, PaginationSkeleton } from './SkeletonComponents';

export function NotesSkeleton() {
  return (
    <div className="pt-2">
      <ShimmerStyles />

      {/* Notes Grid - 3 columns on large screens */}
      <NoteCardsGridSkeleton count={9} />

      {/* Pagination */}
      <PaginationSkeleton />
    </div>
  );
}
