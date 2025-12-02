import { useState, useRef, useEffect, ReactNode } from 'react';

export interface FeatureModePillProps {
  /** Unique identifier for the feature */
  featureId: string;
  /** Display label for the pill */
  label: string;
  /** Icon element to display */
  icon: ReactNode;
  /** Whether the feature is currently active/enabled */
  isActive: boolean;
  /** Called when the pill is clicked (for direct toggle features like Image mode) */
  onClick?: () => void;
  /** Whether the pill is disabled */
  disabled?: boolean;
  /** Color scheme for active state */
  activeColor?: {
    bg: string;
    text: string;
    border: string;
    dot: string;
  };
  /** Popover content (if provided, clicking opens popover instead of direct toggle) */
  popoverContent?: ReactNode;
  /** Title for the popover header */
  popoverTitle?: string;
  /** Custom width for the popover (default: 260px) */
  popoverWidth?: string;
  /** Badge items to show (icons with colors for enabled features) */
  badgeItems?: Array<{
    icon: ReactNode;
    color: string;
  }>;
}

const defaultColors = {
  bg: 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)',
  text: 'var(--color-brand-400)',
  border: 'var(--color-brand-500)',
  dot: 'var(--color-brand-400)',
};

export function FeatureModePill({
  featureId,
  label,
  icon,
  isActive,
  onClick,
  disabled = false,
  activeColor = defaultColors,
  popoverContent,
  popoverTitle,
  popoverWidth = '260px',
  badgeItems,
}: FeatureModePillProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    };

    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isPopoverOpen]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPopoverOpen) {
        setIsPopoverOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isPopoverOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPopoverOpen]);

  const handleClick = () => {
    if (disabled) return;

    if (popoverContent) {
      setIsPopoverOpen(!isPopoverOpen);
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-pressed={isActive}
        aria-expanded={popoverContent ? isPopoverOpen : undefined}
        aria-haspopup={popoverContent ? 'dialog' : undefined}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.03] active:scale-[0.97]'}
        `}
        style={{
          backgroundColor: isActive ? activeColor.bg : 'var(--surface-card)',
          color: isActive ? activeColor.text : 'var(--text-secondary)',
          border: `1px solid ${isActive ? activeColor.border : 'var(--border)'}`,
          boxShadow: isActive
            ? `0 0 12px -4px ${activeColor.border}`
            : 'none',
        }}
        data-feature={featureId}
      >
        {/* Icon */}
        <span className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center">
          {icon}
        </span>

        {/* Label */}
        <span>{label}</span>

        {/* Badge indicators (icons for enabled features) */}
        {badgeItems && badgeItems.length > 0 && (
          <span className="flex items-center gap-1 flex-shrink-0">
            {badgeItems.map((item, index) => (
              item.icon ? (
                <span
                  key={index}
                  className="flex items-center justify-center w-4 h-4 rounded-md flex-shrink-0"
                  style={{
                    backgroundColor: isActive
                      ? `color-mix(in srgb, ${item.color} 20%, transparent)`
                      : 'var(--surface-elevated)',
                    color: item.color,
                  }}
                >
                  <span className="w-3 h-3 flex items-center justify-center">
                    {item.icon}
                  </span>
                </span>
              ) : null
            ))}
          </span>
        )}

        {/* Active indicator dot */}
        {isActive && (!badgeItems || badgeItems.length === 0) && (
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
            style={{ backgroundColor: activeColor.dot }}
          />
        )}

        {/* Dropdown indicator for popover pills */}
        {popoverContent && (
          <svg
            className={`w-3 h-3 transition-transform duration-200 flex-shrink-0 ml-0.5 ${isPopoverOpen ? 'rotate-180' : ''}`}
            style={{ color: isActive ? activeColor.text : 'var(--text-tertiary)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Popover */}
      {popoverContent && isPopoverOpen && (
        <>
          {/* Backdrop - semi-transparent for focus */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsPopoverOpen(false)}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
          />

          <div
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              backgroundColor: 'var(--surface-card-solid, var(--surface-card))',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-xl), 0 0 40px -10px rgba(0, 0, 0, 0.3)',
              minWidth: popoverWidth,
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            }}
            role="dialog"
            aria-label={popoverTitle || `${label} settings`}
          >
            {/* Popover Header */}
            {popoverTitle && (
              <div
                className="px-4 py-3 border-b flex items-center justify-between"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'color-mix(in srgb, var(--surface) 50%, transparent)',
                }}
              >
                <h3
                  className="text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {popoverTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPopoverOpen(false)}
                  className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                  style={{
                    color: 'var(--text-tertiary)',
                    backgroundColor: 'var(--surface)',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Popover Content */}
            <div className="p-4">
              {popoverContent}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Pre-defined color schemes for different features
export const featureColors = {
  rag: {
    bg: 'color-mix(in srgb, var(--color-accent-blue) 15%, transparent)',
    text: 'var(--color-accent-blue-text)',
    border: 'var(--color-accent-blue-border)',
    dot: 'var(--color-accent-blue-dot)',
  },
  agent: {
    bg: 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)',
    text: 'var(--color-brand-400)',
    border: 'var(--color-brand-500)',
    dot: 'var(--color-brand-400)',
  },
  image: {
    bg: 'color-mix(in srgb, var(--color-accent-purple) 15%, transparent)',
    text: 'var(--color-accent-purple-text)',
    border: 'var(--color-accent-purple-border)',
    dot: 'var(--color-accent-purple-dot)',
  },
};

// Icon components for each feature
export const FeatureIcons = {
  RAG: () => (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  Agent: () => (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  Image: () => (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
};

