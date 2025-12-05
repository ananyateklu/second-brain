/**
 * Statistics Types
 * Types for analytics and usage statistics
 */

/**
 * AI usage statistics (aligned with backend AIUsageStatsResponse)
 */
export interface AIUsageStats {
  totalConversations: number;
  totalMessages: number;
  ragConversationsCount: number;
  agentConversationsCount: number;
  imageGenerationConversationsCount: number;
  totalImagesGenerated: number;
  modelUsageCounts: Record<string, number>;
  providerUsageCounts: Record<string, number>;
  modelTokenUsageCounts: Record<string, number>;
  dailyConversationCounts: Record<string, number>;
  dailyRagConversationCounts: Record<string, number>;
  dailyNonRagConversationCounts: Record<string, number>;
  dailyAgentConversationCounts: Record<string, number>;
  dailyNonAgentConversationCounts: Record<string, number>;
  dailyImageGenerationConversationCounts: Record<string, number>;
  dailyModelUsageCounts: Record<string, Record<string, number>>;
  dailyModelTokenUsageCounts: Record<string, Record<string, number>>;
}

/**
 * Notes statistics
 */
export interface NotesStats {
  totalNotes: number;
  archivedNotes: number;
  activeNotes: number;
  tagCounts: Record<string, number>;
  dailyNoteCounts: Record<string, number>;
  folderCounts: Record<string, number>;
}

/**
 * Dashboard statistics summary
 */
export interface DashboardStats {
  aiUsage: AIUsageStats;
  notesStats?: NotesStats;
  lastUpdated: string;
}

/**
 * Chart data point for time series
 */
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

/**
 * Pie chart data
 */
export interface PieChartData {
  name: string;
  value: number;
  color?: string;
}

/**
 * Model usage data for display
 */
export interface ModelUsageData {
  model: string;
  provider: string;
  count: number;
  tokens: number;
  percentage: number;
}

// ============================================================================
// Tool Call Analytics Types (PostgreSQL 18 JSON_TABLE)
// ============================================================================

/**
 * Comprehensive tool call analytics response
 * Aligned with backend ToolCallAnalyticsResponse
 */
export interface ToolCallAnalytics {
  totalToolCalls: number;
  successRate: number;
  averageExecutionTimeMs: number;
  toolUsageByName: ToolUsageStats[];
  toolUsageByAction: ToolActionStats[];
  dailyToolCalls: Record<string, number>;
  dailySuccessRates: Record<string, number>;
  topErrors: ToolErrorStats[];
  hourlyDistribution: Record<number, number>;
}

/**
 * Statistics for a specific tool
 */
export interface ToolUsageStats {
  toolName: string;
  callCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  percentageOfTotal: number;
  firstUsed?: string;
  lastUsed?: string;
}

/**
 * Statistics for a specific tool action
 */
export interface ToolActionStats {
  toolName: string;
  action: string;
  callCount: number;
  successCount: number;
  successRate: number;
  percentageOfTool: number;
}

/**
 * Statistics for tool call errors
 */
export interface ToolErrorStats {
  toolName: string;
  errorType: string;
  errorMessage: string;
  occurrenceCount: number;
  firstOccurrence?: string;
  lastOccurrence?: string;
}

/**
 * Request parameters for filtering tool call analytics
 */
export interface ToolCallAnalyticsRequest {
  startDate?: string;
  endDate?: string;
  toolName?: string;
  action?: string;
  daysBack?: number;
}

