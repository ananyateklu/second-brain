/**
 * ChatMessagesSkeleton
 * Skeleton placeholder for the chat messages list
 * Matches ChatMessageList: px-4 pt-4, inner max-w-4xl mx-auto
 */

import { ShimmerBlock } from '../ui/Shimmer';

export function ChatMessagesSkeleton() {
  // Alternate between user (right) and assistant (left) message bubbles
  const messages = [
    { isUser: true, lines: 1, widths: [75] },
    { isUser: false, lines: 3, widths: [100, 100, 60] },
    { isUser: true, lines: 2, widths: [100, 45] },
    { isUser: false, lines: 4, widths: [100, 100, 100, 70] },
    { isUser: true, lines: 1, widths: [55] },
  ];

  return (
    <div
      className="flex-1 overflow-y-auto px-4 pt-4 min-h-0 [scrollbar-gutter:stable] thin-scrollbar"
    >
      {/* Inner container matching ChatMessageList */}
      <div className="max-w-4xl mx-auto space-y-4 pb-34">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                space-y-2
                ${msg.isUser
                  ? 'max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md'
                  : 'w-full rounded-2xl rounded-bl-md'}
              `}
              style={{
                backgroundColor: msg.isUser
                  ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
                  : 'var(--surface-card)',
                border: msg.isUser ? '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)' : undefined,
              }}
            >
              {/* Message content lines */}
              {msg.widths.map((width, lineIdx) => (
                <ShimmerBlock
                  key={lineIdx}
                  className="h-4 rounded"
                  style={{
                    width: `${width}%`,
                    minWidth: '80px',
                    backgroundColor: msg.isUser
                      ? 'color-mix(in srgb, var(--color-primary) 30%, transparent)'
                      : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Typing indicator skeleton */}
        <div className="flex justify-start">
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--surface-secondary)' }}
          >
            <ShimmerBlock className="w-2 h-2 rounded-full" />
            <ShimmerBlock className="w-2 h-2 rounded-full" />
            <ShimmerBlock className="w-2 h-2 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
