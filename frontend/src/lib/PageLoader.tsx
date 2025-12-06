import { useState, useEffect, useMemo } from 'react';

// Detect if running in Tauri (WebKit)
const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
};

/**
 * Page Loader Component
 * Optimized loading fallback for lazy-loaded pages with smooth fade-in animation
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
      className="flex items-center justify-center w-full h-full min-h-[200px] page-loader"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity ${animationDuration}ms ease-out, transform ${animationDuration}ms ease-out`,
        willChange: isVisible ? 'auto' : 'opacity, transform',
      }}
    >
      <div className="text-center">
        {/* Spinner */}
        <div className="mb-4">
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
                // Slower animation for WebKit to reduce CPU usage
                animationDuration: isWebKit ? '1s' : '0.75s',
              }}
            />
          </div>
        </div>

        {/* Loading Message */}
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Loading...
        </p>
      </div>
    </div>
  );
}
