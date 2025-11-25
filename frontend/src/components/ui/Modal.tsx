import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  maxWidth?: string;
  className?: string;
  headerAction?: ReactNode;
  subtitle?: ReactNode;
}

export function Modal({ isOpen, onClose, title, children, icon, maxWidth = 'max-w-2xl', className = '', headerAction, subtitle }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200"
      style={{
        backgroundColor: 'var(--modal-overlay)',
      }}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} rounded-3xl shadow-2xl border animate-in zoom-in-95 duration-200 modal-container ${className}`}
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-6 py-5 rounded-t-3xl modal-header"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--surface-elevated)',
          }}
        >
          <div className="flex items-center gap-3">
            {icon && (
              <div
                className="flex items-center justify-center w-6 h-6 rounded-lg"
                style={{
                  background: `linear-gradient(to bottom right, var(--color-brand-600), var(--color-brand-700))`,
                }}
              >
                {icon}
              </div>
            )}
            <div className="flex items-center gap-2">
              <h2
                className="font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h2>
              {subtitle && (
                <span
                  className="text-sm"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {subtitle}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
              style={{
                color: 'var(--text-tertiary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-tertiary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              aria-label="Close modal"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="p-6 rounded-b-3xl flex-1 overflow-hidden flex flex-col modal-content"
          style={{
            backgroundColor: 'var(--surface-elevated)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

