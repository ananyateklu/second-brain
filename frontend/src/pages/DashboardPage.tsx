import { useMemo, memo, useState } from 'react';
import { useNotes } from '../features/notes/hooks/use-notes-query';
import { useAIStats } from '../features/stats/hooks/use-stats';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { calculateStats, getChartData, getChatUsageChartData } from '../utils/stats-utils';
import { formatModelName } from '../utils/model-name-formatter';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

// Cache theme colors - read once instead of on every render
let cachedThemeColors: string[] | null = null;
let cachedRagChartColor: string | null = null;
let cachedRegularChartColor: string | null = null;

const getThemeColors = () => {
  if (cachedThemeColors) return cachedThemeColors;

  const style = getComputedStyle(document.documentElement);
  cachedThemeColors = [
    style.getPropertyValue('--color-brand-600').trim() || '#36693d', // Primary green
    style.getPropertyValue('--color-brand-500').trim() || '#4a7d52', // Medium green
    style.getPropertyValue('--color-brand-700').trim() || '#2f5638', // Medium-dark green
    style.getPropertyValue('--color-brand-400').trim() || '#5e9167', // Medium-light green
    style.getPropertyValue('--color-brand-300').trim() || '#7aa884', // Light green
    style.getPropertyValue('--color-brand-800').trim() || '#25422b', // Dark green
  ];
  return cachedThemeColors;
};

const getRagChartColor = () => {
  if (cachedRagChartColor) return cachedRagChartColor;

  const style = getComputedStyle(document.documentElement);
  cachedRagChartColor = style.getPropertyValue('--color-brand-600').trim() || '#36693d';
  return cachedRagChartColor;
};

const getRegularChartColor = () => {
  if (cachedRegularChartColor) return cachedRegularChartColor;

  const style = getComputedStyle(document.documentElement);
  cachedRegularChartColor = style.getPropertyValue('--color-brand-400').trim() || '#5e9167';
  return cachedRegularChartColor;
};

// Reset cache when theme changes (call this from your theme switcher)
export const resetDashboardColorCache = () => {
  cachedThemeColors = null;
  cachedRagChartColor = null;
  cachedRegularChartColor = null;
};

const formatTokenCount = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};

// Extract provider from model name - static function for better performance
const getProviderFromModelName = (modelName: string): string => {
  const lower = modelName.toLowerCase();
  if (lower.startsWith('claude-')) return 'Anthropic';
  if (lower.startsWith('gpt-') || /^o\d/.test(lower) ||
    lower.includes('dall-e') || lower.includes('whisper') || lower.includes('text-embedding') ||
    lower.includes('chatgpt') || lower.includes('sora') || lower.includes('codex')) return 'OpenAI';
  if (lower.startsWith('gemini-')) return 'Google';
  if (lower.startsWith('grok-')) return 'xAI';
  if (lower.includes(':') || lower.includes('llama')) return 'Ollama';
  return 'Other';
};

// Stat Card Component - Memoized to prevent unnecessary re-renders
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: React.ReactNode;
  show?: boolean;
}

