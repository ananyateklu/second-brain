/**
 * DirectorySkeleton Component
 * Shows a pulsing skeleton placeholder while directory data is loading
 * Matches the exact styling of NotesDirectoryPage components
 * Header controls are now in the Header component
 */

import { ShimmerBlock, ShimmerStyles, NoteCardsGridSkeleton } from './SkeletonComponents';

function SkeletonSidebarItem({ hasCount = true }: { hasCount?: boolean }) {
  return (
    <div className="w-full flex items-center justify-between px-4 py-2.5">
      <span className="flex items-center gap-3">
        <ShimmerBlock className="w-4 h-4 rounded" />
        <ShimmerBlock className="h-4 w-20" />
      </span>
      {hasCount && (
        <ShimmerBlock className="h-5 w-8 rounded-full" />
      )}
    </div>
  );
}

/**
 * DirectoryContentSkeleton - Shows just the note cards grid skeleton
 * Used when the sidebar and header are already rendered
 */
export function DirectoryContentSkeleton() {
  return (
    <>
      <ShimmerStyles />
      <NoteCardsGridSkeleton count={6} />
    </>
  );
}

/**
 * DirectorySkeleton - Full page skeleton with sidebar and content
 * Used for initial page load before layout renders
 * Matches NotesDirectoryPage: transparent background, no outer border/shadow
 * Header controls moved to Header component
 */
export function DirectorySkeleton() {
  return (
    <div
      className="flex overflow-hidden flex-1 transition-all duration-300"
      style={{
        backgroundColor: 'transparent',
        height: '100%',
      }}
    >
      <ShimmerStyles />

      {/* Folder Sidebar Skeleton - matches NotesDirectoryPage sidebar */}
      <div
        className="border-r flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-out w-[23rem]"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Navigation Items - no header, controls are in Header component */}
        <div className="flex-1 overflow-y-auto thin-scrollbar">
          {/* All Notes */}
          <SkeletonSidebarItem />
          {/* Active */}
          <SkeletonSidebarItem />
          {/* Archived */}
          <SkeletonSidebarItem />

          {/* Divider */}
          <div className="mx-4 my-2 border-t" style={{ borderColor: 'var(--border)' }} />

          {/* Unfiled */}
          <SkeletonSidebarItem />

          {/* Folders Label */}
          <div
            className="px-4 py-2 text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <ShimmerBlock className="h-3 w-14" />
          </div>

          {/* Folder Items */}
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonSidebarItem key={i} />
          ))}
        </div>
      </div>

      {/* Main Content Area - matches NotesDirectoryPage */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Notes Content - no header, controls are in Header component */}
        <div className="flex-1 overflow-y-auto p-6 thin-scrollbar">
          <NoteCardsGridSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}
