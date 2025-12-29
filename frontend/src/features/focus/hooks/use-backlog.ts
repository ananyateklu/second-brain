/**
 * Backlog Hook
 * TanStack Query hook for fetching backlog items (unscheduled, not completed)
 */

import { useApiQuery } from '../../../hooks/use-api-query';
import { focusKeys } from '../../../lib/query-keys';
import { focusService } from '../../../services/focus.service';
import type { BacklogResponse, FocusPriority } from '../types';

/**
 * Hook options for backlog query
 */
export interface UseBacklogOptions {
  /** Filter by priority (1 = High, 2 = Medium, 3 = Low) */
  priority?: FocusPriority;
  /** Whether the query should be enabled */
  enabled?: boolean;
}

/**
 * Hook to fetch backlog items
 * Returns items that are not scheduled and not completed
 *
 * @param options - Query options including priority filter and enabled state
 * @returns Query result with backlog data and counts
 *
 * @example
 * ```tsx
 * // Get all backlog items
 * const { items, countByPriority, isLoading } = useBacklog();
 *
 * // Get only high-priority backlog items
 * const { items } = useBacklog({ priority: 1 });
 * ```
 */
export function useBacklog(options?: UseBacklogOptions) {
  const { priority, enabled = true } = options ?? {};

  const query = useApiQuery<BacklogResponse>(
    focusKeys.backlog(priority),
    () => focusService.getBacklog(priority),
    {
      enabled,
      // Backlog is relatively stable, use longer stale time
      staleTime: 60 * 1000, // 1 minute
    }
  );

  return {
    /** Backlog response data */
    backlog: query.data,
    /** Backlog items */
    items: query.data?.items ?? [],
    /** Total count of backlog items */
    totalCount: query.data?.totalCount ?? 0,
    /** Count of items by priority (e.g., { 1: 5, 2: 10, 3: 3 }) */
    countByPriority: query.data?.countByPriority ?? {},
    /** High priority (P1) count */
    highPriorityCount: query.data?.countByPriority?.[1] ?? 0,
    /** Medium priority (P2) count */
    mediumPriorityCount: query.data?.countByPriority?.[2] ?? 0,
    /** Low priority (P3) count */
    lowPriorityCount: query.data?.countByPriority?.[3] ?? 0,
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

export default useBacklog;
