import { memo, ReactNode } from 'react';

interface ComingSoonPlaceholderProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export const ComingSoonPlaceholder = memo(function ComingSoonPlaceholder({
  icon,
  title,
  description,
}: ComingSoonPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] px-6">
      <div
        className="flex flex-col items-center text-center max-w-md p-8 rounded-3xl backdrop-blur-md"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg), 0 0 40px -15px var(--color-primary-alpha)',
        }}
      >
        {/* Icon with gradient background */}
        <div
          className="mb-6 p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary-alpha) 0%, transparent 100%)',
          }}
        >
          <div style={{ color: 'var(--color-primary)' }}>
            {icon}
          </div>
        </div>

        {/* Title */}
        <h3
          className="text-xl font-semibold mb-3"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {description}
        </p>

        {/* Coming Soon Badge */}
        <div
          className="mt-6 px-4 py-2 rounded-full text-xs font-medium"
          style={{
            backgroundColor: 'var(--color-primary-alpha)',
            color: 'var(--color-primary)',
            border: '1px solid var(--color-primary)',
          }}
        >
          Coming Soon
        </div>
      </div>
    </div>
  );
});
