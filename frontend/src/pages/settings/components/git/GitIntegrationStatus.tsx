/**
 * Git Integration Status Card
 * Shows the current Git integration configuration status
 */

import { useGitIntegrationStatus } from '../../hooks/use-git-github-status';

interface GitIntegrationStatusProps {
  /** Whether running in Tauri desktop app */
  isTauri: boolean;
}

export function GitIntegrationStatus({ isTauri }: GitIntegrationStatusProps) {
  const { data: status, isLoading, error } = useGitIntegrationStatus();

  const getStatusColor = () => {
    if (isLoading) {
      return {
        bg: 'var(--color-gray-400)',
        shadow: 'color-mix(in srgb, var(--color-gray-400) 20%, transparent)',
      };
    }
    if (error || !status?.isConfigured) {
      return {
        bg: 'var(--color-warning)',
        shadow: 'color-mix(in srgb, var(--color-warning) 20%, transparent)',
      };
    }
    return {
      bg: 'var(--color-success)',
      shadow: 'color-mix(in srgb, var(--color-success) 20%, transparent)',
    };
  };

  const statusColor = getStatusColor();

  return (
    <div
      className="rounded-2xl border p-4 transition-all duration-200"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Git Icon */}
        <div
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border"
          style={{
            borderColor: 'color-mix(in srgb, var(--border) 70%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--surface-card) 60%, transparent)',
          }}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-primary)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span
            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2"
            style={{
              backgroundColor: statusColor.bg,
              borderColor: 'var(--surface-elevated)',
            }}
          />
        </div>

        {/* Status Info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Git
          </p>
          {isLoading ? (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Checking configuration...
            </p>
          ) : error ? (
            <p className="text-xs" style={{ color: 'var(--color-error)' }}>
              Failed to check status
            </p>
          ) : (
            <>
              <p className="text-xs" style={{ color: status?.isConfigured ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {status?.isConfigured ? 'Configured' : 'Not Configured'}
              </p>
              {status?.isConfigured && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {status.allowedRootsCount} repository root{status.allowedRootsCount !== 1 ? 's' : ''} allowed
                </p>
              )}
              {!isTauri && !status?.isConfigured && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Configure in desktop app
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
