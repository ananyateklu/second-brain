import { cn } from '@/lib/utils';
import type { ApiKeySectionProps } from './types';

/**
 * Displays the user's API key with a copy button.
 * Uses CSS hover classes instead of inline handlers.
 */
export function ApiKeySection({ apiKey, onCopy, isBlueTheme }: ApiKeySectionProps) {
  return (
    <div className="px-4 pt-1 pb-2">
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="h-3.5 w-3.5 text-[var(--text-secondary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        <p className="text-xs font-semibold text-[var(--text-primary)]">
          API Key (for iOS)
        </p>
      </div>
      <div className="flex items-center gap-2">
        <code
          className={cn(
            'flex-1 text-xs px-3 py-2 rounded-lg font-mono truncate border transition-all duration-200',
            'text-[var(--text-primary)]',
            isBlueTheme
              ? 'bg-[rgba(74,109,153,0.15)] border-[rgba(74,109,153,0.3)]'
              : 'bg-[var(--surface-elevated)] border-[var(--border)]'
          )}
        >
          {apiKey.substring(0, 32)}...
        </code>
        <button
          onClick={() => onCopy(apiKey)}
          className={cn(
            'p-2 rounded-lg transition-all duration-200',
            'hover:scale-105 active:scale-95',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-600)]',
            'text-[var(--color-brand-600)]',
            'bg-[color-mix(in_srgb,var(--color-brand-600)_10%,transparent)]',
            'hover:bg-[color-mix(in_srgb,var(--color-brand-600)_20%,transparent)]',
            'hover:text-[var(--color-brand-700)]'
          )}
          aria-label="Copy API key"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
