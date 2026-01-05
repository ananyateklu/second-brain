/**
 * Overview Tab
 * Displays dashboard statistics including stat cards, charts, and model usage
 */

import { useState, useMemo, memo } from 'react';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { useDashboardData } from '../../../dashboard/hooks/use-dashboard-data';
import { useDashboardAnimations } from '../../../dashboard/hooks/use-dashboard-animations';
import {
  StatCardsGrid,
  NotesChart,
  ChatUsageChart,
  ModelUsageSection,
  DashboardSkeleton,
} from '../../../dashboard/components';

export const OverviewTab = memo(function OverviewTab() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(30);
  const [selectedChatTimeRange, setSelectedChatTimeRange] = useState<number>(30);

  const {
    isLoading,
    error,
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
  } = useDashboardData();

  // Use optimized animations - 13 stat cards is typical
  const { isReady, getSectionAnimation } = useDashboardAnimations(!isLoading && !!notes, 13);

  // Memoize chart data based on time range selections
  const chartData = useMemo(
    () => getNotesChartData(selectedTimeRange),
    [getNotesChartData, selectedTimeRange]
  );

  const chatUsageChartData = useMemo(
    () => getChatUsageData(selectedChatTimeRange),
    [getChatUsageData, selectedChatTimeRange]
  );

  // Get section animation states
  const notesChartAnimation = getSectionAnimation(0);
  const chatChartAnimation = getSectionAnimation(1);
  const modelUsageAnimation = getSectionAnimation(2);

  if (error) {
    return (
      <div
        className="rounded-2xl p-6 text-center backdrop-blur-md"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-error) 20%, transparent)',
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <svg className="h-5 w-5" style={{ color: 'var(--color-error)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-base font-semibold" style={{ color: 'var(--color-error)' }}>
            Error: {error instanceof Error ? error.message : 'Failed to load dashboard data'}
          </p>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Please check that the backend server is running and accessible
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <DashboardSkeleton />;
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
    <div className="space-y-3 pt-4 animate-in fade-in duration-300">
      {/* Aggregated Stats Cards */}
      <StatCardsGrid
        stats={stats}
        aiStats={aiStats}
        totalTokens={totalTokens}
        sessionStats={sessionStats}
      />

      {/* Charts Section - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <NotesChart
          chartData={chartData}
          selectedTimeRange={selectedTimeRange}
          onTimeRangeChange={setSelectedTimeRange}
          animationDelay={notesChartAnimation.delay}
          isAnimationReady={isReady}
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
            animationDelay={chatChartAnimation.delay}
            isAnimationReady={isReady}
          />
        )}
      </div>

      {/* Model Usage Distribution */}
      {aiStats && (
        <ModelUsageSection
          modelUsageData={modelUsageData}
          colors={colors}
          getFilteredModelUsageData={getFilteredModelUsageData}
          animationDelay={modelUsageAnimation.delay}
          isAnimationReady={isReady}
        />
      )}
    </div>
  );
});
