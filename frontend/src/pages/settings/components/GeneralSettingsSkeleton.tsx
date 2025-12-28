/**
 * GeneralSettingsSkeleton Component
 * Shows a pulsing skeleton placeholder while general settings are loading
 * Matches the exact styling of GeneralSettings components
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

function SkeletonDisplaySettings() {
  return (
    <section
      className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="flex flex-col gap-4">
        {/* Header with icon */}
        <div className="flex items-start gap-3">
          <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShimmerBlock className="h-[10px] w-16" />
              <ShimmerBlock className="h-[10px] w-2" />
              <ShimmerBlock className="h-[14px] w-28" />
            </div>
            <ShimmerBlock className="h-3 w-64" />
          </div>
        </div>

        <div className="space-y-4">
          {/* Font Size Selection */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ShimmerBlock className="h-3.5 w-3.5" />
              <ShimmerBlock className="h-3 w-16" />
            </div>
            <div className="flex gap-2">
              {['Small', 'Medium', 'Large'].map((_, i) => (
                <ShimmerBlock key={i} className="px-4 py-2 rounded-2xl h-[34px] w-[70px]" />
              ))}
            </div>
          </div>

          {/* Default Note View */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ShimmerBlock className="h-3.5 w-3.5" />
              <ShimmerBlock className="h-3 w-28" />
            </div>
            <div className="flex gap-2">
              {['List', 'Grid'].map((_, i) => (
                <ShimmerBlock key={i} className="px-4 py-2 rounded-2xl h-[34px] w-[70px]" />
              ))}
            </div>
          </div>

          {/* Items Per Page Slider */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ShimmerBlock className="h-3.5 w-3.5" />
              <ShimmerBlock className="h-3 w-24" />
              <ShimmerBlock className="ml-2 px-2 py-0.5 rounded-xl h-[18px] w-8" />
            </div>
            <div className="flex items-center gap-3">
              <ShimmerBlock className="h-[10px] w-3" />
              <ShimmerBlock className="flex-1 h-2 rounded-full" />
              <ShimmerBlock className="h-[10px] w-6" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SkeletonNotificationTesting() {
  return (
    <section
      className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="flex flex-col gap-3">
        {/* Header with icon */}
        <div className="flex items-start gap-3">
          <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShimmerBlock className="h-[10px] w-16" />
              <ShimmerBlock className="h-[10px] w-2" />
              <ShimmerBlock className="h-[14px] w-32" />
            </div>
            <ShimmerBlock className="h-3 w-56" />
          </div>
        </div>

        <div className="space-y-3">
          {/* Basic Notification Types */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ShimmerBlock className="h-3.5 w-3.5" />
              <ShimmerBlock className="h-3 w-28" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {['Success', 'Error', 'Warning', 'Info'].map((_, i) => (
                <ShimmerBlock key={i} className="px-2.5 py-2 rounded-xl h-[34px]" />
              ))}
            </div>
          </div>

          {/* Advanced Features */}
          <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <ShimmerBlock className="h-3.5 w-3.5" />
              <ShimmerBlock className="h-3 w-28" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <ShimmerBlock key={i} className="px-2.5 py-2 rounded-xl h-[34px]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SkeletonAutoSave() {
  return (
    <section
      className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="flex flex-col gap-3">
        {/* Header with icon */}
        <div className="flex items-start gap-3">
          <ShimmerBlock className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShimmerBlock className="h-[10px] w-12" />
              <ShimmerBlock className="h-[10px] w-2" />
              <ShimmerBlock className="h-[14px] w-28" />
            </div>
            <ShimmerBlock className="h-3 w-44" />
          </div>
        </div>

        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: 'var(--surface-elevated)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ShimmerBlock className="h-3.5 w-3.5" />
              <ShimmerBlock className="h-3 w-12" />
            </div>
            <ShimmerBlock className="px-2 py-0.5 rounded-xl h-[18px] w-10" />
          </div>
          <div className="flex items-center gap-3">
            <ShimmerBlock className="h-[10px] w-6" />
            <ShimmerBlock className="flex-1 h-2 rounded-full" />
            <ShimmerBlock className="h-[10px] w-6" />
          </div>
          <ShimmerBlock className="h-[10px] w-72 mt-2" />
        </div>
      </div>
    </section>
  );
}

export function GeneralSettingsSkeleton() {
  return (
    <div className="space-y-4">
      <ShimmerStyles />

      {/* Display Settings Section */}
      <SkeletonDisplaySettings />

      {/* Notifications Testing & Auto-save Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonNotificationTesting />
        <SkeletonAutoSave />
      </div>
    </div>
  );
}
