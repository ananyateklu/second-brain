import { useState, useMemo } from 'react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useDashboardData } from '../features/dashboard/hooks/use-dashboard-data';
import {
  StatCardsGrid,
  NotesChart,
  ChatUsageChart,
  ModelUsageSection,
} from '../features/dashboard/components';

export function DashboardPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(30);
  const [selectedChatTimeRange, setSelectedChatTimeRange] = useState<number>(30);

  const {
    isLoading,
    error,
    notes,
    stats,
    aiStats,
    totalTokens,
    modelUsageData,
    colors,
    ragChartColor,
    regularChartColor,
    agentChartColor,
    imageGenChartColor,
    getNotesChartData,
    getChatUsageData,
    getFilteredModelUsageData,
  } = useDashboardData();

  // Memoize chart data based on time range selections
  const chartData = useMemo(
    () => getNotesChartData(selectedTimeRange),
    [getNotesChartData, selectedTimeRange]
  );

  const chatUsageChartData = useMemo(
    () => getChatUsageData(selectedChatTimeRange),
    [getChatUsageData, selectedChatTimeRange]
  );

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

  if (isLoading) {
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
      {/* Aggregated Stats Cards */}
      <StatCardsGrid
        stats={stats}
        aiStats={aiStats}
        totalTokens={totalTokens}
      />

      {/* Charts Section - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NotesChart
          chartData={chartData}
          selectedTimeRange={selectedTimeRange}
          onTimeRangeChange={setSelectedTimeRange}
        />

        {aiStats && (
          <ChatUsageChart
            chatUsageChartData={chatUsageChartData}
            selectedTimeRange={selectedChatTimeRange}
            onTimeRangeChange={setSelectedChatTimeRange}
            ragChartColor={ragChartColor}
            regularChartColor={regularChartColor}
            agentChartColor={agentChartColor}
            imageGenChartColor={imageGenChartColor}
          />
        )}
      </div>

      {/* Model Usage Distribution */}
      {aiStats && (
        <ModelUsageSection
          modelUsageData={modelUsageData}
          colors={colors}
          getFilteredModelUsageData={getFilteredModelUsageData}
        />
      )}
    </div>
  );
}
