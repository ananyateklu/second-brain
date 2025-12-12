import { memo, ReactNode, useMemo, CSSProperties } from 'react';

// Detect if running in Tauri (WebKit)
const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
};

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: ReactNode;
  show?: boolean;
  /** Animation style from parent */
  animationStyle?: CSSProperties;
  /** Index for staggered animations */
  index?: number;
  /** Whether animations are ready */
  isAnimationReady?: boolean;
}

export const StatCard = memo(({
  title,
  value,
  icon,
  subtitle,
  show = true,
  animationStyle,
  index: _index = 0,
  isAnimationReady = true,
}: StatCardProps) => {
  // Check platform once
  const isWebKit = useMemo(() => isTauri(), []);

  if (!show) return null;

  // Optimized styles based on platform
  // WebKit (Tauri) uses reduced blur and simpler effects for performance
  const cardStyles: CSSProperties = {
    backgroundColor: 'var(--surface-card)',
    borderColor: 'var(--border)',
    // Reduced shadow complexity for WebKit
    boxShadow: isWebKit
      ? 'var(--shadow-lg)'
      : 'var(--shadow-lg), 0 0 40px -15px var(--color-primary-alpha)',
    minHeight: '80px',
    // Smooth opacity-only transition for seamless skeleton blending
    // No translateY/scale since skeleton already matches exact layout
    // No stagger delay - all cards load simultaneously
    opacity: isAnimationReady ? 1 : 0,
    // Only opacity transition - no movement since skeleton is in place
    transitionProperty: 'opacity, box-shadow, border-color',
    transitionDuration: '200ms',
    transitionTimingFunction: 'ease-out',
    transitionDelay: '0ms',
    // GPU acceleration hints
    willChange: isAnimationReady ? 'auto' : 'opacity',
    backfaceVisibility: 'hidden',
    // Override with custom animation style if provided
    ...animationStyle,
  };

  // Glow effect styles - only show on non-WebKit platforms
  const glowStyles: CSSProperties = isWebKit
    ? { display: 'none' }
    : {
      background: 'radial-gradient(circle, var(--color-primary), transparent)',
      opacity: 0.15,
    };

  return (
    <div
      className={`
        rounded-2xl border p-4 
        hover:-translate-y-0.5 hover:border-[var(--color-brand-500)]
        flex flex-col h-full relative overflow-hidden
        ${isWebKit ? '' : 'backdrop-blur-md'}
      `}
      style={cardStyles}
    >
      {/* Ambient glow effect - hidden on WebKit for performance */}
      <div
        className="absolute -top-16 -right-16 w-32 h-32 rounded-full blur-2xl pointer-events-none"
        style={glowStyles}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-1">
          <h3
            className="text-[11px] font-medium flex-1 min-w-0 pr-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {title}
          </h3>
          <div
            className="scale-90 w-6 flex-shrink-0 flex items-center justify-center"
            style={{ color: 'var(--color-brand-600)' }}
          >
            {icon}
          </div>
        </div>
        <div className="flex-grow" />
        {subtitle ? (
          <div className="flex items-baseline justify-between">
            <p
              className="text-sm font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {value}
            </p>
            {subtitle}
          </div>
        ) : (
          <p
            className="text-sm font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {value}
          </p>
        )}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';
