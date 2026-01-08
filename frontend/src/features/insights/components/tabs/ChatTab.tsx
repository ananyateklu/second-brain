/**
 * Chat Tab
 * Analytics and statistics for chat conversations
 */

import { memo, useMemo, CSSProperties } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useAIStats } from '../../../stats/hooks/use-stats';
import { statsService } from '../../../../services';
import { StatCard } from '../../../dashboard/components/StatCard';

// Detect if running in Tauri (WebKit)
const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
};

// Chart colors
const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FF6B6B', '#4ECDC4', '#45B7D1'];
const RAG_COLOR = '#8884d8';
const REGULAR_COLOR = '#82ca9d';
const AGENT_COLOR = '#ffc658';
const IMAGE_COLOR = '#ff7300';

// Skeleton component for loading state
const ChatTabSkeleton = memo(function ChatTabSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 animate-pulse">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border p-4 h-20"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
              borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
            }}
          >
            <div className="h-3 w-20 rounded mb-2" style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }} />
            <div className="h-6 w-16 rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }} />
          </div>
        ))}
      </div>
      {/* Chart Skeleton */}
      <div
        className="rounded-3xl border p-6 h-80"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
          borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
        }}
      >
        <div className="h-5 w-48 rounded mb-4" style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }} />
        <div className="h-48 rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }} />
      </div>
    </div>
  );
});

