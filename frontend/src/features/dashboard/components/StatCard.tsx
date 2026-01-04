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
  const cardStyles: CSSProperties = {
    backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
    borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
    minHeight: '80px',
    // Smooth opacity-only transition for seamless skeleton blending
    opacity: isAnimationReady ? 1 : 0,
    transitionProperty: 'opacity, border-color',
    transitionDuration: '200ms',
    transitionTimingFunction: 'ease-out',
    transitionDelay: '0ms',
    willChange: isAnimationReady ? 'auto' : 'opacity',
    backfaceVisibility: 'hidden',
    ...animationStyle,
  };

  return (
    <div
      className={`
        rounded-2xl border p-4
        hover:-translate-y-0.5
        flex flex-col h-full
        transition-all duration-200
        ${isWebKit ? '' : 'backdrop-blur-md'}
      `}
      style={cardStyles}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand-500)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)'; }}
    >
      <div className="flex flex-col h-full">
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
