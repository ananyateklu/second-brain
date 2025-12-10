/**
 * Git Branch Bar Component
 * Displays current branch, ahead/behind status, and push/pull actions
 */

import { memo, useCallback, useState } from 'react';
import {
  GitBranch,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Settings,
  Loader2,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { usePush, usePull, useGitStatus } from '../hooks';
import { useBoundStore } from '../../../store/bound-store';
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
  const push = usePush();
  const pull = usePull();

  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

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
        {/* Branch indicator */}
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-xl"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))',
              boxShadow: '0 2px 8px var(--color-primary-alpha)',
            }}
          >
            <GitBranch className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Branch
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {status?.branch ?? 'No branch'}
            </span>
          </div>
        </div>

        {/* Remote status */}
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-xl"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
          }}
        >
          {status?.hasRemote ? (
            <>
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)',
                }}
              >
                <Cloud className="w-4 h-4" style={{ color: 'var(--color-brand-500)' }} />
              </div>
              <div className="flex items-center gap-3">
                {status.ahead > 0 && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-git-add-line-bg)',
                    }}
                    title={`${status.ahead} commit(s) ahead`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" style={{ color: 'var(--color-git-add)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-git-add)' }}>
                      {status.ahead}
                    </span>
                  </div>
                )}
                {status.behind > 0 && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-git-modified-bg)',
                    }}
                    title={`${status.behind} commit(s) behind`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" style={{ color: 'var(--color-git-modified)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-git-modified)' }}>
                      {status.behind}
                    </span>
                  </div>
                )}
                {status.ahead === 0 && status.behind === 0 && (
                  <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                    Up to date
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--text-tertiary) 15%, transparent)',
                }}
              >
                <CloudOff className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                No remote
              </span>
            </>
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
