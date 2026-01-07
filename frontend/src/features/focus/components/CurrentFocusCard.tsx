/**
 * Current Focus Card Component
 * Hero card displaying the current focus item prominently
 */

import { memo, useCallback } from 'react';
import { Target, Check, X, Clock, Sparkles, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { PriorityBadge } from './PriorityBadge';
import { FocusTimer } from './FocusTimer';
import type { FocusItem } from '../types';

export interface CurrentFocusCardProps {
  /** The current focus item (null if none set) */
  item: FocusItem | null;
  /** Called when item is completed */
  onComplete: (id: string) => void;
  /** Called when focus timer is paused (saves accumulated time) */
  onPause: (id: string) => void;
  /** Called when focus is cleared (discards time) */
  onClearFocus: (id: string) => void;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Large prominent card for displaying the current focus item.
 * Shows empty state when no focus is set.
 */
export const CurrentFocusCard = memo(function CurrentFocusCard({
  item,
  onComplete,
  onPause,
  onClearFocus,
  disabled = false,
  className,
}: CurrentFocusCardProps) {
  const handleComplete = useCallback(() => {
    if (item) {
      onComplete(item.id);
    }
  }, [item, onComplete]);

  const handlePause = useCallback(() => {
    if (item) {
      onPause(item.id);
    }
  }, [item, onPause]);

  const handleClearFocus = useCallback(() => {
    if (item) {
      onClearFocus(item.id);
    }
  }, [item, onClearFocus]);

  // Empty state - prominent for hero placement
  if (!item) {
    return (
      <div
        className={cn(
          'relative rounded-xl sm:rounded-2xl border-2 border-dashed p-4 sm:p-10 text-center min-h-[100px] sm:min-h-[200px] flex flex-col items-center justify-center',
          'transition-all duration-200',
          className
        )}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
          borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
        }}
      >
        <div
          className="inline-flex items-center justify-center w-10 h-10 sm:w-20 sm:h-20 rounded-full mb-2 sm:mb-5"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
          }}
        >
          <Target
            className="h-5 w-5 sm:h-10 sm:w-10"
            style={{ color: 'var(--color-primary)' }}
          />
        </div>
        <h3
          className="text-base sm:text-xl font-semibold mb-1 sm:mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          No Current Focus
        </h3>
        <p
          className="text-xs sm:text-sm max-w-md mx-auto"
          style={{ color: 'var(--text-secondary)' }}
        >
          Select an item from Today's Plan to set it as your current focus.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-xl sm:rounded-2xl border overflow-hidden',
        'transition-all duration-200',
        'focus-card-glow',
        'sm:mt-1 sm:hover:-translate-y-1',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      style={{
        borderColor: 'var(--color-primary)',
      }}
    >
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, transparent) 0%, color-mix(in srgb, var(--text-primary) 2%, transparent) 60%, color-mix(in srgb, var(--color-primary) 5%, transparent) 100%)',
        }}
      />

      {/* Decorative elements - hidden on mobile */}
      <div
        className="hidden sm:block absolute top-0 right-0 w-48 h-48 opacity-[0.08] rounded-full -translate-y-1/2 translate-x-1/2"
        style={{
          background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
        }}
      />
      <div
        className="hidden sm:block absolute bottom-0 left-0 w-32 h-32 opacity-[0.05] rounded-full translate-y-1/2 -translate-x-1/2"
        style={{
          background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
        }}
      />

      {/* Mobile: Centered timer-focused layout */}
      <div className="relative p-4 sm:hidden">
        <div className="flex flex-col items-center text-center">
          {/* Timer as hero element */}
          <FocusTimer
            focusStartedAt={item.focusStartedAt}
            accumulatedMinutes={item.accumulatedMinutes}
            className="mb-3"
          />

          {/* Title with priority */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <PriorityBadge priority={item.priority} size="sm" />
            <h2
              className="text-sm font-semibold line-clamp-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {item.title}
            </h2>
          </div>

          {/* Actions - full width buttons */}
          <div className="flex items-center justify-center gap-2 w-full">
            <Button
              variant="primary"
              size="sm"
              onClick={handleComplete}
              disabled={disabled}
              className="gap-1.5 text-xs flex-1 max-w-[140px]"
            >
              <Check className="h-3.5 w-3.5" />
              Complete
            </Button>
            <button
              onClick={handlePause}
              disabled={disabled}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-accent-orange) 15%, transparent)',
                color: 'var(--color-accent-orange-text)',
              }}
              title="Pause Timer"
            >
              <Pause className="h-4 w-4" />
            </button>
            <button
              onClick={handleClearFocus}
              disabled={disabled}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
                color: 'var(--text-secondary)',
              }}
              title="Clear Focus"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: Full layout */}
      <div className="relative p-8 hidden sm:block">
        {/* Label */}
        <div className="flex items-center gap-3 mb-5">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
              color: 'var(--color-primary)',
            }}
          >
            <Target className="h-4 w-4" />
            Current Focus
          </span>
          <PriorityBadge priority={item.priority} />
        </div>

        {/* Title */}
        <h2
          className="text-2xl lg:text-3xl font-bold mb-3"
          style={{ color: 'var(--text-primary)' }}
        >
          {item.title}
        </h2>

        {/* Description */}
        {item.description && (
          <p
            className="text-base mb-5 max-w-2xl leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {item.description}
          </p>
        )}

        {/* Timer */}
        <div className="mb-5">
          <FocusTimer
            focusStartedAt={item.focusStartedAt}
            accumulatedMinutes={item.accumulatedMinutes}
          />
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {item.estimatedMinutes && (
            <span
              className="inline-flex items-center gap-1.5 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Clock className="h-4 w-4" />
              {item.estimatedMinutes} min estimated
            </span>
          )}
          {item.linkedNote && (
            <span
              className="inline-flex items-center gap-1.5 text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              From note: {item.linkedNote.title}
            </span>
          )}
          {item.aiSuggested && (
            <span
              className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-accent-purple) 15%, transparent)',
                color: 'var(--color-accent-purple-text)',
              }}
              title={item.aiSuggestionReason || 'AI suggested this focus item'}
            >
              <Sparkles className="h-3 w-3" />
              AI Suggested
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleComplete}
            disabled={disabled}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Mark Complete
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={handlePause}
            disabled={disabled}
            className="gap-2 text-[var(--color-accent-orange-text)] hover:bg-[color-mix(in_srgb,var(--color-accent-orange)_15%,transparent)] transition-all duration-200"
          >
            <Pause className="h-4 w-4" />
            Pause
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={handleClearFocus}
            disabled={disabled}
            className="gap-2 text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] transition-all duration-200"
          >
            <X className="h-4 w-4" />
            Clear Focus
          </Button>
        </div>
      </div>
    </div>
  );
});
