import { cn } from '@/lib/utils';
import type { SaveButtonsProps } from './types';

/**
 * Save and Save & Restart buttons for API key forms.
 */
export function SaveButtons({ hasChanges, isSaving, onSave, variant = 'full' }: SaveButtonsProps) {
  const isCompact = variant === 'compact';
  const buttonSize = isCompact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onSave(false)}
        disabled={!hasChanges || isSaving}
        className={cn(
          buttonSize,
          'rounded-lg font-medium transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'hover:scale-[1.02] active:scale-[0.98]',
          'bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-primary)]'
        )}
      >
        Save Only
      </button>
      <button
        type="button"
        onClick={() => onSave(true)}
        disabled={!hasChanges || isSaving}
        className={cn(
          buttonSize,
          'rounded-lg font-medium transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'hover:scale-[1.02] active:scale-[0.98]',
          'border'
        )}
        style={{
          backgroundColor: hasChanges ? 'var(--color-brand-600)' : 'var(--surface-elevated)',
          color: hasChanges ? 'white' : 'var(--text-secondary)',
          borderColor: hasChanges ? 'var(--color-brand-600)' : 'var(--border)',
        }}
      >
        {isSaving ? (
          <span className="flex items-center gap-1.5">
            <svg className={cn('animate-spin', isCompact ? 'h-3 w-3' : 'h-4 w-4')} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Saving...
          </span>
        ) : isCompact ? (
          'Save & Restart'
        ) : (
          'Save & Restart Backend'
        )}
      </button>
    </div>
  );
}
