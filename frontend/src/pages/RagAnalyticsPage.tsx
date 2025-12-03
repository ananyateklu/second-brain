/**
 * RAG Analytics Page
 * Dashboard for analyzing RAG performance, user feedback, and identifying areas for improvement
 * Modern glassmorphism design with elegant animations and tabbed navigation
 */

import { useState, useMemo } from 'react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import {
  useRagPerformanceStats,
  useRagQueryLogs,
  useTopicAnalytics,
} from '../features/rag/hooks/use-rag-analytics';
import {
  AnalyticsTabBar,
  PerformanceSection,
  TopicsSection,
  QueryLogsSection,
  type TabType,
} from '../features/rag/components';

// Time range options for filtering
const TIME_RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'All time', days: null },
];

export function RagAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('performance');
  const [selectedTimeRange, setSelectedTimeRange] = useState<number | null>(30);
  const [feedbackOnly, setFeedbackOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Calculate the since date based on selected time range
  const sinceDate = useMemo(() => {
    if (selectedTimeRange === null) return undefined;
    const date = new Date();
    date.setDate(date.getDate() - selectedTimeRange);
    return date;
  }, [selectedTimeRange]);

  // Fetch data
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useRagPerformanceStats(sinceDate);

  const {
    data: logsResponse,
    isLoading: logsLoading,
    error: logsError,
  } = useRagQueryLogs(page, pageSize, sinceDate, feedbackOnly);

  const {
    data: topicData,
    isLoading: topicsLoading,
  } = useTopicAnalytics(!!stats && stats.totalQueries > 0);

  const error = statsError || logsError;

  if (error) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div
          className="rounded-2xl p-6 text-center backdrop-blur-md max-w-md"
          style={{
            backgroundColor: 'var(--color-error-light)',
            border: '1px solid var(--color-error-border)',
            boxShadow: '0 0 40px -15px rgba(239, 68, 68, 0.3)',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--color-error)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p
              className="text-base font-semibold"
              style={{ color: 'var(--color-error)' }}
            >
              Error loading analytics
            </p>
          </div>
          <p
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {error instanceof Error ? error.message : 'Failed to load RAG analytics data'}
          </p>
        </div>
      </div>
    );
  }

  if (statsLoading && !stats) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--background)' }}
      >
        <LoadingSpinner message="Loading RAG analytics..." />
      </div>
    );
  }

  if (!stats || stats.totalQueries === 0) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <EmptyState
          icon={
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--color-primary)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
          title="No RAG queries yet"
          description="Start using RAG-enhanced chat to see analytics. Enable RAG in a conversation and ask questions about your notes."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex-shrink-0 pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                RAG Analytics
              </h1>
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Monitor retrieval performance and user satisfaction
              </p>
            </div>

            {/* Tab Bar */}
            <AnalyticsTabBar activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Time Range Selector */}
          <div
            className="flex items-center p-1 rounded-xl backdrop-blur-md"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            {TIME_RANGES.map((range) => (
              <button
                key={range.label}
                onClick={() => {
                  setSelectedTimeRange(range.days);
                  setPage(1);
                }}
                className="px-4 py-2 text-sm rounded-lg transition-all duration-200"
                style={{
                  backgroundColor: selectedTimeRange === range.days
                    ? 'var(--surface-card)'
                    : 'transparent',
                  color: selectedTimeRange === range.days
                    ? 'var(--text-primary)'
                    : 'var(--text-tertiary)',
                  fontWeight: selectedTimeRange === range.days ? 600 : 400,
                  boxShadow: selectedTimeRange === range.days
                    ? 'var(--shadow-sm)'
                    : 'none',
                }}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content - Full Screen */}
      <div className="flex-1 overflow-auto">
        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="pt-4 animate-in fade-in duration-300">
            <PerformanceSection stats={stats} />
          </div>
        )}

        {/* Topics Tab */}
        {activeTab === 'topics' && (
          <div className="pt-4 animate-in fade-in duration-300">
            <TopicsSection
              topicData={topicData}
              topicsLoading={topicsLoading}
            />
          </div>
        )}

        {/* Query Logs Tab */}
        {activeTab === 'logs' && (
          <div className="pt-4 animate-in fade-in duration-300">
            <QueryLogsSection
              logsResponse={logsResponse}
              logsLoading={logsLoading}
              page={page}
              pageSize={pageSize}
              feedbackOnly={feedbackOnly}
              setFeedbackOnly={setFeedbackOnly}
              setPage={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
