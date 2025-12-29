/**
 * Today's Plan Hook
 * TanStack Query hook for fetching today's plan (current focus + scheduled items)
 */

import { useMemo } from 'react';
import { useApiQuery } from '../../../hooks/use-api-query';
import { focusKeys } from '../../../lib/query-keys';
import { focusService } from '../../../services/focus.service';
import type { TodaysPlanResponse } from '../types';

/**
 * Hook options for today's plan query
 */
export interface UseTodayPlanOptions {
  /** Date in YYYY-MM-DD format. Defaults to today. */
  date?: string;
  /** Whether the query should be enabled */
  enabled?: boolean;
}

/**
 * Hook to fetch today's plan
 * Returns current focus item, scheduled items for the day, and completion stats
 *
 * @param options - Query options including date and enabled state
 * @returns Query result with today's plan data
 *
 * @example
 * ```tsx
 * const { todaysPlan, isLoading, error, refetch } = useTodayPlan();
 *
 * // Or for a specific date
 * const { todaysPlan } = useTodayPlan({ date: '2024-12-26' });
 * ```
 */
export function useTodayPlan(options?: UseTodayPlanOptions) {
  const { date, enabled = true } = options ?? {};

  // Use provided date or default to today
  const dateParam = date ?? focusService.getTodayDateString();

  const query = useApiQuery<TodaysPlanResponse>(
    focusKeys.todayPlan(dateParam),
    () => focusService.getTodaysPlan(dateParam),
    {
      enabled,
      // Refetch when window regains focus for real-time updates
      refetchOnWindowFocus: true,
      // Keep data fresh
      staleTime: 30 * 1000, // 30 seconds
    }
  );

  // Defensive: ensure no duplicates between currentFocus and scheduledItems
  const scheduledItems = useMemo(() => {
    const items = query.data?.scheduledItems ?? [];
    const currentFocusId = query.data?.currentFocus?.id;
    if (!currentFocusId) return items;
    return items.filter(item => item.id !== currentFocusId);
  }, [query.data?.scheduledItems, query.data?.currentFocus?.id]);

  return {
    /** Today's plan data */
    todaysPlan: query.data,
    /** Current focus item (convenience accessor) */
    currentFocus: query.data?.currentFocus ?? null,
    /** Scheduled items for today (convenience accessor) */
    scheduledItems,
    /** Number of items completed today */
    completedTodayCount: query.data?.completedTodayCount ?? 0,
    /** Total estimated minutes for remaining items */
    totalEstimatedMinutes: query.data?.totalEstimatedMinutes ?? 0,
    /** Whether the query is loading */
    isLoading: query.isLoading,
    /** Whether data is being fetched (includes background refetch) */
    isFetching: query.isFetching,
    /** Error if the query failed */
    error: query.error,
    /** Function to manually refetch */
    refetch: query.refetch,
    /** Whether this is the first load */
    isInitialLoading: query.isLoading && !query.data,
  };
}

export default useTodayPlan;
