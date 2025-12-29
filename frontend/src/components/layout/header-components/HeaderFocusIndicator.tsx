/**
 * Header Focus Indicator
 * Compact indicator shown in header when focus is active and user is not on dashboard.
 * Clicking navigates back to dashboard.
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Timer, ChevronRight } from 'lucide-react';
import { useTodayPlan } from '../../../features/focus/hooks/use-today-plan';
import { PRIORITY_INFO } from '../../../features/focus/types';

/**
 * Formats duration in seconds to MM:SS or HH:MM:SS
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
 * Calculate elapsed seconds from focus start time
 */
function calculateElapsedSeconds(focusStartedAt: string | null, accumulatedMinutes: number): number {
  if (!focusStartedAt) {
    return accumulatedMinutes * 60;
  }

  const startTime = new Date(focusStartedAt).getTime();
  const now = Date.now();
  const currentSessionSeconds = Math.floor((now - startTime) / 1000);
  const accumulatedSeconds = accumulatedMinutes * 60;

  return Math.max(0, currentSessionSeconds + accumulatedSeconds);
}

export const HeaderFocusIndicator = memo(function HeaderFocusIndicator() {
  const navigate = useNavigate();
  const { currentFocus } = useTodayPlan();

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    currentFocus ? calculateElapsedSeconds(currentFocus.focusStartedAt, currentFocus.accumulatedMinutes) : 0
  );

  // Update timer every second when focus is active
  useEffect(() => {
    if (!currentFocus?.focusStartedAt) {
      if (currentFocus) {
        setElapsedSeconds(currentFocus.accumulatedMinutes * 60);
      }
      return;
    }

    const updateElapsed = () => {
      setElapsedSeconds(
        calculateElapsedSeconds(currentFocus.focusStartedAt, currentFocus.accumulatedMinutes)
      );
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [currentFocus?.focusStartedAt, currentFocus?.accumulatedMinutes, currentFocus]);

  const handleClick = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Don't render if no active focus
  if (!currentFocus) {
    return null;
  }

  const isRunning = !!currentFocus.focusStartedAt;
  const priorityInfo = PRIORITY_INFO[currentFocus.priority];
  const formattedTime = formatDuration(elapsedSeconds);

  // Truncate title for header display
  const displayTitle = currentFocus.title.length > 30
    ? currentFocus.title.substring(0, 30) + '...'
    : currentFocus.title;

  return (
    <button
      onClick={handleClick}
      className="group flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      style={{
        backgroundColor: isRunning
          ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
          : 'var(--surface-elevated)',
        border: `1px solid ${isRunning ? 'color-mix(in srgb, var(--color-primary) 30%, transparent)' : 'var(--border)'}`,
      }}
      title={`Focus: ${currentFocus.title} - Click to go to Dashboard`}
    >
      {/* Focus icon with priority color dot */}
      <div className="relative">
        <Target
          className="h-4 w-4"
          style={{ color: isRunning ? 'var(--color-primary)' : 'var(--text-secondary)' }}
        />
        <span
          className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full"
          style={{ backgroundColor: priorityInfo.color }}
        />
      </div>

      {/* Title - hidden on smaller screens */}
      <span
        className="hidden lg:inline text-sm font-medium max-w-[200px] truncate"
        style={{ color: 'var(--text-primary)' }}
      >
        {displayTitle}
      </span>

      {/* Timer */}
      <div
        className="flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-semibold"
        style={{
          backgroundColor: isRunning
            ? 'color-mix(in srgb, var(--color-primary) 20%, transparent)'
            : 'var(--surface-hover)',
          color: isRunning ? 'var(--color-primary)' : 'var(--text-secondary)',
        }}
      >
        <Timer className={`h-3 w-3 ${isRunning ? 'animate-pulse' : ''}`} />
        <span>{formattedTime}</span>
      </div>

      {/* Arrow indicator */}
      <ChevronRight
        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
        style={{ color: 'var(--text-tertiary)' }}
      />
    </button>
  );
});
