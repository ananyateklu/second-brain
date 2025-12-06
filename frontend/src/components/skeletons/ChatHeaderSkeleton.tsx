/**
 * ChatHeaderSkeleton
 * Skeleton placeholder for the chat header with provider/model selectors
 */

export function ChatHeaderSkeleton() {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{
        backgroundColor: 'var(--surface-secondary)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Left side - Toggle and title */}
      <div className="flex items-center gap-3">
        {/* Sidebar toggle */}
        <div
          className="h-8 w-8 rounded animate-pulse"
          style={{ backgroundColor: 'var(--surface-hover)' }}
        />
        {/* Provider selector */}
        <div
          className="h-9 w-36 rounded-lg animate-pulse"
          style={{ backgroundColor: 'var(--surface-hover)' }}
        />
        {/* Model selector */}
        <div
          className="h-9 w-44 rounded-lg animate-pulse"
          style={{ backgroundColor: 'var(--surface-hover)', animationDelay: '100ms' }}
        />
      </div>

      {/* Right side - Feature toggles */}
      <div className="flex items-center gap-2">
        {/* RAG toggle */}
        <div
          className="h-8 w-20 rounded-lg animate-pulse"
          style={{ backgroundColor: 'var(--surface-hover)', animationDelay: '200ms' }}
        />
        {/* Agent toggle */}
        <div
          className="h-8 w-20 rounded-lg animate-pulse"
          style={{ backgroundColor: 'var(--surface-hover)', animationDelay: '300ms' }}
        />
        {/* Context usage */}
        <div
          className="h-8 w-32 rounded-lg animate-pulse"
          style={{ backgroundColor: 'var(--surface-hover)', animationDelay: '400ms' }}
        />
      </div>
    </div>
  );
}
