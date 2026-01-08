import { useState } from 'react';
import { useGitHubCommits, useGitHubBranches } from '../hooks';
import { GitHubListSkeleton } from './GitHubListSkeleton';
import { Pagination } from '../../../components/ui/Pagination';
import type { CommitSummary } from '../../../types/github';
import { formatRelativeTime } from '../../../types/github';

interface GitHubCommitsListProps {
  owner?: string;
  repo?: string;
  onSelectCommit?: (commit: CommitSummary) => void;
  selectedSha?: string;
}

export const GitHubCommitsList = ({
  owner,
  repo,
  onSelectCommit,
  selectedSha,
}: GitHubCommitsListProps) => {
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data: branchesData } = useGitHubBranches(owner, repo);
  const { data, isLoading, error, refetch } = useGitHubCommits({
    owner,
    repo,
    branch: selectedBranch,
    page,
    perPage,
  });

  const branches = branchesData?.branches || [];
  const defaultBranch = branches.find((b) => b.isDefault)?.name;

  if (isLoading) {
    return <GitHubListSkeleton count={5} showHeader={true} variant="compact" />;
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'var(--status-error-bg)' }}
      >
        <p style={{ color: 'var(--status-error)' }}>
          Failed to load commits: {error instanceof Error ? error.message : 'Unknown error'}
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

  const commits = data?.commits || [];
  const totalCount = data?.totalCount || 0;
  const itemsPerPage = data?.perPage ?? perPage;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  return (
    <div className="flex flex-col h-full">
      {/* Header with Branch Selector - Fixed at top, responsive */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Commits
          </h2>
          <span
            className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
              color: 'var(--text-secondary)',
            }}
          >
            {totalCount}
          </span>
        </div>

        {/* Branch Selector */}
        {branches.length > 0 && (
          <select
            value={selectedBranch || defaultBranch || ''}
            onChange={(e) => {
              setSelectedBranch(e.target.value || undefined);
              setPage(1);
            }}
            className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm border outline-none transform-gpu transition-all duration-200 focus:ring-2 focus:ring-primary/50 max-w-[140px] sm:max-w-none truncate"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
              borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
              color: 'var(--text-primary)',
            }}
          >
            {branches.map((branch) => (
              <option key={branch.name} value={branch.name}>
                {branch.name} {branch.isDefault ? '(default)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Commits List - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 thin-scrollbar">
      {commits.length === 0 ? (
        <div className="text-center py-12 animate-in fade-in duration-300">
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p style={{ color: 'var(--text-secondary)' }}>No commits found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {commits.map((commit, index) => (
            <CommitRow
              key={commit.sha}
              commit={commit}
              isSelected={selectedSha === commit.sha}
              onClick={() => onSelectCommit?.(commit)}
              index={index}
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

interface CommitRowProps {
  commit: CommitSummary;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

const CommitRow = ({ commit, isSelected, onClick, index }: CommitRowProps) => {
  // Split message into title only
  const [title] = commit.message.split('\n');
  const hasMoreLines = commit.message.includes('\n');

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 rounded-lg cursor-pointer transform-gpu transition-all duration-200 border hover:-translate-y-[1px] hover:shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        isSelected ? 'ring-1 ring-inset ring-primary/50' : ''
      }`}
      style={{
        animationDelay: `${index * 50}ms`,
        animationFillMode: 'both',
        backgroundColor: isSelected
          ? 'color-mix(in srgb, var(--text-primary) 4%, transparent)'
          : 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
        borderColor: isSelected ? 'var(--primary)' : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      <div className="flex items-center gap-2">
        {/* Commit Icon */}
        <div
          className="p-1 rounded-md"
          style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="currentColor"
            viewBox="0 0 16 16"
            style={{ color: 'var(--text-secondary)' }}
          >
            <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32zm-1.43-.75a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0z" />
          </svg>
        </div>

        {/* Commit Content - Compact */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span
            className="font-medium text-sm truncate hover:underline cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
            onClick={(e) => {
              e.stopPropagation();
              window.open(commit.htmlUrl, '_blank');
            }}
          >
            {title}
          </span>
          {hasMoreLines && (
            <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
              ...
            </span>
          )}
          <code
            className="text-xs px-1.5 py-0.5 rounded shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
              color: 'var(--text-tertiary)',
            }}
          >
            {commit.shortSha}
          </code>
        </div>

        {/* Meta Info - inline, responsive */}
        <div
          className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <span>{formatRelativeTime(commit.authoredAt)}</span>
          <span className="hidden sm:inline">{commit.author}</span>
          {commit.filesChanged > 0 && (
            <span
              className="hidden sm:inline text-xs px-1.5 py-0.5 rounded shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                color: 'var(--text-tertiary)',
              }}
              title="Files changed"
            >
              {commit.filesChanged}
            </span>
          )}
          {(commit.additions > 0 || commit.deletions > 0) && (
            <span className="hidden sm:flex items-center gap-1">
              <span style={{ color: 'var(--color-success)' }}>+{commit.additions}</span>
              <span style={{ color: 'var(--color-error)' }}>-{commit.deletions}</span>
            </span>
          )}
        </div>

        {/* Author Avatar */}
        <img
          src={commit.authorAvatarUrl}
          alt={commit.author}
          className="w-5 h-5 rounded-full shrink-0"
        />
      </div>
    </div>
  );
};
