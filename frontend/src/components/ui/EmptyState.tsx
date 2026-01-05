import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="rounded-2xl backdrop-blur-sm border p-12 text-center"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--surface-card) 85%, transparent)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
        boxShadow: '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
        animation: 'emptyStateFadeIn 0.4s ease-out',
      }}
    >
      <div className="max-w-md mx-auto">
        {icon && (
          <div className="relative inline-block mb-6 group">
            {/* Glow effect behind icon */}
            <div
              className="absolute inset-0 rounded-full blur-2xl transition-opacity duration-500 group-hover:opacity-40"
              style={{
                background: 'radial-gradient(circle, var(--color-brand-500), transparent)',
                opacity: 0.25,
                transform: 'scale(1.8)',
              }}
            />
            <div
              className="relative z-10 inline-flex items-center justify-center w-16 h-16 rounded-full transition-transform duration-300 group-hover:scale-105"
              style={{
                background: `linear-gradient(to bottom right, var(--gradient-brand-start), var(--gradient-brand-end))`,
              }}
            >
              {icon}
            </div>
          </div>
        )}
        <h3
          className="font-semibold mb-2 text-lg"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h3>
        <p
          className="text-base mb-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          {description}
        </p>
        {action}
      </div>
    </div>
  );
}

