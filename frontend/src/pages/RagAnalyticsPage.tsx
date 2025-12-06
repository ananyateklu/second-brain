/**
 * RAG Analytics Page
 * Dashboard for analyzing RAG performance, user feedback, and identifying areas for improvement
 * Modern glassmorphism design with elegant animations and tabbed navigation
 */

import { useMemo, useEffect, useState, startTransition } from 'react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useBoundStore } from '../store/bound-store';
import {
  useRagPerformanceStats,
  useRagQueryLogs,
  useTopicAnalytics,
} from '../features/rag/hooks/use-rag-analytics';
import {
  PerformanceSection,
  TopicsSection,
  QueryLogsSection,
} from '../features/rag/components';

export function RagAnalyticsPage() {
  // Get state from store
  const activeTab = useBoundStore((state) => state.activeTab);
  const selectedTimeRange = useBoundStore((state) => state.selectedTimeRange);

  const [feedbackOnly, setFeedbackOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Reset page when time range changes
  useEffect(() => {
    startTransition(() => {
      setPage(1);
    });
  }, [selectedTimeRange]);

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
