import { memo, ReactNode } from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: ReactNode;
  show?: boolean;
}

export const StatCard = memo(({ title, value, icon, subtitle, show = true }: StatCardProps) => {
  if (!show) return null;

  return (
    <div
      className="rounded-2xl border p-3 transition-all duration-200 hover:scale-[1.02] backdrop-blur-md flex flex-col h-full relative overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg), 0 0 40px -15px var(--color-primary-alpha)',
        minHeight: '80px',
      }}
    >
      {/* Ambient glow effect */}
      <div
        className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-15 blur-2xl pointer-events-none transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle, var(--color-primary), transparent)`,
        }}
      />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-[11px] font-medium flex-1 min-w-0 pr-2" style={{ color: 'var(--text-secondary)' }}>
            {title}
          </h3>
          <div className="scale-90 w-6 flex-shrink-0 flex items-center justify-center" style={{ color: 'var(--color-brand-600)' }}>
            {icon}
          </div>
        </div>
        <div className="flex-grow"></div>
        {subtitle ? (
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {value}
            </p>
            {subtitle}
          </div>
        ) : (
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {value}
          </p>
        )}
      </div>
    </div>
  );
});

