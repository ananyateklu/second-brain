/**
 * Priority Badge Component
 * Displays priority level (P1, P2, P3) with appropriate colors
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { PRIORITY_INFO, type FocusPriority } from '../types';

export interface PriorityBadgeProps {
  /** Priority level (1 = High, 2 = Medium, 3 = Low) */
  priority: FocusPriority;
  /** Additional CSS classes */
  className?: string;
  /** Show full label instead of short label */
  showFullLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
}

/**
 * Priority badge showing P1, P2, or P3 with appropriate colors.
 * P1 = Red (urgent), P2 = Amber (medium), P3 = Green (low)
 */
export const PriorityBadge = memo(function PriorityBadge({
  priority,
  className,
  showFullLabel = false,
  size = 'md',
}: PriorityBadgeProps) {
  const info = PRIORITY_INFO[priority];

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        'font-semibold whitespace-nowrap',
        'transition-colors duration-200',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        className
      )}
      style={{
        color: info.color,
        backgroundColor: info.bgColor,
        border: `1px solid ${info.borderColor}`,
      }}
      title={info.label}
      aria-label={info.label}
    >
      {showFullLabel ? info.label : info.shortLabel}
    </span>
  );
});
