/**
 * VoiceAgentSkeleton Component
 * Loading skeleton for the voice agent page (split layout with shimmer effect)
 * Matches the structure of VoiceAgentInterface and VoiceSettings
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

export function VoiceAgentSkeleton() {
  return (
    <>
      <ShimmerStyles />
      <div className="h-full flex">
        {/* Left: Orb Section (40%) - glassmorphism background */}
        <div
          className="w-2/5 flex flex-col items-center justify-center px-6"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(var(--glass-blur))',
            WebkitBackdropFilter: 'blur(var(--glass-blur))',
            borderRight: '1px solid var(--border)',
          }}
        >
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

        {/* Right: Settings Section (60%) - glassmorphism background */}
        <div
          className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(var(--glass-blur))',
            WebkitBackdropFilter: 'blur(var(--glass-blur))',
          }}
        >
          {/* Settings skeleton - matches VoiceSettings structure */}
          <div className="w-full max-w-lg bg-[var(--surface)] rounded-2xl p-4 border border-[var(--border)]">
            {/* Header with icon + title */}
            <div className="flex items-center gap-2 mb-4">
              <ShimmerBlock className="h-5 w-5 rounded" />
              <ShimmerBlock className="h-4 w-28 rounded" />
            </div>

            <div className="space-y-4">
              {/* Voice Provider section - 2 toggle buttons */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <ShimmerBlock className="h-4 w-4 rounded" />
                  <ShimmerBlock className="h-3 w-24 rounded" />
                </div>
                <div className="flex gap-2">
                  <ShimmerBlock className="h-10 flex-1 rounded-lg" />
                  <ShimmerBlock className="h-10 flex-1 rounded-lg" />
                </div>
              </div>

              {/* Provider dropdown section */}
              <div>
                <ShimmerBlock className="h-3 w-20 rounded mb-1.5" />
                <ShimmerBlock className="h-10 w-full rounded-lg" />
              </div>

              {/* Model dropdown section */}
              <div>
                <ShimmerBlock className="h-3 w-12 rounded mb-1.5" />
                <ShimmerBlock className="h-10 w-full rounded-lg" />
              </div>

              {/* Voice dropdown section - label with icon */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <ShimmerBlock className="h-4 w-4 rounded" />
                  <ShimmerBlock className="h-3 w-10 rounded" />
                </div>
                <ShimmerBlock className="h-10 w-full rounded-lg" />
              </div>

              {/* Agent Capabilities section */}
              <div className="pt-4 border-t border-[var(--border)]">
                {/* Section header with icon */}
                <div className="flex items-center gap-2 mb-3">
                  <ShimmerBlock className="h-4 w-4 rounded" />
                  <ShimmerBlock className="h-3 w-32 rounded" />
                </div>

                {/* Toggle switch row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="space-y-1">
                    <ShimmerBlock className="h-4 w-32 rounded" />
                    <ShimmerBlock className="h-3 w-52 rounded" />
                  </div>
                  <ShimmerBlock className="h-6 w-11 rounded-full" />
                </div>

                {/* Checkbox rows (3 capabilities) */}
                <div className="space-y-2 pl-2">
                  {/* Notes CRUD checkbox */}
                  <div className="flex items-center gap-3">
                    <ShimmerBlock className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-1">
                      <ShimmerBlock className="h-4 w-24 rounded" />
                      <ShimmerBlock className="h-3 w-44 rounded" />
                    </div>
                  </div>

                  {/* Notes Search checkbox */}
                  <div className="flex items-center gap-3">
                    <ShimmerBlock className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-1">
                      <ShimmerBlock className="h-4 w-28 rounded" />
                      <ShimmerBlock className="h-3 w-40 rounded" />
                    </div>
                  </div>

                  {/* Web Search checkbox */}
                  <div className="flex items-center gap-3">
                    <ShimmerBlock className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-1">
                      <ShimmerBlock className="h-4 w-24 rounded" />
                      <ShimmerBlock className="h-3 w-36 rounded" />
                    </div>
                  </div>
                </div>
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
