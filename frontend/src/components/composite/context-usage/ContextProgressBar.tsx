/**
 * Progress bar component for context usage display.
 */

import { cn } from '@/lib/utils';
import type { ContextProgressBarProps } from './types';

/**
 * Progress bar showing context window usage percentage.
 * Supports streaming animation with glow and shimmer effects.
 */
export function ContextProgressBar({
  percentUsed,
  colors,
  isStreaming = false,
  showShimmer = false,
  className,
  variant = 'small',
}: ContextProgressBarProps) {
  const heightClass = variant === 'medium' ? 'h-2.5' : 'h-2';

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden',
        heightClass,
        className
      )}
      style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 10%, transparent)' }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${Math.min(100, percentUsed)}%`,
          backgroundColor: colors.bar,
          boxShadow: isStreaming ? `0 0 8px ${colors.barGlow}` : 'none',
        }}
      />
      {/* Animated shimmer effect when streaming */}
      {showShimmer && isStreaming && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
          style={{ backgroundSize: '200% 100%' }}
        />
      )}
    </div>
  );
}
