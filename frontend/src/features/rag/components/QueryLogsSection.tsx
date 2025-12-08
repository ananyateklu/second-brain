/**
 * Query Logs section for RAG Analytics
 * Displays filterable query logs table
 */

import { memo } from 'react';
import { QueryLogsTable } from './QueryLogsTable';
import type { RagQueryLog } from '../../../types/rag';

interface QueryLogsSectionProps {
  logsResponse: {
    logs: RagQueryLog[];
    totalCount: number;
    totalPages: number;
  } | undefined;
  logsLoading: boolean;
  page: number;
  pageSize: number;
  feedbackOnly: boolean;
  setFeedbackOnly: (value: boolean) => void;
  setPage: (value: number) => void;
}

export const QueryLogsSection = memo(({
  logsResponse,
  logsLoading,
  page,
  pageSize,
  feedbackOnly,
  setFeedbackOnly,
  setPage,
}: QueryLogsSectionProps) => {
  return (
    <div className="flex flex-col" style={{ height: 'calc(100% - 0.34rem)' }}>
      {/* Query Logs Table - Takes full height */}
      <div className="flex-1 min-h-0">
        <QueryLogsTable
          logs={logsResponse?.logs ?? []}
          totalCount={logsResponse?.totalCount ?? 0}
          page={page}
          pageSize={pageSize}
          totalPages={logsResponse?.totalPages ?? 1}
          onPageChange={setPage}
          isLoading={logsLoading}
          feedbackOnly={feedbackOnly}
          setFeedbackOnly={setFeedbackOnly}
        />
      </div>
    </div>
  );
});

