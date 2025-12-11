/**
 * Git Page
 * Main page for Git operations - status, staging, commits, push/pull
 */

import { useState, useCallback } from 'react';
import { AlertCircle, Settings } from 'lucide-react';
import { useBoundStore } from '../store/bound-store';
import { useGitStatus, useSelectedDiff } from '../features/git/hooks';
import {
  GitStatusPanel,
  GitDiffViewer,
  GitBranchBar,
  GitSettingsPanel,
  GitEmptyState,
} from '../features/git/components';

export function GitPage() {
  const repositoryPath = useBoundStore((state) => state.repositoryPath);
  const setSelectedDiffFile = useBoundStore((state) => state.setSelectedDiffFile);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { data: status, isLoading: isStatusLoading, error: statusError } = useGitStatus();
  const { data: selectedDiff, isLoading: isDiffLoading } = useSelectedDiff();

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const handleViewDiff = useCallback(
    (filePath: string, staged: boolean) => {
      setSelectedDiffFile(filePath, staged);
    },
    [setSelectedDiffFile]
  );

  const handleCloseDiff = useCallback(() => {
    setSelectedDiffFile(null, false);
  }, [setSelectedDiffFile]);

  // Show empty state if no repository configured
  if (!repositoryPath) {
    return (
      <>
        <div
          className="h-full pt-4 pb-3 px-4"
          style={{ backgroundColor: 'var(--background-primary)' }}
        >
          <div
            className="h-full rounded-2xl overflow-hidden relative"
            style={{
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-2xl), 0 0 40px -15px var(--color-primary-alpha)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Ambient glow effect */}
            <div
              className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-15 blur-3xl pointer-events-none"
              style={{
                background: 'radial-gradient(circle, var(--color-primary), transparent)',
              }}
            />
            <GitEmptyState onOpenSettings={handleOpenSettings} />
          </div>
        </div>
        <GitSettingsPanel isOpen={isSettingsOpen} onClose={handleCloseSettings} />
      </>
    );
  }

  // Show error state
  if (statusError) {
    const errorMessage =
      statusError instanceof Error ? statusError.message : 'Unknown error';
    const isPathError =
      errorMessage.toLowerCase().includes('path') ||
      errorMessage.toLowerCase().includes('repository') ||
      errorMessage.toLowerCase().includes('not found');

    return (
      <>
        <div
          className="h-full flex flex-col pt-4 pb-3 px-4"
          style={{ backgroundColor: 'var(--background-primary)' }}
        >
          <GitBranchBar
            status={null}
            onOpenSettings={handleOpenSettings}
          />
          <div
            className="flex-1 flex items-center justify-center mt-4 rounded-2xl relative overflow-hidden"
            style={{
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-2xl), 0 0 40px -15px var(--color-primary-alpha)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Ambient glow effect */}
            <div
              className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-15 blur-3xl pointer-events-none"
              style={{
                background: 'radial-gradient(circle, var(--color-primary), transparent)',
              }}
            />
            <div className="max-w-md w-full p-8 text-center relative z-10">
              {/* Error icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{
                  backgroundColor: 'color-mix(in srgb, #ef4444 15%, transparent)',
                }}
              >
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>

              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Failed to load repository
              </h3>

              <p
                className="text-sm mb-4"
                style={{ color: 'var(--text-secondary)' }}
              >
                {errorMessage}
              </p>

              {isPathError && (
                <div
                  className="p-3 rounded-xl mb-6"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <p
                    className="text-xs mb-1"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Current path:
                  </p>
                  <code
                    className="text-xs font-mono break-all"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {repositoryPath}
                  </code>
                </div>
              )}

              <button
                onClick={handleOpenSettings}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <Settings className="w-4 h-4" />
                Check Settings
              </button>
            </div>
          </div>
        </div>
        <GitSettingsPanel isOpen={isSettingsOpen} onClose={handleCloseSettings} />
      </>
    );
  }

  // Show loading state
  if (isStatusLoading && !status) {
    return (
      <div
        className="h-full pt-4 pb-3 px-4"
        style={{ backgroundColor: 'var(--background-primary)' }}
      >
        <div
          className="h-full rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-2xl), 0 0 40px -15px var(--color-primary-alpha)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Ambient glow effect */}
          <div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-15 blur-3xl pointer-events-none"
            style={{
              background: 'radial-gradient(circle, var(--color-primary), transparent)',
            }}
          />
          <div className="flex flex-col items-center gap-4 relative z-10">
            <div
              className="w-12 h-12 rounded-full border-2 animate-spin"
              style={{
                borderColor: 'var(--border)',
                borderTopColor: 'var(--color-brand-500)',
              }}
            />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Loading repository...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="h-full flex flex-col overflow-hidden pt-4 pb-3 px-4"
        style={{ backgroundColor: 'var(--background-primary)' }}
      >
        {/* Branch bar */}
        <GitBranchBar
          status={status ?? null}
          onOpenSettings={handleOpenSettings}
        />

        {/* Main content */}
        <div className="flex-1 flex gap-4 mt-4 min-h-0">
          {/* Left panel: File status */}
          <div className="w-96 min-w-[384px] max-w-[480px] flex-shrink-0">
            {status && (
              <GitStatusPanel status={status} onViewDiff={handleViewDiff} />
            )}
          </div>

          {/* Right panel: Diff viewer */}
          <div className="flex-1 min-w-0">
            <GitDiffViewer
              diff={selectedDiff ?? null}
              isLoading={isDiffLoading}
              onClose={handleCloseDiff}
            />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <GitSettingsPanel isOpen={isSettingsOpen} onClose={handleCloseSettings} />
    </>
  );
}

export default GitPage;
