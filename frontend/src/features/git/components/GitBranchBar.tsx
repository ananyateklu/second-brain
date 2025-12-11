/**
 * Git Branch Bar Component
 * Displays current branch, ahead/behind status, and push/pull actions
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
} from 'lucide-react';
import { usePush, usePull, useGitStatus, useGitBranches, usePublishBranch } from '../hooks';
import { useBoundStore } from '../../../store/bound-store';
import { GitBranchSelector } from './GitBranchSelector';
import type { GitStatus } from '../../../types/git';

interface GitBranchBarProps {
  status: GitStatus | null;
  onOpenSettings: () => void;
}

export const GitBranchBar = memo(function GitBranchBar({
  status,
  onOpenSettings,
}: GitBranchBarProps) {
  const repositoryPath = useBoundStore((state) => state.repositoryPath);
  const { refetch, isFetching } = useGitStatus();
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
  }, [status?.branch, publishBranch]);

  const canPush = status?.hasRemote && status.ahead > 0;
  const canPull = status?.hasRemote && status.behind > 0;

  return (
    <div
      className="flex items-center justify-between px-5 py-4 rounded-2xl border transition-all duration-300 relative overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-2xl), 0 0 40px -15px var(--color-primary-alpha)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Left: Branch info */}
      <div className="flex items-center gap-5">
        {/* Branch selector */}
        <GitBranchSelector currentBranch={status?.branch ?? ''} />

        {/* Remote status */}
        <div
          className="flex items-center gap-2 px-3 h-10 rounded-xl"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Case 1: No remote configured */}
          {!status?.hasRemote && (
            <>
              <CloudOff className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
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
              className="flex items-center gap-2 text-xs font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
              style={{ color: 'var(--color-brand-500)' }}
              title="Publish branch to remote"
            >
              {publishBranch.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>Publish branch</span>
            </button>
          )}

          {/* Case 3: Has remote and branch is published */}
          {status?.hasRemote && !isUnpublished && (
            <div className="flex items-center gap-2">
              {/* Sync/Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={isFetching}
                className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
                title="Sync with remote"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`}
                  style={{ color: 'var(--text-secondary)' }}
                />
              </button>

              {/* Behind count (pull) */}
              <div
                className="flex items-center gap-1"
                title={status.behind > 0 ? `${status.behind} commit(s) to pull` : 'No commits to pull'}
              >
                <ArrowDown
                  className="w-4 h-4"
                  style={{ color: status.behind > 0 ? 'var(--color-git-modified)' : 'var(--text-tertiary)' }}
                />
                <span
                  className="text-sm font-semibold min-w-[1ch]"
                  style={{ color: status.behind > 0 ? 'var(--color-git-modified)' : 'var(--text-tertiary)' }}
                >
                  {status.behind}
                </span>
              </div>

              {/* Ahead count (push) */}
              <div
                className="flex items-center gap-1"
                title={status.ahead > 0 ? `${status.ahead} commit(s) to push` : 'No commits to push'}
              >
                <ArrowUp
                  className="w-4 h-4"
                  style={{ color: status.ahead > 0 ? 'var(--color-git-add)' : 'var(--text-tertiary)' }}
                />
                <span
                  className="text-sm font-semibold min-w-[1ch]"
                  style={{ color: status.ahead > 0 ? 'var(--color-git-add)' : 'var(--text-tertiary)' }}
                >
                  {status.ahead}
                </span>
              </div>

              {/* Up to date indicator */}
              {status.ahead === 0 && status.behind === 0 && (
                <Check className="w-3.5 h-3.5 ml-1" style={{ color: '#22c55e' }} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Refresh */}
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
          }}
          title="Refresh status"
        >
          <RefreshCw
            className={`w-4 h-4 transition-transform duration-300 ${isFetching ? 'animate-spin' : 'group-hover:rotate-180'}`}
            style={{ color: 'var(--text-secondary)' }}
          />
        </button>

        {/* Pull */}
        <button
          onClick={handlePull}
          disabled={isPulling || !status?.hasRemote}
          className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${canPull ? 'shadow-lg' : ''
            }`}
          style={{
            backgroundColor: canPull
              ? 'color-mix(in srgb, var(--color-git-modified) 20%, transparent)'
              : 'var(--surface-elevated)',
            border: canPull
              ? '1px solid color-mix(in srgb, var(--color-git-modified) 40%, transparent)'
              : '1px solid var(--border)',
            color: canPull ? 'var(--color-git-modified)' : 'var(--text-secondary)',
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

        {/* Push */}
        <button
          onClick={handlePush}
          disabled={isPushing || !status?.hasRemote}
          className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${canPush ? 'shadow-lg' : ''
            }`}
          style={{
            backgroundColor: canPush
              ? 'color-mix(in srgb, var(--color-git-add) 20%, transparent)'
              : 'var(--surface-elevated)',
            border: canPush
              ? '1px solid color-mix(in srgb, var(--color-git-add) 40%, transparent)'
              : '1px solid var(--border)',
            color: canPush ? 'var(--color-git-add)' : 'var(--text-secondary)',
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

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
          }}
          title="Git settings"
        >
          <Settings
            className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90"
            style={{ color: 'var(--text-secondary)' }}
          />
        </button>
      </div>
    </div>
  );
});
