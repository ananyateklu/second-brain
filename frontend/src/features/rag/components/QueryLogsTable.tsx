/**
 * Paginated table for RAG query logs
 * Modern glassmorphism design with elegant row interactions
 */

import { useState, memo, Fragment } from 'react';
import type { RagQueryLog, RagFeedbackType } from '../../../types/rag';

interface QueryLogsTableProps {
  logs: RagQueryLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  feedbackOnly: boolean;
  setFeedbackOnly: (value: boolean) => void;
}

const FeedbackBadge = memo(({ feedback }: { feedback: RagFeedbackType | null }) => {
  if (!feedback) {
    return (
      <span
        className="text-xs px-2.5 py-1 rounded-full font-medium"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          color: 'var(--text-tertiary)',
        }}
      >
        No feedback
      </span>
    );
  }

  const isPositive = feedback === 'thumbs_up';
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1"
      style={{
        backgroundColor: isPositive
          ? 'color-mix(in srgb, var(--color-brand-400) 15%, transparent)'
          : 'color-mix(in srgb, var(--color-error) 15%, transparent)',
        color: isPositive ? 'var(--color-brand-400)' : 'var(--color-error)',
      }}
    >
      {isPositive ? '👍' : '👎'} {isPositive ? 'Helpful' : 'Not helpful'}
    </span>
  );
});

