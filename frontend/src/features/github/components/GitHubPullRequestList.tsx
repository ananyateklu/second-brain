import { useState } from 'react';
import { useGitHubPullRequests } from '../hooks';
import { GitHubListSkeleton } from './GitHubListSkeleton';
import { Pagination } from '../../../components/ui/Pagination';
import type { PullRequestFilter, PullRequestSummary } from '../../../types/github';
import {
  getPullRequestStateColor,
  getPullRequestStateBgColor,
  formatRelativeTime,
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
  const perPage = 20;

  const { data, isLoading, error, refetch } = useGitHubPullRequests({
    owner,
    repo,
    state: stateFilter,
    page,
    perPage,
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
    return <GitHubListSkeleton count={5} showHeader={false} variant="default" />;
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

  const totalItems = data?.totalCount ?? 0;
  const itemsPerPage = data?.perPage ?? perPage;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  return (
    <div className="flex flex-col h-full">
      {/* Filter Tabs - Fixed at top */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-4">
        {(['open', 'closed', 'all'] as PullRequestFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => {
              setStateFilter(filter);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${stateFilter === filter
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

      {/* Pull Requests List - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 space-y-2 thin-scrollbar">
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
              className={`w-full text-left px-3 py-2 rounded-lg border transform-gpu transition-transform transition-shadow hover:-translate-y-[1px] hover:shadow-sm ${selectedPRNumber === pr.number ? 'ring-1 ring-inset ring-primary' : ''
                }`}
              style={{
                backgroundColor:
                  selectedPRNumber === pr.number
                    ? 'var(--surface-elevated)'
                    : 'var(--surface-card)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center gap-2">
                {/* PR State Icon */}
                <div
                  className={`p-1.5 rounded-md ${getPullRequestStateBgColor(pr.state)}`}
                >
                  {pr.state === 'merged' ? (
                    <svg
                      className={`w-4 h-4 ${getPullRequestStateColor(pr.state)}`}
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                    </svg>
                  ) : pr.state === 'open' ? (
                    <svg
                      className={`w-4 h-4 ${getPullRequestStateColor(pr.state)}`}
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M1.5 3.25a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zm5.677-.177L9.573.677A.25.25 0 0110 .854V2.5h1A2.5 2.5 0 0113.5 5v5.628a2.251 2.251 0 11-1.5 0V5a1 1 0 00-1-1h-1v1.646a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm0 9.5a.75.75 0 100 1.5.75.75 0 000-1.5zm8.25.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                  ) : (
                    <svg
                      className={`w-4 h-4 ${getPullRequestStateColor(pr.state)}`}
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M3.25 1A2.25 2.25 0 011 3.25v9.5A2.25 2.25 0 013.25 15h9.5A2.25 2.25 0 0115 12.75v-9.5A2.25 2.25 0 0112.75 1h-9.5zM3.75 9h8.5a.75.75 0 010 1.5h-8.5a.75.75 0 010-1.5z" />
                    </svg>
                  )}
                </div>

                {/* PR Info - Compact */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span
                    className="font-medium text-sm truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {pr.title}
                  </span>
                  {pr.isDraft && (
                    <span
                      className="px-1.5 py-0.5 text-xs rounded-full shrink-0"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      Draft
                    </span>
                  )}
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    #{pr.number}
                  </span>
                </div>

                {/* Meta info - inline */}
                <div
                  className="flex items-center gap-2 text-xs shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <span
                    className="hidden sm:inline-flex items-center gap-1 max-w-64"
                    title={`${pr.headBranch} → ${pr.baseBranch}`}
                  >
                    <span className="truncate">{pr.headBranch}</span>
                    <span className="shrink-0">→</span>
                    <span className="truncate">{pr.baseBranch}</span>
                  </span>
                  <span>{formatRelativeTime(pr.updatedAt)}</span>
                  {pr.commentsCount > 0 && (
                    <span className="flex items-center gap-0.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {pr.commentsCount}
                    </span>
                  )}
                </div>

                {/* Check Status - compact */}
                {(() => {
                  const status = getCheckStatus(pr);
                  if (!status) return null;
                  const statusConfig = {
                    success: { icon: '✓', color: 'text-green-500' },
                    failure: { icon: '✗', color: 'text-red-500' },
                    pending: { icon: '○', color: 'text-yellow-500' },
                    neutral: { icon: '−', color: 'text-gray-500' },
                  }[status];
                  return (
                    <span className={`text-xs ${statusConfig.color}`} title="Checks">
                      <span className="sr-only">Checks</span>
                      {statusConfig.icon}
                    </span>
                  );
                })()}

                {/* Labels - compact */}
                {pr.labels.length > 0 && (
                  <div className="hidden md:flex items-center gap-1 shrink-0">
                    {pr.labels.slice(0, 4).map((label) => (
                      <span
                        key={label.id}
                        className="px-1.5 py-0.5 rounded-full text-xs"
                        style={{
                          backgroundColor: `#${label.color}20`,
                          color: `#${label.color}`,
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                    {pr.labels.length > 4 && (
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        +{pr.labels.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* File Changes */}
                <div className="flex items-center gap-1 text-xs shrink-0">
                  <span className="text-green-500">+{pr.additions}</span>
                  <span className="text-red-500">-{pr.deletions}</span>
                </div>

                {/* Author */}
                <img
                  src={pr.authorAvatarUrl}
                  alt={pr.author}
                  className="w-5 h-5 rounded-full shrink-0"
                />
              </div>
            </button>
          ))
        )}
      </div>

      {/* Pagination - Fixed at bottom */}
      <div className="flex-shrink-0">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={(nextPage) => setPage(Math.min(totalPages, Math.max(1, nextPage)))}
        />
      </div>
    </div>
  );
};
