/**
 * GitHubListSkeleton Component
 * Reusable skeleton for GitHub list views (PRs, Issues, Actions, Commits, Branches)
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

interface GitHubListSkeletonProps {
  /** Number of list items to show */
  count?: number;
  /** Whether to show filter bar */
  showFilters?: boolean;
  /** Whether to show header with title */
  showHeader?: boolean;
  /** Variant for different list types */
  variant?: 'default' | 'compact' | 'actions';
}

function SkeletonListItem({ variant = 'default' }: { variant?: 'default' | 'compact' | 'actions' }) {
  if (variant === 'compact') {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-lg border"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Icon */}
        <ShimmerBlock className="h-5 w-5 rounded-md flex-shrink-0" />

        <div className="flex-1 min-w-0">
          {/* Title */}
          <ShimmerBlock className="h-4 w-3/4 mb-2" style={{ maxWidth: '300px' }} />
          {/* Meta */}
          <div className="flex items-center gap-2">
            <ShimmerBlock className="h-3 w-16" />
            <ShimmerBlock className="h-3 w-20" />
          </div>
        </div>

        {/* Avatar */}
        <ShimmerBlock className="h-6 w-6 rounded-full flex-shrink-0" />
      </div>
    );
  }

  if (variant === 'actions') {
    return (
      <div
        className="flex items-start gap-3 px-3 py-2 rounded-lg border"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Status Icon */}
        <ShimmerBlock className="h-7 w-7 rounded-md flex-shrink-0" />

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-2">
            <ShimmerBlock className="h-4 flex-1" style={{ maxWidth: '350px' }} />
            <ShimmerBlock className="h-4 w-16 rounded-full" />
          </div>

          {/* Workflow name and number */}
          <div className="flex items-center gap-2 mb-2">
            <ShimmerBlock className="h-3.5 w-32" />
            <ShimmerBlock className="h-3.5 w-12" />
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3">
            <ShimmerBlock className="h-3 w-24" />
            <ShimmerBlock className="h-3 w-16" />
            <ShimmerBlock className="h-3 w-20" />
          </div>
        </div>

        {/* Right side - avatar and actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShimmerBlock className="h-5 w-5 rounded-full" />
            <ShimmerBlock className="h-3.5 w-16" />
          </div>
          <div className="flex items-center gap-2">
            <ShimmerBlock className="h-5 w-14 rounded" />
            <ShimmerBlock className="h-5 w-5 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Default variant (PRs, Issues) - compact single-row layout
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-lg border"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
      }}
    >
      {/* State Icon */}
      <ShimmerBlock className="h-7 w-7 rounded-md flex-shrink-0" />

      <div className="flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-center gap-2 mb-1.5">
          <ShimmerBlock className="h-4 flex-1" style={{ maxWidth: '400px' }} />
          <ShimmerBlock className="h-4 w-14 rounded-full" />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3">
          <ShimmerBlock className="h-3 w-8" />
          <ShimmerBlock className="h-3 w-20" />
          <ShimmerBlock className="h-3 w-24" />
          {/* Labels */}
          <ShimmerBlock className="h-4 w-14 rounded-full" />
          <ShimmerBlock className="h-4 w-16 rounded-full" />
        </div>
      </div>

      {/* Right side - minimal indicators */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex -space-x-1">
          <ShimmerBlock className="h-5 w-5 rounded-full" />
          <ShimmerBlock className="h-5 w-5 rounded-full" />
        </div>
        <ShimmerBlock className="h-3 w-8" />
      </div>
    </div>
  );
}

export function GitHubListSkeleton({
  count = 5,
  showFilters = true,
  showHeader = true,
  variant = 'default',
}: GitHubListSkeletonProps) {
  return (
    <div className="flex flex-col h-full">
      <ShimmerStyles />

      {/* Header - Fixed at top */}
      {showHeader && (
        <div className="flex-shrink-0 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShimmerBlock className="h-6 w-32" />
            <ShimmerBlock className="h-5 w-8 rounded-full" />
          </div>

          {/* Filter tabs or selector */}
          <div className="flex items-center gap-1">
            <ShimmerBlock className="h-8 w-16 rounded-lg" />
            <ShimmerBlock className="h-8 w-16 rounded-lg" />
            <ShimmerBlock className="h-8 w-14 rounded-lg" />
          </div>
        </div>
      )}

      {/* Filters bar (for Actions panel) - Fixed at top */}
      {showFilters && variant === 'actions' && (
        <div className="flex-shrink-0 flex items-center gap-4 mb-4">
          <ShimmerBlock className="h-9 w-32 rounded-lg" />
          <ShimmerBlock className="h-9 flex-1 rounded-lg" style={{ maxWidth: '300px' }} />
          <ShimmerBlock className="h-9 w-9 rounded-lg" />
          <ShimmerBlock className="h-9 w-20 rounded-lg" />
        </div>
      )}

      {/* List items - Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-2 thin-scrollbar">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonListItem key={i} variant={variant} />
        ))}
      </div>

      {/* Pagination - Fixed at bottom */}
      <div
        className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3 py-4 mt-4 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Left side - Item count */}
        <div className="flex items-center gap-2">
          <ShimmerBlock className="h-3.5 w-24" />
        </div>

        {/* Right side - Navigation */}
        <div className="flex items-center gap-1">
          {/* Previous button */}
          <ShimmerBlock className="h-8 w-8 rounded-lg" />

          {/* Page number buttons */}
          <ShimmerBlock className="h-8 w-8 rounded-lg" />
          <ShimmerBlock className="h-8 w-8 rounded-lg" />
          <ShimmerBlock className="h-8 w-8 rounded-lg" />
          <ShimmerBlock className="h-4 w-4" />
          <ShimmerBlock className="h-8 w-8 rounded-lg" />

          {/* Next button */}
          <ShimmerBlock className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
