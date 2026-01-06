/**
 * Progress Summary Hook
 * TanStack Query hook for fetching AI-generated progress summaries
 * Summaries are cached in the database to reduce AI API costs
 */

import { useCallback, useState } from 'react';
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
  /** Date to get summary for (YYYY-MM-DD format, defaults to today) */
  date?: string;
  /** Whether the query should be enabled */
  enabled?: boolean;
}

/**
 * Hook to fetch AI-generated progress summary
 * Provides insights on completed items, productivity patterns, and encouragement.
 * Summaries are cached in the database and only regenerated on forceRefresh.
 *
 * @param options - Query options including period, date, and enabled state
 * @returns Query result with progress summary data
 *
 * @example
 * ```tsx
 * // Today's summary
 * const { summary, stats, highlights, refreshSummary } = useProgressSummary();
 *
 * // Historical summary for a specific date
 * const { summary, stats } = useProgressSummary({ date: '2025-01-01' });
 *
 * // Weekly summary
 * const { summary, stats } = useProgressSummary({ period: 'week' });
 *
 * // Force refresh the summary
 * await refreshSummary();
 * ```
 */
export function useProgressSummary(options?: UseProgressSummaryOptions) {
  const { period = 'today', date, enabled = true } = options ?? {};
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const query = useApiQuery<ProgressSummaryResponse>(
    [...focusKeys.summary(period, date), forceRefreshKey],
    () => focusService.getProgressSummary(period, date, forceRefreshKey > 0),
    {
      enabled,
      // Summaries are cached in the database, so we can use longer stale time
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Don't refetch on window focus since cache is DB-based
      refetchOnWindowFocus: false,
    }
  );

  /**
   * Force regenerate the summary (ignores database cache)
   * Use this when the user explicitly wants fresh AI insights
   */
  const refreshSummary = useCallback(async () => {
    setIsRefreshing(true);
    setForceRefreshKey((k) => k + 1);
    // Wait for the query to refetch
    await query.refetch();
    setIsRefreshing(false);
  }, [query]);

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
    /** Whether the summary is being forcefully refreshed */
    isRefreshing,
    /** Error if the query failed */
    error: query.error,
    /** Function to manually refetch (uses cached) */
    refetch: query.refetch,
    /** Function to force regenerate summary (ignores cache) */
    refreshSummary,
    /** Whether this is the first load */
    isInitialLoading: query.isLoading && !query.data,
  };
}

export default useProgressSummary;