export const ChatTab = memo(function ChatTab() {
  const { data: stats, isLoading, error } = useAIStats();
  const isWebKit = useMemo(() => isTauri(), []);

  // Prepare chat type breakdown data
  const chatTypeData = useMemo(() => {
    if (!stats) return [];
    return statsService.convertToChartData(stats.dailyConversationCounts, 30).map((point) => {
      const date = point.date;
      return {
        date: point.label || date,
        ragChats: stats.dailyRagConversationCounts[date] || 0,
        regularChats: stats.dailyNonRagConversationCounts[date] || 0,
        agentChats: stats.dailyAgentConversationCounts[date] || 0,
        imageGenChats: stats.dailyImageGenerationConversationCounts[date] || 0,
      };
    });
  }, [stats]);

  // Provider usage pie data - convert to plain objects for recharts
  const providerPieData = useMemo(() => {
    if (!stats) return [];
    return statsService.convertProviderUsageToPieData(stats.providerUsageCounts).map(item => ({
      name: item.name,
      value: item.value,
    }));
  }, [stats]);

  // Calculate derived stats
  const avgMessagesPerConversation = useMemo(() => {
    if (!stats || stats.totalConversations === 0) return 0;
    return (stats.totalMessages / stats.totalConversations).toFixed(1);
  }, [stats]);

  const totalTokens = useMemo(() => {
    if (!stats) return 0;
    return Object.values(stats.modelTokenUsageCounts).reduce((a, b) => a + b, 0);
  }, [stats]);

  const conversationTrend = useMemo(() => {
    if (!stats) return { current: 0, previous: 0, percentageChange: 0 };
    return statsService.getConversationTrend(stats);
  }, [stats]);

  // Card container styles - frosted glass with subtle shadow
  const cardStyles = useMemo<CSSProperties>(() => ({
    backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
    borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  }), []);

  if (isLoading) {
    return <ChatTabSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-64 p-4">
        <div
          className="rounded-2xl p-6 text-center backdrop-blur-md max-w-md animate-in fade-in slide-in-from-top-2 duration-300"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-error) 20%, transparent)',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg
              className="h-5 w-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--color-error)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-base font-semibold" style={{ color: 'var(--color-error)' }}>
              Failed to load chat analytics
            </p>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {error instanceof Error ? error.message : 'Please check your connection and try again'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 animate-in fade-in duration-300">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
        <StatCard
          title="Total Conversations"
          value={stats.totalConversations.toLocaleString()}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
          subtitle={
            conversationTrend.percentageChange !== 0 && (
              <span
                className={`text-xs font-medium ${conversationTrend.percentageChange > 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {conversationTrend.percentageChange > 0 ? '+' : ''}{conversationTrend.percentageChange.toFixed(1)}% vs last week
              </span>
            )
          }
        />
        <StatCard
          title="Total Messages"
          value={stats.totalMessages.toLocaleString()}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          }
        />
        <StatCard
          title="Avg Messages/Chat"
          value={avgMessagesPerConversation}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          }
        />
        <StatCard
          title="Total Tokens"
          value={statsService.formatNumber(totalTokens)}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          title="Providers Used"
          value={Object.keys(stats.providerUsageCounts).length}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
      </div>

      {/* Chat Usage Over Time, Provider Usage, and Feature Usage - Inline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Chat Usage Over Time */}
        {chatTypeData.length > 0 && (
          <div
            className={`rounded-2xl border p-4 transition-all duration-200 ${isWebKit ? '' : 'backdrop-blur-md'}`}
            style={cardStyles}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-500) 30%, transparent)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
            }}
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-4 w-4" style={{ color: 'var(--color-brand-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Chat Usage Over Time
                </h3>
              </div>

              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chatTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '9px' }}
                    interval={Math.max(0, Math.floor(chatTypeData.length / 5) - 1)}
                    tick={{ fontSize: 9 }}
                  />
                  <YAxis stroke="var(--text-secondary)" style={{ fontSize: '9px' }} width={30} tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      backdropFilter: 'blur(20px)',
                    }}
                    labelStyle={{ color: 'var(--text-primary)' }}
                    isAnimationActive={!isWebKit}
                  />
                  <Line type="monotone" dataKey="ragChats" name="RAG" stroke={RAG_COLOR} strokeWidth={2} dot={false} animationDuration={isWebKit ? 300 : 500} />
                  <Line type="monotone" dataKey="regularChats" name="Regular" stroke={REGULAR_COLOR} strokeWidth={2} dot={false} animationDuration={isWebKit ? 300 : 500} />
                  <Line type="monotone" dataKey="agentChats" name="Agent" stroke={AGENT_COLOR} strokeWidth={2} dot={false} animationDuration={isWebKit ? 300 : 500} />
                  <Line type="monotone" dataKey="imageGenChats" name="Image" stroke={IMAGE_COLOR} strokeWidth={2} dot={false} animationDuration={isWebKit ? 300 : 500} />
                </LineChart>
              </ResponsiveContainer>
              {/* Compact Legend */}
              <div className="flex justify-center gap-3 mt-2">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: RAG_COLOR }} /><span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>RAG</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: REGULAR_COLOR }} /><span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Regular</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: AGENT_COLOR }} /><span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Agent</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: IMAGE_COLOR }} /><span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Image</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Provider Usage */}
        {providerPieData.length > 0 && (
          <div
            className={`rounded-2xl border p-4 transition-all duration-200 ${isWebKit ? '' : 'backdrop-blur-md'}`}
            style={cardStyles}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-500) 30%, transparent)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
            }}
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-4 w-4" style={{ color: 'var(--color-brand-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Provider Usage
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <ResponsiveContainer width="45%" height={140}>
                  <PieChart>
                    <Pie
                      data={providerPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={50}
                      dataKey="value"
                      paddingAngle={2}
                      animationDuration={isWebKit ? 300 : 500}
                    >
                      {providerPieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        backdropFilter: 'blur(20px)',
                      }}
                      isAnimationActive={!isWebKit}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1 overflow-hidden">
                  {providerPieData.slice(0, 4).map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                        {entry.name}
                      </span>
                      <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Usage Breakdown */}
        <div
          className={`rounded-2xl border p-4 transition-all duration-200 ${isWebKit ? '' : 'backdrop-blur-md'}`}
          style={cardStyles}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-500) 30%, transparent)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg className="h-4 w-4" style={{ color: 'var(--color-brand-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Feature Usage
              </h3>
            </div>

            <div className="space-y-3">
              {/* RAG Usage */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    RAG-Enhanced
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    {stats.ragConversationsCount} ({statsService.formatPercentage(statsService.getRagUsagePercentage(stats), 0)})
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(statsService.getRagUsagePercentage(stats), 100)}%`,
                      backgroundColor: RAG_COLOR,
                    }}
                  />
                </div>
              </div>

              {/* Agent Usage */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    Agent
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    {stats.agentConversationsCount} ({statsService.formatPercentage(statsService.getAgentUsagePercentage(stats), 0)})
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(statsService.getAgentUsagePercentage(stats), 100)}%`,
                      backgroundColor: AGENT_COLOR,
                    }}
                  />
                </div>
              </div>

              {/* Image Generation Usage */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    Image Gen
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    {stats.imageGenerationConversationsCount} ({stats.totalImagesGenerated} imgs)
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.totalConversations > 0 ? Math.min((stats.imageGenerationConversationsCount / stats.totalConversations) * 100, 100) : 0}%`,
                      backgroundColor: IMAGE_COLOR,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Usage Summary */}
      {Object.keys(stats.modelUsageCounts).length > 0 && (
        <div
          className={`rounded-3xl border p-6 transition-all duration-200 ${isWebKit ? '' : 'backdrop-blur-md'}`}
          style={cardStyles}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-500) 30%, transparent)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg className="h-5 w-5" style={{ color: 'var(--color-brand-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Top Models
              </h3>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {statsService.getTopModels(stats, 6).map((model, index) => (
                <div
                  key={model.model}
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }} title={model.model}>
                      {model.model}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--text-secondary)' }}>{model.provider}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{model.count} chats</span>
                  </div>
                  {model.tokens > 0 && (
                    <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      {statsService.formatNumber(model.tokens)} tokens
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
