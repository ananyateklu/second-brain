/**
 * Statistics Service Tests
 * Unit tests for stats service methods and utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { statsService } from '../stats.service';
import { apiClient } from '../../lib/api-client';
import { API_ENDPOINTS } from '../../lib/constants';
import type { AIUsageStats, ToolCallAnalytics } from '../../types/stats';

// Mock the apiClient
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

// Helper to create mock AI usage stats
const createMockAIStats = (overrides: Partial<AIUsageStats> = {}): AIUsageStats => ({
  totalConversations: 100,
  totalMessages: 500,
  ragConversationsCount: 60,
  agentConversationsCount: 40,
  imageGenerationConversationsCount: 10,
  totalImagesGenerated: 25,
  dailyConversationCounts: {
    '2024-01-15': 10,
    '2024-01-14': 8,
    '2024-01-13': 12,
  },
  dailyRagConversationCounts: {},
  dailyNonRagConversationCounts: {},
  dailyAgentConversationCounts: {},
  dailyNonAgentConversationCounts: {},
  dailyImageGenerationConversationCounts: {},
  dailyModelUsageCounts: {},
  dailyModelTokenUsageCounts: {},
  providerUsageCounts: {
    'OpenAI': 50,
    'Anthropic': 30,
    'Ollama': 20,
  },
  modelUsageCounts: {
    'openai:gpt-4': 30,
    'openai:gpt-3.5-turbo': 20,
    'anthropic:claude-3': 30,
  },
  modelTokenUsageCounts: {
    'openai:gpt-4': 100000,
    'openai:gpt-3.5-turbo': 50000,
    'anthropic:claude-3': 80000,
  },
  ...overrides,
});

describe('statsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // API Method Tests
  // ============================================
  describe('getAIStats', () => {
    it('should GET AI stats', async () => {
      const mockStats = createMockAIStats();
      vi.mocked(apiClient.get).mockResolvedValue(mockStats);

      const result = await statsService.getAIStats();

      expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.STATS.AI);
      expect(result.totalConversations).toBe(100);
    });
  });

  describe('getToolCallAnalytics', () => {
    it('should GET tool call analytics without params', async () => {
      const mockAnalytics: ToolCallAnalytics = {
        totalToolCalls: 500,
        successRate: 0.9,
        averageExecutionTimeMs: 150,
        toolUsageByName: [],
        toolUsageByAction: [],
        dailyToolCalls: {},
        dailySuccessRates: {},
        topErrors: [],
        hourlyDistribution: {},
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockAnalytics);

      const result = await statsService.getToolCallAnalytics();

      expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.STATS.TOOLS);
      expect(result.totalToolCalls).toBe(500);
    });

    it('should include daysBack param', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({});

      await statsService.getToolCallAnalytics({ daysBack: 7 });

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('daysBack=7')
      );
    });

    it('should include date range params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({});

      await statsService.getToolCallAnalytics({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('startDate=')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('endDate=')
      );
    });
  });

  describe('getToolActionBreakdown', () => {
    it('should GET tool action breakdown', async () => {
      vi.mocked(apiClient.get).mockResolvedValue([]);

      await statsService.getToolActionBreakdown(30, 'SearchNotes');

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('daysBack=30')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('toolName=SearchNotes')
      );
    });
  });

  describe('getTopToolErrors', () => {
    it('should GET top tool errors', async () => {
      vi.mocked(apiClient.get).mockResolvedValue([]);

      await statsService.getTopToolErrors(10, 7);

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('topN=10')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('daysBack=7')
      );
    });
  });

  // ============================================
  // Data Transformation Tests
  // ============================================
  describe('convertToChartData', () => {
    it('should convert daily counts to chart data points', () => {
      const dailyCounts = {
        '2024-01-15': 10,
        '2024-01-14': 8,
      };

      const result = statsService.convertToChartData(dailyCounts, 3);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('value');
      expect(result[0]).toHaveProperty('label');
    });

    it('should fill missing dates with 0', () => {
      const dailyCounts = {};

      const result = statsService.convertToChartData(dailyCounts, 5);

      expect(result).toHaveLength(5);
      expect(result.every(d => d.value === 0)).toBe(true);
    });
  });

  describe('convertProviderUsageToPieData', () => {
    it('should convert provider counts to pie chart data', () => {
      const providerCounts = {
        'OpenAI': 50,
        'Anthropic': 30,
      };

      const result = statsService.convertProviderUsageToPieData(providerCounts);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('OpenAI');
      expect(result[0].value).toBe(50);
      expect(result[0]).toHaveProperty('color');
    });

    it('should sort by value descending', () => {
      const providerCounts = {
        'Small': 10,
        'Large': 100,
        'Medium': 50,
      };

      const result = statsService.convertProviderUsageToPieData(providerCounts);

      expect(result[0].name).toBe('Large');
      expect(result[1].name).toBe('Medium');
      expect(result[2].name).toBe('Small');
    });
  });

  describe('convertModelUsageToData', () => {
    it('should convert model counts to detailed data', () => {
      const modelCounts = { 'openai:gpt-4': 30 };
      const tokenCounts = { 'openai:gpt-4': 100000 };

      const result = statsService.convertModelUsageToData(modelCounts, tokenCounts);

      expect(result).toHaveLength(1);
      expect(result[0].model).toBe('gpt-4');
      expect(result[0].provider).toBe('openai');
      expect(result[0].count).toBe(30);
      expect(result[0].tokens).toBe(100000);
    });

    it('should calculate percentage correctly', () => {
      const modelCounts = {
        'openai:gpt-4': 60,
        'anthropic:claude': 40,
      };
      const tokenCounts = {};

      const result = statsService.convertModelUsageToData(modelCounts, tokenCounts);

      expect(result[0].percentage).toBe(60);
      expect(result[1].percentage).toBe(40);
    });
  });

  // ============================================
  // Aggregation Functions Tests
  // ============================================
  describe('getTotalConversations', () => {
    it('should return total conversations', () => {
      const stats = createMockAIStats({ totalConversations: 150 });

      expect(statsService.getTotalConversations(stats)).toBe(150);
    });
  });

  describe('getRagUsagePercentage', () => {
    it('should calculate RAG usage percentage', () => {
      const stats = createMockAIStats({
        totalConversations: 100,
        ragConversationsCount: 60,
      });

      expect(statsService.getRagUsagePercentage(stats)).toBe(60);
    });

    it('should return 0 when no conversations', () => {
      const stats = createMockAIStats({
        totalConversations: 0,
        ragConversationsCount: 0,
      });

      expect(statsService.getRagUsagePercentage(stats)).toBe(0);
    });
  });

  describe('getAgentUsagePercentage', () => {
    it('should calculate agent usage percentage', () => {
      const stats = createMockAIStats({
        totalConversations: 100,
        agentConversationsCount: 40,
      });

      expect(statsService.getAgentUsagePercentage(stats)).toBe(40);
    });
  });

  describe('getTopProviders', () => {
    it('should return top providers', () => {
      const stats = createMockAIStats();

      const result = statsService.getTopProviders(stats, 2);

      expect(result).toHaveLength(2);
      expect(result[0].value).toBeGreaterThanOrEqual(result[1].value);
    });
  });

  describe('getTopModels', () => {
    it('should return top models', () => {
      const stats = createMockAIStats();

      const result = statsService.getTopModels(stats, 2);

      expect(result).toHaveLength(2);
    });
  });

  describe('getTotalTokens', () => {
    it('should sum all token counts', () => {
      const stats = createMockAIStats({
        modelTokenUsageCounts: {
          'model1': 100000,
          'model2': 50000,
        },
      });

      expect(statsService.getTotalTokens(stats)).toBe(150000);
    });

    it('should return 0 for empty counts', () => {
      const stats = createMockAIStats({
        modelTokenUsageCounts: {},
      });

      expect(statsService.getTotalTokens(stats)).toBe(0);
    });
  });

  describe('getConversationTrend', () => {
    it('should calculate trend between periods', () => {
      const stats = createMockAIStats({
        dailyConversationCounts: {
          '2024-01-15': 10,
          '2024-01-14': 10,
          '2024-01-13': 10,
          '2024-01-12': 10,
          '2024-01-11': 10,
          '2024-01-10': 10,
          '2024-01-09': 10,
          '2024-01-08': 5,
          '2024-01-07': 5,
          '2024-01-06': 5,
          '2024-01-05': 5,
          '2024-01-04': 5,
          '2024-01-03': 5,
          '2024-01-02': 5,
        },
      });

      const result = statsService.getConversationTrend(stats);

      expect(result.current).toBe(70);
      expect(result.previous).toBe(35);
      expect(result.percentageChange).toBe(100);
    });

    it('should return 0 percentage change when no previous data', () => {
      const stats = createMockAIStats({
        dailyConversationCounts: {
          '2024-01-15': 10,
        },
      });

      const result = statsService.getConversationTrend(stats);

      expect(result.percentageChange).toBe(0);
    });
  });

  describe('getToolCallTrend', () => {
    it('should calculate tool call trend', () => {
      const dailyCalls = {
        '2024-01-15': 20,
        '2024-01-14': 20,
        '2024-01-13': 20,
        '2024-01-12': 20,
        '2024-01-11': 20,
        '2024-01-10': 20,
        '2024-01-09': 20,
        '2024-01-08': 10,
        '2024-01-07': 10,
        '2024-01-06': 10,
        '2024-01-05': 10,
        '2024-01-04': 10,
        '2024-01-03': 10,
        '2024-01-02': 10,
      };

      const result = statsService.getToolCallTrend(dailyCalls);

      expect(result.current).toBe(140);
      expect(result.previous).toBe(70);
      expect(result.percentageChange).toBe(100);
    });
  });

  // ============================================
  // Formatting Functions Tests
  // ============================================
  describe('formatDateLabel', () => {
    it('should format date string to label', () => {
      const result = statsService.formatDateLabel('2024-01-15');

      expect(result).toBe('Jan 15');
    });
  });

  describe('parseModelName', () => {
    it('should parse model name with provider', () => {
      const [provider, model] = statsService.parseModelName('openai:gpt-4');

      expect(provider).toBe('openai');
      expect(model).toBe('gpt-4');
    });

    it('should handle model without provider', () => {
      const [provider, model] = statsService.parseModelName('gpt-4');

      expect(provider).toBe('Unknown');
      expect(model).toBe('gpt-4');
    });
  });

  describe('formatNumber', () => {
    it('should format millions', () => {
      expect(statsService.formatNumber(1500000)).toBe('1.5M');
    });

    it('should format thousands', () => {
      expect(statsService.formatNumber(5000)).toBe('5.0K');
    });

    it('should return raw number for small values', () => {
      expect(statsService.formatNumber(500)).toBe('500');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default decimals', () => {
      expect(statsService.formatPercentage(75.5)).toBe('75.5%');
    });

    it('should format percentage with custom decimals', () => {
      expect(statsService.formatPercentage(75.567, 2)).toBe('75.57%');
    });
  });

  describe('formatTrend', () => {
    it('should format positive trend', () => {
      const result = statsService.formatTrend(25.5);

      expect(result.text).toBe('+25.5%');
      expect(result.isPositive).toBe(true);
      expect(result.icon).toBe('up');
    });

    it('should format negative trend', () => {
      const result = statsService.formatTrend(-15);

      expect(result.text).toBe('-15.0%');
      expect(result.isPositive).toBe(false);
      expect(result.icon).toBe('down');
    });

    it('should format zero trend', () => {
      const result = statsService.formatTrend(0);

      expect(result.text).toBe('0%');
      expect(result.isPositive).toBe(true);
      expect(result.icon).toBe('neutral');
    });
  });

  describe('convertSuccessRatesToChartData', () => {
    it('should convert success rates with default 100%', () => {
      const dailyRates = {
        '2024-01-15': 95,
      };

      const result = statsService.convertSuccessRatesToChartData(dailyRates, 3);

      expect(result).toHaveLength(3);
      // Missing dates should default to 100%
      expect(result.some(d => d.value === 100)).toBe(true);
    });
  });
});
