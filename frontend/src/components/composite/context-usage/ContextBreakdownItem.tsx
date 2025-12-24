/**
 * Individual breakdown item component for context usage display.
 */

import { cn } from '@/lib/utils';
import { formatTokenCount } from '../../../utils/model-context-limits';
import type { ContextBreakdownItemProps } from './types';

/**
 * Displays a single category in the context usage breakdown.
 * Shows icon, label, mini progress bar, and token count.
 */
export function ContextBreakdownItem({
  label,
  value,
  maxTokens,
  icon: Icon,
  colors,
}: ContextBreakdownItemProps) {
  const itemPercent = maxTokens > 0 ? (value / maxTokens) * 100 : 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-2 py-1.5 rounded-lg',
        'transition-colors duration-150',
        'hover:bg-[var(--surface)]'
      )}
    >
      <div style={{ color: 'var(--color-brand-400)' }}>
        <Icon className="w-4 h-4" />
      </div>
      <span
        className="flex-1 text-xs font-medium truncate"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">
        {/* Mini progress bar */}
        <div
          className="w-12 h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 8%, transparent)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, itemPercent * 10)}%`,
              backgroundColor: colors.bar,
              opacity: 0.6,
            }}
          />
        </div>
        <span
          className="text-xs font-mono w-12 text-right"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {formatTokenCount(value)}
        </span>
      </div>
    </div>
  );
}
