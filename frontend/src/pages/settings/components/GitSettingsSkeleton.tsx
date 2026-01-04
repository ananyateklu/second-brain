/**
 * Git Settings Skeleton
 * Loading state for the Git & GitHub settings page
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

export function GitSettingsSkeleton() {
  return (
    <>
      <ShimmerStyles />
      <div className="space-y-4">
        {/* GitHub Section Skeleton */}
        <section
          className="rounded-3xl border p-4"
          style={{
            backgroundColor: 'var(--surface-card)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <ShimmerBlock className="h-3 w-16 rounded" />
                  <ShimmerBlock className="h-3 w-24 rounded" />
                </div>
                <ShimmerBlock className="h-3 w-48 rounded" />
              </div>
            </div>
            {/* Content */}
            <div className="space-y-4">
              <div>
                <ShimmerBlock className="h-3 w-32 rounded mb-2" />
                <ShimmerBlock className="h-10 w-full rounded-xl" />
              </div>
              <div>
                <ShimmerBlock className="h-3 w-28 rounded mb-2" />
                <div className="grid grid-cols-2 gap-2">
                  <ShimmerBlock className="h-10 rounded-xl" />
                  <ShimmerBlock className="h-10 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Git Section Skeleton */}
        <section
          className="rounded-3xl border p-4"
          style={{
            backgroundColor: 'var(--surface-card)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <ShimmerBlock className="h-3 w-20 rounded" />
                  <ShimmerBlock className="h-3 w-28 rounded" />
                </div>
                <ShimmerBlock className="h-3 w-56 rounded" />
              </div>
            </div>
            {/* Content */}
            <div className="space-y-4">
              <div>
                <ShimmerBlock className="h-3 w-40 rounded mb-2" />
                <ShimmerBlock className="h-10 w-full rounded-xl mb-2" />
                <div className="flex gap-2">
                  <ShimmerBlock className="h-10 flex-1 rounded-xl" />
                  <ShimmerBlock className="h-10 w-16 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Status Cards Skeleton */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div
            className="rounded-2xl border p-4"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center gap-3">
              <ShimmerBlock className="h-10 w-10 rounded-xl" />
              <div className="flex-1">
                <ShimmerBlock className="h-4 w-12 rounded mb-1" />
                <ShimmerBlock className="h-3 w-24 rounded" />
              </div>
            </div>
          </div>
          <div
            className="rounded-2xl border p-4"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center gap-3">
              <ShimmerBlock className="h-10 w-10 rounded-xl" />
              <div className="flex-1">
                <ShimmerBlock className="h-4 w-16 rounded mb-1" />
                <ShimmerBlock className="h-3 w-28 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
