/**
 * Shimmer Components
 * Reusable shimmer animation components for skeleton loading states
 */

/**
 * ShimmerBlock - A block with animated shimmer effect
 * Used as the base building block for skeleton UIs
 */
export function ShimmerBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden rounded ${className || ''}`}
      style={{
        backgroundColor: 'var(--surface-elevated)',
        ...style,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
          animation: 'shimmer 1.5s infinite',
        }}
      />
    </div>
  );
}

/**
 * ShimmerStyles - CSS keyframes for shimmer animation
 * Include this once in a parent component that uses ShimmerBlock
 */
export function ShimmerStyles() {
  return (
    <style>
      {`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}
    </style>
  );
}
