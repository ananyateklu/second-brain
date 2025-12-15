/**
 * Use Stats Hook Tests
 * Unit tests for the stats hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAIStats, statsKeys } from '../use-stats';

// Mock the stats service
vi.mock('../../../../services', () => ({
  statsService: {
    getAIStats: vi.fn(),
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

describe('use-stats hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // statsKeys Tests
  // ============================================
  describe('statsKeys', () => {
    it('should export statsKeys', () => {
      expect(statsKeys).toBeDefined();
    });

    it('should have ai function', () => {
      expect(typeof statsKeys.ai).toBe('function');
    });

    it('should return query key array', () => {
      const key = statsKeys.ai();
      expect(Array.isArray(key)).toBe(true);
    });
  });

  // ============================================
  // useAIStats Tests
  // ============================================
  describe('useAIStats', () => {
    it('should fetch AI stats', async () => {
      const { statsService } = await import('../../../../services');
      vi.mocked(statsService.getAIStats).mockResolvedValue({
        totalConversations: 100,
        totalMessages: 500,
        ragConversationsCount: 40,
        agentConversationsCount: 20,
        imageGenerationConversationsCount: 10,
        totalImagesGenerated: 25,
        modelUsageCounts: { 'gpt-4': 50, 'claude-3': 30 },
        providerUsageCounts: { 'OpenAI': 50, 'Anthropic': 30 },
        modelTokenUsageCounts: { 'gpt-4': 10000, 'claude-3': 8000 },
        dailyConversationCounts: { '2024-01-01': 15, '2024-01-02': 20 },
        dailyRagConversationCounts: { '2024-01-01': 5, '2024-01-02': 8 },
        dailyNonRagConversationCounts: { '2024-01-01': 10, '2024-01-02': 12 },
        dailyAgentConversationCounts: { '2024-01-01': 3, '2024-01-02': 4 },
        dailyNonAgentConversationCounts: { '2024-01-01': 12, '2024-01-02': 16 },
        dailyImageGenerationConversationCounts: { '2024-01-01': 2, '2024-01-02': 1 },
        dailyModelUsageCounts: {},
        dailyModelTokenUsageCounts: {},
      });

      const { result } = renderHook(() => useAIStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.totalConversations).toBe(100);
      expect(result.current.data?.ragConversationsCount).toBe(40);
      expect(result.current.data?.totalMessages).toBe(500);
    });

    it('should handle loading state', () => {
      const { result } = renderHook(() => useAIStats(), {
        wrapper: createWrapper(),
      });

      // Initially should be loading
      expect(result.current.isLoading).toBe(true);
    });

    it('should have error state property', async () => {
      const { statsService } = await import('../../../../services');
      vi.mocked(statsService.getAIStats).mockResolvedValue({
        totalConversations: 0,
        totalMessages: 0,
        ragConversationsCount: 0,
        agentConversationsCount: 0,
        imageGenerationConversationsCount: 0,
        totalImagesGenerated: 0,
        modelUsageCounts: {},
        providerUsageCounts: {},
        modelTokenUsageCounts: {},
        dailyConversationCounts: {},
        dailyRagConversationCounts: {},
        dailyNonRagConversationCounts: {},
        dailyAgentConversationCounts: {},
        dailyNonAgentConversationCounts: {},
        dailyImageGenerationConversationCounts: {},
        dailyModelUsageCounts: {},
        dailyModelTokenUsageCounts: {},
      });

      const { result } = renderHook(() => useAIStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Error state should be false on success
      expect(result.current.isError).toBe(false);
    });

    it('should call statsService.getAIStats', async () => {
      const { statsService } = await import('../../../../services');
      vi.mocked(statsService.getAIStats).mockResolvedValue({
        totalConversations: 0,
        totalMessages: 0,
        ragConversationsCount: 0,
        agentConversationsCount: 0,
        imageGenerationConversationsCount: 0,
        totalImagesGenerated: 0,
        modelUsageCounts: {},
        providerUsageCounts: {},
        modelTokenUsageCounts: {},
        dailyConversationCounts: {},
        dailyRagConversationCounts: {},
        dailyNonRagConversationCounts: {},
        dailyAgentConversationCounts: {},
        dailyNonAgentConversationCounts: {},
        dailyImageGenerationConversationCounts: {},
        dailyModelUsageCounts: {},
        dailyModelTokenUsageCounts: {},
      });

      const { result } = renderHook(() => useAIStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(statsService.getAIStats).toHaveBeenCalled();
    });

    it('should return model usage counts', async () => {
      const { statsService } = await import('../../../../services');
      vi.mocked(statsService.getAIStats).mockResolvedValue({
        totalConversations: 100,
        totalMessages: 0,
        ragConversationsCount: 0,
        agentConversationsCount: 0,
        imageGenerationConversationsCount: 0,
        totalImagesGenerated: 0,
        modelUsageCounts: {
          'gpt-4': 50,
          'gpt-3.5-turbo': 30,
          'claude-3-opus': 20,
        },
        providerUsageCounts: {},
        modelTokenUsageCounts: {
          'gpt-4': 100000,
          'gpt-3.5-turbo': 50000,
          'claude-3-opus': 80000,
        },
        dailyConversationCounts: {},
        dailyRagConversationCounts: {},
        dailyNonRagConversationCounts: {},
        dailyAgentConversationCounts: {},
        dailyNonAgentConversationCounts: {},
        dailyImageGenerationConversationCounts: {},
        dailyModelUsageCounts: {},
        dailyModelTokenUsageCounts: {},
      });

      const { result } = renderHook(() => useAIStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.modelUsageCounts).toEqual({
        'gpt-4': 50,
        'gpt-3.5-turbo': 30,
        'claude-3-opus': 20,
      });
    });

    it('should return daily counts for charts', async () => {
      const { statsService } = await import('../../../../services');
      vi.mocked(statsService.getAIStats).mockResolvedValue({
        totalConversations: 0,
        totalMessages: 0,
        ragConversationsCount: 0,
        agentConversationsCount: 0,
        imageGenerationConversationsCount: 0,
        totalImagesGenerated: 0,
        modelUsageCounts: {},
        providerUsageCounts: {},
        modelTokenUsageCounts: {},
        dailyConversationCounts: {},
        dailyRagConversationCounts: {
          '2024-01-01': 5,
          '2024-01-02': 8,
          '2024-01-03': 10,
        },
        dailyNonRagConversationCounts: {
          '2024-01-01': 10,
          '2024-01-02': 12,
          '2024-01-03': 15,
        },
        dailyAgentConversationCounts: {
          '2024-01-01': 2,
          '2024-01-02': 3,
          '2024-01-03': 5,
        },
        dailyNonAgentConversationCounts: {},
        dailyImageGenerationConversationCounts: {},
        dailyModelUsageCounts: {},
        dailyModelTokenUsageCounts: {},
      });

      const { result } = renderHook(() => useAIStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.dailyRagConversationCounts).toHaveProperty('2024-01-01');
      expect(result.current.data?.dailyNonRagConversationCounts).toHaveProperty('2024-01-02');
      expect(result.current.data?.dailyAgentConversationCounts).toHaveProperty('2024-01-03');
    });

    it('should handle empty stats', async () => {
      const { statsService } = await import('../../../../services');
      vi.mocked(statsService.getAIStats).mockResolvedValue({
        totalConversations: 0,
        totalMessages: 0,
        ragConversationsCount: 0,
        agentConversationsCount: 0,
        imageGenerationConversationsCount: 0,
        totalImagesGenerated: 0,
        modelUsageCounts: {},
        providerUsageCounts: {},
        modelTokenUsageCounts: {},
        dailyConversationCounts: {},
        dailyRagConversationCounts: {},
        dailyNonRagConversationCounts: {},
        dailyAgentConversationCounts: {},
        dailyNonAgentConversationCounts: {},
        dailyImageGenerationConversationCounts: {},
        dailyModelUsageCounts: {},
        dailyModelTokenUsageCounts: {},
      });

      const { result } = renderHook(() => useAIStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.totalConversations).toBe(0);
      expect(result.current.data?.totalMessages).toBe(0);
      expect(Object.keys(result.current.data?.modelUsageCounts || {}).length).toBe(0);
    });

    it('should provide refetch function', async () => {
      const { statsService } = await import('../../../../services');
      vi.mocked(statsService.getAIStats).mockResolvedValue({
        totalConversations: 0,
        totalMessages: 0,
        ragConversationsCount: 0,
        agentConversationsCount: 0,
        imageGenerationConversationsCount: 0,
        totalImagesGenerated: 0,
        modelUsageCounts: {},
        providerUsageCounts: {},
        modelTokenUsageCounts: {},
        dailyConversationCounts: {},
        dailyRagConversationCounts: {},
        dailyNonRagConversationCounts: {},
        dailyAgentConversationCounts: {},
        dailyNonAgentConversationCounts: {},
        dailyImageGenerationConversationCounts: {},
        dailyModelUsageCounts: {},
        dailyModelTokenUsageCounts: {},
      });

      const { result } = renderHook(() => useAIStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(typeof result.current.refetch).toBe('function');
    });
  });
});
