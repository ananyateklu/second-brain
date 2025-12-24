import { cn } from '@/lib/utils';
import type { DeleteButtonProps } from './types';

/**
 * Delete button for removing indexed notes.
 * Uses CSS hover classes instead of inline handlers.
 */
export function DeleteButton({ isDeleting, onClick, title }: DeleteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDeleting}
      className={cn(
        'flex items-center justify-center w-6 h-6 rounded-xl transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]',
        'border border-[color-mix(in_srgb,var(--color-error)_30%,transparent)]',
        'text-[var(--color-error)]',
        'hover:bg-[color-mix(in_srgb,var(--color-error)_20%,transparent)]',
        'hover:border-[color-mix(in_srgb,var(--color-error)_50%,transparent)]',
        isDeleting && 'opacity-60 cursor-not-allowed'
      )}
      title={`Delete all indexed notes from ${title}`}
    >
      {isDeleting ? (
        <svg
          className="h-3.5 w-3.5 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ) : (
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </button>
  );
}
