/**
 * Git Page
 * Main page for Git operations - status, staging, commits, push/pull
 */

import { useCallback } from 'react';
import { AlertCircle, Settings } from 'lucide-react';
import { useBoundStore } from '../store/bound-store';
import { useGitStatus, useSelectedDiff } from '../features/git/hooks';
import {
  GitStatusPanel,
  GitDiffViewer,
  GitSettingsPanel,
  GitEmptyState,
} from '../features/git/components';
import { GitPageSkeleton } from '../features/git/components/GitPageSkeleton';
import { useTitleBarHeight } from '../components/layout/use-title-bar-height';

export function GitPage() {
  const titleBarHeight = useTitleBarHeight();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);
  const setSelectedDiffFile = useBoundStore((state) => state.setSelectedDiffFile);
  const isGitSettingsOpen = useBoundStore((state) => state.isGitSettingsOpen);
  const openGitSettings = useBoundStore((state) => state.openGitSettings);
  const closeGitSettings = useBoundStore((state) => state.closeGitSettings);

  const { data: status, isLoading: isStatusLoading, error: statusError } = useGitStatus();
  const { data: selectedDiff, isLoading: isDiffLoading } = useSelectedDiff();

  // Calculate height similar to GitHubPage - accounts for title bar, header, and bottom padding
  const headerHeight = 80;
  const bottomPadding = 10;
  const containerHeight = `calc(100vh - ${titleBarHeight}px - ${headerHeight}px - ${bottomPadding}px)`;

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
          className="flex flex-col rounded-3xl border overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-card)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-2xl)',
            height: containerHeight,
            maxHeight: containerHeight,
          }}
        >
          <GitEmptyState onOpenSettings={openGitSettings} />
        </div>
        <GitSettingsPanel isOpen={isGitSettingsOpen} onClose={closeGitSettings} />
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
          className="flex flex-col rounded-3xl border overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-card)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-2xl)',
            height: containerHeight,
            maxHeight: containerHeight,
          }}
        >
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
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
                onClick={openGitSettings}
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
        <GitSettingsPanel isOpen={isGitSettingsOpen} onClose={closeGitSettings} />
      </>
    );
  }

  // Show loading state
  if (isStatusLoading && !status) {
    return <GitPageSkeleton />;
  }

  return (
    <>
      {/* Main content - two panels side by side */}
      <div
        className="flex gap-4 overflow-hidden"
        style={{
          height: containerHeight,
          maxHeight: containerHeight,
        }}
      >
        {/* Left panel: File status */}
        <div className="w-96 min-w-[384px] max-w-[480px] flex-shrink-0 h-full">
          {status && (
            <GitStatusPanel status={status} onViewDiff={handleViewDiff} />
          )}
        </div>

        {/* Right panel: Diff viewer */}
        <div className="flex-1 min-w-0 h-full">
          <GitDiffViewer
            diff={selectedDiff ?? null}
            isLoading={isDiffLoading}
            onClose={handleCloseDiff}
          />
        </div>
      </div>

      {/* Dialogs */}
      <GitSettingsPanel isOpen={isGitSettingsOpen} onClose={closeGitSettings} />
    </>
  );
}

export default GitPage;
