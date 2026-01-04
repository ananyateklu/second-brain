/**
 * Current Focus Card Component
 * Hero card displaying the current focus item prominently
 */

import { memo, useCallback } from 'react';
import { Target, Check, X, Clock, Sparkles } from 'lucide-react';
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
  /** Called when focus is cleared */
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
  onClearFocus,
  disabled = false,
  className,
}: CurrentFocusCardProps) {
  const handleComplete = useCallback(() => {
    if (item) {
      onComplete(item.id);
    }
  }, [item, onComplete]);

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
          'relative rounded-2xl border-2 border-dashed p-10 text-center min-h-[200px] flex flex-col items-center justify-center',
          'transition-all duration-200',
          className
        )}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
          borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
        }}
      >
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-5"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
          }}
        >
          <Target
            className="h-10 w-10"
            style={{ color: 'var(--color-primary)' }}
          />
        </div>
        <h3
          className="text-xl font-semibold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          No Current Focus
        </h3>
        <p
          className="text-sm max-w-md mx-auto"
          style={{ color: 'var(--text-secondary)' }}
        >
          Select an item from Today's Plan to set it as your current focus.
          This helps you concentrate on one thing at a time.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-2xl border overflow-hidden min-h-[180px]',
        'transition-all duration-200',
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

      {/* Decorative elements */}
      <div
        className="absolute top-0 right-0 w-48 h-48 opacity-[0.08] rounded-full -translate-y-1/2 translate-x-1/2"
        style={{
          background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-32 h-32 opacity-[0.05] rounded-full translate-y-1/2 -translate-x-1/2"
        style={{
          background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
        }}
      />

      <div className="relative p-8">
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
          className="text-3xl font-bold mb-3"
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

        {/* Timer - prominent display */}
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
            onClick={handleClearFocus}
            disabled={disabled}
            className="gap-2 hover:backdrop-blur-sm transition-all duration-200"
            style={{
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 8%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X className="h-4 w-4" />
            Clear Focus
          </Button>
        </div>
      </div>
    </div>
  );
});
