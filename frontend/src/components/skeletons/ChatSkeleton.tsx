/**
 * ChatSkeleton Component
 * Full page skeleton for the chat page including sidebar, messages, and input
 * Matches ChatPage layout exactly: flex overflow-hidden flex-1 with transparent background
 * Note: Header is rendered in AppLayout's Header component (via ChatPageControls)
 */

import { ShimmerBlock, ShimmerStyles } from '../ui/Shimmer';
import { ChatSidebarSkeleton } from './ChatSidebarSkeleton';
import { ChatMessagesSkeleton } from './ChatMessagesSkeleton';

/**
 * ChatInputSkeleton - Matches ChatInputArea layout
 * Positioned absolutely at bottom with px-6 py-6, inner max-w-4xl mx-auto
 * Uses the same glassmorphism styling as the actual ChatInput
 */
function ChatInputSkeleton() {
  return (
    <div
      className="absolute bottom-0 left-0 w-full px-6 py-6 z-20 pointer-events-none"
    >
      <div className="max-w-4xl mx-auto pointer-events-auto">
        {/* Glassmorphism container matching chat-input styles.glass */}
        <div
          className="rounded-3xl px-3 py-2 relative flex flex-col"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--surface-card) 85%, transparent)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Input Row */}
          <div className="flex items-end gap-3">
            {/* Attachment button */}
            <ShimmerBlock className="h-9 w-9 rounded-xl flex-shrink-0" />
            {/* Format button */}
            <ShimmerBlock className="h-9 w-9 rounded-xl flex-shrink-0" />
            {/* Smart prompts button */}
            <ShimmerBlock className="h-9 w-9 rounded-xl flex-shrink-0" />

            {/* TextArea placeholder */}
            <div className="flex-1 min-w-0">
              <ShimmerBlock className="h-10 w-full rounded-xl" />
            </div>

            {/* Send button */}
            <ShimmerBlock className="h-9 w-9 rounded-xl flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full page chat skeleton matching ChatPage layout
 * Uses the same flex layout as the actual ChatPage component
 */
export function ChatSkeleton() {
  return (
    <div
      className="flex overflow-hidden flex-1 transition-all duration-300"
      style={{
        backgroundColor: 'transparent',
        height: '100%',
      }}
    >
      <ShimmerStyles />

      {/* Sidebar - matches ChatSidebar positioning */}
      <ChatSidebarSkeleton />

      {/* Main Chat Area - matches ChatPage's main area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Messages - fills available space */}
        <ChatMessagesSkeleton />

        {/* Input - Absolutely positioned at bottom */}
        <ChatInputSkeleton />
      </div>
    </div>
  );
}
