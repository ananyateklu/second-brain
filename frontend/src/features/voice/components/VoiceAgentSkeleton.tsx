/**
 * VoiceAgentSkeleton Component
 * Loading skeleton for the voice agent page (split layout with shimmer effect)
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

export function VoiceAgentSkeleton() {
  return (
    <>
      <ShimmerStyles />
      <div className="h-full flex">
        {/* Left: Orb Section (40%) */}
        <div className="w-2/5 flex flex-col items-center justify-center px-6 border-r border-[var(--border)] bg-[var(--surface)]/30">
          {/* Status indicator skeleton */}
          <ShimmerBlock className="h-8 w-48 rounded-full" />

          {/* Orb skeleton */}
          <div className="relative my-8">
            <ShimmerBlock className="w-60 h-60 rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ShimmerBlock className="w-44 h-44 rounded-full" />
            </div>
          </div>

          {/* Controls skeleton */}
          <div className="flex gap-4">
            <ShimmerBlock className="h-12 w-36 rounded-full" />
          </div>
        </div>

        {/* Right: Settings Section (60%) */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Settings skeleton */}
          <div className="w-full max-w-lg bg-[var(--surface)] rounded-2xl p-4 border border-[var(--border)]">
            <ShimmerBlock className="h-4 w-32 rounded mb-4" />
            <div className="space-y-4">
              <div>
                <ShimmerBlock className="h-3 w-20 rounded mb-2" />
                <ShimmerBlock className="h-10 w-full rounded-lg" />
              </div>
              <div>
                <ShimmerBlock className="h-3 w-16 rounded mb-2" />
                <ShimmerBlock className="h-10 w-full rounded-lg" />
              </div>
              <div>
                <ShimmerBlock className="h-3 w-12 rounded mb-2" />
                <ShimmerBlock className="h-10 w-full rounded-lg" />
              </div>
            </div>
          </div>

          {/* Help text skeleton */}
          <ShimmerBlock className="h-4 w-64 rounded mt-6" />
        </div>
      </div>
    </>
  );
}
