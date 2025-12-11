import { useState } from 'react';
import { useGitHubPullRequests } from '../hooks';
import type { PullRequestFilter, PullRequestSummary } from '../../../types/github';
import {
  getPullRequestStateColor,
  getPullRequestStateBgColor,
  formatRelativeTime,
  getReviewStateColor,
} from '../../../types/github';

interface GitHubPullRequestListProps {
  owner?: string;
  repo?: string;
  onSelectPR?: (pr: PullRequestSummary) => void;
  selectedPRNumber?: number;
}

export const GitHubPullRequestList = ({
  owner,
  repo,
  onSelectPR,
  selectedPRNumber,
}: GitHubPullRequestListProps) => {
  const [stateFilter, setStateFilter] = useState<PullRequestFilter>('open');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useGitHubPullRequests({
    owner,
    repo,
    state: stateFilter,
    page,
    perPage: 20,
  });

  const getCheckStatus = (pr: PullRequestSummary) => {
    if (!pr.checkRuns || pr.checkRuns.length === 0) return null;

    const hasFailure = pr.checkRuns.some(
      (c) => c.conclusion === 'failure' || c.conclusion === 'timed_out'
    );
    const hasPending = pr.checkRuns.some(
      (c) => c.status === 'in_progress' || c.status === 'queued'
    );
    const allSuccess = pr.checkRuns.every((c) => c.conclusion === 'success');

    if (hasFailure) return 'failure';
    if (hasPending) return 'pending';
    if (allSuccess) return 'success';
    return 'neutral';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-xl border"
        style={{
          backgroundColor: 'var(--error-bg)',
          borderColor: 'var(--error-border)',
          color: 'var(--error-text)',
        }}
      >
        <p className="font-medium">Failed to load pull requests</p>
        <p className="text-sm mt-1 opacity-80">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <button
          onClick={(e) => {
            e.preventDefault();
            void refetch();
          }}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['open', 'closed', 'all'] as PullRequestFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => {
              setStateFilter(filter);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              stateFilter === filter
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-surface-elevated'
            }`}
            style={{
              backgroundColor:
                stateFilter === filter ? 'var(--color-primary-alpha)' : undefined,
              color:
                stateFilter === filter
                  ? 'var(--color-primary)'
                  : 'var(--text-secondary)',
            }}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={(e) => {
            e.preventDefault();
            void refetch();
          }}
          className="p-2 rounded-lg hover:bg-surface-elevated transition-colors"
          title="Refresh"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: 'var(--text-secondary)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Pull Requests List */}
      <div className="space-y-2">
        {!data?.pullRequests || data.pullRequests.length === 0 ? (
          <div
            className="text-center py-12 rounded-xl border"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            <svg
              className="w-12 h-12 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            <p style={{ color: 'var(--text-secondary)' }}>
              No {stateFilter === 'all' ? '' : stateFilter} pull requests found
            </p>
          </div>
        ) : (
          data.pullRequests.map((pr) => (
            <button
              key={pr.number}
              onClick={() => onSelectPR?.(pr)}
              className={`w-full text-left p-4 rounded-xl border transition-all hover:scale-[1.01] ${
                selectedPRNumber === pr.number ? 'ring-2 ring-primary' : ''
              }`}
              style={{
                backgroundColor:
                  selectedPRNumber === pr.number
                    ? 'var(--surface-elevated)'
                    : 'var(--surface-card)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-start gap-3">
                {/* PR State Icon */}
                <div
                  className={`p-2 rounded-lg ${getPullRequestStateBgColor(pr.state)}`}
                >
                  {pr.state === 'merged' ? (
                    <svg
                      className={`w-5 h-5 ${getPullRequestStateColor(pr.state)}`}
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                    </svg>
                  ) : pr.state === 'open' ? (
                    <svg
                      className={`w-5 h-5 ${getPullRequestStateColor(pr.state)}`}
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M1.5 3.25a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zm5.677-.177L9.573.677A.25.25 0 0110 .854V2.5h1A2.5 2.5 0 0113.5 5v5.628a2.251 2.251 0 11-1.5 0V5a1 1 0 00-1-1h-1v1.646a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm0 9.5a.75.75 0 100 1.5.75.75 0 000-1.5zm8.25.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                  ) : (
                    <svg
                      className={`w-5 h-5 ${getPullRequestStateColor(pr.state)}`}
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M3.25 1A2.25 2.25 0 011 3.25v9.5A2.25 2.25 0 013.25 15h9.5A2.25 2.25 0 0115 12.75v-9.5A2.25 2.25 0 0112.75 1h-9.5zM3.75 9h8.5a.75.75 0 010 1.5h-8.5a.75.75 0 010-1.5z" />
                    </svg>
                  )}
                </div>

                {/* PR Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-semibold truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {pr.title}
                    </span>
                    {pr.isDraft && (
                      <span
                        className="px-2 py-0.5 text-xs rounded-full"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        Draft
                      </span>
                    )}
                  </div>

                  <div
                    className="flex items-center gap-2 mt-1 text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span>#{pr.number}</span>
                    <span>•</span>
                    <span>{pr.headBranch}</span>
                    <span>→</span>
                    <span>{pr.baseBranch}</span>
                  </div>

                  <div
                    className="flex items-center gap-3 mt-2 text-xs"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <img
                      src={pr.authorAvatarUrl}
                      alt={pr.author}
                      className="w-4 h-4 rounded-full"
                    />
                    <span>{pr.author}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(pr.updatedAt)}</span>
                    {pr.commentsCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                          {pr.commentsCount}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Labels */}
                  {pr.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {pr.labels.slice(0, 4).map((label) => (
                        <span
                          key={label.id}
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{
                            backgroundColor: `#${label.color}20`,
                            color: `#${label.color}`,
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                      {pr.labels.length > 4 && (
                        <span
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{
                            backgroundColor: 'var(--surface-elevated)',
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          +{pr.labels.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Indicators */}
                <div className="flex flex-col items-end gap-2">
                  {/* Check Status */}
                  {(() => {
                    const status = getCheckStatus(pr);
                    if (!status) return null;

                    const statusConfig = {
                      success: {
                        icon: '✓',
                        color: 'text-green-500',
                        bg: 'bg-green-500/10',
                      },
                      failure: {
                        icon: '✗',
                        color: 'text-red-500',
                        bg: 'bg-red-500/10',
                      },
                      pending: {
                        icon: '○',
                        color: 'text-yellow-500',
                        bg: 'bg-yellow-500/10',
                      },
                      neutral: {
                        icon: '−',
                        color: 'text-gray-500',
                        bg: 'bg-gray-500/10',
                      },
                    }[status];

                    return (
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${statusConfig.color} ${statusConfig.bg}`}
                      >
                        {statusConfig.icon} Checks
                      </span>
                    );
                  })()}

                  {/* Reviews */}
                  {pr.reviews && pr.reviews.length > 0 && (
                    <div className="flex -space-x-1">
                      {pr.reviews.slice(0, 3).map((review, idx) => (
                        <div
                          key={idx}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${getReviewStateColor(
                            review.state
                          )}`}
                          style={{ borderColor: 'var(--surface-card)' }}
                          title={`${review.author}: ${review.state}`}
                        >
                          <img
                            src={review.authorAvatarUrl}
                            alt={review.author}
                            className="w-full h-full rounded-full"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* File Changes */}
                  <div
                    className="flex items-center gap-2 text-xs"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <span className="text-green-500">+{pr.additions}</span>
                    <span className="text-red-500">-{pr.deletions}</span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && (data.hasMore || page > 1) && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            Previous
          </button>
          <span style={{ color: 'var(--text-secondary)' }}>Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!data.hasMore}
            className="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