const StatCard = memo(function StatCard({ title, value, icon, subtitle, show = true }: StatCardProps) {
  if (!show) return null;

  return (
    <div
      className="rounded-3xl border p-4 transition-all duration-200 hover:scale-[1.02] backdrop-blur-md flex flex-col h-full relative overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg), 0 0 40px -15px var(--color-primary-alpha)',
        minHeight: '100px',
      }}
    >
      {/* Ambient glow effect */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-15 blur-2xl pointer-events-none transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle, var(--color-primary), transparent)`,
        }}
      />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {title}
          </h3>
          <div style={{ color: 'var(--color-brand-600)' }}>
            {icon}
          </div>
        </div>
        <div className="flex-grow"></div>
        {subtitle ? (
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {value}
            </p>
            {subtitle}
          </div>
        ) : (
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {value}
          </p>
        )}
      </div>
    </div>
  );
});

export function DashboardPage() {
  const { data: notes, isLoading, error } = useNotes();
  const { data: aiStats, isLoading: isAIStatsLoading } = useAIStats();
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(30); // Default to 30 days
  const [selectedChatTimeRange, setSelectedChatTimeRange] = useState<number>(30); // Default to 30 days

  // Initialize colors once - they're cached after first call
  const COLORS = getThemeColors();
  const ragChartColor = getRagChartColor();
  const regularChartColor = getRegularChartColor();
  const agentChartColor = getThemeColors()[2]; // Use third color from theme for agent chats

  // Time range options in days
  const timeRangeOptions = [
    { label: '7D', days: 7 },
    { label: '30D', days: 30 },
    { label: '90D', days: 90 },
    { label: '6M', days: 180 },
    { label: '1Y', days: 365 },
    { label: '2Y', days: 730 },
  ];

  const stats = useMemo(() => {
    if (!notes) return null;
    return calculateStats(notes);
  }, [notes]);

  const chartData = useMemo(() => {
    if (!notes) return [];
    return getChartData(notes, selectedTimeRange);
  }, [notes, selectedTimeRange]);

  const modelUsageData = useMemo(() => {
    if (!aiStats?.modelUsageCounts) return [];
    return Object.entries(aiStats.modelUsageCounts).map(([name, value]) => ({
      name: formatModelName(name),
      originalName: name,
      value,
      tokens: aiStats.modelTokenUsageCounts?.[name] || 0,
    }));
  }, [aiStats]);

  // Calculate total tokens from AI stats
  const totalTokens = useMemo(() => {
    if (!aiStats?.modelTokenUsageCounts) return 0;
    return Object.values(aiStats.modelTokenUsageCounts).reduce((sum, tokens) => sum + tokens, 0);
  }, [aiStats]);

  // Group models by provider
  const modelsByProvider = useMemo(() => {
    if (!modelUsageData.length) return {};

    const grouped: Record<string, Array<{ name: string; originalName: string; value: number; tokens: number; color: string }>> = {};

    modelUsageData.forEach((entry, index) => {
      const provider = getProviderFromModelName(entry.originalName);
      if (!grouped[provider]) {
        grouped[provider] = [];
      }
      grouped[provider].push({
        ...entry,
        color: COLORS[index % COLORS.length],
      });
    });

    // Sort providers by total usage
    const sortedProviders = Object.entries(grouped).sort((a, b) => {
      const totalA = a[1].reduce((sum, m) => sum + m.value, 0);
      const totalB = b[1].reduce((sum, m) => sum + m.value, 0);
      return totalB - totalA;
    });

    // Sort models within each provider by usage
    sortedProviders.forEach(([_, models]) => {
      models.sort((a, b) => b.value - a.value);
    });

    return Object.fromEntries(sortedProviders);
  }, [modelUsageData, COLORS]);

  const chatUsageChartData = useMemo(() => {
    if (!aiStats?.dailyRagConversationCounts || !aiStats?.dailyNonRagConversationCounts || !aiStats?.dailyAgentConversationCounts) return [];

    return getChatUsageChartData(
      aiStats.dailyRagConversationCounts,
      aiStats.dailyNonRagConversationCounts,
      aiStats.dailyAgentConversationCounts,
      selectedChatTimeRange
    );
  }, [aiStats, selectedChatTimeRange]);

  // Stats configuration
  const statsConfig = useMemo(() => {
    const configs: Array<{
      title: string;
      value: string | number;
      icon: React.ReactNode;
      subtitle?: React.ReactNode;
      show: boolean;
    }> = [
        {
          title: 'Total Notes',
          value: stats?.totalNotes || 0,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          show: true,
        },
        {
          title: 'Notes Created This Week',
          value: stats?.notesCreatedThisWeek || 0,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          show: true,
        },
        {
          title: 'Notes Created This Month',
          value: stats?.notesCreatedThisMonth || 0,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          show: true,
        },
        {
          title: 'Notes Updated This Week',
          value: stats?.notesUpdatedThisWeek || 0,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ),
          show: true,
        },
        {
          title: 'Total Conversations',
          value: aiStats?.totalConversations || 0,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
          show: !!aiStats,
        },
        {
          title: 'RAG-Enhanced Conversations',
          value: aiStats?.ragConversationsCount || 0,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
          subtitle: aiStats && aiStats.totalConversations > 0 ? (
            <p className="text-[10px] whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
              <span className="font-bold text-[15px]" style={{ color: 'var(--color-brand-600)' }}>
                {((aiStats.ragConversationsCount / aiStats.totalConversations) * 100).toFixed(0)}%
              </span>
              {' '}of total
            </p>
          ) : undefined,
          show: !!aiStats,
        },
        {
          title: 'Agent Conversations',
          value: aiStats?.agentConversationsCount || 0,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ),
          subtitle: aiStats && aiStats.totalConversations > 0 ? (
            <p className="text-[10px] whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
              <span className="font-bold text-[15px]" style={{ color: 'var(--color-brand-600)' }}>
                {((aiStats.agentConversationsCount / aiStats.totalConversations) * 100).toFixed(0)}%
              </span>
              {' '}of total
            </p>
          ) : undefined,
          show: !!aiStats,
        },
        {
          title: 'Total Messages',
          value: aiStats?.totalMessages || 0,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
          show: !!aiStats,
        },
        {
          title: 'Total Tokens Used',
          value: `${formatTokenCount(totalTokens)} tokens`,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
          show: !!aiStats,
        },
      ];

    return configs;
  }, [stats, aiStats, totalTokens]);

  if (error) {
    return (
      <div
        className="rounded-3xl border p-6 text-center shadow-sm"
        style={{
          backgroundColor: 'var(--color-error-light)',
          borderColor: 'var(--color-error-border)',
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <svg className="h-5 w-5" style={{ color: 'var(--color-error-text)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-base font-semibold" style={{ color: 'var(--color-error-text)' }}>
            Error: {error instanceof Error ? error.message : 'Failed to load dashboard data'}
          </p>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-error-text-light)' }}>
          Please check that the backend server is running and accessible
        </p>
      </div>
    );
  }

  if (isLoading || isAIStatsLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <LoadingSpinner message="Loading dashboard..." />
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="h-8 w-8" style={{ color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
        title="No notes yet"
        description="Start capturing your thoughts and ideas by creating your first note to see dashboard statistics!"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Aggregated Stats Cards - Notes & AI Usage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {statsConfig.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            subtitle={stat.subtitle}
            show={stat.show}
          />
        ))}
      </div>

      {/* Charts Section - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Section - Notes Created Over Time */}
        <div
          className="rounded-3xl border p-6 backdrop-blur-md relative overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-card)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-lg), 0 0 60px -20px var(--color-primary-alpha)',
          }}
        >
          {/* Ambient glow effect */}
          <div
            className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none transition-opacity duration-1000"
            style={{
              background: `radial-gradient(circle, var(--color-primary), transparent)`,
            }}
          />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" style={{ color: 'var(--color-brand-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Notes Created Over Time
                </h2>
              </div>
              {/* Time Range Filters */}
              <div className="flex items-center gap-1">
                {timeRangeOptions.map((option) => (
                  <button
                    key={option.days}
                    onClick={() => setSelectedTimeRange(option.days)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${selectedTimeRange === option.days
                      ? 'scale-105'
                      : 'hover:scale-105'
                      }`}
                    style={{
                      backgroundColor: selectedTimeRange === option.days
                        ? 'var(--color-brand-600)'
                        : 'var(--surface-elevated)',
                      color: selectedTimeRange === option.days
                        ? '#ffffff'
                        : 'var(--text-secondary)',
                      border: `1px solid ${selectedTimeRange === option.days
                        ? 'var(--color-brand-600)'
                        : 'var(--border)'}`,
                    }}
                    onMouseEnter={(e) => {
                      if (selectedTimeRange !== option.days) {
                        e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedTimeRange !== option.days) {
                        e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '12px' }}
                    angle={selectedTimeRange > 90 ? -45 : 0}
                    textAnchor={selectedTimeRange > 90 ? 'end' : 'middle'}
                    height={selectedTimeRange > 90 ? 60 : 30}
                    interval={
                      selectedTimeRange > 180
                        ? 'preserveStartEnd'
                        : selectedTimeRange === 90
                          ? 0 // Show all weekly labels for 90 days (already grouped by week, ~12-13 points)
                          : selectedTimeRange === 30
                            ? Math.max(0, Math.floor(chartData.length / 8) - 1) // Show ~8 labels for 30 days (every ~4th label)
                            : selectedTimeRange === 7
                              ? 0 // Show all labels for 7 days
                              : 0 // Default: show all
                    }
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                    labelStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-primary)', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart Section - Chat Usage Over Time */}
        {aiStats && chatUsageChartData.length > 0 && (
          <div
            className="rounded-3xl border p-6 backdrop-blur-md relative overflow-hidden"
            style={{
              backgroundColor: 'var(--surface-card)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-lg), 0 0 60px -20px var(--color-primary-alpha)',
            }}
          >
            {/* Ambient glow effect */}
            <div
              className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none transition-opacity duration-1000"
              style={{
                background: `radial-gradient(circle, var(--color-primary), transparent)`,
              }}
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5" style={{ color: 'var(--color-brand-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Chat Usage Over Time
                  </h2>
                </div>
                {/* Time Range Filters */}
                <div className="flex items-center gap-1">
                  {timeRangeOptions.map((option) => (
                    <button
                      key={option.days}
                      onClick={() => setSelectedChatTimeRange(option.days)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${selectedChatTimeRange === option.days
                        ? 'scale-105'
                        : 'hover:scale-105'
                        }`}
                      style={{
                        backgroundColor: selectedChatTimeRange === option.days
                          ? 'var(--color-brand-600)'
                          : 'var(--surface-elevated)',
                        color: selectedChatTimeRange === option.days
                          ? '#ffffff'
                          : 'var(--text-secondary)',
                        border: `1px solid ${selectedChatTimeRange === option.days
                          ? 'var(--color-brand-600)'
                          : 'var(--border)'}`,
                      }}
                      onMouseEnter={(e) => {
                        if (selectedChatTimeRange !== option.days) {
                          e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedChatTimeRange !== option.days) {
                          e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chatUsageChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      stroke="var(--text-secondary)"
                      style={{ fontSize: '12px' }}
                      angle={selectedChatTimeRange > 90 ? -45 : 0}
                      textAnchor={selectedChatTimeRange > 90 ? 'end' : 'middle'}
                      height={selectedChatTimeRange > 90 ? 60 : 30}
                      interval={
                        selectedChatTimeRange > 180
                          ? 'preserveStartEnd'
                          : selectedChatTimeRange === 90
                            ? 0 // Show all weekly labels for 90 days
                            : selectedChatTimeRange === 30
                              ? Math.max(0, Math.floor(chatUsageChartData.length / 8) - 1) // Show ~8 labels for 30 days
                              : selectedChatTimeRange === 7
                                ? 0 // Show all labels for 7 days
                                : 0 // Default: show all
                      }
                    />
                    <YAxis
                      stroke="var(--text-secondary)"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                      }}
                      labelStyle={{ color: 'var(--text-primary)' }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          ragChats: 'RAG-Enhanced Chats',
                          regularChats: 'Regular Chats',
                          agentChats: 'Agent Chats',
                        };
                        return [`${value}`, labels[name] || name];
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      iconType="line"
                      formatter={(value) => {
                        const labels: Record<string, string> = {
                          ragChats: 'RAG-Enhanced Chats',
                          regularChats: 'Regular Chats',
                          agentChats: 'Agent Chats',
                        };
                        return (
                          <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                            {labels[value] || value}
                          </span>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ragChats"
                      stroke={ragChartColor}
                      strokeWidth={2}
                      dot={{ fill: ragChartColor, r: 4 }}
                      activeDot={{ r: 6 }}
                      name="ragChats"
                    />
                    <Line
                      type="monotone"
                      dataKey="regularChats"
                      stroke={regularChartColor}
                      strokeWidth={2}
                      dot={{ fill: regularChartColor, r: 4 }}
                      activeDot={{ r: 6 }}
                      name="regularChats"
                    />
                    <Line
                      type="monotone"
                      dataKey="agentChats"
                      stroke={agentChartColor}
                      strokeWidth={2}
                      dot={{ fill: agentChartColor, r: 4 }}
                      activeDot={{ r: 6 }}
                      name="agentChats"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Stats Section - Detailed Charts */}
      {aiStats && (
        <div className="space-y-4">
          {/* Model Usage Chart */}
          {modelUsageData.length > 0 && (
            <div
              className="rounded-3xl border p-6 backdrop-blur-md relative overflow-hidden"
              style={{
                backgroundColor: 'var(--surface-card)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--shadow-lg), 0 0 60px -20px var(--color-primary-alpha)',
              }}
            >
              {/* Ambient glow effect */}
              <div
                className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none transition-opacity duration-1000"
                style={{
                  background: `radial-gradient(circle, var(--color-primary), transparent)`,
                }}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <svg className="h-5 w-5" style={{ color: 'var(--color-brand-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Model Usage Distribution
                  </h3>
                </div>
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Models by Provider - Left Col */}
                    <div className="lg:col-span-1 h-74">
                      <div
                        className="h-full overflow-y-auto rounded-lg p-4 [&::-webkit-scrollbar]:w-0.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--border)] [&::-webkit-scrollbar-thumb]:hover:bg-[color:var(--text-secondary)]"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          border: '1px solid var(--border)',
                          scrollbarWidth: 'thin',
                          scrollbarColor: 'var(--border) transparent',
                        }}
                      >
                        <div className="space-y-4">
                          {Object.entries(modelsByProvider).map(([provider, models]) => {
                            const totalUsage = models.reduce((sum, m) => sum + m.value, 0);
                            return (
                              <div key={provider} className="space-y-2">
                                <h4
                                  className="text-sm font-semibold mb-2 pb-1 border-b"
                                  style={{
                                    color: 'var(--text-primary)',
                                    borderColor: 'var(--border)',
                                  }}
                                >
                                  {provider}
                                  <span
                                    className="ml-2 text-xs font-normal"
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    ({totalUsage} msgs)
                                  </span>
                                </h4>
                                <div className="space-y-1.5">
                                  {models.map((entry, index) => (
                                    <div
                                      key={`${provider}-${index}`}
                                      className="flex items-center gap-2 text-xs"
                                      style={{ color: 'var(--text-primary)' }}
                                    >
                                      <div
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: entry.color }}
                                      />
                                      <span className="truncate flex-1" title={entry.name}>
                                        {entry.name}
                                      </span>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span
                                          className="text-xs"
                                          style={{ color: 'var(--text-secondary)' }}
                                          title={`${entry.value} conversations`}
                                        >
                                          {entry.value} msgs
                                        </span>
                                        {entry.tokens > 0 && (
                                          <span
                                            className="text-[10px] px-1.5 py-0.5 rounded-full"
                                            style={{
                                              backgroundColor: 'var(--surface-hover)',
                                              color: 'var(--text-tertiary)'
                                            }}
                                            title={`${entry.tokens.toLocaleString()} tokens`}
                                          >
                                            {formatTokenCount(entry.tokens)} tokens
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Charts - Right 2 Cols */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 h-64">
                      {/* Pie Chart - Conversations */}
                      <div className="flex flex-col h-full">
                        <h4 className="text-sm font-medium text-center mb-2" style={{ color: 'var(--text-secondary)' }}>
                          By Conversation
                        </h4>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                              <Pie
                                data={modelUsageData.map(({ name, value }) => ({ name, value }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ percent }) => {
                                  if (percent < 0.05) return ''; // Hide labels for small slices
                                  return `${(percent * 100).toFixed(0)}%`;
                                }}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                paddingAngle={2}
                              >
                                {modelUsageData.map((_entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                    className="transition-opacity hover:opacity-80"
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'var(--surface-elevated)',
                                  borderColor: 'var(--border)',
                                  borderRadius: '8px',
                                  color: 'var(--text-primary)',
                                  boxShadow: 'var(--shadow-lg)',
                                }}
                                formatter={(value: number) => [`${value} uses`, 'Count']}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Pie Chart - Token Usage */}
                      <div className="flex flex-col h-full">
                        <h4 className="text-sm font-medium text-center mb-2" style={{ color: 'var(--text-secondary)' }}>
                          By Token Usage
                        </h4>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                              <Pie
                                data={modelUsageData
                                  .filter(d => d.tokens > 0)
                                  .map(({ name, tokens }) => ({ name, value: tokens }))
                                }
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ percent }) => {
                                  if (percent < 0.05) return ''; // Hide labels for small slices
                                  return `${(percent * 100).toFixed(0)}%`;
                                }}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                paddingAngle={2}
                              >
                                {modelUsageData
                                  .filter(d => d.tokens > 0)
                                  .map((_entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={COLORS[index % COLORS.length]}
                                      className="transition-opacity hover:opacity-80"
                                    />
                                  ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'var(--surface-elevated)',
                                  borderColor: 'var(--border)',
                                  borderRadius: '8px',
                                  color: 'var(--text-primary)',
                                  boxShadow: 'var(--shadow-lg)',
                                }}
                                formatter={(value: number) => [`${value.toLocaleString()} tokens`, 'Usage']}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

