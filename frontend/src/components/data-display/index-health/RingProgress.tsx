import { cn } from '@/lib/utils';

interface RingProgressProps {
  /** Percentage value (0-100) */
  value: number;
  /** Size of the ring in pixels */
  size?: number;
  /** Thickness of the ring stroke */
  thickness?: number;
  /** Whether to show the percentage in center */
  showValue?: boolean;
  /** Custom label to show below percentage */
  label?: string;
  /** Color variant */
  variant?: 'default' | 'success' | 'warning';
  /** Whether indexing is in progress (shows loading animation) */
  isLoading?: boolean;
  className?: string;
}

/**
 * Circular progress ring showing indexed coverage.
 * Shows indexed portion in one color and remaining (not indexed) in another.
 * Accessible with proper ARIA labels.
 */
export function RingProgress({
  value,
  size = 80,
  thickness = 8,
  showValue = true,
  label,
  variant = 'default',
  isLoading = false,
  className,
}: RingProgressProps) {
  // Clamp value between 0-100
  const normalizedValue = Math.max(0, Math.min(100, value));

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedValue / 100) * circumference;

  // Progress (indexed) color - green for success, brand for default/loading
  const getProgressColor = () => {
    if (isLoading) return 'var(--color-brand-600)';
    if (variant === 'success') return 'var(--color-success)';
    if (variant === 'warning') return 'var(--color-warning)';
    return 'var(--color-brand-600)';
  };

  // Track (not indexed) color - always show as muted warning/amber to indicate remaining work
  const getTrackColor = () => {
    if (isLoading) {
      // During loading, show remaining as muted amber/warning
      return 'color-mix(in srgb, var(--color-warning) 25%, transparent)';
    }
    if (variant === 'success') return 'color-mix(in srgb, var(--color-success) 15%, transparent)';
    if (variant === 'warning') return 'color-mix(in srgb, var(--color-warning) 15%, transparent)';
    return 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)';
  };

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={normalizedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ? `${label}: ${normalizedValue}%` : `${normalizedValue}% complete`}
    >
      {/* Rotating container for loading animation */}
      <svg
        className={cn(
          'transform -rotate-90',
          isLoading && 'animate-[spin_3s_linear_infinite]'
        )}
        width={size}
        height={size}
        style={{
          // Override default spin to be slower and from current position
          animationDirection: isLoading ? 'normal' : undefined,
        }}
      >
        {/* Background track - shows "not indexed" portion */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getTrackColor()}
          strokeWidth={thickness}
        />
        {/* Progress arc - shows "indexed" portion */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getProgressColor()}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: isLoading ? 'stroke-dashoffset 0.3s ease-out' : 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>

      {/* Center content */}
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isLoading ? (
            <>
              <span
                className={cn(
                  'font-bold tabular-nums',
                  size >= 80 ? 'text-lg' : 'text-sm'
                )}
                style={{ color: 'var(--color-brand-600)' }}
              >
                {normalizedValue}%
              </span>
              <span
                className="text-[10px] leading-tight font-medium"
                style={{ color: 'var(--color-brand-600)' }}
              >
                Indexing
              </span>
            </>
          ) : (
            <>
              <span
                className={cn(
                  'font-bold text-[var(--text-primary)]',
                  size >= 80 ? 'text-lg' : 'text-sm'
                )}
              >
                {normalizedValue}%
              </span>
              {label && (
                <span className="text-[10px] text-[var(--text-secondary)] leading-tight">
                  {label}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
