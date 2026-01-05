import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useBoundStore } from '../store/bound-store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TitleBar } from '@/components/layout/TitleBar';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    identifier?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      void navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Clear error on unmount
    return () => { clearError(); };
  }, [clearError]);

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!identifier.trim()) {
      errors.identifier = isRegisterMode ? 'Email is required' : 'Email or Username is required';
    } else if (isRegisterMode) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        errors.identifier = 'Please enter a valid email address';
      }
    }

    if (isRegisterMode && username && !/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      errors.username = 'Username must be 3-20 characters (letters, numbers, _, -)';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (isRegisterMode && password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
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
      void navigate('/', { replace: true });
    } catch {
      // Error is already handled in the store
    }
  };

  return (
    <>
      {/* macOS Title Bar - provides drag region for Tauri */}
      <TitleBar />

      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)] bg-[image:var(--page-background)]">
        {/* Ambient background effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div
            className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
            style={{ background: 'radial-gradient(circle, var(--color-brand-600), transparent)' }}
          />
          <div
            className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15 blur-3xl animate-pulse"
            style={{ background: 'radial-gradient(circle, var(--color-brand-500), transparent)', animationDelay: '1s' }}
          />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Main Card */}
          <div className="rounded-3xl border border-[var(--border)] p-8 backdrop-blur-md bg-[var(--surface-card)] shadow-[var(--glass-shadow)]">
            {/* Logo and Title */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-6 group">
                {/* Glow effect behind logo */}
                <div
                  className="absolute inset-0 rounded-full opacity-30 blur-2xl transition-opacity duration-500 group-hover:opacity-50 scale-150"
                  style={{ background: 'radial-gradient(circle, var(--color-brand-500), transparent)' }}
                />
                <img
                  src={brainLogo}
                  alt="Second Brain"
                  className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 text-[var(--text-primary)]">
                Second Brain
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                {isRegisterMode ? 'Create your account' : 'Sign in to your account'}
              </p>
            </div>

            {/* Server Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl border flex items-start gap-3 bg-[var(--color-error-light)] border-[var(--color-error-border)] animate-in fade-in slide-in-from-top-2 duration-300">
                <svg
                  className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--color-error-text)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-[var(--color-error-text)]">
                  {error}
                </p>
              </div>
            )}

            {/* Login/Register Form */}
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
              {/* Email/Identifier Input */}
              <Input
                label={isRegisterMode ? 'Email' : 'Email or Username'}
                type={isRegisterMode ? 'email' : 'text'}
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); }}
                placeholder={isRegisterMode ? 'you@example.com' : 'Email or Username'}
                autoComplete={isRegisterMode ? 'email' : 'username'}
                disabled={isLoading}
                error={fieldErrors.identifier}
                required
              />

              {/* Username (Register only) */}
              {isRegisterMode && (
                <Input
                  label="Username (optional)"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); }}
                  placeholder="unique_username"
                  autoComplete="username"
                  disabled={isLoading}
                  error={fieldErrors.username}
                  helperText="3-20 characters, letters, numbers, underscores, hyphens"
                />
              )}

              {/* Display Name (Register only) */}
              {isRegisterMode && (
                <Input
                  label="Display Name (optional)"
                  type="text"
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); }}
                  placeholder="Your name"
                  autoComplete="name"
                  disabled={isLoading}
                />
              )}

              {/* Password Input */}
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); }}
                  placeholder="Enter your password"
                  autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                  disabled={isLoading}
                  error={fieldErrors.password}
                  required
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => { setShowPassword(!showPassword); }}
                  className="absolute right-3 top-[34px] p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] transition-all duration-200"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Confirm Password (Register only) */}
              {isRegisterMode && (
                <div className="relative">
                  <Input
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); }}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    error={fieldErrors.confirmPassword}
                    required
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => { setShowConfirmPassword(!showConfirmPassword); }}
                    className="absolute right-3 top-[34px] p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] transition-all duration-200"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                className="w-full !mt-6"
              >
                {isLoading
                  ? (isRegisterMode ? 'Creating account...' : 'Signing in...')
                  : (isRegisterMode ? 'Create Account' : 'Sign In')
                }
              </Button>
            </form>

            {/* Toggle Login/Register */}
            <div className="mt-6 pt-6 border-t border-[var(--border)] text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}{' '}
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode);
                    setPassword('');
                    setConfirmPassword('');
                    setShowPassword(false);
                    setShowConfirmPassword(false);
                    setFieldErrors({});
                    clearError();
                  }}
                  disabled={isLoading}
                  className="px-0 h-auto"
                >
                  {isRegisterMode ? 'Sign in' : 'Create one'}
                </Button>
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              {
                label: 'Smart Notes',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                ),
              },
              {
                label: 'AI Chat',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                ),
              },
              {
                label: 'RAG Search',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                ),
              },
            ].map((feature, index) => (
              <div
                key={feature.label}
                className="group text-center p-3 rounded-xl bg-[color-mix(in_srgb,var(--surface-card)_40%,transparent)] border border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-card)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[var(--shadow-sm)]"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex justify-center mb-1.5 text-[var(--color-brand-500)] group-hover:text-[var(--color-brand-400)] transition-colors">
                  {feature.icon}
                </div>
                <div className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  {feature.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
