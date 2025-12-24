/**
 * DirectorySkeleton Component
 * Shows a pulsing skeleton placeholder while directory data is loading
 * Matches the exact styling of NotesDirectoryPage components
 */

import { ShimmerBlock, ShimmerStyles, NoteCardsGridSkeleton } from './SkeletonComponents';
import { useTitleBarHeight } from '../../../components/layout/use-title-bar-height';

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
 * Height matches NotesDirectoryPage: calc(100vh - titleBarHeight - 21px)
 */
export function DirectorySkeleton() {
  const titleBarHeight = useTitleBarHeight();

  return (
    <div
      className="flex overflow-hidden border rounded-3xl"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-2xl)',
        height: `calc(100vh - ${titleBarHeight}px - 21px)`,
        maxHeight: `calc(100vh - ${titleBarHeight}px - 21px)`,
      }}
    >
      <ShimmerStyles />

      {/* Folder Sidebar Skeleton */}
      <div
        className="border-r flex flex-col h-full flex-shrink-0 w-64 md:w-72"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Sidebar Header */}
        <div
          className="flex-shrink-0 px-4 border-b flex items-center justify-between h-16"
          style={{ borderColor: 'var(--border)' }}
        >
          <ShimmerBlock className="h-5 w-16" />
          <ShimmerBlock className="w-9 h-9 rounded-xl" />
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-hidden py-2">
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
          <div className="px-4 py-2">
            <ShimmerBlock className="h-3 w-14" />
          </div>

          {/* Folder Items */}
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonSidebarItem key={i} />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Header */}
        <div
          className="flex-shrink-0 px-4 border-b flex items-center justify-between h-16"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <ShimmerBlock className="w-5 h-5 rounded" />
            <ShimmerBlock className="h-5 w-24" />
          </div>
          <div className="flex items-center gap-3">
            <ShimmerBlock className="h-4 w-16" />
            {/* View Mode Toggle */}
            <ShimmerBlock className="h-8 w-20 rounded-lg" />
          </div>
        </div>

        {/* Notes Content */}
        <div className="flex-1 overflow-hidden p-6">
          <NoteCardsGridSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}
