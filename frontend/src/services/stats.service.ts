/**
 * Statistics Service
 * Handles analytics and usage statistics
 */

import { apiClient } from '../lib/api-client';
import { API_ENDPOINTS } from '../lib/constants';
import type {
  AIUsageStats,
  ChartDataPoint,
  PieChartData,
  ModelUsageData,
} from '../types/stats';

/**
 * Statistics service for analytics operations
 */
export const statsService = {
  /**
   * Get AI usage statistics
   */
  async getAIStats(): Promise<AIUsageStats> {
    return apiClient.get<AIUsageStats>(API_ENDPOINTS.STATS.AI);
  },

  // ============================================
  // Data Transformation Functions
  // ============================================

  /**
   * Convert daily counts to chart data points
   */
  convertToChartData(
    dailyCounts: Record<string, number>,
    days: number = 30
  ): ChartDataPoint[] {
    const result: ChartDataPoint[] = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      result.push({
        date: dateStr,
        value: dailyCounts[dateStr] || 0,
        label: this.formatDateLabel(dateStr),
      });
    }
    
    return result;
  },

  /**
   * Convert provider usage to pie chart data
   */
  convertProviderUsageToPieData(
    providerCounts: Record<string, number>
  ): PieChartData[] {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'];
    
    return Object.entries(providerCounts)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value);
  },

  /**
   * Convert model usage to detailed data
   */
  convertModelUsageToData(
    modelCounts: Record<string, number>,
    tokenCounts: Record<string, number>
  ): ModelUsageData[] {
    const totalUsage = Object.values(modelCounts).reduce((a, b) => a + b, 0);
    
    return Object.entries(modelCounts)
      .map(([model, count]) => {
        const [provider, modelName] = this.parseModelName(model);
        return {
          model: modelName,
          provider,
          count,
          tokens: tokenCounts[model] || 0,
          percentage: totalUsage > 0 ? (count / totalUsage) * 100 : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  },

  // ============================================
  // Aggregation Functions
  // ============================================

  /**
   * Calculate total conversations
   */
  getTotalConversations(stats: AIUsageStats): number {
    return stats.totalConversations;
  },

  /**
   * Calculate RAG usage percentage
   */
  getRagUsagePercentage(stats: AIUsageStats): number {
    if (stats.totalConversations === 0) return 0;
    return (stats.ragConversationsCount / stats.totalConversations) * 100;
  },

  /**
   * Calculate agent usage percentage
   */
  getAgentUsagePercentage(stats: AIUsageStats): number {
    if (stats.totalConversations === 0) return 0;
    return (stats.agentConversationsCount / stats.totalConversations) * 100;
  },

  /**
   * Get top N providers by usage
   */
  getTopProviders(stats: AIUsageStats, limit: number = 5): PieChartData[] {
    return this.convertProviderUsageToPieData(stats.providerUsageCounts).slice(0, limit);
  },

  /**
   * Get top N models by usage
   */
  getTopModels(stats: AIUsageStats, limit: number = 5): ModelUsageData[] {
    return this.convertModelUsageToData(
      stats.modelUsageCounts,
      stats.modelTokenUsageCounts
    ).slice(0, limit);
  },

  /**
   * Calculate total tokens used
   */
  getTotalTokens(stats: AIUsageStats): number {
    return Object.values(stats.modelTokenUsageCounts).reduce((a, b) => a + b, 0);
  },

  /**
   * Get conversation trend (last 7 days vs previous 7 days)
   */
  getConversationTrend(stats: AIUsageStats): {
    current: number;
    previous: number;
    percentageChange: number;
  } {
    const dailyCounts = Object.entries(stats.dailyConversationCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date));

    let current = 0;
    let previous = 0;

    for (let i = 0; i < 7 && i < dailyCounts.length; i++) {
      current += dailyCounts[i].count;
    }

    for (let i = 7; i < 14 && i < dailyCounts.length; i++) {
      previous += dailyCounts[i].count;
    }

    const percentageChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return { current, previous, percentageChange };
  },

  // ============================================
  // Formatting Functions
  // ============================================

  /**
   * Format date label for charts
   */
  formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  /**
   * Parse model name into provider and model
   */
  parseModelName(fullName: string): [string, string] {
    // Common patterns: "openai:gpt-4", "anthropic:claude-3", etc.
    const parts = fullName.split(':');
    if (parts.length === 2) {
      return [parts[0], parts[1]];
    }
    return ['Unknown', fullName];
  },

  /**
   * Format large numbers for display
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  },

  /**
   * Format percentage for display
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  },

  /**
   * Format trend indicator
   */
  formatTrend(percentageChange: number): {
    text: string;
    isPositive: boolean;
    icon: 'up' | 'down' | 'neutral';
  } {
    if (percentageChange > 0) {
      return {
        text: `+${this.formatPercentage(percentageChange)}`,
        isPositive: true,
        icon: 'up',
      };
    }
    if (percentageChange < 0) {
      return {
        text: this.formatPercentage(percentageChange),
        isPositive: false,
        icon: 'down',
      };
    }
    return {
      text: '0%',
      isPositive: true,
      icon: 'neutral',
    };
  },
};

