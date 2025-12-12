interface SelectorSkeletonProps {
  text?: string;
}

export function SelectorSkeleton({ text = 'Loading options...' }: SelectorSkeletonProps) {
  return (
    <div className="relative">
      <div
        className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 min-w-[180px] sm:min-w-[220px] justify-between animate-pulse"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Text */}
        <span
          className="truncate flex-1 text-left font-medium"
          style={{
            color: 'var(--btn-primary-bg)',
            opacity: 0.7,
          }}
        >
          {text}
        </span>
        {/* Chevron skeleton */}
        <div
          className="w-4 h-4 rounded flex-shrink-0 animate-pulse"
          style={{
            backgroundColor: 'var(--btn-primary-bg)',
            opacity: 0.5,
          }}
        />
      </div>
    </div>
  );
}

