import { useMemo } from 'react';
import { useNotes } from '../../notes/hooks/use-notes-query';
import { useAIStats } from '../../stats/hooks/use-stats';
import { useSessionStats } from '../../chat/hooks/use-chat-sessions';
import { calculateStats, getChartData, getChatUsageChartData } from '../../../utils/stats-utils';
import { formatModelName } from '../../../utils/model-name-formatter';
import { parse, subDays, startOfDay, isBefore } from 'date-fns';
import {
  getThemeColors,
  getRagChartColor,
  getRegularChartColor,
  getImageGenChartColor,
} from '../utils/dashboard-utils';
import type { SessionStats } from '../../../types/chat';

interface ModelUsageEntry {
  name: string;
  originalName: string;
  value: number;
  tokens: number;
}

interface ChartDataPoint {
  date: string;
  count: number;
}

interface ChatUsageDataPoint {
  date: string;
  ragChats: number;
  regularChats: number;
  agentChats: number;
  imageGenChats: number;
}

interface NotesStats {
  totalNotes: number;
  notesCreatedThisWeek: number;
  notesCreatedThisMonth: number;
  notesUpdatedThisWeek: number;
}

interface AggregatedModelUsageEntry extends ModelUsageEntry {
  isAggregated?: boolean;
  aggregatedModels?: ModelUsageEntry[];
}

interface DashboardData {
  // Loading and error states
  isLoading: boolean;
  error: Error | null;

  // Notes data
  notes: ReturnType<typeof useNotes>['data'];
  stats: NotesStats | null;

  // AI Stats
  aiStats: ReturnType<typeof useAIStats>['data'];
  totalTokens: number;

  // Session Stats (PostgreSQL 18 Temporal Features)
  sessionStats: SessionStats | undefined;

  // Model usage
  modelUsageData: ModelUsageEntry[];

  // Colors
  colors: string[];
  ragChartColor: string;
  regularChartColor: string;
  agentChartColor: string;
  imageGenChartColor: string;

  // Chart data generators (need time range as input)
  getNotesChartData: (timeRange: number) => ChartDataPoint[];
  getChatUsageData: (timeRange: number) => ChatUsageDataPoint[];
  getFilteredModelUsageData: (timeRange: number, aggregateThreshold?: number) => {
    data: AggregatedModelUsageEntry[];
    allFilteredModels: ModelUsageEntry[];
    totalConversations: number;
    totalTokens: number;
    modelDataMap: Map<string, { conversations: number; tokens: number }>;
  };
}

