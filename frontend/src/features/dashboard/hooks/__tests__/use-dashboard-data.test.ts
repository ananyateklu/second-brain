/**
 * Use Dashboard Data Hook Tests
 * Unit tests for the dashboard data hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDashboardData } from '../use-dashboard-data';

// Mock the hooks
vi.mock('../../../notes/hooks/use-notes-query', () => ({
  useNotes: vi.fn(),
}));

vi.mock('../../../stats/hooks/use-stats', () => ({
  useAIStats: vi.fn(),
}));

vi.mock('../../../chat/hooks/use-chat-sessions', () => ({
  useSessionStats: vi.fn(),
}));

// Mock utility functions
vi.mock('../../../../utils/stats-utils', () => ({
  calculateStats: vi.fn(() => ({
    totalNotes: 100,
    notesCreatedThisWeek: 10,
    notesCreatedThisMonth: 25,
    notesUpdatedThisWeek: 15,
  })),
  getChartData: vi.fn(() => [
    { date: '2024-01-01', count: 5 },
    { date: '2024-01-02', count: 8 },
  ]),
  getChatUsageChartData: vi.fn(() => [
    { date: '2024-01-01', ragChats: 3, regularChats: 5, agentChats: 2, imageGenChats: 1 },
  ]),
}));

vi.mock('../../../../utils/model-name-formatter', () => ({
  formatModelName: vi.fn((name: string) => name.toUpperCase()),
}));

vi.mock('../../utils/dashboard-utils', () => ({
  getThemeColors: vi.fn(() => ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6']),
  getRagChartColor: vi.fn(() => '#10b981'),
  getRegularChartColor: vi.fn(() => '#6366f1'),
  getImageGenChartColor: vi.fn(() => '#ec4899'),
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

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Basic Return Value Tests
  // ============================================
  describe('return value structure', () => {
    it('should return loading state', async () => {
      const { useNotes } = await import('../../../notes/hooks/use-notes-query');
      const { useAIStats } = await import('../../../stats/hooks/use-stats');
      const { useSessionStats } = await import('../../../chat/hooks/use-chat-sessions');

      vi.mocked(useNotes).mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      } as unknown as ReturnType<typeof useNotes>);

      vi.mocked(useAIStats).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useAIStats>);

      vi.mocked(useSessionStats).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useSessionStats>);

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should return error state', async () => {
      const { useNotes } = await import('../../../notes/hooks/use-notes-query');
      const { useAIStats } = await import('../../../stats/hooks/use-stats');
      const { useSessionStats } = await import('../../../chat/hooks/use-chat-sessions');

      const testError = new Error('Test error');
      vi.mocked(useNotes).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: testError,
      } as unknown as ReturnType<typeof useNotes>);

      vi.mocked(useAIStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useAIStats>);

      vi.mocked(useSessionStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useSessionStats>);

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBe(testError);
    });

    it('should return notes data', async () => {
      const { useNotes } = await import('../../../notes/hooks/use-notes-query');
      const { useAIStats } = await import('../../../stats/hooks/use-stats');
      const { useSessionStats } = await import('../../../chat/hooks/use-chat-sessions');

      const mockNotes = [
        { id: '1', title: 'Note 1' },
        { id: '2', title: 'Note 2' },
      ];

      vi.mocked(useNotes).mockReturnValue({
        data: mockNotes,
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useNotes>);

      vi.mocked(useAIStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useAIStats>);

      vi.mocked(useSessionStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useSessionStats>);

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.notes).toEqual(mockNotes);
    });

    it('should return colors', async () => {
      const { useNotes } = await import('../../../notes/hooks/use-notes-query');
      const { useAIStats } = await import('../../../stats/hooks/use-stats');
      const { useSessionStats } = await import('../../../chat/hooks/use-chat-sessions');

      vi.mocked(useNotes).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useNotes>);

      vi.mocked(useAIStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useAIStats>);

      vi.mocked(useSessionStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useSessionStats>);

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper(),
      });

      expect(Array.isArray(result.current.colors)).toBe(true);
      expect(result.current.colors.length).toBeGreaterThan(0);
      expect(typeof result.current.ragChartColor).toBe('string');
      expect(typeof result.current.regularChartColor).toBe('string');
    });
  });

  // ============================================
  // Stats Calculation Tests
  // ============================================
  describe('stats calculation', () => {
    it('should calculate notes stats from notes data', async () => {
      const { useNotes } = await import('../../../notes/hooks/use-notes-query');
      const { useAIStats } = await import('../../../stats/hooks/use-stats');
      const { useSessionStats } = await import('../../../chat/hooks/use-chat-sessions');

      vi.mocked(useNotes).mockReturnValue({
        data: [{ id: '1' }],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useNotes>);

      vi.mocked(useAIStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useAIStats>);

      vi.mocked(useSessionStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useSessionStats>);

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.stats).toEqual({
        totalNotes: 100,
        notesCreatedThisWeek: 10,
        notesCreatedThisMonth: 25,
        notesUpdatedThisWeek: 15,
      });
    });

    it('should return null stats when notes is undefined', async () => {
      const { useNotes } = await import('../../../notes/hooks/use-notes-query');
      const { useAIStats } = await import('../../../stats/hooks/use-stats');
      const { useSessionStats } = await import('../../../chat/hooks/use-chat-sessions');

      vi.mocked(useNotes).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useNotes>);

      vi.mocked(useAIStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useAIStats>);

      vi.mocked(useSessionStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useSessionStats>);

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.stats).toBeNull();
    });
  });

  // ============================================
  // Chart Data Generator Tests
  // ============================================
  describe('chart data generators', () => {
    it('should return getNotesChartData function', async () => {
      const { useNotes } = await import('../../../notes/hooks/use-notes-query');
      const { useAIStats } = await import('../../../stats/hooks/use-stats');
      const { useSessionStats } = await import('../../../chat/hooks/use-chat-sessions');

      vi.mocked(useNotes).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useNotes>);

      vi.mocked(useAIStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useAIStats>);

      vi.mocked(useSessionStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useSessionStats>);

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.getNotesChartData).toBe('function');
    });

    it('should return getChatUsageData function', async () => {
      const { useNotes } = await import('../../../notes/hooks/use-notes-query');
      const { useAIStats } = await import('../../../stats/hooks/use-stats');
      const { useSessionStats } = await import('../../../chat/hooks/use-chat-sessions');

      vi.mocked(useNotes).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useNotes>);

      vi.mocked(useAIStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useAIStats>);

      vi.mocked(useSessionStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useSessionStats>);

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.getChatUsageData).toBe('function');
    });

    it('should return getFilteredModelUsageData function', async () => {
      const { useNotes } = await import('../../../notes/hooks/use-notes-query');
      const { useAIStats } = await import('../../../stats/hooks/use-stats');
      const { useSessionStats } = await import('../../../chat/hooks/use-chat-sessions');

      vi.mocked(useNotes).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useNotes>);

      vi.mocked(useAIStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useAIStats>);

      vi.mocked(useSessionStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useSessionStats>);

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.getFilteredModelUsageData).toBe('function');
    });
  });

  // ============================================
  // Model Usage Data Tests
  // ============================================
  describe('model usage data', () => {
    it('should return empty model usage when aiStats is undefined', async () => {
      const { useNotes } = await import('../../../notes/hooks/use-notes-query');
      const { useAIStats } = await import('../../../stats/hooks/use-stats');
      const { useSessionStats } = await import('../../../chat/hooks/use-chat-sessions');

      vi.mocked(useNotes).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useNotes>);

      vi.mocked(useAIStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useAIStats>);

      vi.mocked(useSessionStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useSessionStats>);

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.modelUsageData).toEqual([]);
    });

    it('should format model names in model usage data', async () => {
      const { useNotes } = await import('../../../notes/hooks/use-notes-query');
      const { useAIStats } = await import('../../../stats/hooks/use-stats');
      const { useSessionStats } = await import('../../../chat/hooks/use-chat-sessions');

      vi.mocked(useNotes).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useNotes>);

      vi.mocked(useAIStats).mockReturnValue({
        data: {
          totalConversations: 100,
          modelUsageCounts: { 'gpt-4': 50, 'claude-3': 30 },
          modelTokenUsageCounts: { 'gpt-4': 10000, 'claude-3': 8000 },
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useAIStats>);

      vi.mocked(useSessionStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useSessionStats>);

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.modelUsageData.length).toBe(2);
      expect(result.current.modelUsageData[0].name).toBe('GPT-4');
      expect(result.current.modelUsageData[0].originalName).toBe('gpt-4');
    });
  });

  // ============================================
  // Total Tokens Tests
  // ============================================
  describe('total tokens calculation', () => {
    it('should return 0 when no token usage data', async () => {
      const { useNotes } = await import('../../../notes/hooks/use-notes-query');
      const { useAIStats } = await import('../../../stats/hooks/use-stats');
      const { useSessionStats } = await import('../../../chat/hooks/use-chat-sessions');

      vi.mocked(useNotes).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useNotes>);

      vi.mocked(useAIStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useAIStats>);

      vi.mocked(useSessionStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useSessionStats>);

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.totalTokens).toBe(0);
    });

    it('should calculate total tokens from model usage', async () => {
      const { useNotes } = await import('../../../notes/hooks/use-notes-query');
      const { useAIStats } = await import('../../../stats/hooks/use-stats');
      const { useSessionStats } = await import('../../../chat/hooks/use-chat-sessions');

      vi.mocked(useNotes).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useNotes>);

      vi.mocked(useAIStats).mockReturnValue({
        data: {
          totalConversations: 100,
          modelTokenUsageCounts: { 'gpt-4': 10000, 'claude-3': 8000 },
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useAIStats>);

      vi.mocked(useSessionStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useSessionStats>);

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.totalTokens).toBe(18000);
    });
  });

  // ============================================
  // Session Stats Tests
  // ============================================
  describe('session stats', () => {
    it('should return session stats when available', async () => {
      const { useNotes } = await import('../../../notes/hooks/use-notes-query');
      const { useAIStats } = await import('../../../stats/hooks/use-stats');
      const { useSessionStats } = await import('../../../chat/hooks/use-chat-sessions');

      const mockSessionStats = {
        totalSessions: 50,
        avgSessionDurationMinutes: 15.5,
        activeSessions: 2,
        totalMessagesSent: 100,
        totalMessagesReceived: 150,
      };

      vi.mocked(useNotes).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useNotes>);

      vi.mocked(useAIStats).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useAIStats>);

      vi.mocked(useSessionStats).mockReturnValue({
        data: mockSessionStats,
        isLoading: false,
      } as unknown as ReturnType<typeof useSessionStats>);

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.sessionStats).toEqual(mockSessionStats);
    });
  });
});
