/**
 * Focus Skeleton Component
 * Loading state for the Focus dashboard
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

export interface FocusSkeletonProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton loader for CurrentFocusCard (Hero version)
 */
const CurrentFocusSkeleton = memo(function CurrentFocusSkeleton() {
  return (
    <div
      className="rounded-2xl border-2 p-8 min-h-[180px]"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Label */}
      <div className="flex items-center gap-3 mb-5">
        <Skeleton className="h-7 w-36 rounded-full" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>

      {/* Title */}
      <Skeleton className="h-9 w-3/4 mb-3" />

      {/* Description */}
      <Skeleton className="h-5 w-full mb-1" />
      <Skeleton className="h-5 w-2/3 mb-5" />

      {/* Meta */}
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-36" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-36 rounded-3xl" />
        <Skeleton className="h-10 w-28 rounded-3xl" />
      </div>
    </div>
  );
});

/**
 * Skeleton loader for ProgressSummary
 */
const ProgressSummarySkeleton = memo(function ProgressSummarySkeleton() {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-lg" />
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    </div>
  );
});

/**
 * Skeleton loader for a single plan item
 */
const PlanItemSkeleton = memo(function PlanItemSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-2">
      {/* Checkbox */}
      <Skeleton className="h-5 w-5 rounded-md" />

      {/* Content */}
      <div className="flex-1 flex items-center gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>

      {/* Time */}
      <Skeleton className="h-4 w-12" />
    </div>
  );
});

/**
 * Skeleton loader for TodaysPlanList
 */
const TodaysPlanSkeleton = memo(function TodaysPlanSkeleton() {
  return (
    <div
      className="rounded-2xl border"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>

      {/* Items */}
      <div className="px-4 py-2">
        <PlanItemSkeleton />
        <PlanItemSkeleton />
        <PlanItemSkeleton />
        <PlanItemSkeleton />
      </div>
    </div>
  );
});

/**
 * Skeleton loader for a single backlog item
 */
const BacklogItemSkeleton = memo(function BacklogItemSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-3">
      <Skeleton className="h-5 w-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-40 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
});

/**
 * Skeleton loader for BacklogSection
 */
const BacklogSkeleton = memo(function BacklogSkeleton() {
  return (
    <div
      className="rounded-2xl border"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-8 rounded" />
        </div>
      </div>

      {/* Filters */}
      <div
        className="px-4 py-2 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-1">
          <Skeleton className="h-7 w-16 rounded-lg" />
          <Skeleton className="h-7 w-14 rounded-lg" />
          <Skeleton className="h-7 w-14 rounded-lg" />
          <Skeleton className="h-7 w-14 rounded-lg" />
        </div>
      </div>

      {/* Items */}
      <div className="px-2 py-2">
        <BacklogItemSkeleton />
        <BacklogItemSkeleton />
        <BacklogItemSkeleton />
      </div>
    </div>
  );
});

/**
 * Skeleton loader for AI Suggestions
 */
const SuggestionsSkeleton = memo(function SuggestionsSkeleton() {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>

      {/* Suggestions */}
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    </div>
  );
});

/**
 * Full page skeleton for the Focus Dashboard.
 * Shows 3-column Kanban layout with skeleton versions of all components.
 */
export const FocusSkeleton = memo(function FocusSkeleton({
  className,
}: FocusSkeletonProps) {
  return (
    <div className={cn('flex flex-col lg:flex-row gap-4 h-full', className)}>
      {/* Left Column - Today's Plan + Backlog */}
      <div className="order-2 lg:order-1 w-full lg:w-80 xl:w-96 lg:flex-shrink-0 flex flex-col gap-4">
        <TodaysPlanSkeleton />
        <BacklogSkeleton />
      </div>

      {/* Center Column - Current Focus + Progress */}
      <div className="order-1 lg:order-2 flex-1 min-w-0 flex flex-col gap-4">
        <CurrentFocusSkeleton />
        <ProgressSummarySkeleton />
      </div>

      {/* Right Column - AI Suggestions */}
      <div className="order-3 w-full lg:w-80 xl:w-96 lg:flex-shrink-0 flex flex-col">
        <SuggestionsSkeleton />
      </div>
    </div>
  );
});

// Export individual skeletons for flexible use
export {
  CurrentFocusSkeleton,
  TodaysPlanSkeleton,
  BacklogSkeleton,
  PlanItemSkeleton,
  BacklogItemSkeleton,
  ProgressSummarySkeleton,
  SuggestionsSkeleton,
};