export function useDashboardData(): DashboardData {
  const { data: notes, isLoading: isNotesLoading, error: notesError } = useNotes();
  const { data: aiStats, isLoading: isAIStatsLoading } = useAIStats();
  const { data: sessionStats, isLoading: isSessionStatsLoading } = useSessionStats();

  // Get cached colors
  const colors = getThemeColors();
  const ragChartColor = getRagChartColor();
  const regularChartColor = getRegularChartColor();
  const agentChartColor = colors[2]; // Use third color from theme for agent chats
  const imageGenChartColor = getImageGenChartColor();

  // Calculate notes stats
  const stats = useMemo<NotesStats | null>(() => {
    if (!notes) return null;
    return calculateStats(notes);
  }, [notes]);

  // Generate chart data function (memoized generator)
  const getNotesChartData = useMemo(() => {
    return (timeRange: number): ChartDataPoint[] => {
      if (!notes) return [];
      return getChartData(notes, timeRange);
    };
  }, [notes]);

  // Model usage data
  const modelUsageData = useMemo<ModelUsageEntry[]>(() => {
    if (!aiStats?.modelUsageCounts) return [];
    return Object.entries(aiStats.modelUsageCounts).map(([name, value]) => ({
      name: formatModelName(name),
      originalName: name,
      value,
      tokens: aiStats.modelTokenUsageCounts?.[name] || 0,
    }));
  }, [aiStats]);

  // Calculate total tokens
  const totalTokens = useMemo(() => {
    if (!aiStats?.modelTokenUsageCounts) return 0;
    return Object.values(aiStats.modelTokenUsageCounts).reduce((sum, tokens) => sum + tokens, 0);
  }, [aiStats]);

  // Chat usage data generator
  const getChatUsageData = useMemo(() => {
    return (timeRange: number): ChatUsageDataPoint[] => {
      if (!aiStats?.dailyRagConversationCounts ||
        !aiStats?.dailyNonRagConversationCounts ||
        !aiStats?.dailyAgentConversationCounts) {
        return [];
      }

      return getChatUsageChartData(
        aiStats.dailyRagConversationCounts,
        aiStats.dailyNonRagConversationCounts,
        aiStats.dailyAgentConversationCounts,
        aiStats.dailyImageGenerationConversationCounts || {},
        timeRange
      );
    };
  }, [aiStats]);

  // Filtered and aggregated model usage data generator
  const getFilteredModelUsageData = useMemo(() => {
    return (timeRange: number, aggregateThreshold: number = 0.05): {
      data: AggregatedModelUsageEntry[];
      allFilteredModels: ModelUsageEntry[];
      totalConversations: number;
      totalTokens: number;
      modelDataMap: Map<string, { conversations: number; tokens: number }>;
    } => {
      // Filter model usage data by time range using daily data from backend
      const cutoffDate = startOfDay(subDays(new Date(), timeRange));

      // Helper to parse yyyy-MM-dd as local date
      const parseDateKey = (dateStr: string): Date =>
        parse(dateStr, 'yyyy-MM-dd', new Date());

      // Aggregate daily model usage counts within the time range
      const filteredModelCounts: Record<string, number> = {};
      const filteredModelTokens: Record<string, number> = {};

      if (aiStats?.dailyModelUsageCounts) {
        Object.entries(aiStats.dailyModelUsageCounts).forEach(([dateStr, modelCounts]) => {
          // Parse backend date as local date for proper comparison
          const backendDate = parseDateKey(dateStr);
          if (!isBefore(backendDate, cutoffDate)) {
            Object.entries(modelCounts).forEach(([model, count]) => {
              filteredModelCounts[model] = (filteredModelCounts[model] || 0) + count;
            });
          }
        });
      }

      if (aiStats?.dailyModelTokenUsageCounts) {
        Object.entries(aiStats.dailyModelTokenUsageCounts).forEach(([dateStr, modelTokens]) => {
          // Parse backend date as local date for proper comparison
          const backendDate = parseDateKey(dateStr);
          if (!isBefore(backendDate, cutoffDate)) {
            Object.entries(modelTokens).forEach(([model, tokens]) => {
              filteredModelTokens[model] = (filteredModelTokens[model] || 0) + tokens;
            });
          }
        });
      }

      // Convert to model usage entries
      const filteredData: ModelUsageEntry[] = Object.entries(filteredModelCounts).map(([name, value]) => ({
        name: formatModelName(name),
        originalName: name,
        value,
        tokens: filteredModelTokens[name] || 0,
      }));

      if (!filteredData.length) {
        return {
          data: [],
          allFilteredModels: [],
          totalConversations: 0,
          totalTokens: 0,
          modelDataMap: new Map(),
        };
      }

      // Calculate totals
      const totalConversations = filteredData.reduce((sum, m) => sum + m.value, 0);
      const totalTokens = filteredData.reduce((sum, m) => sum + m.tokens, 0);

      // Create model data map for tooltips
      const modelDataMap = new Map<string, { conversations: number; tokens: number }>();
      filteredData.forEach((entry) => {
        modelDataMap.set(entry.name, {
          conversations: entry.value,
          tokens: entry.tokens,
        });
      });

      // Sort by value (conversations) descending
      const sorted = [...filteredData].sort((a, b) => b.value - a.value);

      // Aggregate small slices
      const mainSlices: AggregatedModelUsageEntry[] = [];
      const smallSlices: ModelUsageEntry[] = [];

      sorted.forEach((entry) => {
        const percent = totalConversations > 0 ? entry.value / totalConversations : 0;
        if (percent >= aggregateThreshold) {
          mainSlices.push({ ...entry });
        } else {
          smallSlices.push(entry);
        }
      });

      // Create "Others" category if there are small slices
      if (smallSlices.length > 0) {
        const othersEntry: AggregatedModelUsageEntry = {
          name: 'Others',
          originalName: 'Others',
          value: smallSlices.reduce((sum, m) => sum + m.value, 0),
          tokens: smallSlices.reduce((sum, m) => sum + m.tokens, 0),
          isAggregated: true,
          aggregatedModels: smallSlices,
        };
        mainSlices.push(othersEntry);

        // Add "Others" to model data map
        modelDataMap.set('Others', {
          conversations: othersEntry.value,
          tokens: othersEntry.tokens,
        });
      }

      return {
        data: mainSlices,
        allFilteredModels: sorted,
        totalConversations,
        totalTokens,
        modelDataMap,
      };
    };
  }, [aiStats]);

  return {
    isLoading: isNotesLoading || isAIStatsLoading || isSessionStatsLoading,
    error: notesError,
    notes,
    stats,
    aiStats,
    totalTokens,
    sessionStats,
    modelUsageData,
    colors,
    ragChartColor,
    regularChartColor,
    agentChartColor,
    imageGenChartColor,
    getNotesChartData,
    getChatUsageData,
    getFilteredModelUsageData,
  };
}

