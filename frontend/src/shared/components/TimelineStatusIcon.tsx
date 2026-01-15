import { memo } from 'react';

interface TimelineStatusIconProps {
  isLoading: boolean;
  className?: string;
}

/**
 * Timeline status icon that shows a spinning loader when loading
 * and morphs into a checkmark when complete.
 * - Loading: Grey spinning circle
 * - Complete: Green checkmark with smooth transition
 */
export const TimelineStatusIcon = memo(function TimelineStatusIcon({
  isLoading,
  className = '',
}: TimelineStatusIconProps) {
  return (
    <div
      className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all duration-300 ${className}`}
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: isLoading ? 'var(--border)' : 'var(--color-success)',
      }}
    >
      <div className="relative w-2.5 h-2.5">
        {/* Spinning loader - visible when loading */}
        <svg
          className={`absolute inset-0 w-2.5 h-2.5 transition-all duration-300 ${
            isLoading ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
          viewBox="0 0 24 24"
          fill="none"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
          />
          <path
            className={isLoading ? 'animate-spin origin-center' : ''}
            style={{ transformOrigin: '12px 12px' }}
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* Checkmark - visible when complete */}
        <svg
          className={`absolute inset-0 w-2.5 h-2.5 transition-all duration-300 ${
            isLoading ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
          }`}
          viewBox="0 0 24 24"
          fill="none"
          style={{ color: 'var(--color-success)' }}
        >
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
});
