import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoundStore } from '../store/bound-store';
import brainLogo from '../assets/brain-top-tab.png';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useBoundStore((state) => state.login);
  const register = useBoundStore((state) => state.register);
  const isLoading = useBoundStore((state) => state.isLoading);
  const isAuthenticated = useBoundStore((state) => state.isAuthenticated);
  const error = useBoundStore((state) => state.error);
  const clearError = useBoundStore((state) => state.clearError);

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- navigate from useNavigate() returns void, not a promise
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear errors on mode change - use ref to track previous mode
  const prevIsRegisterModeRef = useRef(isRegisterMode);
  useEffect(() => {
    if (prevIsRegisterModeRef.current !== isRegisterMode) {
      prevIsRegisterModeRef.current = isRegisterMode;
      clearError();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Valid state reset on mode change
      setValidationError(null);
    }
  }, [isRegisterMode, clearError]);

  useEffect(() => {
    // Clear error on unmount
    return () => { clearError(); };
  }, [clearError]);

  const validateForm = (): boolean => {
    if (!identifier.trim()) {
      setValidationError(isRegisterMode ? 'Email is required' : 'Email or Username is required');
      return false;
    }

    if (isRegisterMode) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        setValidationError('Please enter a valid email address');
        return false;
      }

      if (username && !/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
        setValidationError('Username must be 3-20 characters and contain only letters, numbers, underscores, and hyphens');
        return false;
      }
    }

    if (!password) {
      setValidationError('Password is required');
      return false;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return false;
    }

    if (isRegisterMode && password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (isRegisterMode) {
        await register(identifier, password, displayName || undefined, username || undefined);
      } else {
        await login(identifier, password);
      }
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- navigate from useNavigate() returns void, not a promise
      navigate('/', { replace: true });
    } catch {
      // Error is already handled in the store
    }
  };

  const displayError = validationError || error;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
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

      <div className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div
          className="rounded-3xl border p-8 backdrop-blur-md"
          style={{
            backgroundColor: 'var(--surface-card)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-2xl), 0 0 80px -30px var(--color-primary-alpha)',
          }}
        >
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-6 group">
              {/* Glow effect behind logo */}
              <div
                className="absolute inset-0 rounded-full opacity-30 blur-2xl transition-opacity duration-500 group-hover:opacity-50"
                style={{
                  background: 'radial-gradient(circle, var(--color-brand-500), transparent)',
                  transform: 'scale(1.5)',
                }}
              />
              <img
                src={brainLogo}
                alt="Second Brain"
                className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <h1
              className="text-3xl font-bold tracking-tight mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Second Brain
            </h1>
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {isRegisterMode ? 'Create your account' : 'Sign in to your account'}
            </p>
          </div>

          {/* Error Message */}
          {displayError && (
            <div
              className="mb-6 p-4 rounded-xl border flex items-start gap-3"
              style={{
                backgroundColor: 'var(--color-error-light)',
                borderColor: 'var(--color-error-border)',
              }}
            >
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--color-error-text)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm" style={{ color: 'var(--color-error-text)' }}>
                {displayError}
              </p>
            </div>
          )}

          {/* Login/Register Form */}
          <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
            {/* Email/Identifier Input */}
            <div>
              <label
                htmlFor="identifier"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {isRegisterMode ? 'Email' : 'Email or Username'}
              </label>
              <input
                id="identifier"
                type={isRegisterMode ? "email" : "text"}
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); }}
                className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
                placeholder={isRegisterMode ? "you@example.com" : "Email or Username"}
                autoComplete={isRegisterMode ? "email" : "username"}
                disabled={isLoading}
              />
            </div>

            {/* Username (Register only) */}
            {isRegisterMode && (
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Username (optional)
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); }}
                  className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="unique_username"
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Display Name (Register only) */}
            {isRegisterMode && (
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Display Name (optional)
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); }}
                  className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="Your name"
                  autoComplete="name"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); }}
                className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
                placeholder="••••••••"
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                disabled={isLoading}
              />
            </div>

            {/* Confirm Password (Register only) */}
            {isRegisterMode && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); }}
                  className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-6"
              style={{
                backgroundColor: 'var(--color-brand-600)',
                color: 'white',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>{isRegisterMode ? 'Creating account...' : 'Signing in...'}</span>
                </>
              ) : (
                <span>{isRegisterMode ? 'Create Account' : 'Sign In'}</span>
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div
            className="mt-6 pt-6 border-t text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="font-medium hover:underline"
                style={{ color: 'var(--color-brand-600)' }}
                disabled={isLoading}
              >
                {isRegisterMode ? 'Sign in' : 'Create one'}
              </button>
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            {
              label: 'Smart Notes',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              ),
            },
            {
              label: 'AI Chat',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              ),
            },
            {
              label: 'RAG Search',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              ),
            },
          ].map((feature) => (
            <div
              key={feature.label}
              className="text-center p-3 rounded-xl transition-all duration-200 hover:scale-105"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--surface-card) 50%, transparent)',
              }}
            >
              <div className="flex justify-center mb-1" style={{ color: 'var(--color-brand-600)' }}>
                {feature.icon}
              </div>
              <div
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {feature.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
