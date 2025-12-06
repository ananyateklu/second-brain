/**
 * React Query hooks for RAG analytics
 */

import { ragService } from '../../../services/rag.service';
import { ragAnalyticsKeys } from '../../../lib/query-keys';
import type { RagPerformanceStats, RagQueryLogsResponse, TopicAnalyticsResponse } from '../../../types/rag';
import { useApiQuery, useConditionalQuery } from '../../../hooks/use-api-query';

/**
 * Hook to fetch RAG performance statistics
 */
export function useRagPerformanceStats(since?: Date) {
  return useApiQuery<RagPerformanceStats>(
    ragAnalyticsKeys.stats(since?.toISOString()),
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
    ragAnalyticsKeys.logs({ page, pageSize, since: since?.toISOString(), feedback: feedbackOnly ? 'thumbs_up' : null }),
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
    ragAnalyticsKeys.topics(),
    () => ragService.getTopicStats(),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );
}

