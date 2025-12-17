import { useState, useCallback } from 'react';
import { useGitHubRepository } from '../features/github/hooks';
import { GitHubPullRequestList } from '../features/github/components/GitHubPullRequestList';
import { GitHubActionsPanel } from '../features/github/components/GitHubActionsPanel';
import { GitHubEmptyState } from '../features/github/components/GitHubEmptyState';
import { GitHubRepoSelector } from '../features/github/components/GitHubRepoSelector';
import { GitHubIssuesList } from '../features/github/components/GitHubIssuesList';
import { GitHubCommitsList } from '../features/github/components/GitHubCommitsList';
import { GitHubBranchesList } from '../features/github/components/GitHubBranchesList';
import { GitHubCodeBrowser } from '../features/github/components/GitHubCodeBrowser';
import { GitHubPageSkeleton } from '../features/github/components/GitHubPageSkeleton';
import { useTitleBarHeight } from '../components/layout/use-title-bar-height';
import type { PullRequestSummary, WorkflowRunSummary, IssueSummary, CommitSummary, BranchSummary } from '../types/github';

type TabType = 'pull-requests' | 'actions' | 'issues' | 'commits' | 'branches' | 'code';

export const GitHubPage = () => {
  const titleBarHeight = useTitleBarHeight();
  const [activeTab, setActiveTab] = useState<TabType>('code');
  const [selectedPR, setSelectedPR] = useState<PullRequestSummary | null>(null);
  const [selectedRun, setSelectedRun] = useState<WorkflowRunSummary | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<IssueSummary | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<CommitSummary | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchSummary | null>(null);

  // Custom repo override (null = use defaults from config)
  const [customOwner, setCustomOwner] = useState<string | undefined>();
  const [customRepo, setCustomRepo] = useState<string | undefined>();

  const { data: repoInfo, isLoading, error } = useGitHubRepository(customOwner, customRepo);

  const handleRepoChange = useCallback((owner: string, repo: string) => {
    setCustomOwner(owner);
    setCustomRepo(repo);
    // Clear selections when switching repos
    setSelectedPR(null);
    setSelectedRun(null);
    setSelectedIssue(null);
    setSelectedCommit(null);
    setSelectedBranch(null);
  }, []);

  const handleSelectPR = (pr: PullRequestSummary) => {
    setSelectedPR(pr);
    // Open in new tab
    window.open(pr.htmlUrl, '_blank');
  };

  const handleSelectRun = (run: WorkflowRunSummary) => {
    setSelectedRun(selectedRun?.id === run.id ? null : run);
  };

  const handleSelectIssue = (issue: IssueSummary) => {
    setSelectedIssue(issue);
    window.open(issue.htmlUrl, '_blank');
  };

  const handleSelectCommit = (commit: CommitSummary) => {
    setSelectedCommit(commit);
    window.open(commit.htmlUrl, '_blank');
  };

  const handleSelectBranch = (branch: BranchSummary) => {
    setSelectedBranch(selectedBranch?.name === branch.name ? null : branch);
  };

  // Show skeleton while loading initial data
  if (isLoading) {
    return <GitHubPageSkeleton />;
  }

  // Show empty state if not configured or error
  if (error || !repoInfo?.isConfigured) {
    return (
      <div className="min-h-screen p-6">
        <GitHubEmptyState
          error={error instanceof Error ? error : null}
          onConfigure={() => {
            // Could open settings modal or navigate to settings
            window.open('/settings/general', '_self');
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col rounded-3xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-2xl)',
        height: `calc(100vh - ${titleBarHeight}px - 2rem)`,
        maxHeight: `calc(100vh - ${titleBarHeight}px - 2rem)`,
      }}
    >
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-center gap-4 mb-4">
            {/* GitHub Icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <svg
                className="w-7 h-7"
                fill="currentColor"
                viewBox="0 0 24 24"
                style={{ color: 'var(--text-primary)' }}
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </div>

            <div className="flex-1">
              <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                GitHub
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Pull requests, actions, and repository activity
              </p>
            </div>

            {/* Repository Selector */}
            <GitHubRepoSelector
              currentOwner={repoInfo?.owner}
              currentRepo={repoInfo?.repo}
              fullName={repoInfo?.fullName}
              htmlUrl={repoInfo?.htmlUrl}
              onRepoChange={handleRepoChange}
            />
          </div>

          {/* Tab Navigation */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl w-fit overflow-x-auto"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            <TabButton
              active={activeTab === 'code'}
              onClick={() => setActiveTab('code')}
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4.72 3.22a.75.75 0 011.06 1.06L2.06 8l3.72 3.72a.75.75 0 11-1.06 1.06L.47 8.53a.75.75 0 010-1.06l4.25-4.25zm6.56 0a.75.75 0 10-1.06 1.06L13.94 8l-3.72 3.72a.75.75 0 101.06 1.06l4.25-4.25a.75.75 0 000-1.06l-4.25-4.25z" />
                </svg>
              }
              label="Code"
            />
            <TabButton
              active={activeTab === 'pull-requests'}
              onClick={() => setActiveTab('pull-requests')}
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M1.5 3.25a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zm5.677-.177L9.573.677A.25.25 0 0110 .854V2.5h1A2.5 2.5 0 0113.5 5v5.628a2.251 2.251 0 11-1.5 0V5a1 1 0 00-1-1h-1v1.646a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm0 9.5a.75.75 0 100 1.5.75.75 0 000-1.5zm8.25.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              }
              label="Pull Requests"
            />
            <TabButton
              active={activeTab === 'issues'}
              onClick={() => setActiveTab('issues')}
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                  <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
                </svg>
              }
              label="Issues"
            />
            <TabButton
              active={activeTab === 'actions'}
              onClick={() => setActiveTab('actions')}
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M3.25 1A2.25 2.25 0 001 3.25v9.5A2.25 2.25 0 003.25 15h9.5A2.25 2.25 0 0015 12.75v-9.5A2.25 2.25 0 0012.75 1h-9.5zM2.5 3.25a.75.75 0 01.75-.75h9.5a.75.75 0 01.75.75v9.5a.75.75 0 01-.75.75h-9.5a.75.75 0 01-.75-.75v-9.5zM11.28 6.28a.75.75 0 00-1.06-1.06L7.25 8.19l-.97-.97a.75.75 0 10-1.06 1.06l1.5 1.5a.75.75 0 001.06 0l3.5-3.5z" />
                </svg>
              }
              label="Actions"
            />
            <TabButton
              active={activeTab === 'commits'}
              onClick={() => setActiveTab('commits')}
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32zm-1.43-.75a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0z" />
                </svg>
              }
              label="Commits"
            />
            <TabButton
              active={activeTab === 'branches'}
              onClick={() => setActiveTab('branches')}
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M9.5 3.25a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zm-6 0a.75.75 0 101.5 0 .75.75 0 00-1.5 0zm8.25-.75a.75.75 0 100 1.5.75.75 0 000-1.5zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
                </svg>
              }
              label="Branches"
            />
          </div>
        </div>

        {/* Content - Scrollable area with proper height constraint */}
        <div className="flex-1 min-h-0 px-6 pb-6">
          {activeTab === 'code' && (
            <GitHubCodeBrowser
              owner={repoInfo?.owner}
              repo={repoInfo?.repo}
            />
          )}
          {activeTab === 'pull-requests' && (
            <GitHubPullRequestList
              owner={repoInfo?.owner}
              repo={repoInfo?.repo}
              onSelectPR={handleSelectPR}
              selectedPRNumber={selectedPR?.number}
            />
          )}
          {activeTab === 'issues' && (
            <GitHubIssuesList
              owner={repoInfo?.owner}
              repo={repoInfo?.repo}
              onSelectIssue={handleSelectIssue}
              selectedIssueNumber={selectedIssue?.number}
            />
          )}
          {activeTab === 'actions' && (
            <GitHubActionsPanel
              owner={repoInfo?.owner}
              repo={repoInfo?.repo}
              onSelectRun={handleSelectRun}
              selectedRunId={selectedRun?.id}
            />
          )}
          {activeTab === 'commits' && (
            <GitHubCommitsList
              owner={repoInfo?.owner}
              repo={repoInfo?.repo}
              onSelectCommit={handleSelectCommit}
              selectedSha={selectedCommit?.sha}
            />
          )}
          {activeTab === 'branches' && (
            <GitHubBranchesList
              owner={repoInfo?.owner}
              repo={repoInfo?.repo}
              onSelectBranch={handleSelectBranch}
              selectedBranchName={selectedBranch?.name}
            />
          )}
        </div>
      </div>
  );
};

// Tab Button Component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton = ({ active, onClick, icon, label }: TabButtonProps) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
      active ? 'shadow-sm' : ''
    }`}
    style={{
      backgroundColor: active ? 'var(--surface-card)' : 'transparent',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    }}
  >
    <span className="flex items-center gap-2">
      {icon}
      {label}
    </span>
  </button>
);

export default GitHubPage;
