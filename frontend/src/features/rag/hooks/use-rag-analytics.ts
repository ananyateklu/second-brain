/**
 * React Query hooks for RAG analytics
 */

import { ragService } from '../../../services/rag.service';
import { QUERY_KEYS } from '../../../lib/constants';
import type { RagPerformanceStats, RagQueryLogsResponse, TopicAnalyticsResponse } from '../../../types/rag';
import { useApiQuery, useConditionalQuery } from '../../../hooks/use-api-query';

/**
 * Hook to fetch RAG performance statistics
 */
export function useRagPerformanceStats(since?: Date) {
  return useApiQuery<RagPerformanceStats>(
    QUERY_KEYS.ragAnalytics.stats(since?.toISOString()),
    () => ragService.getPerformanceStats(since),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );
}

/**
 * Hook to fetch paginated RAG query logs
 */
export function useRagQueryLogs(
  page = 1,
  pageSize = 20,
  since?: Date,
  feedbackOnly = false
) {
  return useApiQuery<RagQueryLogsResponse>(
    [...QUERY_KEYS.ragAnalytics.logs(page, pageSize), { since: since?.toISOString(), feedbackOnly }],
    () => ragService.getQueryLogs(page, pageSize, since, feedbackOnly),
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
    }
  );
}

/**
 * Hook to fetch topic analytics
 */
export function useTopicAnalytics(enabled = true) {
  return useConditionalQuery<TopicAnalyticsResponse>(
    enabled,
    QUERY_KEYS.ragAnalytics.topics(),
    () => ragService.getTopicStats(),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );
}

