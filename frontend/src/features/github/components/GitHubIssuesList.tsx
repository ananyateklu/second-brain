import { useState } from 'react';
import { useGitHubIssues } from '../hooks';
import { GitHubListSkeleton } from './GitHubListSkeleton';
import { Pagination } from '../../../components/ui/Pagination';
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
    return <GitHubListSkeleton count={5} showHeader={true} variant="default" />;
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
  const itemsPerPage = data?.perPage ?? perPage;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  return (
    <div className="flex flex-col h-full">
      {/* Header with Filter - Fixed at top */}
      <div className="flex-shrink-0 flex items-center justify-between mb-4">
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

      {/* Issues List - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 thin-scrollbar">
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
      </div>

      {/* Pagination - Fixed at bottom */}
      <div className="flex-shrink-0">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={(nextPage) => setPage(Math.min(totalPages, Math.max(1, nextPage)))}
        />
      </div>
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
      className={`px-3 py-2 rounded-lg cursor-pointer transition-all border ${
        isSelected ? 'ring-1 ring-inset ring-primary/50' : ''
      }`}
      style={{
        backgroundColor: isSelected
          ? 'var(--surface-elevated)'
          : 'var(--surface-card)',
        borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
      }}
    >
      <div className="flex items-center gap-2">
        {/* Issue State Icon */}
        <div
          className={`p-1 rounded-md ${getIssueStateBgColor(issue.state)}`}
        >
          {issue.state === 'open' ? (
            <svg
              className={`w-3.5 h-3.5 ${getIssueStateColor(issue.state)}`}
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
            </svg>
          ) : (
            <svg
              className={`w-3.5 h-3.5 ${getIssueStateColor(issue.state)}`}
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M11.28 6.78a.75.75 0 00-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l3.5-3.5z" />
              <path d="M16 8A8 8 0 110 8a8 8 0 0116 0zm-1.5 0a6.5 6.5 0 10-13 0 6.5 6.5 0 0013 0z" />
            </svg>
          )}
        </div>

        {/* Issue Content - Compact */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span
            className="font-medium text-sm truncate hover:underline cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
            onClick={(e) => {
              e.stopPropagation();
              window.open(issue.htmlUrl, '_blank');
            }}
          >
            {issue.title}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-tertiary)',
            }}
          >
            #{issue.number}
          </span>
        </div>

        {/* Labels - inline compact */}
        {issue.labels.length > 0 && (
          <div className="hidden md:flex items-center gap-1 shrink-0">
            {issue.labels.slice(0, 2).map((label) => (
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
            {issue.labels.length > 2 && (
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                +{issue.labels.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Meta Info - inline */}
        <div
          className="flex items-center gap-2 text-xs shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <span className="hidden sm:inline">by {issue.author}</span>
          <span>{formatRelativeTime(issue.createdAt)}</span>
          {issue.commentsCount > 0 && (
            <span className="flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                <path d="M2.75 2.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 01.75.75v2.19l2.72-2.72a.75.75 0 01.53-.22h4.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25H2.75z" />
              </svg>
              {issue.commentsCount}
            </span>
          )}
        </div>

        {/* Author Avatar */}
        <img
          src={issue.authorAvatarUrl}
          alt={issue.author}
          className="w-5 h-5 rounded-full shrink-0"
        />
      </div>
    </div>
  );
};
