interface GitHubEmptyStateProps {
  error?: Error | null;
  onConfigure?: () => void;
}

export const GitHubEmptyState = ({ error, onConfigure }: GitHubEmptyStateProps) => {
  const isNotConfigured = error?.message?.includes('not configured');
  const isUnauthorized = error?.message?.includes('Unauthorized') || error?.message?.includes('authentication');

  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-8 rounded-2xl border"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      {/* GitHub Logo */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ backgroundColor: 'var(--surface-card)' }}
      >
        <svg
          className="w-12 h-12"
          fill="currentColor"
          viewBox="0 0 24 24"
          style={{ color: 'var(--text-secondary)' }}
        >
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      </div>

      {/* Title */}
      <h2
        className="text-xl font-semibold mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {isNotConfigured
          ? 'Configure GitHub Integration'
          : isUnauthorized
          ? 'GitHub Authentication Required'
          : 'Connect to GitHub'}
      </h2>

      {/* Description */}
      <p
        className="text-center max-w-md mb-6"
        style={{ color: 'var(--text-secondary)' }}
      >
        {isNotConfigured ? (
          <>
            To view pull requests and GitHub Actions, you need to configure your
            GitHub Personal Access Token and repository settings.
          </>
        ) : isUnauthorized ? (
          <>
            Your GitHub Personal Access Token may be invalid or expired. Please
            update your token in the settings.
          </>
        ) : error ? (
          <>
            There was an error connecting to GitHub: {error.message}
          </>
        ) : (
          <>
            View your pull requests, review status, and monitor GitHub Actions
            workflow runs all in one place.
          </>
        )}
      </p>

      {/* Configuration Steps */}
      {(isNotConfigured || isUnauthorized) && (
        <div
          className="w-full max-w-md p-4 rounded-xl mb-6"
          style={{
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border)',
          }}
        >
          <h3
            className="text-sm font-semibold mb-3"
            style={{ color: 'var(--text-primary)' }}
          >
            Setup Instructions
          </h3>
          <ol
            className="space-y-2 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            <li className="flex items-start gap-2">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: 'var(--color-primary-alpha)',
                  color: 'var(--color-primary)',
                }}
              >
                1
              </span>
              <span>
                Go to GitHub → Settings → Developer Settings → Personal access
                tokens → Tokens (classic)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: 'var(--color-primary-alpha)',
                  color: 'var(--color-primary)',
                }}
              >
                2
              </span>
              <span>
                Generate a new token with <code className="text-xs px-1 rounded" style={{ backgroundColor: 'var(--surface-elevated)' }}>repo</code> and{' '}
                <code className="text-xs px-1 rounded" style={{ backgroundColor: 'var(--surface-elevated)' }}>workflow</code> scopes
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: 'var(--color-primary-alpha)',
                  color: 'var(--color-primary)',
                }}
              >
                3
              </span>
              <span>
                Add the token to your <code className="text-xs px-1 rounded" style={{ backgroundColor: 'var(--surface-elevated)' }}>appsettings.json</code> under{' '}
                <code className="text-xs px-1 rounded" style={{ backgroundColor: 'var(--surface-elevated)' }}>GitHub:PersonalAccessToken</code>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: 'var(--color-primary-alpha)',
                  color: 'var(--color-primary)',
                }}
              >
                4
              </span>
              <span>
                Set <code className="text-xs px-1 rounded" style={{ backgroundColor: 'var(--surface-elevated)' }}>GitHub:DefaultOwner</code> and{' '}
                <code className="text-xs px-1 rounded" style={{ backgroundColor: 'var(--surface-elevated)' }}>GitHub:DefaultRepo</code> to your repository
              </span>
            </li>
          </ol>
        </div>
      )}

      {/* Action Button */}
      {onConfigure && (
        <button
          onClick={onConfigure}
          className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-105"
          style={{
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
          }}
        >
          Open Settings
        </button>
      )}

      {/* Help Link */}
      <a
        href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 text-sm flex items-center gap-1 transition-colors hover:underline"
        style={{ color: 'var(--color-primary)' }}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Learn more about GitHub tokens
      </a>
    </div>
  );
};
