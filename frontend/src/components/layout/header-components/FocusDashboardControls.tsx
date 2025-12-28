import { memo, useCallback } from 'react';
import { Calendar, RefreshCw, Plus } from 'lucide-react';
import { Button } from '../../ui/Button';
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
    <div className="flex items-center gap-3">
      {/* Date with icon */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
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
      <Button
        variant="ghost"
        size="icon"
        onClick={handleRefresh}
        disabled={isLoading}
        title="Refresh"
        className="h-9 w-9"
      >
        <RefreshCw
          className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
        />
      </Button>

      {/* Quick Add button */}
      <Button
        variant="primary"
        size="sm"
        onClick={handleQuickCapture}
        className="gap-1.5"
      >
        <Plus className="h-4 w-4" />
        Quick Add
      </Button>
    </div>
  );
});
