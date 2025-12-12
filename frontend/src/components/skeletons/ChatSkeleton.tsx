/**
 * ChatSkeleton Component
 * Full page skeleton for the chat page including sidebar, header, messages, and input
 * Matches ChatPage layout exactly: calc(100vh - titleBarHeight - 2rem)
 * In browser titleBarHeight=0, in Tauri it's 16px
 */

import { ShimmerBlock, ShimmerStyles } from '../ui/Shimmer';
import { ChatSidebarSkeleton } from './ChatSidebarSkeleton';
import { ChatHeaderSkeleton } from './ChatHeaderSkeleton';
import { ChatMessagesSkeleton } from './ChatMessagesSkeleton';
import { useTitleBarHeight } from '../layout/use-title-bar-height';

/**
 * ChatInputSkeleton - Matches ChatInputArea layout
 * Positioned absolutely at bottom with px-6 py-6, inner max-w-4xl mx-auto
 */
function ChatInputSkeleton() {
  return (
    <div
      className="absolute bottom-0 left-0 w-full px-6 py-6 z-20"
    >
      <div className="max-w-4xl mx-auto">
        {/* Glassmorphism container matching chat-input-glass */}
        <div
          className="rounded-3xl px-3 py-2"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--surface-card) 85%, transparent)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
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

export function ChatSkeleton() {
  const titleBarHeight = useTitleBarHeight();

  return (
    <div
      className="flex overflow-hidden border rounded-3xl"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-2xl)',
        height: `calc(100vh - ${titleBarHeight}px - 2rem)`,
        maxHeight: `calc(100vh - ${titleBarHeight}px - 2rem)`,
      }}
    >
      <ShimmerStyles />

      {/* Sidebar */}
      <ChatSidebarSkeleton />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Header */}
        <ChatHeaderSkeleton />

        {/* Messages */}
        <ChatMessagesSkeleton />

        {/* Input - Absolutely positioned at bottom */}
        <ChatInputSkeleton />
      </div>
    </div>
  );
}
