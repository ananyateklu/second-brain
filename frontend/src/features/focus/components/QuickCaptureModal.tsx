/**
 * Quick Capture Modal
 * Minimal form for quickly capturing focus items
 */

import { memo, useCallback, useEffect, useRef } from 'react';
import { X, Zap, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useBoundStore } from '@/store/bound-store';
import { useQuickCapture } from '../hooks';
import { PRIORITY_INFO, type FocusPriority } from '../types';

export interface QuickCaptureModalProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Priority selector buttons
 */
const PrioritySelector = memo(function PrioritySelector({
  value,
  onChange,
  disabled,
}: {
  value: FocusPriority;
  onChange: (priority: FocusPriority) => void;
  disabled?: boolean;
}) {
  const priorities: FocusPriority[] = [1, 2, 3];

  return (
    <div className="flex items-center gap-1">
      {priorities.map((priority) => {
        const info = PRIORITY_INFO[priority];
        const isSelected = value === priority;

        return (
          <button
            key={priority}
            type="button"
            onClick={() => onChange(priority)}
            disabled={disabled}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-semibold',
              'transition-all duration-150',
              'focus:outline-none focus-visible:ring-2',
              isSelected ? 'ring-1' : 'opacity-60 hover:opacity-100'
            )}
            style={{
              backgroundColor: isSelected ? info.bgColor : 'transparent',
              color: info.color,
              borderColor: isSelected ? info.borderColor : 'transparent',
            }}
          >
            {info.shortLabel}
          </button>
        );
      })}
    </div>
  );
});

/**
 * Minimal modal for quick focus item capture.
 * Auto-focuses title input and supports Cmd+Enter to submit.
 */
export const QuickCaptureModal = memo(function QuickCaptureModal({
  className,
}: QuickCaptureModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Modal state from store
  const isOpen = useBoundStore((state) => state.isQuickCaptureOpen);
  const closeQuickCapture = useBoundStore((state) => state.closeQuickCapture);

  // Form state from hook
  const {
    formState,
    setTitle,
    setPriority,
    setScheduleForToday,
    submit,
    isSubmitting,
    reset,
    isValid,
    error,
  } = useQuickCapture();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is visible
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [isOpen]);

  // Handle close
  const handleClose = useCallback(() => {
    reset();
    closeQuickCapture();
  }, [reset, closeQuickCapture]);

  // Handle submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await submit();
      // Close modal on success (form resets automatically)
      if (!error) {
        closeQuickCapture();
      }
    },
    [submit, error, closeQuickCapture]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd+Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleSubmit(e);
      }
      // Escape to close
      if (e.key === 'Escape') {
        handleClose();
      }
    },
    [handleSubmit, handleClose]
  );

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'fixed z-[61]',
          'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-full max-w-md',
          'rounded-2xl overflow-hidden',
          'shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200',
          className
        )}
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-capture-title"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Zap
              className="h-5 w-5"
              style={{ color: 'var(--color-primary)' }}
            />
            <h2
              id="quick-capture-title"
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Quick Capture
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-elevated)]"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title input */}
          <div>
            <input
              ref={inputRef}
              type="text"
              value={formState.title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to focus on?"
              disabled={isSubmitting}
              className={cn(
                'w-full px-4 py-3 rounded-xl',
                'text-base font-medium',
                'transition-all duration-150',
                'focus:outline-none focus:ring-2',
                'placeholder:text-[var(--text-tertiary)]'
              )}
              style={{
                backgroundColor: 'var(--surface-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
              autoComplete="off"
            />
            {error && (
              <p
                className="mt-1.5 text-xs"
                style={{ color: 'var(--color-error)' }}
              >
                {error}
              </p>
            )}
          </div>

          {/* Options row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Priority */}
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Priority:
              </span>
              <PrioritySelector
                value={formState.priority}
                onChange={setPriority}
                disabled={isSubmitting}
              />
            </div>

            {/* Schedule for today toggle */}
            <button
              type="button"
              onClick={() => setScheduleForToday(!formState.scheduleForToday)}
              disabled={isSubmitting}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
                'text-xs font-medium',
                'transition-all duration-150',
                formState.scheduleForToday
                  ? 'bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)]'
                  : 'hover:bg-[var(--surface-elevated)]'
              )}
              style={{
                color: formState.scheduleForToday
                  ? 'var(--color-primary)'
                  : 'var(--text-secondary)',
              }}
            >
              <Calendar className="h-3.5 w-3.5" />
              Today
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!isValid || isSubmitting}
              className="gap-1.5"
            >
              {isSubmitting ? (
                'Adding...'
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  Add
                </>
              )}
            </Button>
          </div>

          {/* Keyboard hint */}
          <p
            className="text-center text-[10px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Press <kbd className="px-1 py-0.5 rounded bg-[var(--muted)]">⌘</kbd>{' '}
            <kbd className="px-1 py-0.5 rounded bg-[var(--muted)]">↵</kbd> to add quickly
          </p>
        </form>
      </div>
    </>
  );
});

export default QuickCaptureModal;
