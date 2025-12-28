/**
 * Focus Timer Component
 * Displays elapsed time since focus started, updating every second.
 * Persists across page refreshes by calculating from focusStartedAt timestamp.
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FocusTimerProps {
  /** When focus started (ISO datetime string) */
  focusStartedAt: string | null;
  /** Accumulated minutes from previous sessions */
  accumulatedMinutes: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Formats duration in minutes to HH:MM:SS or MM:SS
 */
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Live timer that updates every second showing elapsed focus time.
 * Survives page refreshes by calculating from the server-stored focusStartedAt.
 */
export const FocusTimer = memo(function FocusTimer({
  focusStartedAt,
  accumulatedMinutes,
  className,
}: FocusTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Calculate elapsed time from focusStartedAt
  const calculateElapsed = useCallback(() => {
    if (!focusStartedAt) {
      return accumulatedMinutes * 60; // Only show accumulated time
    }

    const startTime = new Date(focusStartedAt).getTime();
    const now = Date.now();
    const currentSessionSeconds = Math.floor((now - startTime) / 1000);
    const accumulatedSeconds = accumulatedMinutes * 60;

    return Math.max(0, currentSessionSeconds + accumulatedSeconds);
  }, [focusStartedAt, accumulatedMinutes]);

  // Update elapsed time every second
  useEffect(() => {
    // Initial calculation
    setElapsedSeconds(calculateElapsed());

    // Update every second while timer is running
    if (focusStartedAt) {
      const interval = setInterval(() => {
        setElapsedSeconds(calculateElapsed());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [focusStartedAt, calculateElapsed]);

  const formattedTime = formatDuration(elapsedSeconds);
  const isRunning = !!focusStartedAt;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-semibold',
        'transition-all duration-200',
        className
      )}
      style={{
        backgroundColor: isRunning
          ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)'
          : 'var(--surface-hover)',
        color: isRunning ? 'var(--color-primary)' : 'var(--text-secondary)',
      }}
    >
      <Timer
        className={cn('h-5 w-5', isRunning && 'animate-pulse')}
      />
      <span>{formattedTime}</span>
      {!isRunning && accumulatedMinutes > 0 && (
        <span
          className="text-xs font-normal ml-1"
          style={{ color: 'var(--text-tertiary)' }}
        >
          (paused)
        </span>
      )}
    </div>
  );
});
