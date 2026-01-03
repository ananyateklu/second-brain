/**
 * VoiceAgentSkeleton Component
 * Loading skeleton for the voice agent page matching VoiceAgentInterface layout:
 * - Sidebar (session history)
 * - Main content (transcript + floating input bar)
 */

import { ShimmerBlock, ShimmerStyles } from '../../../components/ui/Shimmer';

/**
 * Sidebar skeleton matching VoiceSidebar layout
 */
function VoiceSidebarSkeleton() {
  return (
    <div
      className="flex flex-col h-full flex-shrink-0 w-72 md:w-[23rem]"
      style={{
        borderRightWidth: '0.5px',
        borderRightStyle: 'solid',
        borderRightColor: 'var(--border)',
      }}
    >
      {/* Session list skeleton */}
      <div className="flex-1 overflow-hidden p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{ backgroundColor: 'var(--surface-card)' }}
          >
            {/* Session icon */}
            <ShimmerBlock className="w-10 h-10 rounded-xl flex-shrink-0" />
            {/* Session info */}
            <div className="flex-1 space-y-2 min-w-0">
              <ShimmerBlock className="h-4 w-3/4 rounded" />
              <ShimmerBlock className="h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Transcript area skeleton with empty state
 */
function VoiceTranscriptSkeleton() {
  return (
    <div className="flex-1 overflow-hidden">
      {/* Empty state - positioned to match VoiceTranscript */}
      <div className="flex flex-col items-center pt-[35vh] px-8">
        {/* Brain icon placeholder */}
        <ShimmerBlock className="w-32 h-32 rounded-full mb-8" />
        {/* Title placeholder */}
        <ShimmerBlock className="h-8 w-64 rounded mb-4" />
        {/* Subtitle placeholder */}
        <ShimmerBlock className="h-5 w-48 rounded" />
      </div>
    </div>
  );
}

/**
 * Floating input bar skeleton matching VoiceInputBar
 */
function VoiceInputBarSkeleton() {
  return (
    <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-2 z-20">
      <div className="flex justify-center">
        {/* Glassmorphism pill bar */}
        <div
          className="inline-flex items-center gap-3 px-4 py-3 rounded-full"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--surface-card) 85%, transparent)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border)',
            boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Start button placeholder */}
          <ShimmerBlock className="h-10 w-20 rounded-full" />
          {/* Waveform placeholder */}
          <ShimmerBlock className="h-6 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Full page voice agent skeleton matching VoiceAgentInterface layout
 */
export function VoiceAgentSkeleton() {
  return (
    <>
      <ShimmerStyles />
      <div className="h-full flex">
        {/* Sidebar */}
        <VoiceSidebarSkeleton />

        {/* Main Content Area */}
        <div className="flex-1 relative min-h-0 min-w-0">
          {/* Transcript Area */}
          <VoiceTranscriptSkeleton />

          {/* Floating Input Bar */}
          <VoiceInputBarSkeleton />
        </div>
      </div>
    </>
  );
}
