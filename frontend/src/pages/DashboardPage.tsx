/**
 * Dashboard Page
 * Focus-driven productivity dashboard for managing daily tasks and priorities
 */

import { memo, useCallback, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTitleBarHeight } from '../components/layout/use-title-bar-height';
import { Button } from '../components/ui/Button';
import {
  useTodayPlan,
  useBacklog,
  useCompleteFocusItem,
  useSetCurrentFocus,
  useDeleteFocusItem,
  useUpdateFocusItem,
  useCreateFocusItem,
  useFocusSuggestions,
  useProgressSummary,
} from '../features/focus/hooks';
import {
  CurrentFocusCard,
  TodaysPlanList,
  BacklogSection,
  FocusSkeleton,
  FocusSuggestionsPanel,
  ProgressSummary,
} from '../features/focus/components';
import { focusService } from '../services/focus.service';
import type { PersistedFocusSuggestion, SummaryPeriod } from '../features/focus/types';

export const DashboardPage = memo(function DashboardPage() {
  const titleBarHeight = useTitleBarHeight();

  // Fetch today's plan
  const {
    currentFocus,
    scheduledItems,
    isLoading: isTodayPlanLoading,
    error: todayPlanError,
    refetch: refetchTodayPlan,
  } = useTodayPlan();

  // Fetch backlog
  const {
    items: backlogItems,
    countByPriority,
    isLoading: isBacklogLoading,
    error: backlogError,
    refetch: refetchBacklog,
  } = useBacklog();

  // Mutations
  const { mutate: completeFocusItem, isPending: isCompleting } = useCompleteFocusItem();
  const { mutate: setCurrentFocus, isPending: isSettingFocus } = useSetCurrentFocus();
  const { mutate: deleteFocusItem, isPending: isDeleting } = useDeleteFocusItem();
  const { mutate: updateFocusItem, isPending: isUpdating } = useUpdateFocusItem();
  const { mutate: createFocusItem, isPending: isCreating } = useCreateFocusItem();

  // AI Features
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('today');

  const {
    suggestions,
    isLoading: isSuggestionsLoading,
    isGenerating: isSuggestionsGenerating,
    error: suggestionsError,
    generateSuggestions,
    deleteSuggestion,
    acceptSuggestion,
    isDeleting: isSuggestionDeleting,
    lastGenerationStats,
  } = useFocusSuggestions();

  const {
    summary,
    stats,
    highlights,
    encouragement,
    isLoading: isSummaryLoading,
    isFetching: isSummaryFetching,
    error: summaryError,
    refetch: refetchSummary,
  } = useProgressSummary({
    period: summaryPeriod,
  });

  // Combined mutation state
  const isMutating = isCompleting || isSettingFocus || isDeleting || isUpdating || isCreating;

  // Handlers
  const handleComplete = useCallback(
    (id: string) => {
      completeFocusItem({ id });
    },
    [completeFocusItem]
  );

  const handleClearFocus = useCallback(
    (id: string) => {
      // Update item to no longer be current focus
      updateFocusItem({ id, data: { isCurrentFocus: false } });
    },
    [updateFocusItem]
  );

  const handleSetFocus = useCallback(
    (id: string) => {
      setCurrentFocus(id);
    },
    [setCurrentFocus]
  );

  const handlePlanItemComplete = useCallback(
    (id: string, completed: boolean) => {
      if (completed) {
        completeFocusItem({ id });
      } else {
        // Uncomplete: set status back to pending
        updateFocusItem({ id, data: { status: 'pending' } });
      }
    },
    [completeFocusItem, updateFocusItem]
  );

  const handleScheduleToday = useCallback(
    (id: string) => {
      const today = focusService.getTodayDateString();
      updateFocusItem({ id, data: { scheduledDate: today, updateScheduledDate: true } });
    },
    [updateFocusItem]
  );

  const handleRemoveFromToday = useCallback(
    (id: string) => {
      updateFocusItem({ id, data: { scheduledDate: null, updateScheduledDate: true } });
    },
    [updateFocusItem]
  );

  const handleDeleteBacklogItem = useCallback(
    (id: string) => {
      deleteFocusItem(id);
    },
    [deleteFocusItem]
  );

  const handleRefresh = useCallback(() => {
    void refetchTodayPlan();
    void refetchBacklog();
  }, [refetchTodayPlan, refetchBacklog]);

  // AI Handlers
  const handleAddSuggestion = useCallback(
    (suggestion: PersistedFocusSuggestion) => {
      createFocusItem(
        {
          title: suggestion.title,
          description: suggestion.description ?? undefined,
          priority: suggestion.priority,
          estimatedMinutes: suggestion.estimatedMinutes ?? undefined,
          noteId: suggestion.sourceNoteId ?? undefined,
          scheduledDate: focusService.getTodayDateString(), // Schedule for today
        },
        {
          onSuccess: (createdItem) => {
            // Mark suggestion as accepted with the created focus item ID
            acceptSuggestion.mutate({
              suggestionId: suggestion.id,
              focusItemId: createdItem.id,
            });
          },
        }
      );
    },
    [createFocusItem, acceptSuggestion]
  );

  const handleDeleteSuggestion = useCallback(
    (suggestionId: string) => {
      deleteSuggestion.mutate(suggestionId);
    },
    [deleteSuggestion]
  );

  const handleGenerateSuggestions = useCallback(() => {
    generateSuggestions.mutate({ currentFocusTitle: currentFocus?.title });
  }, [generateSuggestions, currentFocus?.title]);

  const handleSummaryPeriodChange = useCallback((period: SummaryPeriod) => {
    setSummaryPeriod(period);
  }, []);

  const handleRefreshSummary = useCallback(() => {
    void refetchSummary();
  }, [refetchSummary]);

  // Calculate container height - accounts for title bar and header
  const containerHeight = `calc(100vh - ${titleBarHeight}px - 113px)`;

  // Loading state
  const isLoading = isTodayPlanLoading || isBacklogLoading;

  // Error state
  const hasError = todayPlanError || backlogError;

  if (hasError) {
    return (
      <div
        className="flex flex-col items-center justify-center p-8"
        style={{ height: containerHeight }}
      >
        <div
          className="flex flex-col items-center text-center max-w-md p-8 rounded-2xl"
          style={{
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            className="p-4 rounded-full mb-4"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
            }}
          >
            <AlertCircle
              className="h-8 w-8"
              style={{ color: 'var(--color-error)' }}
            />
          </div>
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Failed to load dashboard
          </h3>
          <p
            className="text-sm mb-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            {todayPlanError?.message || backlogError?.message || 'An error occurred while loading your focus data.'}
          </p>
          <Button variant="primary" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: containerHeight,
        maxHeight: containerHeight,
      }}
    >
      {/* 3-Column Kanban Layout */}
      {isLoading ? (
        <div className="flex-1 p-4">
          <FocusSkeleton />
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
          {/* Left Column - Today's Plan + Backlog (mobile: 2nd) */}
          <div className="order-2 lg:order-1 w-full lg:w-80 xl:w-96 lg:flex-shrink-0 flex flex-col gap-4 min-h-0 lg:overflow-y-auto thin-scrollbar">
            <TodaysPlanList
              items={scheduledItems}
              onComplete={handlePlanItemComplete}
              onSetFocus={handleSetFocus}
              onRemove={handleRemoveFromToday}
              disabled={isMutating}
            />
            <BacklogSection
              items={backlogItems}
              countByPriority={countByPriority}
              onSchedule={handleScheduleToday}
              onDelete={handleDeleteBacklogItem}
              disabled={isMutating}
            />
          </div>

          {/* Center Column - Current Focus + Progress (mobile: 1st) */}
          <div className="order-1 lg:order-2 flex-1 min-w-0 flex flex-col gap-4 min-h-0 lg:overflow-y-auto thin-scrollbar">
            <CurrentFocusCard
              item={currentFocus}
              onComplete={handleComplete}
              onClearFocus={handleClearFocus}
              disabled={isMutating}
            />
            <ProgressSummary
              period={summaryPeriod}
              summary={summary}
              stats={stats}
              highlights={highlights}
              encouragement={encouragement}
              isLoading={isSummaryLoading}
              isFetching={isSummaryFetching}
              error={summaryError?.message}
              onPeriodChange={handleSummaryPeriodChange}
              onRefresh={handleRefreshSummary}
            />
          </div>

          {/* Right Column - AI Suggestions (mobile: 3rd) */}
          <div className="order-3 w-full lg:w-80 xl:w-96 lg:flex-shrink-0 flex flex-col min-h-0 lg:overflow-y-auto thin-scrollbar">
            <FocusSuggestionsPanel
              suggestions={suggestions}
              isLoading={isSuggestionsLoading}
              isGenerating={isSuggestionsGenerating}
              error={suggestionsError?.message}
              lastGenerationStats={lastGenerationStats}
              onAddSuggestion={handleAddSuggestion}
              onDeleteSuggestion={handleDeleteSuggestion}
              onGenerate={handleGenerateSuggestions}
              disabled={isMutating}
              isDeleting={isSuggestionDeleting}
              className="flex-1 min-h-0"
            />
          </div>
        </div>
      )}
    </div>
  );
});
