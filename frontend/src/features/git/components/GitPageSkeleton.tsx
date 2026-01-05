/**
 * GitPageSkeleton Component
 * Shows a pulsing skeleton placeholder while Git page data is loading
 * Matches the exact styling of GitPage components with staggered animations
 */

import { useMemo } from 'react';
import { ShimmerBlock } from '../../../components/ui/Shimmer';

// Generate random widths outside of component to avoid impure functions during render
const generateRandomWidths = (count: number) => {
  return Array.from({ length: count }, () => Math.random() * 60 + 30);
};

// Enhanced shimmer styles with staggered delays
function EnhancedShimmerStyles() {
  return (
    <style>
      {`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes skeleton-fade-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .skeleton-stagger-1 { animation: skeleton-fade-in 0.4s ease-out 0.05s both, skeleton-pulse 2s ease-in-out infinite; }
        .skeleton-stagger-2 { animation: skeleton-fade-in 0.4s ease-out 0.1s both, skeleton-pulse 2s ease-in-out 0.1s infinite; }
        .skeleton-stagger-3 { animation: skeleton-fade-in 0.4s ease-out 0.15s both, skeleton-pulse 2s ease-in-out 0.2s infinite; }
        .skeleton-stagger-4 { animation: skeleton-fade-in 0.4s ease-out 0.2s both, skeleton-pulse 2s ease-in-out 0.3s infinite; }
        .skeleton-stagger-5 { animation: skeleton-fade-in 0.4s ease-out 0.25s both, skeleton-pulse 2s ease-in-out 0.4s infinite; }
        .skeleton-stagger-6 { animation: skeleton-fade-in 0.4s ease-out 0.3s both, skeleton-pulse 2s ease-in-out 0.5s infinite; }
      `}
    </style>
  );
}

function SkeletonBranchBar() {
  return (
    <div
      className="flex items-center justify-between px-5 py-4 rounded-2xl border relative overflow-hidden backdrop-blur-xl skeleton-stagger-1 shadow-[var(--glass-shadow)]"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      {/* Left: Branch info */}
      <div className="flex items-center gap-5">
        {/* Branch selector */}
        <ShimmerBlock className="h-10 w-40 rounded-xl skeleton-stagger-2" />

        {/* Remote status */}
        <div
          className="flex items-center gap-2 px-3 h-10 rounded-xl skeleton-stagger-3"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
            border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
          }}
        >
          <ShimmerBlock className="h-4 w-4 rounded" />
          <ShimmerBlock className="h-4 w-4 rounded" />
          <ShimmerBlock className="h-4 w-6" />
          <ShimmerBlock className="h-4 w-4 rounded" />
          <ShimmerBlock className="h-4 w-6" />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <ShimmerBlock className="h-10 w-10 rounded-xl skeleton-stagger-4" />
        <ShimmerBlock className="h-10 w-20 rounded-xl skeleton-stagger-4" />
        <ShimmerBlock className="h-10 w-20 rounded-xl skeleton-stagger-5" />
        <ShimmerBlock className="h-10 w-10 rounded-xl skeleton-stagger-5" />
      </div>
    </div>
  );
}

function SkeletonStatusPanel() {
  return (
    <div
      className="h-full flex flex-col overflow-hidden relative backdrop-blur-xl rounded-l-2xl skeleton-stagger-2 shadow-[var(--glass-shadow)]"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
        borderRight: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      {/* Commit Input Section */}
      <div className="p-3 relative z-10">
        {/* Commit message input and button - horizontal layout */}
        <div className="flex items-center gap-2">
          <ShimmerBlock
            className="flex-1 rounded-xl skeleton-stagger-3"
            style={{ height: '36px' }}
          />
          <ShimmerBlock className="px-3 py-2 rounded-xl skeleton-stagger-3" style={{ width: '80px', height: '36px' }} />
        </div>
      </div>

      {/* File sections */}
      <div className="flex-1 overflow-y-auto pt-2 pb-3 space-y-3 relative z-10 thin-scrollbar">
        {/* Staged Section */}
        <div className="px-3 skeleton-stagger-4">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-3">
              <ShimmerBlock className="h-6 w-6 rounded-xl" />
              <ShimmerBlock className="h-4 w-16 rounded-lg" />
              <ShimmerBlock className="h-5 w-6 rounded-full" />
            </div>
            <ShimmerBlock className="h-6 w-20 rounded-xl" />
          </div>
          <div className="pb-2 space-y-1 px-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                style={{ animationDelay: `${0.15 + i * 0.05}s` }}
              >
                <ShimmerBlock className="h-4 w-4 rounded" />
                <ShimmerBlock className="h-3 flex-1 rounded" style={{ maxWidth: '200px' }} />
                <ShimmerBlock className="h-5 w-8 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Unstaged Section */}
        <div className="px-3 skeleton-stagger-5">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-3">
              <ShimmerBlock className="h-6 w-6 rounded-xl" />
              <ShimmerBlock className="h-4 w-20 rounded-lg" />
              <ShimmerBlock className="h-5 w-6 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
              <ShimmerBlock className="h-6 w-20 rounded-xl" />
              <ShimmerBlock className="h-6 w-20 rounded-xl" />
            </div>
          </div>
          <div className="pb-2 space-y-1 px-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                style={{ animationDelay: `${0.25 + i * 0.05}s` }}
              >
                <ShimmerBlock className="h-4 w-4 rounded" />
                <ShimmerBlock className="h-3 flex-1 rounded" style={{ maxWidth: '180px' }} />
                <ShimmerBlock className="h-5 w-8 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonDiffViewer() {
  const randomWidths = useMemo(() => generateRandomWidths(15), []);

  return (
    <div
      className="h-full flex flex-col relative overflow-hidden backdrop-blur-xl rounded-r-2xl skeleton-stagger-3 shadow-[var(--glass-shadow)]"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b relative z-10 skeleton-stagger-4" style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShimmerBlock className="h-5 w-5 rounded-lg" />
            <ShimmerBlock className="h-4 w-48 rounded-lg" />
          </div>
          <ShimmerBlock className="h-7 w-7 rounded-xl" />
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 p-4 space-y-2 relative z-10">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2"
            style={{
              opacity: 0,
              animation: `skeleton-fade-in 0.3s ease-out ${0.2 + i * 0.03}s forwards, skeleton-pulse 2s ease-in-out ${i * 0.1}s infinite`
            }}
          >
            <ShimmerBlock className="h-4 w-8 flex-shrink-0 rounded" />
            <ShimmerBlock
              className="h-4 flex-1 rounded"
              style={{ maxWidth: `${randomWidths[i]}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GitPageSkeleton() {
  return (
    <div
      className="h-full flex flex-col overflow-hidden pt-4 pb-3 px-4"
      style={{ backgroundColor: 'var(--background-primary)' }}
    >
      <EnhancedShimmerStyles />

      {/* Branch bar */}
      <SkeletonBranchBar />

      {/* Main content */}
      <div className="flex-1 flex mt-4 min-h-0">
        {/* Left panel: File status */}
        <div className="w-120 flex-shrink-0">
          <SkeletonStatusPanel />
        </div>

        {/* Right panel: Diff viewer */}
        <div className="flex-1 min-w-0">
          <SkeletonDiffViewer />
        </div>
      </div>
    </div>
  );
}
