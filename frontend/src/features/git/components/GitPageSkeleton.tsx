/**
 * GitPageSkeleton Component
 * Shows a pulsing skeleton placeholder while Git page data is loading
 * Matches the exact styling of GitPage components
 */

import { useMemo } from 'react';
import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

// Generate random widths outside of component to avoid impure functions during render
const generateRandomWidths = (count: number) => {
  return Array.from({ length: count }, () => Math.random() * 60 + 30);
};

function SkeletonBranchBar() {
  return (
    <div
      className="flex items-center justify-between px-5 py-4 rounded-2xl border relative overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-2xl), 0 0 40px -15px var(--color-primary-alpha)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Left: Branch info */}
      <div className="flex items-center gap-5">
        {/* Branch selector */}
        <ShimmerBlock className="h-10 w-40 rounded-xl" />

        {/* Remote status */}
        <div
          className="flex items-center gap-2 px-3 h-10 rounded-xl"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
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
        <ShimmerBlock className="h-10 w-10 rounded-xl" />
        <ShimmerBlock className="h-10 w-20 rounded-xl" />
        <ShimmerBlock className="h-10 w-20 rounded-xl" />
        <ShimmerBlock className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  );
}

function SkeletonStatusPanel() {
  return (
    <div
      className="h-full flex flex-col overflow-hidden relative"
      style={{
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Commit Input Section */}
      <div className="p-3 relative z-10">
        {/* Commit message input and button - horizontal layout */}
        <div className="flex items-center gap-2">
          <ShimmerBlock
            className="flex-1 rounded-lg"
            style={{ height: '36px' }}
          />
          <ShimmerBlock className="px-3 py-2 rounded-xl" style={{ width: '80px', height: '36px' }} />
        </div>
      </div>

      {/* File sections */}
      <div className="flex-1 overflow-y-auto pt-2 pb-3 space-y-3 relative z-10 thin-scrollbar">
        {/* Staged Section */}
        <div className="px-3">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-3">
              <ShimmerBlock className="h-6 w-6 rounded-lg" />
              <ShimmerBlock className="h-4 w-16" />
              <ShimmerBlock className="h-5 w-6 rounded-full" />
            </div>
            <ShimmerBlock className="h-6 w-20 rounded-lg" />
          </div>
          <div className="pb-2 space-y-1 px-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              >
                <ShimmerBlock className="h-4 w-4 rounded" />
                <ShimmerBlock className="h-3 flex-1" style={{ maxWidth: '200px' }} />
                <ShimmerBlock className="h-5 w-8 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Unstaged Section */}
        <div className="px-3">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-3">
              <ShimmerBlock className="h-6 w-6 rounded-lg" />
              <ShimmerBlock className="h-4 w-20" />
              <ShimmerBlock className="h-5 w-6 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
              <ShimmerBlock className="h-6 w-20 rounded-lg" />
              <ShimmerBlock className="h-6 w-20 rounded-lg" />
            </div>
          </div>
          <div className="pb-2 space-y-1 px-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              >
                <ShimmerBlock className="h-4 w-4 rounded" />
                <ShimmerBlock className="h-3 flex-1" style={{ maxWidth: '180px' }} />
                <ShimmerBlock className="h-5 w-8 rounded" />
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
      className="h-full flex flex-col relative overflow-hidden"
      style={{
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
      }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b relative z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShimmerBlock className="h-5 w-5 rounded" />
            <ShimmerBlock className="h-4 w-48" />
          </div>
          <ShimmerBlock className="h-7 w-7 rounded-md" />
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 p-4 space-y-2 relative z-10">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <ShimmerBlock className="h-4 w-8 flex-shrink-0" />
            <ShimmerBlock
              className="h-4 flex-1"
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
      <ShimmerStyles />

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
