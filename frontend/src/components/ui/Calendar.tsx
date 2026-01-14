/**
 * Calendar Component
 * Simple month calendar for date picking in the Focus Dashboard
 */

import { memo, useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isFuture,
} from 'date-fns';
import { cn } from '@/lib/utils';

export interface CalendarProps {
  /** Currently selected date */
  selected?: Date;
  /** Called when a date is selected */
  onSelect: (date: Date) => void;
  /** Whether to disable future dates (default: true) */
  disableFuture?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A simple calendar component for selecting dates.
 * Used in the Focus Dashboard for viewing historical focus data.
 */
export const Calendar = memo(function Calendar({
  selected,
  onSelect,
  disableFuture = true,
  className,
}: CalendarProps) {
  // Derive initial month from selected date, defaulting to current month
  // When selected changes externally, we use key prop on parent to reset
  const initialMonth = useMemo(
    () => (selected ? startOfMonth(selected) : startOfMonth(new Date())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Only compute on mount
  );

  // Track the currently displayed month (allows independent navigation)
  const [viewMonth, setViewMonth] = useState(initialMonth);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [viewMonth]);

  const handlePrevMonth = useCallback(() => {
    setViewMonth((prev) => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth((prev) => {
      const nextMonth = addMonths(prev, 1);
      // Don't allow navigating to future months if disableFuture
      if (disableFuture && isFuture(startOfMonth(nextMonth))) {
        return prev;
      }
      return nextMonth;
    });
  }, [disableFuture]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      if (disableFuture && isFuture(date) && !isToday(date)) {
        return;
      }
      onSelect(date);
    },
    [onSelect, disableFuture]
  );

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Check if next month button should be disabled
  const isNextMonthDisabled = disableFuture && isFuture(addMonths(viewMonth, 1));

  return (
    <div className={cn('p-2 rounded-xl bg-[var(--surface-solid)]', className)}>
      {/* Month navigation header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg transition-colors hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          disabled={isNextMonthDisabled}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            isNextMonthDisabled
              ? 'opacity-30 cursor-not-allowed'
              : 'hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]'
          )}
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium py-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const isCurrentMonth = isSameMonth(day, viewMonth);
          const isSelected = selected && isSameDay(day, selected);
          const isTodayDate = isToday(day);
          const isFutureDate = isFuture(day) && !isTodayDate;
          const isDisabled = disableFuture && isFutureDate;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDateSelect(day)}
              disabled={isDisabled}
              className={cn(
                'h-8 w-8 rounded-lg text-sm font-medium transition-all duration-150',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1',
                !isCurrentMonth && 'opacity-30',
                isDisabled && 'cursor-not-allowed opacity-20',
                !isSelected && !isDisabled && 'hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]',
                isSelected && 'bg-[var(--color-primary)] text-white',
                isTodayDate && !isSelected && 'ring-1 ring-[var(--color-primary)]'
              )}
              style={{
                color: isSelected ? 'white' : 'var(--text-primary)',
              }}
              aria-label={format(day, 'MMMM d, yyyy')}
              aria-selected={isSelected}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Today button */}
      <div className="mt-3 pt-2 border-t" style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }}>
        <button
          type="button"
          onClick={() => handleDateSelect(new Date())}
          className={cn(
            'w-full py-1.5 rounded-lg text-xs font-medium transition-colors',
            'hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]'
          )}
          style={{ color: 'var(--color-primary)' }}
        >
          Jump to Today
        </button>
      </div>
    </div>
  );
});
