/**
 * RAG Analytics Page
 * Dashboard for analyzing RAG performance, user feedback, and identifying areas for improvement
 * Modern glassmorphism design with elegant animations
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
  RagStatsCards,
  ScoreCorrelationCard,
  QueryLogsTable,
  TopicDistributionCard,
} from '../features/rag/components';

// Time range options for filtering
const TIME_RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'All time', days: null },
];

// Feedback Summary Card Component
function FeedbackSummaryCard({ stats }: { stats: { totalQueries: number; queriesWithFeedback: number; positiveFeedback: number; negativeFeedback: number } }) {
  return (
    <div
      className="rounded-2xl p-5 transition-all duration-200 hover:scale-[1.01] backdrop-blur-md relative overflow-hidden group"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg), 0 0 40px -15px var(--color-primary-alpha)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-15 blur-3xl pointer-events-none transition-opacity duration-500 group-hover:opacity-25"
        style={{
          background: 'radial-gradient(circle, var(--color-brand-400), transparent)',
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="p-2.5 rounded-xl"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)',
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--color-brand-400)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          <h3
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Feedback Summary
          </h3>
        </div>

        <div className="space-y-4">
          {/* Positive Feedback */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: 'var(--text-secondary)' }}>Positive Feedback</span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: 'var(--color-brand-400)' }}
              >
                {stats.positiveFeedback}
              </span>
            </div>
            <div
              className="h-2.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: stats.queriesWithFeedback > 0
                    ? `${(stats.positiveFeedback / stats.queriesWithFeedback) * 100}%`
                    : '0%',
                  background: 'linear-gradient(90deg, var(--color-brand-500), var(--color-brand-400))',
                }}
              />
            </div>
          </div>

          {/* Negative Feedback */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: 'var(--text-secondary)' }}>Negative Feedback</span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: 'var(--color-error)' }}
              >
                {stats.negativeFeedback}
              </span>
            </div>
            <div
              className="h-2.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: stats.queriesWithFeedback > 0
                    ? `${(stats.negativeFeedback / stats.queriesWithFeedback) * 100}%`
                    : '0%',
                  background: 'linear-gradient(90deg, var(--color-error), #f87171)',
                }}
              />
            </div>
          </div>

          {/* No Feedback */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: 'var(--text-secondary)' }}>Awaiting Feedback</span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {stats.totalQueries - stats.queriesWithFeedback}
              </span>
            </div>
            <div
              className="h-2.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${((stats.totalQueries - stats.queriesWithFeedback) / stats.totalQueries) * 100}%`,
                  backgroundColor: 'var(--text-tertiary)',
                  opacity: 0.4,
                }}
              />
            </div>
          </div>
        </div>

        <div
          className="mt-5 pt-4 border-t text-xs leading-relaxed"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-tertiary)'
          }}
        >
          <p>
            Collecting more feedback helps identify problem areas. Consider prompting users
            to rate responses to build a meaningful dataset.
          </p>
        </div>
      </div>
    </div>
  );
}

export function RagAnalyticsPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<number | null>(30);
  const [feedbackOnly, setFeedbackOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

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
      <div className="p-6">
        <div
          className="rounded-2xl p-6 text-center backdrop-blur-md"
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
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: 'var(--background)' }}
      >
        <LoadingSpinner message="Loading RAG analytics..." />
      </div>
    );
  }

  if (!stats || stats.totalQueries === 0) {
    return (
      <div className="p-6">
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            Monitor retrieval performance and user satisfaction to optimize your knowledge base
          </p>
        </div>

        {/* Time Range Selector - Elegant Pill Design */}
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

      {/* Stats Cards */}
      <RagStatsCards stats={stats} />

      {/* Charts Section - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScoreCorrelationCard stats={stats} />
        <TopicDistributionCard topicData={topicData} isLoading={topicsLoading} />
      </div>

      {/* Charts Section - Row 2: Feedback Summary */}
      <FeedbackSummaryCard stats={stats} />

      {/* Query Logs Table */}
      <div>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div
              className="relative w-5 h-5 rounded-md transition-all duration-200"
              style={{
                backgroundColor: feedbackOnly ? 'var(--color-brand-500)' : 'var(--surface-elevated)',
                border: feedbackOnly ? 'none' : '1px solid var(--border)',
              }}
            >
              <input
                type="checkbox"
                checked={feedbackOnly}
                onChange={(e) => {
                  setFeedbackOnly(e.target.checked);
                  setPage(1);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {feedbackOnly && (
                <svg
                  className="absolute inset-0 w-5 h-5 p-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="white"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span
              className="text-sm transition-colors duration-200"
              style={{ color: feedbackOnly ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              Show only queries with feedback
            </span>
          </label>
        </div>

        <QueryLogsTable
          logs={logsResponse?.logs ?? []}
          totalCount={logsResponse?.totalCount ?? 0}
          page={page}
          pageSize={pageSize}
          totalPages={logsResponse?.totalPages ?? 1}
          onPageChange={setPage}
          isLoading={logsLoading}
        />
      </div>
    </div>
  );
}
