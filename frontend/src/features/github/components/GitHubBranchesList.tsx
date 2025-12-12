import { useGitHubBranches } from '../hooks';
import { GitHubListSkeleton } from './GitHubListSkeleton';
import type { BranchSummary } from '../../../types/github';

interface GitHubBranchesListProps {
  owner?: string;
  repo?: string;
  onSelectBranch?: (branch: BranchSummary) => void;
  selectedBranchName?: string;
}

export const GitHubBranchesList = ({
  owner,
  repo,
  onSelectBranch,
  selectedBranchName,
}: GitHubBranchesListProps) => {
  const { data, isLoading, error, refetch } = useGitHubBranches(owner, repo);

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
          Failed to load branches: {error instanceof Error ? error.message : 'Unknown error'}
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

  const branches = data?.branches || [];
  const totalCount = data?.totalCount || 0;

  // Sort branches: default first, then protected, then alphabetically
  const sortedBranches = [...branches].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    if (a.isProtected && !b.isProtected) return -1;
    if (!a.isProtected && b.isProtected) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Branches
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

      {/* Branches List - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 [scrollbar-width:thin] [scrollbar-color:var(--color-brand-600)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--color-brand-600)] [&::-webkit-scrollbar-thumb]:hover:bg-[color:var(--color-brand-500)]">
      {sortedBranches.length === 0 ? (
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
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p style={{ color: 'var(--text-secondary)' }}>No branches found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedBranches.map((branch) => (
            <BranchRow
              key={branch.name}
              branch={branch}
              isSelected={selectedBranchName === branch.name}
              onClick={() => onSelectBranch?.(branch)}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

interface BranchRowProps {
  branch: BranchSummary;
  isSelected: boolean;
  onClick: () => void;
}

const BranchRow = ({ branch, isSelected, onClick }: BranchRowProps) => {
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
        {/* Branch Icon */}
        <div
          className="p-1 rounded-md"
          style={{
            backgroundColor: branch.isDefault
              ? 'var(--status-success-bg)'
              : 'var(--surface-elevated)',
          }}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="currentColor"
            viewBox="0 0 16 16"
            style={{
              color: branch.isDefault
                ? 'var(--status-success)'
                : 'var(--text-secondary)',
            }}
          >
            <path d="M9.5 3.25a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zm-6 0a.75.75 0 101.5 0 .75.75 0 00-1.5 0zm8.25-.75a.75.75 0 100 1.5.75.75 0 000-1.5zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
          </svg>
        </div>

        {/* Branch Info - Compact */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span
            className="font-medium text-sm truncate hover:underline cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
            onClick={(e) => {
              e.stopPropagation();
              window.open(branch.htmlUrl, '_blank');
            }}
          >
            {branch.name}
          </span>
          {branch.isDefault && (
            <span
              className="px-1.5 py-0.5 rounded-full text-xs shrink-0"
              style={{
                backgroundColor: 'var(--status-success-bg)',
                color: 'var(--status-success)',
              }}
            >
              default
            </span>
          )}
          {branch.isProtected && (
            <span
              className="px-1.5 py-0.5 rounded-full text-xs shrink-0 flex items-center gap-0.5"
              style={{
                backgroundColor: 'var(--status-warning-bg)',
                color: 'var(--status-warning)',
              }}
            >
              <span className="sr-only">protected</span>
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0c-.69 0-1.34.13-1.918.38L4.618.903a.75.75 0 00.764 1.294l1.464-.863C7.2.167 7.587.075 8 .075s.8.092 1.154.259l1.464.863a.75.75 0 00.764-1.294L9.918.38A5.002 5.002 0 008 0z" />
                <path fillRule="evenodd" d="M4.5 6.25A3.5 3.5 0 018 2.75a3.5 3.5 0 013.5 3.5v1.5a.75.75 0 01-1.5 0v-1.5a2 2 0 10-4 0v1.5a.75.75 0 01-1.5 0v-1.5zm-2 5v1.5c0 1.657 1.343 3 3 3h5c1.657 0 3-1.343 3-3v-1.5a1 1 0 00-1-1h-9a1 1 0 00-1 1zm6.5 2a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </span>
          )}
        </div>

        {/* SHA */}
        {branch.sha && (
          <code
            className="text-xs px-1.5 py-0.5 rounded shrink-0"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-tertiary)',
            }}
          >
            {branch.sha.substring(0, 7)}
          </code>
        )}

        {/* External Link */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(branch.htmlUrl, '_blank');
          }}
          className="p-1 rounded-md transition-all hover:bg-white/5 shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
