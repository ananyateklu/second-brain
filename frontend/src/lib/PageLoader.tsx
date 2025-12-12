import { useState, useEffect, useMemo } from 'react';
import brainLogo from '../assets/brain-top-tab.png';

// Detect if running in Tauri (WebKit)
const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
};

/**
 * Page Loader Component
 * Full-screen loading fallback for lazy-loaded pages, matching AppLoadingScreen style
 */
export function PageLoader() {
  const [isVisible, setIsVisible] = useState(false);
  const isWebKit = useMemo(() => isTauri(), []);

  // Delay showing the loader to prevent flash on fast loads
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100); // 100ms delay prevents flash for quick loads

    return () => clearTimeout(timer);
  }, []);

  // Animation configuration based on platform
  const animationDuration = isWebKit ? 200 : 300;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center page-loader"
      style={{
        background: 'var(--page-background)',
        backgroundColor: 'var(--background)',
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${animationDuration}ms ease-out`,
        willChange: isVisible ? 'auto' : 'opacity',
        zIndex: 50,
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
        <div className="mb-8">
          <div className="relative inline-block">
            {/* Glow effect behind logo */}
            <div
              className="absolute inset-0 rounded-full opacity-30 blur-2xl"
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

        {/* App Title */}
        <h1
          className="text-xl font-semibold mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          Second Brain
        </h1>

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
                animationDuration: isWebKit ? '1s' : '0.75s',
              }}
            />
          </div>
        </div>

        {/* Loading Message */}
        <p
          className="text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          Loading page...
        </p>
      </div>
    </div>
  );
}
