import brainLogo from '../../assets/brain-top-tab.png';

interface AppLoadingScreenProps {
  /** Primary message to display */
  message?: string;
  /** Secondary smaller text (e.g., "attempt 3/30") */
  subMessage?: string;
  /** Error message (shows error state when provided) */
  error?: string | null;
  /** Callback for retry button (only shown when error is present) */
  onRetry?: () => void;
  /** Show logo (default: true) */
  showLogo?: boolean;
}

/**
 * Centralized loading screen component that follows the app's design system.
 * Used for backend initialization, page loading, and authentication checks.
 */
export function AppLoadingScreen({
  message = 'Initializing app...',
  subMessage,
  error,
  onRetry,
  showLogo = true,
}: AppLoadingScreenProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        background: 'var(--page-background)',
        backgroundColor: 'var(--background)',
      }}
    >
      {/* Ambient background effects */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, var(--color-brand-600), transparent)',
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{
            background: 'radial-gradient(circle, var(--color-brand-500), transparent)',
          }}
        />
      </div>

      <div className="text-center max-w-md px-6 relative z-10">
        {/* Logo */}
        {showLogo && (
          <div className="mb-8">
            <div className="relative inline-block group">
              {/* Glow effect behind logo */}
              <div
                className="absolute inset-0 rounded-full opacity-30 blur-2xl transition-opacity duration-500"
                style={{
                  background: 'radial-gradient(circle, var(--color-brand-500), transparent)',
                  transform: 'scale(1.5)',
                }}
              />
              <img
                src={brainLogo}
                alt="Second Brain"
                className="w-20 h-20 object-contain relative z-10 drop-shadow-2xl"
              />
            </div>
          </div>
        )}

        {/* App Title */}
        <h1
          className="text-xl font-semibold mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          Second Brain
        </h1>

        {error ? (
          /* Error State */
          <>
            <div className="mb-6">
              <div
                className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--color-error-light)',
                  border: '1px solid var(--color-error-border)',
                }}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: 'var(--color-error-text)' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <p
                className="text-sm"
                style={{ color: 'var(--color-error-text)' }}
              >
                {error}
              </p>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-5 py-2.5 font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--color-brand-600)',
                  color: 'white',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                Retry Connection
              </button>
            )}
            <p
              className="mt-4 text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Make sure the backend is running on port 5001
            </p>
          </>
        ) : (
          /* Loading State */
          <>
            {/* Spinner */}
            <div className="mb-6">
              <div className="relative w-10 h-10 mx-auto">
                <div
                  className="absolute inset-0 rounded-full border-4 border-solid"
                  style={{
                    borderColor: 'var(--color-brand-200)',
                    opacity: 0.3,
                  }}
                />
                <div
                  className="absolute inset-0 rounded-full border-4 border-solid border-t-transparent animate-spin"
                  style={{
                    borderColor: 'var(--color-brand-600)',
                    borderTopColor: 'transparent',
                  }}
                />
              </div>
            </div>

            {/* Loading Message */}
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {message}
            </p>

            {/* Sub Message */}
            {subMessage && (
              <p
                className="mt-2 text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {subMessage}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

