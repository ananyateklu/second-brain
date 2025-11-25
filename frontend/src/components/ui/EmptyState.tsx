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
      className="rounded-2xl backdrop-blur-sm border p-16 text-center shadow-lg"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="max-w-md mx-auto">
        {icon && (
          <div
            className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full"
            style={{
              background: `linear-gradient(to bottom right, var(--gradient-brand-start), var(--gradient-brand-end))`,
            }}
          >
            {icon}
          </div>
        )}
        <h3
          className="font-semibold mb-2"
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

