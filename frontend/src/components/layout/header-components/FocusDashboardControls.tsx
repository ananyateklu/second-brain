import { memo, useCallback, useMemo } from 'react';
import { Calendar as CalendarIcon, RefreshCw, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subDays, addDays, isToday as isTodayFn, isFuture } from 'date-fns';
import { useBoundStore } from '../../../store/bound-store';
import { useTodayPlan, useBacklog } from '../../../features/focus/hooks';
import { Popover, PopoverTrigger, PopoverContent } from '../../ui/Popover';
import { Calendar } from '../../ui/Calendar';
import { formatLocalDate, parseLocalDate } from '../../../utils/date-utils';
import { cn } from '@/lib/utils';

/**
 * Dashboard-specific header controls for the Focus page.
 * Displays date picker, completed count, refresh, and quick add buttons.
 */
export const FocusDashboardControls = memo(function FocusDashboardControls() {
  const openQuickCapture = useBoundStore((state) => state.openQuickCapture);
  const selectedFocusDate = useBoundStore((state) => state.selectedFocusDate);
  const setSelectedFocusDate = useBoundStore((state) => state.setSelectedFocusDate);

  // The effective date being viewed (null means today)
  const effectiveDate = useMemo(() => {
    if (selectedFocusDate) {
      return parseLocalDate(selectedFocusDate);
    }
    return new Date();
  }, [selectedFocusDate]);

  const isToday = isTodayFn(effectiveDate);

  // Fetch focus data for controls (using selected date)
  const {
    completedTodayCount,
    isLoading: isTodayPlanLoading,
    refetch: refetchTodayPlan,
  } = useTodayPlan({ date: selectedFocusDate ?? undefined });

  const {
    isLoading: isBacklogLoading,
    refetch: refetchBacklog,
  } = useBacklog();

  const isLoading = isTodayPlanLoading || isBacklogLoading;

  // Format the displayed date
  const dateFormatted = useMemo(() => {
    if (isToday) {
      return format(effectiveDate, 'EEEE, MMMM d');
    }
    return format(effectiveDate, 'EEEE, MMMM d, yyyy');
  }, [effectiveDate, isToday]);

  const handleRefresh = useCallback(() => {
    void refetchTodayPlan();
    void refetchBacklog();
  }, [refetchTodayPlan, refetchBacklog]);

  const handleQuickCapture = useCallback(() => {
    openQuickCapture();
  }, [openQuickCapture]);

  // Navigate to previous day
  const handlePrevDay = useCallback(() => {
    const prevDay = subDays(effectiveDate, 1);
    setSelectedFocusDate(formatLocalDate(prevDay));
  }, [effectiveDate, setSelectedFocusDate]);

  // Navigate to next day (only if not in the future)
  const handleNextDay = useCallback(() => {
    const nextDay = addDays(effectiveDate, 1);
    if (!isFuture(nextDay)) {
      // If next day is today, set to null (which means "today")
      if (isTodayFn(nextDay)) {
        setSelectedFocusDate(null);
      } else {
        setSelectedFocusDate(formatLocalDate(nextDay));
      }
    }
  }, [effectiveDate, setSelectedFocusDate]);

  // Handle calendar date selection
  const handleDateSelect = useCallback((date: Date) => {
    if (isTodayFn(date)) {
      setSelectedFocusDate(null);
    } else {
      setSelectedFocusDate(formatLocalDate(date));
    }
  }, [setSelectedFocusDate]);

  // Check if next day button should be disabled
  const isNextDayDisabled = isToday;

  return (
    <div className="flex items-center gap-2">
      {/* Date navigation with calendar popover */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 my-1 rounded-xl backdrop-blur-md"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
          border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
        }}
      >
        {/* Previous day button */}
        <button
          onClick={handlePrevDay}
          className="p-1.5 rounded-lg transition-colors hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Previous day"
          title="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Date with calendar popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 px-2 py-1 rounded-lg transition-colors',
                'hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50'
              )}
              aria-label="Select date"
            >
              <CalendarIcon
                className="h-4 w-4"
                style={{ color: 'var(--color-primary)' }}
              />
              <span
                className="text-sm font-medium whitespace-nowrap"
                style={{ color: 'var(--text-primary)' }}
              >
                {dateFormatted}
              </span>
              {isToday && (
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                    color: 'var(--color-primary)',
                  }}
                >
                  Today
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={8}
            className="w-auto p-0"
          >
            <Calendar
              selected={effectiveDate}
              onSelect={handleDateSelect}
              disableFuture
            />
          </PopoverContent>
        </Popover>

        {/* Next day button */}
        <button
          onClick={handleNextDay}
          disabled={isNextDayDisabled}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            isNextDayDisabled
              ? 'opacity-30 cursor-not-allowed'
              : 'hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]'
          )}
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Next day"
          title={isNextDayDisabled ? "Can't go to future dates" : 'Next day'}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Completed count badge */}
        {completedTodayCount > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium ml-1"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
              color: 'var(--color-success)',
            }}
          >
            {completedTodayCount} done
          </span>
        )}
      </div>

      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        disabled={isLoading}
        title="Refresh"
        className="p-2.5 my-1 rounded-xl backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
          color: 'var(--text-secondary)',
          border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
        }}
      >
        <RefreshCw
          className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
        />
      </button>

      {/* Quick Add button */}
      <button
        onClick={handleQuickCapture}
        className="flex items-center gap-1.5 px-3 py-2.5 my-1 rounded-xl backdrop-blur-md text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          backgroundColor: 'var(--btn-primary-bg)',
          color: 'var(--btn-primary-text)',
          border: '1px solid var(--btn-primary-border)',
        }}
      >
        <Plus className="h-4 w-4" />
        Quick Add
      </button>
    </div>
  );
});
