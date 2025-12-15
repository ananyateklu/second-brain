/**
 * Use RAG Analytics Hooks Tests
 * Unit tests for the RAG analytics hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useRagPerformanceStats,
  useRagQueryLogs,
  useTopicAnalytics,
} from '../use-rag-analytics';

// Mock the rag service
vi.mock('../../../../services/rag.service', () => ({
  ragService: {
    getPerformanceStats: vi.fn(),
    getQueryLogs: vi.fn(),
    getTopicStats: vi.fn(),
  },
}));

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('use-rag-analytics hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // useRagPerformanceStats Tests
  // ============================================
  describe('useRagPerformanceStats', () => {
    it('should fetch performance stats', async () => {
      const { ragService } = await import('../../../../services/rag.service');
      vi.mocked(ragService.getPerformanceStats).mockResolvedValue({
        totalQueries: 100,
        queriesWithFeedback: 50,
        positiveFeedback: 40,
        negativeFeedback: 10,
        positiveFeedbackRate: 0.8,
        avgRetrievedCount: 4.5,
        avgTotalTimeMs: 250,
        avgCosineScore: 0.75,
        avgRerankScore: 0.82,
        cosineScoreCorrelation: 0.65,
        rerankScoreCorrelation: 0.72,
      });

      const { result } = renderHook(() => useRagPerformanceStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.totalQueries).toBe(100);
      expect(result.current.data?.positiveFeedbackRate).toBe(0.8);
    });

    it('should pass since date to service', async () => {
      const { ragService } = await import('../../../../services/rag.service');
      vi.mocked(ragService.getPerformanceStats).mockResolvedValue({
        totalQueries: 50,
        queriesWithFeedback: 25,
        positiveFeedback: 20,
        negativeFeedback: 5,
        positiveFeedbackRate: 0.8,
        avgRetrievedCount: 4.0,
        avgTotalTimeMs: 200,
        avgCosineScore: 0.7,
        avgRerankScore: 0.8,
        cosineScoreCorrelation: 0.6,
        rerankScoreCorrelation: 0.7,
      });

      const sinceDate = new Date('2024-01-01');
      const { result } = renderHook(() => useRagPerformanceStats(sinceDate), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(ragService.getPerformanceStats).toHaveBeenCalledWith(sinceDate);
    });

    it('should have error state property', async () => {
      const { ragService } = await import('../../../../services/rag.service');
      vi.mocked(ragService.getPerformanceStats).mockResolvedValue({
        totalQueries: 0,
        queriesWithFeedback: 0,
        positiveFeedback: 0,
        negativeFeedback: 0,
        positiveFeedbackRate: 0,
        avgRetrievedCount: 0,
        avgTotalTimeMs: 0,
        avgCosineScore: 0,
        avgRerankScore: 0,
        cosineScoreCorrelation: 0,
        rerankScoreCorrelation: 0,
      });

      const { result } = renderHook(() => useRagPerformanceStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Error state should be false on success
      expect(result.current.isError).toBe(false);
    });
  });

  // ============================================
  // useRagQueryLogs Tests
  // ============================================
  describe('useRagQueryLogs', () => {
    it('should fetch query logs with pagination', async () => {
      const { ragService } = await import('../../../../services/rag.service');
      vi.mocked(ragService.getQueryLogs).mockResolvedValue({
        logs: [
          { id: '1', query: 'test query', responseTimeMs: 200 },
          { id: '2', query: 'another query', responseTimeMs: 150 },
        ],
        totalCount: 100,
        page: 1,
        pageSize: 20,
      });

      const { result } = renderHook(() => useRagQueryLogs(1, 20), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.logs).toHaveLength(2);
      expect(result.current.data?.totalCount).toBe(100);
    });

    it('should use default pagination values', async () => {
      const { ragService } = await import('../../../../services/rag.service');
      vi.mocked(ragService.getQueryLogs).mockResolvedValue({
        logs: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
      });

      const { result } = renderHook(() => useRagQueryLogs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(ragService.getQueryLogs).toHaveBeenCalledWith(1, 20, undefined, false);
    });

    it('should filter by feedback when feedbackOnly is true', async () => {
      const { ragService } = await import('../../../../services/rag.service');
      vi.mocked(ragService.getQueryLogs).mockResolvedValue({
        logs: [{ id: '1', query: 'query with feedback', feedback: 'thumbs_up' }],
        totalCount: 10,
        page: 1,
        pageSize: 20,
      });

      const { result } = renderHook(
        () => useRagQueryLogs(1, 20, undefined, true),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(ragService.getQueryLogs).toHaveBeenCalledWith(1, 20, undefined, true);
    });

    it('should pass since date to service', async () => {
      const { ragService } = await import('../../../../services/rag.service');
      vi.mocked(ragService.getQueryLogs).mockResolvedValue({
        logs: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
      });

      const sinceDate = new Date('2024-01-01');
      const { result } = renderHook(
        () => useRagQueryLogs(1, 20, sinceDate),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(ragService.getQueryLogs).toHaveBeenCalledWith(1, 20, sinceDate, false);
    });
  });

  // ============================================
  // useTopicAnalytics Tests
  // ============================================
  describe('useTopicAnalytics', () => {
    it('should fetch topic analytics', async () => {
      const { ragService } = await import('../../../../services/rag.service');
      vi.mocked(ragService.getTopicStats).mockResolvedValue({
        topics: [
          {
            clusterId: 1,
            label: 'Development',
            queryCount: 50,
            positiveFeedback: 40,
            negativeFeedback: 10,
            positiveFeedbackRate: 0.8,
            sampleQueries: ['How to debug?'],
          },
        ],
        totalClustered: 100,
        totalUnclustered: 20,
      });

      const { result } = renderHook(() => useTopicAnalytics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.topics).toHaveLength(1);
      expect(result.current.data?.topics[0].label).toBe('Development');
    });

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() => useTopicAnalytics(false), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
    });

    it('should fetch when enabled is true', async () => {
      const { ragService } = await import('../../../../services/rag.service');
      vi.mocked(ragService.getTopicStats).mockResolvedValue({
        topics: [],
        totalClustered: 0,
        totalUnclustered: 0,
      });

      const { result } = renderHook(() => useTopicAnalytics(true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(ragService.getTopicStats).toHaveBeenCalled();
    });

    it('should have error state property', async () => {
      const { ragService } = await import('../../../../services/rag.service');
      vi.mocked(ragService.getTopicStats).mockResolvedValue({
        topics: [],
        totalClustered: 0,
        totalUnclustered: 0,
      });

      const { result } = renderHook(() => useTopicAnalytics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Error state should be false on success
      expect(result.current.isError).toBe(false);
    });
  });
});
