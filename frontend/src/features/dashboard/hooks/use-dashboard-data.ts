import { useMemo } from 'react';
import { useNotes } from '../../notes/hooks/use-notes-query';
import { useAIStats } from '../../stats/hooks/use-stats';
import { calculateStats, getChartData, getChatUsageChartData } from '../../../utils/stats-utils';
import { formatModelName } from '../../../utils/model-name-formatter';
import {
  getThemeColors,
  getRagChartColor,
  getRegularChartColor,
  getProviderFromModelName,
} from '../utils/dashboard-utils';

interface ModelUsageEntry {
  name: string;
  originalName: string;
  value: number;
  tokens: number;
}

interface ModelWithColor extends ModelUsageEntry {
  color: string;
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
  
  // Model usage
  modelUsageData: ModelUsageEntry[];
  modelsByProvider: Record<string, ModelWithColor[]>;
  
  // Colors
  colors: string[];
  ragChartColor: string;
  regularChartColor: string;
  agentChartColor: string;
  
  // Chart data generators (need time range as input)
  getNotesChartData: (timeRange: number) => ChartDataPoint[];
  getChatUsageData: (timeRange: number) => ChatUsageDataPoint[];
  getFilteredModelUsageData: (timeRange: number, aggregateThreshold?: number) => {
    data: AggregatedModelUsageEntry[];
    totalConversations: number;
    totalTokens: number;
    modelDataMap: Map<string, { conversations: number; tokens: number }>;
  };
}

export function useDashboardData(): DashboardData {
  const { data: notes, isLoading: isNotesLoading, error: notesError } = useNotes();
  const { data: aiStats, isLoading: isAIStatsLoading } = useAIStats();

  // Get cached colors
  const colors = getThemeColors();
  const ragChartColor = getRagChartColor();
  const regularChartColor = getRegularChartColor();
  const agentChartColor = colors[2]; // Use third color from theme for agent chats

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

  // Group models by provider
  const modelsByProvider = useMemo<Record<string, ModelWithColor[]>>(() => {
    if (!modelUsageData.length) return {};

    const grouped: Record<string, ModelWithColor[]> = {};

    modelUsageData.forEach((entry, index) => {
      const provider = getProviderFromModelName(entry.originalName);
      if (!grouped[provider]) {
        grouped[provider] = [];
      }
      grouped[provider].push({
        ...entry,
        color: colors[index % colors.length],
      });
    });

    // Sort providers by total usage
    const sortedProviders = Object.entries(grouped).sort((a, b) => {
      const totalA = a[1].reduce((sum, m) => sum + m.value, 0);
      const totalB = b[1].reduce((sum, m) => sum + m.value, 0);
      return totalB - totalA;
    });

    // Sort models within each provider by usage
    sortedProviders.forEach(([, models]) => {
      models.sort((a, b) => b.value - a.value);
    });

    return Object.fromEntries(sortedProviders);
  }, [modelUsageData, colors]);

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
        timeRange
      );
    };
  }, [aiStats]);

  // Filtered and aggregated model usage data generator
  const getFilteredModelUsageData = useMemo(() => {
    return (_timeRange: number, aggregateThreshold: number = 0.05): {
      data: AggregatedModelUsageEntry[];
      totalConversations: number;
      totalTokens: number;
      modelDataMap: Map<string, { conversations: number; tokens: number }>;
    } => {
      // Note: Backend doesn't currently provide time-filtered model usage data,
      // so we show all-time data. This function is structured to support time filtering
      // when backend adds support for it.
      
      if (!modelUsageData.length) {
        return {
          data: [],
          totalConversations: 0,
          totalTokens: 0,
          modelDataMap: new Map(),
        };
      }

      // Calculate totals
      const totalConversations = modelUsageData.reduce((sum, m) => sum + m.value, 0);
      const totalTokens = modelUsageData.reduce((sum, m) => sum + m.tokens, 0);

      // Create model data map for tooltips
      const modelDataMap = new Map<string, { conversations: number; tokens: number }>();
      modelUsageData.forEach((entry) => {
        modelDataMap.set(entry.name, {
          conversations: entry.value,
          tokens: entry.tokens,
        });
      });

      // Sort by value (conversations) descending
      const sorted = [...modelUsageData].sort((a, b) => b.value - a.value);

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
        totalConversations,
        totalTokens,
        modelDataMap,
      };
    };
  }, [modelUsageData]);

  return {
    isLoading: isNotesLoading || isAIStatsLoading,
    error: notesError,
    notes,
    stats,
    aiStats,
    totalTokens,
    modelUsageData,
    modelsByProvider,
    colors,
    ragChartColor,
    regularChartColor,
    agentChartColor,
    getNotesChartData,
    getChatUsageData,
    getFilteredModelUsageData,
  };
}

