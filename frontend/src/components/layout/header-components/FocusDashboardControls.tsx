import { memo, useCallback } from 'react';
import { Calendar, RefreshCw, Plus } from 'lucide-react';
import { useBoundStore } from '../../../store/bound-store';
import { useTodayPlan, useBacklog } from '../../../features/focus/hooks';

/**
 * Dashboard-specific header controls for the Focus page.
 * Displays date, completed count, refresh, and quick add buttons.
 */
export const FocusDashboardControls = memo(function FocusDashboardControls() {
  const openQuickCapture = useBoundStore((state) => state.openQuickCapture);

  // Fetch focus data for controls
  const {
    completedTodayCount,
    isLoading: isTodayPlanLoading,
    refetch: refetchTodayPlan,
  } = useTodayPlan();

  const {
    isLoading: isBacklogLoading,
    refetch: refetchBacklog,
  } = useBacklog();

  const isLoading = isTodayPlanLoading || isBacklogLoading;

  // Format today's date
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleRefresh = useCallback(() => {
    void refetchTodayPlan();
    void refetchBacklog();
  }, [refetchTodayPlan, refetchBacklog]);

  const handleQuickCapture = useCallback(() => {
    openQuickCapture();
  }, [openQuickCapture]);

  return (
    <div className="flex items-center gap-2">
      {/* Date with icon */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 my-1 rounded-xl backdrop-blur-md"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
          border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
        }}
      >
        <Calendar
          className="h-4 w-4"
          style={{ color: 'var(--color-primary)' }}
        />
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {todayFormatted}
        </span>
        {completedTodayCount > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
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