function formatTime(ms: number | null): string {
  if (ms === null) return '-';
  if (ms > 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateQuery(query: string, maxLength = 60): string {
  if (query.length <= maxLength) return query;
  return query.substring(0, maxLength) + '...';
}

const FeatureBadge = memo(({ label }: { label: string }) => {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-md font-medium"
      style={{
        backgroundColor: 'var(--surface-card)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border)',
      }}
    >
      {label}
    </span>
  );
});

export const QueryLogsTable = memo(({
  logs,
  totalCount,
  page,
  pageSize,
  totalPages,
  onPageChange,
  isLoading,
  feedbackOnly,
  setFeedbackOnly,
}: QueryLogsTableProps) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  return (
    <div
      className="rounded-2xl backdrop-blur-md relative overflow-hidden flex flex-col h-full"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg), 0 0 40px -15px var(--color-primary-alpha)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--color-brand-400), transparent)',
        }}
      />

      {/* Header */}
      <div
        className="px-5 py-2 border-b flex items-center justify-between relative z-10 flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl"
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
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </div>
          <div>
            <h3
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Query Logs
            </h3>
            <span
              className="text-xs tabular-nums"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {totalCount.toLocaleString()} total queries
            </span>
          </div>
        </div>

        {/* Feedback Filter Checkbox */}
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
                onPageChange(1);
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
            className="text-sm transition-colors duration-200 font-medium"
            style={{ color: feedbackOnly ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            Show only queries with feedback
          </span>
        </label>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden relative z-10 flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full">
            <thead className="sticky top-0 z-20">
              <tr>
                <th
                  className="px-4 py-1 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--surface-elevated)',
                  }}
                >
                  Query
                </th>
                <th
                  className="px-3 py-1 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--surface-elevated)',
                  }}
                >
                  Time
                </th>
                <th
                  className="px-3 py-1 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--surface-elevated)',
                  }}
                >
                  Results
                </th>
                <th
                  className="px-3 py-1 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--surface-elevated)',
                  }}
                >
                  Top Score
                </th>
                <th
                  className="px-3 py-1 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--surface-elevated)',
                  }}
                >
                  Feedback
                </th>
                <th
                  className="px-4 py-1 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--surface-elevated)',
                  }}
                >
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div
                        className="w-8 h-8 border-2 rounded-full animate-spin"
                        style={{
                          borderColor: 'var(--border)',
                          borderTopColor: 'var(--color-brand-400)',
                        }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Loading query logs...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center"
                  >
                    <div
                      className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: 'var(--surface-elevated)' }}
                    >
                      <svg
                        className="w-6 h-6 opacity-50"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                    <p
                      className="font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      No query logs found
                    </p>
                    <p
                      className="text-sm mt-1"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Queries will appear here once RAG is used
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <Fragment key={log.id}>
                    <tr
                      className="cursor-pointer transition-colors duration-150"
                      style={{
                        borderTop: index > 0 ? '1px solid var(--border)' : undefined,
                        backgroundColor: expandedRow === log.id
                          ? 'color-mix(in srgb, var(--surface-elevated) 50%, transparent)'
                          : 'transparent',
                      }}
                      onClick={() => { setExpandedRow(expandedRow === log.id ? null : log.id); }}
                      onMouseEnter={(e) => {
                        if (expandedRow !== log.id) {
                          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--surface-elevated) 30%, transparent)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (expandedRow !== log.id) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <td className="px-4 py-1.5">
                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{ color: 'var(--text-primary)' }}
                            title={log.query}
                          >
                            {truncateQuery(log.query)}
                          </p>
                          {log.topicLabel && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-medium"
                              style={{
                                backgroundColor: 'color-mix(in srgb, var(--color-brand-400) 15%, transparent)',
                                color: 'var(--color-brand-400)',
                              }}
                            >
                              {log.topicLabel}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className="px-3 py-1.5 text-sm font-mono tabular-nums"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {formatTime(log.totalTimeMs)}
                      </td>
                      <td
                        className="px-3 py-1.5 text-sm tabular-nums"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {log.finalCount ?? '-'}
                      </td>
                      <td
                        className="px-3 py-1.5 text-sm font-mono tabular-nums"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {log.topCosineScore?.toFixed(3) ?? '-'}
                      </td>
                      <td className="px-3 py-1.5">
                        <FeedbackBadge feedback={log.userFeedback} />
                      </td>
                      <td
                        className="px-4 py-1.5 text-sm"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {expandedRow === log.id && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-2.5"
                          style={{
                            backgroundColor: 'var(--surface-elevated)',
                            borderTop: '1px solid var(--border)',
                          }}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 text-sm">
                            <div
                              className="p-4 rounded-xl"
                              style={{
                                backgroundColor: 'var(--surface-card)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              <p
                                className="text-xs uppercase tracking-wide mb-2"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                Full Query
                              </p>
                              <p
                                className="font-medium leading-relaxed"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {log.query}
                              </p>
                            </div>

                            <div
                              className="p-4 rounded-xl"
                              style={{
                                backgroundColor: 'var(--surface-card)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              <p
                                className="text-xs uppercase tracking-wide mb-2"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                Features Enabled
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {log.hybridSearchEnabled && <FeatureBadge label="Hybrid" />}
                                {log.hyDEEnabled && <FeatureBadge label="HyDE" />}
                                {log.multiQueryEnabled && <FeatureBadge label="Multi-Query" />}
                                {log.rerankingEnabled && <FeatureBadge label="Reranking" />}
                                {!log.hybridSearchEnabled && !log.hyDEEnabled && !log.multiQueryEnabled && !log.rerankingEnabled && (
                                  <span style={{ color: 'var(--text-tertiary)' }}>Basic search only</span>
                                )}
                              </div>
                            </div>

                            <div
                              className="p-4 rounded-xl"
                              style={{
                                backgroundColor: 'var(--surface-card)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              <p
                                className="text-xs uppercase tracking-wide mb-2"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                Timing Breakdown
                              </p>
                              <div
                                className="space-y-1.5 font-mono text-xs"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                <div className="flex justify-between">
                                  <span>Embedding:</span>
                                  <span className="tabular-nums">{formatTime(log.queryEmbeddingTimeMs)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Search:</span>
                                  <span className="tabular-nums">{formatTime(log.vectorSearchTimeMs)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Rerank:</span>
                                  <span className="tabular-nums">{formatTime(log.rerankTimeMs)}</span>
                                </div>
                              </div>
                            </div>

                            {log.feedbackCategory && (
                              <div
                                className="p-4 rounded-xl"
                                style={{
                                  backgroundColor: 'var(--surface-card)',
                                  border: '1px solid var(--border)',
                                }}
                              >
                                <p
                                  className="text-xs uppercase tracking-wide mb-2"
                                  style={{ color: 'var(--text-tertiary)' }}
                                >
                                  Feedback Details
                                </p>
                                <p style={{ color: 'var(--text-secondary)' }}>
                                  Category: <span style={{ color: 'var(--text-primary)' }}>{log.feedbackCategory}</span>
                                </p>
                                {log.feedbackComment && (
                                  <p
                                    className="mt-2 text-xs italic"
                                    style={{ color: 'var(--text-tertiary)' }}
                                  >
                                    "{log.feedbackComment}"
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="px-5 py-2 border-t flex items-center justify-between relative z-10 flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <p
            className="text-sm tabular-nums"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Showing <span style={{ color: 'var(--text-secondary)' }}>{((page - 1) * pageSize) + 1}</span> to <span style={{ color: 'var(--text-secondary)' }}>{Math.min(page * pageSize, totalCount)}</span> of <span style={{ color: 'var(--text-secondary)' }}>{totalCount}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { onPageChange(page - 1); }}
              disabled={page <= 1}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-[1px]"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                color: page <= 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              ← Previous
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => { onPageChange(pageNum); }}
                    className="w-9 h-9 text-sm font-medium rounded-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-[1px]"
                    style={{
                      backgroundColor: page === pageNum ? 'var(--color-brand-500)' : 'transparent',
                      color: page === pageNum ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => { onPageChange(page + 1); }}
              disabled={page >= totalPages}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-[1px]"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                color: page >= totalPages ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
