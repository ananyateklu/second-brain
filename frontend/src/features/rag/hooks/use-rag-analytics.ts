/**
 * React Query hooks for RAG analytics
 */

import { useQuery } from '@tanstack/react-query';
import { ragService } from '../../../services/rag.service';
import { QUERY_KEYS } from '../../../lib/constants';
import type { RagPerformanceStats, RagQueryLogsResponse, TopicAnalyticsResponse } from '../../../types/rag';

/**
 * Hook to fetch RAG performance statistics
 */
export function useRagPerformanceStats(since?: Date) {
  return useQuery<RagPerformanceStats>({
    queryKey: QUERY_KEYS.ragAnalytics.stats(since?.toISOString()),
    queryFn: () => ragService.getPerformanceStats(since),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
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
  return useQuery<RagQueryLogsResponse>({
    queryKey: [...QUERY_KEYS.ragAnalytics.logs(page, pageSize), { since: since?.toISOString(), feedbackOnly }],
    queryFn: () => ragService.getQueryLogs(page, pageSize, since, feedbackOnly),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch topic analytics
 */
export function useTopicAnalytics(enabled = true) {
  return useQuery<TopicAnalyticsResponse>({
    queryKey: QUERY_KEYS.ragAnalytics.topics(),
    queryFn: () => ragService.getTopicStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}

