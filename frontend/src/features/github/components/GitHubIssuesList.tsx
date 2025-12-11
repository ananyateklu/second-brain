import { useState } from 'react';
import { useGitHubIssues } from '../hooks';
import type { IssueSummary, IssueFilter } from '../../../types/github';
import {
  formatRelativeTime,
  getIssueStateColor,
  getIssueStateBgColor,
} from '../../../types/github';

interface GitHubIssuesListProps {
  owner?: string;
  repo?: string;
  onSelectIssue?: (issue: IssueSummary) => void;
  selectedIssueNumber?: number;
}

export const GitHubIssuesList = ({
  owner,
  repo,
  onSelectIssue,
  selectedIssueNumber,
}: GitHubIssuesListProps) => {
  const [stateFilter, setStateFilter] = useState<IssueFilter>('open');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data, isLoading, error, refetch } = useGitHubIssues({
    owner,
    repo,
    state: stateFilter,
    page,
    perPage,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Loading issues...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'var(--status-error-bg)' }}
      >
        <p style={{ color: 'var(--status-error)' }}>
          Failed to load issues: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <button
          onClick={(e) => {
            e.preventDefault();
            void refetch();
          }}
          className="mt-2 text-sm underline"
          style={{ color: 'var(--status-error)' }}
        >
          Try again
        </button>
      </div>
    );
  }

  const issues = data?.issues || [];
  const totalCount = data?.totalCount || 0;
  const hasMore = data?.hasMore || false;

  return (
    <div className="space-y-4">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Issues
          </h2>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-secondary)',
            }}
          >
            {totalCount}
          </span>
        </div>

        {/* State Filter */}
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{ backgroundColor: 'var(--surface-elevated)' }}
        >
          {(['open', 'closed', 'all'] as IssueFilter[]).map((state) => (
            <button
              key={state}
              onClick={() => {
                setStateFilter(state);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                stateFilter === state ? 'shadow-sm' : ''
              }`}
              style={{
                backgroundColor:
                  stateFilter === state ? 'var(--surface-card)' : 'transparent',
                color:
                  stateFilter === state
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
              }}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="w-12 h-12 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p style={{ color: 'var(--text-secondary)' }}>No issues found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <IssueRow
              key={issue.number}
              issue={issue}
              isSelected={selectedIssueNumber === issue.number}
              onClick={() => onSelectIssue?.(issue)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(hasMore || page > 1) && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-secondary)',
            }}
          >
            Previous
          </button>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Page {page}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-secondary)',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

interface IssueRowProps {
  issue: IssueSummary;
  isSelected: boolean;
  onClick: () => void;
}

const IssueRow = ({ issue, isSelected, onClick }: IssueRowProps) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl cursor-pointer transition-all border ${
        isSelected ? 'ring-2 ring-primary/50' : ''
      }`}
      style={{
        backgroundColor: isSelected
          ? 'var(--surface-elevated)'
          : 'var(--surface-card)',
        borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Issue State Icon */}
        <div
          className={`mt-0.5 p-1 rounded-full ${getIssueStateBgColor(issue.state)}`}
        >
          {issue.state === 'open' ? (
            <svg
              className={`w-4 h-4 ${getIssueStateColor(issue.state)}`}
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
            </svg>
          ) : (
            <svg
              className={`w-4 h-4 ${getIssueStateColor(issue.state)}`}
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M11.28 6.78a.75.75 0 00-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l3.5-3.5z" />
              <path d="M16 8A8 8 0 110 8a8 8 0 0116 0zm-1.5 0a6.5 6.5 0 10-13 0 6.5 6.5 0 0013 0z" />
            </svg>
          )}
        </div>

        {/* Issue Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3
              className="font-medium text-sm hover:underline cursor-pointer"
              style={{ color: 'var(--text-primary)' }}
              onClick={(e) => {
                e.stopPropagation();
                window.open(issue.htmlUrl, '_blank');
              }}
            >
              {issue.title}
            </h3>
          </div>

          {/* Labels */}
          {issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {issue.labels.slice(0, 4).map((label) => (
                <span
                  key={label.id}
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `#${label.color}20`,
                    color: `#${label.color}`,
                    border: `1px solid #${label.color}40`,
                  }}
                >
                  {label.name}
                </span>
              ))}
              {issue.labels.length > 4 && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  +{issue.labels.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Meta Info */}
          <div
            className="flex items-center gap-3 mt-2 text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <span>#{issue.number}</span>
            <span>opened {formatRelativeTime(issue.createdAt)}</span>
            <span>by {issue.author}</span>
            {issue.commentsCount > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M2.75 2.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 01.75.75v2.19l2.72-2.72a.75.75 0 01.53-.22h4.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25H2.75z" />
                </svg>
                {issue.commentsCount}
              </span>
            )}
            {issue.assignees.length > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.004 6.004 0 00-3.431 5.142.75.75 0 001.498.07 4.5 4.5 0 018.99 0 .75.75 0 101.498-.07 6.005 6.005 0 00-3.432-5.142z" />
                </svg>
                {issue.assignees.length}
              </span>
            )}
          </div>
        </div>

        {/* Author Avatar */}
        <img
          src={issue.authorAvatarUrl}
          alt={issue.author}
          className="w-8 h-8 rounded-full"
        />
      </div>
    </div>
  );
};
