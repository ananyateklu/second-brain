/**
 * Git Navigation Controls
 * Header component for Git page - branch selector, sync status, push/pull actions, settings
 */

import { memo, useCallback, useState, useMemo } from 'react';
import {
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Settings,
  Loader2,
  CloudOff,
  Upload,
  Check,
  GitBranch,
} from 'lucide-react';
import { usePush, usePull, useGitStatus, useGitBranches, usePublishBranch } from '../../../features/git/hooks';
import { useBoundStore } from '../../../store/bound-store';
import { GitBranchSelector } from '../../../features/git/components/GitBranchSelector';

export const GitNavControls = memo(function GitNavControls() {
  const repositoryPath = useBoundStore((state) => state.repositoryPath);
  const openGitSettings = useBoundStore((state) => state.openGitSettings);
  const { data: status, refetch, isFetching } = useGitStatus();
  const { data: branches } = useGitBranches();
  const push = usePush();
  const pull = usePull();
  const publishBranch = usePublishBranch();

  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // Find current branch info to check if it has upstream
  const currentBranchInfo = useMemo(() => {
    if (!branches || !status?.branch) return null;
    return branches.find((b) => b.isCurrent && !b.isRemote);
  }, [branches, status?.branch]);

  const isUnpublished = currentBranchInfo && !currentBranchInfo.upstream;

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handlePush = useCallback(() => {
    if (!repositoryPath) return;
    setIsPushing(true);
    push.mutate(
      {},
      {
        onSettled: () => setIsPushing(false),
      }
    );
  }, [repositoryPath, push]);

  const handlePull = useCallback(() => {
    if (!repositoryPath) return;
    setIsPulling(true);
    pull.mutate(
      {},
      {
        onSettled: () => setIsPulling(false),
      }
    );
  }, [repositoryPath, pull]);

  const handlePublish = useCallback(() => {
    if (!status?.branch) return;
    publishBranch.mutate({ branchName: status.branch });
  }, [status, publishBranch]);

  const canPush = status?.hasRemote && status.ahead > 0;
  const canPull = status?.hasRemote && status.behind > 0;

  // Show minimal state if no repository configured
  if (!repositoryPath) {
    return (
      <div
        className="flex items-center gap-1 p-1 rounded-xl backdrop-blur-md"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
          <GitBranch className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No repository
          </span>
        </div>
        <button
          onClick={openGitSettings}
          className="flex items-center justify-center px-2 py-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
          title="Git settings"
        >
          <Settings className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl backdrop-blur-md"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Branch selector */}
      <GitBranchSelector currentBranch={status?.branch ?? ''} />

      {/* Remote status pill */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
        {/* Case 1: No remote configured */}
        {!status?.hasRemote && (
          <>
            <CloudOff className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              No remote
            </span>
          </>
        )}

        {/* Case 2: Has remote but branch is unpublished */}
        {status?.hasRemote && isUnpublished && (
          <button
            onClick={handlePublish}
            disabled={publishBranch.isPending}
            className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
            style={{ color: 'var(--color-brand-500)' }}
            title="Publish branch to remote"
          >
            {publishBranch.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>Publish</span>
          </button>
        )}

        {/* Case 3: Has remote and branch is published */}
        {status?.hasRemote && !isUnpublished && (
          <div className="flex items-center gap-1.5">
            {/* Sync/Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="flex items-center justify-center w-5 h-5 rounded-md hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
              title="Sync with remote"
            >
              <RefreshCw
                className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`}
                style={{ color: 'var(--text-secondary)' }}
              />
            </button>

            {/* Behind count (pull) */}
            <div
              className="flex items-center gap-0.5"
              title={status.behind > 0 ? `${status.behind} commit(s) to pull` : 'No commits to pull'}
            >
              <ArrowDown
                className="w-3.5 h-3.5"
                style={{ color: status.behind > 0 ? 'var(--color-git-modified)' : 'var(--text-tertiary)' }}
              />
              <span
                className="text-xs font-semibold min-w-[1ch]"
                style={{ color: status.behind > 0 ? 'var(--color-git-modified)' : 'var(--text-tertiary)' }}
              >
                {status.behind}
              </span>
            </div>

            {/* Ahead count (push) */}
            <div
              className="flex items-center gap-0.5"
              title={status.ahead > 0 ? `${status.ahead} commit(s) to push` : 'No commits to push'}
            >
              <ArrowUp
                className="w-3.5 h-3.5"
                style={{ color: status.ahead > 0 ? 'var(--color-git-add)' : 'var(--text-tertiary)' }}
              />
              <span
                className="text-xs font-semibold min-w-[1ch]"
                style={{ color: status.ahead > 0 ? 'var(--color-git-add)' : 'var(--text-tertiary)' }}
              >
                {status.ahead}
              </span>
            </div>

            {/* Up to date indicator */}
            {status.ahead === 0 && status.behind === 0 && (
              <Check className="w-3 h-3 ml-0.5" style={{ color: '#22c55e' }} />
            )}
          </div>
        )}
      </div>

      {/* Pull button */}
      <button
        onClick={handlePull}
        disabled={isPulling || !status?.hasRemote}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: canPull ? 'var(--surface-card)' : 'transparent',
          color: canPull ? 'var(--color-git-modified)' : 'var(--text-secondary)',
          boxShadow: canPull ? 'var(--shadow-sm)' : 'none',
        }}
        title="Pull from remote"
      >
        {isPulling ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ArrowDown className="w-4 h-4" />
        )}
        <span>Pull</span>
      </button>

      {/* Push button */}
      <button
        onClick={handlePush}
        disabled={isPushing || !status?.hasRemote}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: canPush ? 'var(--surface-card)' : 'transparent',
          color: canPush ? 'var(--color-git-add)' : 'var(--text-secondary)',
          boxShadow: canPush ? 'var(--shadow-sm)' : 'none',
        }}
        title="Push to remote"
      >
        {isPushing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ArrowUp className="w-4 h-4" />
        )}
        <span>Push</span>
      </button>

      {/* Settings button */}
      <button
        onClick={openGitSettings}
        className="flex items-center justify-center px-2 py-2 rounded-lg transition-all duration-200 hover:bg-[var(--surface-card)]"
        title="Git settings"
      >
        <Settings
          className="w-4 h-4"
          style={{ color: 'var(--text-secondary)' }}
        />
      </button>
    </div>
  );
});

GitNavControls.displayName = 'GitNavControls';
