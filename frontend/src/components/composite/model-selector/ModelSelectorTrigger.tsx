import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { formatModelName } from '@/utils/model-name-formatter';
import type { ModelSelectorTriggerProps } from './types';

/**
 * Loading spinner component.
 */
function LoadingSpinner() {
  return (
    <svg
      className="w-4 h-4 flex-shrink-0 animate-spin"
      style={{ color: 'var(--color-primary)' }}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Fallback icon when no provider is selected.
 */
function FallbackIcon() {
  return (
    <svg
      className="w-4 h-4 flex-shrink-0 transition-colors"
      style={{ color: 'var(--text-secondary)' }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

/**
 * Chevron icon for the dropdown.
 */
function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={cn(
        'w-4 h-4 transition-transform duration-200 flex-shrink-0',
        isOpen && 'rotate-180'
      )}
      style={{ color: 'var(--text-tertiary)' }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

/**
 * Main trigger button for the model selector dropdown.
 */
export const ModelSelectorTrigger = forwardRef<
  HTMLButtonElement,
  ModelSelectorTriggerProps
>(function ModelSelectorTrigger(
  {
    selectedProvider,
    selectedModel,
    selectedProviderLogo,
    isOpen,
    isRefreshing,
    disabled,
    isDarkMode,
    onClick,
  },
  ref
) {
  const hasSelection = selectedProvider && selectedModel;
  const textColor = isOpen
    ? 'var(--color-brand-400)'
    : isDarkMode
      ? 'var(--text-secondary)'
      : 'var(--text-tertiary)';

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled || isRefreshing}
      className={cn(
        'group px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
        'hover:scale-[1.02] active:scale-[0.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'flex items-center gap-2 max-w-[280px]'
      )}
      style={{
        backgroundColor: isOpen
          ? 'var(--surface-elevated)'
          : 'var(--surface-card)',
        color: 'var(--text-primary)',
        border: `1px solid ${isRefreshing ? 'var(--color-primary)' : 'var(--border)'}`,
        boxShadow: isOpen ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
      }}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
    >
      {/* Icon: Loading spinner, provider logo, or fallback */}
      {isRefreshing ? (
        <LoadingSpinner />
      ) : selectedProvider && selectedProviderLogo ? (
        <img
          src={selectedProviderLogo}
          alt={selectedProvider}
          className="w-4 h-4 flex-shrink-0 object-contain"
        />
      ) : (
        <FallbackIcon />
      )}

      {/* Text content */}
      <span className="truncate flex-1 text-left">
        {isRefreshing ? (
          <span style={{ color: 'var(--color-primary)' }}>Refreshing...</span>
        ) : hasSelection ? (
          <>
            <span style={{ color: textColor }}>{selectedProvider}</span>
            <span className="mx-1" style={{ color: 'var(--text-secondary)' }}>
              /
            </span>
            <span style={{ color: textColor }}>
              {formatModelName(selectedModel)}
            </span>
          </>
        ) : (
          'Select Model'
        )}
      </span>

      <ChevronIcon isOpen={isOpen} />
    </button>
  );
});
