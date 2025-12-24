/**
 * Indexing Notification Component
 * A floating notification that shows indexing progress at the top-right
 * Supports multiple simultaneous indexing jobs (one per vector store)
 * Persists across page reloads and auto-dismisses when complete
 */

import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useBoundStore } from '../../../store/bound-store';
import { router } from '../../../lib/router';
import { indexingKeys } from '../../../lib/query-keys';
import { DEFAULT_USER_ID } from '../../../lib/constants';
import { DatabaseIcon, XIcon, SettingsIcon } from './IndexingNotificationIcons';
import { JobCard } from './JobCard';

// Note: Job restoration is handled by useIndexingRestoration hook in App.tsx

export function IndexingNotification() {
  const queryClient = useQueryClient();
  const {
    activeJobs,
    isNotificationVisible,
    clearJob,
    clearAllJobs,
    hideNotification,
  } = useBoundStore();

  // Get user from auth store for stats invalidation
  const user = useBoundStore((state) => state.user);
  const userId = user?.userId ?? DEFAULT_USER_ID;

  const jobs = Object.values(activeJobs);
  const hasActiveJobs = jobs.length > 0;
  const anyIndexing = jobs.some((job) =>
    job.status?.status === 'running' || job.status?.status === 'pending'
  );

  const handleRefreshStats = useCallback(() => {
    const statsQueryKey = indexingKeys.stats({ userId });
    void queryClient.invalidateQueries({ queryKey: statsQueryKey });
    void queryClient.refetchQueries({ queryKey: statsQueryKey });
  }, [queryClient, userId]);

  const handleClearJob = useCallback((vectorStore: string) => {
    clearJob(vectorStore);
  }, [clearJob]);

  const handleDismiss = useCallback(() => {
    if (anyIndexing) {
      // Just hide the notification, jobs continue in background
      hideNotification();
    } else {
      // Clear completely for completed/failed jobs
      clearAllJobs();
    }
  }, [anyIndexing, hideNotification, clearAllJobs]);

  const handleGoToSettings = useCallback(() => {
    hideNotification();
    void router.navigate('/settings/indexing');
  }, [hideNotification]);

  // Don't render if no active jobs or notification is hidden
  if (!hasActiveJobs || !isNotificationVisible) {
    return null;
  }

  return createPortal(
    <div
      className="fixed top-4 right-4 z-[9998] w-80"
      style={{
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      <style>
        {`
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>

      <div
        className="rounded-xl shadow-2xl overflow-hidden backdrop-blur-md"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--surface-elevated) 95%, transparent)',
          border: '1px solid var(--border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-2">
            <DatabaseIcon className="w-5 h-5" style={{ color: 'var(--color-brand-500)' }} />
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {anyIndexing ? 'Indexing Notes' : 'Indexing Complete'}
            </span>
            {jobs.length > 1 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--color-brand-500)',
                  color: 'white',
                }}
              >
                {jobs.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleGoToSettings}
              className="p-1 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
              title="Go to Indexing Settings"
            >
              <SettingsIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
              title={anyIndexing ? 'Hide (continues in background)' : 'Dismiss'}
            >
              <XIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>

        {/* Job Cards */}
        <div className="p-3 space-y-2">
          {jobs.map((job) => (
            <JobCard
              key={job.vectorStore}
              job={job}
              onClear={handleClearJob}
              onRefreshStats={handleRefreshStats}
            />
          ))}
        </div>

        {/* Footer hint for running jobs */}
        {anyIndexing && (
          <div
            className="px-4 py-2 text-xs text-center"
            style={{
              backgroundColor: 'var(--surface-hover)',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border)',
            }}
          >
            Indexing continues even if you navigate away
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// Re-export types and sub-components
export type * from './types';
export { JobCard } from './JobCard';
