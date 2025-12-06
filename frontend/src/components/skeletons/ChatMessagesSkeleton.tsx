/**
 * ChatMessagesSkeleton
 * Skeleton placeholder for the chat messages list
 */

export function ChatMessagesSkeleton() {
  // Alternate between user (right) and assistant (left) message bubbles
  const messages = [
    { isUser: true, lines: 1 },
    { isUser: false, lines: 3 },
    { isUser: true, lines: 2 },
    { isUser: false, lines: 4 },
    { isUser: true, lines: 1 },
  ];

  return (
    <div
      className="flex-1 overflow-hidden p-4 space-y-4"
      style={{ backgroundColor: 'var(--surface-primary)' }}
    >
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
          style={{ animationDelay: `${i * 150}ms` }}
        >
          <div
            className={`
              animate-pulse rounded-2xl p-4 space-y-2
              ${msg.isUser ? 'max-w-[60%]' : 'max-w-[75%]'}
            `}
            style={{
              backgroundColor: msg.isUser
                ? 'var(--color-primary-light)'
                : 'var(--surface-secondary)',
            }}
          >
            {/* Message content lines */}
            {Array.from({ length: msg.lines }).map((_, lineIdx) => (
              <div
                key={lineIdx}
                className="h-4 rounded"
                style={{
                  backgroundColor: msg.isUser
                    ? 'var(--color-primary)'
                    : 'var(--surface-hover)',
                  opacity: 0.3,
                  width:
                    lineIdx === msg.lines - 1
                      ? `${40 + Math.random() * 40}%`
                      : '100%',
                }}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Typing indicator skeleton */}
      <div className="flex justify-start">
        <div
          className="animate-pulse rounded-2xl p-4 flex items-center gap-1"
          style={{ backgroundColor: 'var(--surface-secondary)' }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--text-tertiary)' }}
          />
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--text-tertiary)', animationDelay: '150ms' }}
          />
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--text-tertiary)', animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}
