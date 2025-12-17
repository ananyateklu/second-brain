/**
 * Toast Item Component
 * Individual toast notification with glassmorphism styling and animations
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Toast } from './ToastContext';
import { useToastContext } from './use-toast-context';
import styles from '@styles/components/toast.module.css';

// ============================================
// Icons
// ============================================

const SuccessIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const WarningIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const InfoIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LoadingIcon = () => (
  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ============================================
// Type-based style configurations
// ============================================

const typeConfig = {
  success: {
    icon: <SuccessIcon />,
    containerClass: 'border-[var(--color-brand-600)]',
    iconBgClass: 'bg-[color-mix(in_srgb,var(--color-brand-600)_20%,transparent)]',
    iconColorClass: 'text-[var(--color-brand-400)]',
    progressColorClass: 'bg-[var(--color-brand-500)]',
  },
  error: {
    icon: <ErrorIcon />,
    containerClass: 'border-[var(--color-error-border)]',
    iconBgClass: 'bg-[color-mix(in_srgb,var(--color-error)_15%,transparent)]',
    iconColorClass: 'text-[var(--color-error-text-light)]',
    progressColorClass: 'bg-[var(--color-error)]',
  },
  warning: {
    icon: <WarningIcon />,
    containerClass: 'border-amber-500',
    iconBgClass: 'bg-amber-500/15',
    iconColorClass: 'text-amber-400',
    progressColorClass: 'bg-amber-500',
  },
  info: {
    icon: <InfoIcon />,
    containerClass: 'border-[var(--color-accent-blue)]',
    iconBgClass: 'bg-[color-mix(in_srgb,var(--color-accent-blue)_15%,transparent)]',
    iconColorClass: 'text-[var(--color-accent-blue)]',
    progressColorClass: 'bg-[var(--color-accent-blue)]',
  },
  loading: {
    icon: <LoadingIcon />,
    containerClass: 'border-[var(--border)]',
    iconBgClass: 'bg-[color-mix(in_srgb,var(--color-brand-600)_15%,transparent)]',
    iconColorClass: 'text-[var(--color-brand-400)]',
    progressColorClass: 'bg-[var(--color-brand-500)]',
  },
  default: {
    icon: null,
    containerClass: 'border-[var(--border)]',
    iconBgClass: 'bg-[var(--surface-elevated)]',
    iconColorClass: 'text-[var(--text-secondary)]',
    progressColorClass: 'bg-[var(--color-brand-500)]',
  },
};

// ============================================
// Toast Item Component
// ============================================

interface ToastItemProps {
  toast: Toast;
  index: number;
}

export function ToastItem({ toast, index }: ToastItemProps) {
  const { removeToast } = useToastContext();
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  // Use state with lazy initializer to capture start time on mount
  const [startTime] = useState(() => Date.now());
  const startTimeRef = useRef(startTime);
  const remainingTimeRef = useRef(toast.duration);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const handleDismiss = useCallback(() => {
    toast.onDismiss?.();
    removeToast(toast.id);
  }, [removeToast, toast]);

  // Progress bar animation
  useEffect(() => {
    if (toast.type === 'loading' || toast.duration === Infinity) {
      return;
    }

    const animate = () => {
      if (isPaused) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = remainingTimeRef.current - elapsed;
      const newProgress = Math.max(0, (remaining / toast.duration) * 100);

      setProgress(newProgress);

      if (remaining <= 0) {
        toast.onAutoClose?.();
        removeToast(toast.id);
      } else {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [toast, removeToast, isPaused]);

  // Handle pause/resume
  const handleMouseEnter = () => {
    if (toast.type !== 'loading' && toast.duration !== Infinity) {
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = remainingTimeRef.current - elapsed;
      setIsPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (toast.type !== 'loading' && toast.duration !== Infinity) {
      startTimeRef.current = Date.now();
      setIsPaused(false);
    }
  };

  // Get config based on type
  const config = typeConfig[toast.type] || typeConfig.default;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        ${styles.item}
        relative overflow-hidden rounded-2xl border
        bg-[var(--glass-bg)] backdrop-blur-[16px]
        shadow-[0_20px_40px_-12px_rgba(0,0,0,0.35),0_8px_16px_-8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]
        transition-all duration-300 ease-out
        min-w-[280px] max-w-[360px]
        ${config.containerClass}
        ${toast.isExiting ? styles.exit : styles.enter}
      `}
      style={{
        transform: `translateY(${index * 4}px)`,
        zIndex: 100 - index,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main Content */}
      <div className="flex items-start gap-2.5 p-3">
        {/* Icon */}
        {config.icon && (
          <div
            className={`
              flex-shrink-0 flex items-center justify-center
              w-7 h-7 rounded-xl
              ${config.iconBgClass} ${config.iconColorClass}
            `}
          >
            {config.icon}
          </div>
        )}

        {/* Text Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <span className="block font-semibold text-xs leading-tight text-[var(--text-primary)]">
            {toast.title}
          </span>
          {toast.description && (
            <span className="block mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
              {toast.description}
            </span>
          )}

          {/* Action Buttons */}
          {(toast.action || toast.cancel) && (
            <div className="flex items-center gap-1.5 mt-2">
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    handleDismiss();
                  }}
                  className="
                    px-2.5 py-1 text-[11px] font-semibold rounded-md
                    bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]
                    transition-all duration-200 hover:scale-105 active:scale-95
                  "
                >
                  {toast.action.label}
                </button>
              )}
              {toast.cancel && (
                <button
                  onClick={() => {
                    toast.cancel?.onClick();
                    handleDismiss();
                  }}
                  className="
                    px-2.5 py-1 text-[11px] font-medium rounded-md
                    bg-transparent text-[var(--text-secondary)]
                    border border-[var(--border)]
                    transition-all duration-200 hover:scale-105 active:scale-95
                  "
                >
                  {toast.cancel.label}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        {toast.type !== 'loading' && (
          <button
            onClick={handleDismiss}
            className="
              flex-shrink-0 flex items-center justify-center
              w-6 h-6 rounded-md
              text-[var(--text-tertiary)] bg-transparent
              transition-all duration-200 hover:scale-110 active:scale-95
              hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]
            "
            aria-label="Dismiss notification"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {toast.type !== 'loading' && toast.duration !== Infinity && (
        <div
          className={`absolute bottom-0 left-0 h-0.5 opacity-60 ${config.progressColorClass}`}
          style={{ width: `${progress}%` }}
        />
      )}
    </div>
  );
}
