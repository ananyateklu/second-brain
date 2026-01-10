/**
 * RAG Tab
 * Displays RAG performance analytics, topics, and query logs
 */

import { useMemo, useEffect, useState, startTransition, memo } from 'react';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { RagAnalyticsSkeleton } from '../../../rag/components/RagAnalyticsSkeleton';
import { useBoundStore } from '../../../../store/bound-store';
import {
  useRagPerformanceStats,
  useRagQueryLogs,
  useTopicAnalytics,
} from '../../../rag/hooks/use-rag-analytics';
import {
  PerformanceSection,
  TopicsSection,
  QueryLogsSection,
} from '../../../rag/components';
import { AnalyticsTabBar } from '../../../rag/components/AnalyticsTabBar';

export const RagTab = memo(function RagTab() {
  // Get state from insights slice for sub-tab navigation
  const ragSubTab = useBoundStore((state) => state.ragSubTab);
  const setRagSubTab = useBoundStore((state) => state.setRagSubTab);
  // Use the shared time range from RagAnalyticsSlice (synced with TimeRangeSelector)
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
      <div className="flex items-center justify-center h-64 p-4">
        <div className="rounded-2xl p-6 text-center backdrop-blur-md max-w-md animate-in fade-in slide-in-from-top-2 duration-300 insights-error">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg
              className="h-5 w-5 flex-shrink-0"
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
              Failed to load RAG analytics
            </p>
          </div>
          <p
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {error instanceof Error ? error.message : 'Please check your connection and try again'}
          </p>
        </div>
      </div>
    );
  }

  if (statsLoading && !stats) {
    return <RagAnalyticsSkeleton />;
  }

  if (!stats || stats.totalQueries === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
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
    <div className="flex flex-col pt-3 sm:pt-4 animate-in fade-in duration-300">
      {/* RAG Sub-Tab Navigation */}
      <div className="mb-3 sm:mb-4 flex justify-center md:justify-start">
        <AnalyticsTabBar activeTab={ragSubTab} onTabChange={setRagSubTab} />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto thin-scrollbar min-h-0">
        {/* Performance Sub-Tab */}
        {ragSubTab === 'performance' && (
          <div className="animate-in fade-in duration-300">
            <PerformanceSection stats={stats} />
          </div>
        )}

        {/* Topics Sub-Tab */}
        {ragSubTab === 'topics' && (
          <div className="animate-in fade-in duration-300">
            <TopicsSection
              topicData={topicData}
              topicsLoading={topicsLoading}
            />
          </div>
        )}

        {/* Query Logs Sub-Tab */}
        {ragSubTab === 'logs' && (
          <div className="h-full flex flex-col animate-in fade-in duration-300 pb-2">
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
});
