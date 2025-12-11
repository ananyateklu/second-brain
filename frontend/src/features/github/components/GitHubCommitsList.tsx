import { useState } from 'react';
import { useGitHubCommits, useGitHubBranches } from '../hooks';
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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Loading commits...
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
  const hasMore = data?.hasMore || false;

  return (
    <div className="space-y-4">
      {/* Header with Branch Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Commits
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

        {/* Branch Selector */}
        {branches.length > 0 && (
          <select
            value={selectedBranch || defaultBranch || ''}
            onChange={(e) => {
              setSelectedBranch(e.target.value || undefined);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg text-sm border outline-none transition-all focus:ring-2 focus:ring-primary/50"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
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

      {/* Commits List */}
      {commits.length === 0 ? (
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p style={{ color: 'var(--text-secondary)' }}>No commits found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {commits.map((commit) => (
            <CommitRow
              key={commit.sha}
              commit={commit}
              isSelected={selectedSha === commit.sha}
              onClick={() => onSelectCommit?.(commit)}
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

interface CommitRowProps {
  commit: CommitSummary;
  isSelected: boolean;
  onClick: () => void;
}

const CommitRow = ({ commit, isSelected, onClick }: CommitRowProps) => {
  // Split message into title and description
  const [title, ...descLines] = commit.message.split('\n');
  const hasDescription = descLines.some((line) => line.trim());

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
        {/* Commit Icon */}
        <div
          className="mt-0.5 p-1.5 rounded-full"
          style={{ backgroundColor: 'var(--surface-elevated)' }}
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 16 16"
            style={{ color: 'var(--text-secondary)' }}
          >
            <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32zm-1.43-.75a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0z" />
          </svg>
        </div>

        {/* Commit Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3
              className="font-medium text-sm hover:underline cursor-pointer line-clamp-1"
              style={{ color: 'var(--text-primary)' }}
              onClick={(e) => {
                e.stopPropagation();
                window.open(commit.htmlUrl, '_blank');
              }}
            >
              {title}
            </h3>
            {hasDescription && (
              <span style={{ color: 'var(--text-tertiary)' }}>...</span>
            )}
          </div>

          {/* Meta Info */}
          <div
            className="flex items-center gap-3 mt-1.5 text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <span className="font-mono">{commit.shortSha}</span>
            <span>{commit.author}</span>
            <span>{formatRelativeTime(commit.authoredAt)}</span>
            {(commit.additions > 0 || commit.deletions > 0) && (
              <span className="flex items-center gap-1.5">
                <span className="text-green-500">+{commit.additions}</span>
                <span className="text-red-500">-{commit.deletions}</span>
              </span>
            )}
            {commit.filesChanged > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M3.75 1.5a.25.25 0 00-.25.25v11.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25V6H9.75A1.75 1.75 0 018 4.25V1.5H3.75zm5.75.56v2.19c0 .138.112.25.25.25h2.19L9.5 2.06z" />
                </svg>
                {commit.filesChanged}
              </span>
            )}
          </div>
        </div>

        {/* Author Avatar */}
        <img
          src={commit.authorAvatarUrl}
          alt={commit.author}
          className="w-8 h-8 rounded-full"
        />
      </div>
    </div>
  );
};
