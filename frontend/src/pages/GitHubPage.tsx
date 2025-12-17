import { useState, useEffect, useCallback } from 'react';
import { useGitHubRepository } from '../features/github/hooks';
import { GitHubPullRequestList } from '../features/github/components/GitHubPullRequestList';
import { GitHubActionsPanel } from '../features/github/components/GitHubActionsPanel';
import { GitHubEmptyState } from '../features/github/components/GitHubEmptyState';
import { GitHubIssuesList } from '../features/github/components/GitHubIssuesList';
import { GitHubCommitsList } from '../features/github/components/GitHubCommitsList';
import { GitHubBranchesList } from '../features/github/components/GitHubBranchesList';
import { GitHubCodeBrowser } from '../features/github/components/GitHubCodeBrowser';
import { GitHubPageSkeleton } from '../features/github/components/GitHubPageSkeleton';
import { useBoundStore } from '../store/bound-store';
import { useTitleBarHeight } from '../components/layout/use-title-bar-height';
import type { PullRequestSummary, WorkflowRunSummary, IssueSummary, CommitSummary, BranchSummary } from '../types/github';
// Git imports
import { useGitStatus, useSelectedDiff } from '../features/git/hooks';
import {
  GitStatusPanel,
  GitDiffViewer,
  GitSettingsPanel,
  GitEmptyState,
} from '../features/git/components';

export const GitHubPage = () => {
  const titleBarHeight = useTitleBarHeight();

  // Get tab state from store
  const activeTab = useBoundStore((state) => state.githubActiveTab);
  const githubOwner = useBoundStore((state) => state.githubOwner);
  const githubRepo = useBoundStore((state) => state.githubRepo);
  const setGitHubRepo = useBoundStore((state) => state.setGitHubRepo);

  // Git state from store
  const repositoryPath = useBoundStore((state) => state.repositoryPath);
  const setSelectedDiffFile = useBoundStore((state) => state.setSelectedDiffFile);
  const isGitSettingsOpen = useBoundStore((state) => state.isGitSettingsOpen);
  const openGitSettings = useBoundStore((state) => state.openGitSettings);
  const closeGitSettings = useBoundStore((state) => state.closeGitSettings);

  // Calculate height similar to sidebar - accounts for title bar, header, and bottom padding
  const headerHeight = 80; // Approximate header height
  const bottomPadding = 10; // 0.625rem bottom padding
  const containerHeight = `calc(100vh - ${titleBarHeight}px - ${headerHeight}px - ${bottomPadding}px)`;

  const [selectedPR, setSelectedPR] = useState<PullRequestSummary | null>(null);
  const [selectedRun, setSelectedRun] = useState<WorkflowRunSummary | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<IssueSummary | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<CommitSummary | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchSummary | null>(null);

  // Use store values if set, otherwise use defaults from hook
  const { data: repoInfo, isLoading, error } = useGitHubRepository(
    githubOwner ?? undefined,
    githubRepo ?? undefined
  );

  // Git hooks
  const { data: gitStatus } = useGitStatus();
  const { data: selectedDiff, isLoading: isDiffLoading } = useSelectedDiff();

  // Sync repo info to store when it loads
  useEffect(() => {
    if (repoInfo?.owner && repoInfo?.repo && !githubOwner && !githubRepo) {
      setGitHubRepo(repoInfo.owner, repoInfo.repo);
    }
  }, [repoInfo?.owner, repoInfo?.repo, githubOwner, githubRepo, setGitHubRepo]);

  // Clear selections when repo changes
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSelectedPR(null);
    setSelectedRun(null);
    setSelectedIssue(null);
    setSelectedCommit(null);
    setSelectedBranch(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [githubOwner, githubRepo]);

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

  // Git handlers
  const handleViewDiff = useCallback(
    (filePath: string, staged: boolean) => {
      setSelectedDiffFile(filePath, staged);
    },
    [setSelectedDiffFile]
  );

  const handleCloseDiff = useCallback(() => {
    setSelectedDiffFile(null, false);
  }, [setSelectedDiffFile]);

  // For local-changes tab, we don't need GitHub to be configured
  const isLocalChangesTab = activeTab === 'local-changes';

  // Show skeleton while loading initial data (only for GitHub tabs)
  if (isLoading && !isLocalChangesTab) {
    return <GitHubPageSkeleton />;
  }

  // Show empty state if not configured or error (only for GitHub tabs)
  if (!isLocalChangesTab && (error || !repoInfo?.isConfigured)) {
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
        height: containerHeight,
        maxHeight: containerHeight,
      }}
    >
      {/* Content - Scrollable area with proper height constraint */}

      {/* Local Changes tab - Git status and diff viewer */}
      {activeTab === 'local-changes' && (
        !repositoryPath ? (
          <div className="flex-1 min-h-0">
            <GitEmptyState onOpenSettings={openGitSettings} />
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            {/* Left panel: File status - matches FileTreeView sidebar */}
            <div
              className="w-120 flex-shrink-0 overflow-hidden"
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(var(--glass-blur))',
                WebkitBackdropFilter: 'blur(var(--glass-blur))',
                borderRight: '1px solid var(--border)',
              }}
            >
              {gitStatus && (
                <GitStatusPanel status={gitStatus} onViewDiff={handleViewDiff} />
              )}
            </div>
            {/* Right panel: Diff viewer - matches CodeViewer */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <GitDiffViewer
                diff={selectedDiff ?? null}
                isLoading={isDiffLoading}
                onClose={handleCloseDiff}
              />
            </div>
          </div>
        )
      )}

      {/* Code tab takes full width without padding */}
      {activeTab === 'code' && (
        <div className="flex-1 min-h-0">
          <GitHubCodeBrowser
            owner={repoInfo?.owner}
            repo={repoInfo?.repo}
          />
        </div>
      )}
      {/* Other tabs have padding */}
      <div className={`flex-1 min-h-0 px-6 py-6 overflow-y-auto thin-scrollbar ${activeTab === 'code' || activeTab === 'local-changes' ? 'hidden' : ''}`}>
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

      {/* Git Settings Dialog */}
      <GitSettingsPanel isOpen={isGitSettingsOpen} onClose={closeGitSettings} />
    </div>
  );
};

export default GitHubPage;
