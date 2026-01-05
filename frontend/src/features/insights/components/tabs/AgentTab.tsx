/**
 * Agent Tab
 * Analytics and statistics for AI agent usage and tool execution
 */

import { memo, useMemo, CSSProperties } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { useToolCallAnalytics, useAIStats } from '../../../stats/hooks/use-stats';
import { statsService } from '../../../../services';
import { StatCard } from '../../../dashboard/components/StatCard';

// Detect if running in Tauri (WebKit)
const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
};

// Chart colors
const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FF6B6B', '#4ECDC4', '#45B7D1'];
const SUCCESS_COLOR = '#82ca9d';
const FAILURE_COLOR = '#FF6B6B';

// Skeleton component for loading state
const AgentTabSkeleton = memo(function AgentTabSkeleton() {
  return (
    <div className="space-y-6 p-4 animate-pulse">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
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

// Empty state component
const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 p-4">
      <svg className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-tertiary)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
      <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No Agent Activity Yet</h3>
      <p className="text-center max-w-md" style={{ color: 'var(--text-secondary)' }}>
        Start using AI agents with tool capabilities to see analytics here. Agent tools include note management, web search, and more.
      </p>
    </div>
  );
});

export const AgentTab = memo(function AgentTab() {
  const { data: toolStats, isLoading: toolsLoading, error: toolsError } = useToolCallAnalytics({ daysBack: 30 });
  const { data: aiStats, isLoading: aiStatsLoading } = useAIStats();
  const isWebKit = useMemo(() => isTauri(), []);

  const isLoading = toolsLoading || aiStatsLoading;

  // Convert daily tool calls to chart data
  const dailyToolCallsData = useMemo(() => {
    if (!toolStats?.dailyToolCalls) return [];
    return statsService.convertToolCallsToChartData(toolStats.dailyToolCalls, 30);
  }, [toolStats]);

  // Prepare tool usage breakdown for pie chart
  const toolUsagePieData = useMemo(() => {
    if (!toolStats?.toolUsageByName) return [];
    return toolStats.toolUsageByName.slice(0, 8).map((tool, index) => ({
      name: tool.toolName,
      value: tool.callCount,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [toolStats]);

  // Tool usage trend
  const toolCallTrend = useMemo(() => {
    if (!toolStats?.dailyToolCalls) return { current: 0, previous: 0, percentageChange: 0 };
    return statsService.getToolCallTrend(toolStats.dailyToolCalls);
  }, [toolStats]);

  // Hourly distribution for bar chart
  const hourlyData = useMemo(() => {
    if (!toolStats?.hourlyDistribution) return [];
    return Object.entries(toolStats.hourlyDistribution)
      .map(([hour, count]) => ({
        hour: `${hour.padStart(2, '0')}:00`,
        calls: count,
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }, [toolStats]);

  // Card container styles - frosted glass with subtle shadow
  const cardStyles = useMemo<CSSProperties>(() => ({
    backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
    borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  }), []);

  if (isLoading) {
    return <AgentTabSkeleton />;
  }

  if (toolsError) {
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
              Failed to load agent analytics
            </p>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {toolsError instanceof Error ? toolsError.message : 'Please check your connection and try again'}
          </p>
        </div>
      </div>
    );
  }

  // Show empty state if no tool calls
  if (!toolStats || toolStats.totalToolCalls === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6 p-4 animate-in fade-in duration-300">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Tool Calls"
          value={toolStats.totalToolCalls.toLocaleString()}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          subtitle={
            toolCallTrend.percentageChange !== 0 && (
              <span
                className={`text-xs font-medium ${toolCallTrend.percentageChange > 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {toolCallTrend.percentageChange > 0 ? '+' : ''}{toolCallTrend.percentageChange.toFixed(1)}% vs last week
              </span>
            )
          }
        />
        <StatCard
          title="Success Rate"
          value={`${toolStats.successRate.toFixed(1)}%`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          subtitle={
            <span
              className={`text-xs font-medium ${toolStats.successRate >= 95 ? 'text-green-500' : toolStats.successRate >= 80 ? 'text-yellow-500' : 'text-red-500'}`}
            >
              {toolStats.successRate >= 95 ? 'Excellent' : toolStats.successRate >= 80 ? 'Good' : 'Needs attention'}
            </span>
          }
        />
        <StatCard
          title="Avg Execution Time"
          value={`${toolStats.averageExecutionTimeMs.toFixed(0)}ms`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Agent Conversations"
          value={aiStats?.agentConversationsCount.toLocaleString() || '0'}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082" />
            </svg>
          }
        />
      </div>

      {/* Tool Calls Over Time, Tool Usage Breakdown, and Hourly Distribution - Inline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tool Calls Over Time */}
        {dailyToolCallsData.length > 0 && (
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Tool Calls Over Time
                </h3>
              </div>

              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={dailyToolCallsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '9px' }}
                    interval={Math.max(0, Math.floor(dailyToolCallsData.length / 5) - 1)}
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
                    formatter={(value: number) => [`${value} calls`, 'Tool Calls']}
                    isAnimationActive={!isWebKit}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Tool Calls"
                    stroke={CHART_COLORS[0]}
                    strokeWidth={2}
                    dot={false}
                    animationDuration={isWebKit ? 300 : 500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tool Usage Breakdown */}
        {toolUsagePieData.length > 0 && (
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
                </svg>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Tool Usage
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <ResponsiveContainer width="45%" height={140}>
                  <PieChart>
                    <Pie
                      data={toolUsagePieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={50}
                      dataKey="value"
                      paddingAngle={2}
                      animationDuration={isWebKit ? 300 : 500}
                    >
                      {toolUsagePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                  {toolUsagePieData.slice(0, 4).map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
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

        {/* Hourly Distribution */}
        {hourlyData.length > 0 && (
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Hourly Distribution
                </h3>
              </div>

              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="hour"
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '8px' }}
                    interval={3}
                    tick={{ fontSize: 8 }}
                  />
                  <YAxis stroke="var(--text-secondary)" style={{ fontSize: '9px' }} width={25} tick={{ fontSize: 9 }} />
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
                  <Bar
                    dataKey="calls"
                    fill={CHART_COLORS[0]}
                    radius={[2, 2, 0, 0]}
                    animationDuration={isWebKit ? 300 : 500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Tool Details Table */}
      {toolStats.toolUsageByName.length > 0 && (
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Tool Performance Details
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)' }}>
                    <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Tool</th>
                    <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Calls</th>
                    <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Success</th>
                    <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Failed</th>
                    <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Rate</th>
                    <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {toolStats.toolUsageByName.slice(0, 10).map((tool, index) => (
                    <tr
                      key={tool.toolName}
                      style={{ borderBottom: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)' }}
                      className="transition-colors"
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 4%, transparent)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {tool.toolName}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-2 px-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                        {tool.callCount.toLocaleString()}
                      </td>
                      <td className="text-right py-2 px-3 text-sm" style={{ color: SUCCESS_COLOR }}>
                        {tool.successCount.toLocaleString()}
                      </td>
                      <td className="text-right py-2 px-3 text-sm" style={{ color: tool.failureCount > 0 ? FAILURE_COLOR : 'var(--text-tertiary)' }}>
                        {tool.failureCount.toLocaleString()}
                      </td>
                      <td className="text-right py-2 px-3">
                        <span
                          className={`text-sm font-medium ${
                            tool.successRate >= 95 ? 'text-green-500' :
                            tool.successRate >= 80 ? 'text-yellow-500' : 'text-red-500'
                          }`}
                        >
                          {tool.successRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right py-2 px-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {tool.percentageOfTotal.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Top Errors */}
      {toolStats.topErrors && toolStats.topErrors.length > 0 && (
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
              <svg className="h-5 w-5" style={{ color: FAILURE_COLOR }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Recent Errors
              </h3>
            </div>

            <div className="space-y-3">
              {toolStats.topErrors.slice(0, 5).map((error, index) => (
                <div
                  key={`${error.toolName}-${error.errorType}-${index}`}
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {error.toolName}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(255, 107, 107, 0.2)', color: FAILURE_COLOR }}
                      >
                        {error.errorType}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {error.occurrenceCount} occurrences
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }} title={error.errorMessage}>
                    {error.errorMessage}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
