/**
 * Progress Summary Hook
 * TanStack Query hook for fetching AI-generated progress summaries
 */

import { useApiQuery } from '../../../hooks/use-api-query';
import { focusKeys } from '../../../lib/query-keys';
import { focusService } from '../../../services/focus.service';
import type { ProgressSummaryResponse, SummaryPeriod } from '../types';

/**
 * Hook options for progress summary query
 */
export interface UseProgressSummaryOptions {
  /** Time period for the summary: 'today' or 'week' */
  period?: SummaryPeriod;
  /** Whether the query should be enabled */
  enabled?: boolean;
}

/**
 * Hook to fetch AI-generated progress summary
 * Provides insights on completed items, productivity patterns, and encouragement
 *
 * @param options - Query options including period and enabled state
 * @returns Query result with progress summary data
 *
 * @example
 * ```tsx
 * // Today's summary
 * const { summary, stats, highlights } = useProgressSummary();
 *
 * // Weekly summary
 * const { summary, stats } = useProgressSummary({ period: 'week' });
 *
 * // Display stats
 * <div>Completed: {stats.totalCompleted} items</div>
 * <div>Time tracked: {stats.totalMinutesTracked} minutes</div>
 * ```
 */
export function useProgressSummary(options?: UseProgressSummaryOptions) {
  const { period = 'today', enabled = true } = options ?? {};

  const query = useApiQuery<ProgressSummaryResponse>(
    focusKeys.summary(period),
    () => focusService.getProgressSummary(period),
    {
      enabled,
      // Summary changes less frequently, cache longer
      staleTime: 2 * 60 * 1000, // 2 minutes
      // Refetch on window focus to update after completing items
      refetchOnWindowFocus: true,
    }
  );

  return {
    /** Full summary response */
    summaryResponse: query.data,
    /** AI-generated summary text */
    summary: query.data?.summary ?? '',
    /** Completion statistics */
    stats: query.data?.stats ?? {
      totalCompleted: 0,
      totalMinutesTracked: 0,
      completedByPriority: {},
      streakDays: 0,
    },
    /** Highlight points from the period */
    highlights: query.data?.highlights ?? [],
    /** Encouragement message (may be null) */
    encouragement: query.data?.encouragement ?? null,
    /** Time period for this summary */
    period: query.data?.period ?? period,
    /** Start date of the summary period */
    startDate: query.data?.startDate ?? null,
    /** End date of the summary period */
    endDate: query.data?.endDate ?? null,
    /** When the summary was generated */
    generatedAt: query.data?.generatedAt ?? null,
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

export default useProgressSummary;
