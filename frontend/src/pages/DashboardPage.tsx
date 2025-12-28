/**
 * Dashboard Page
 * Placeholder page for future dashboard features
 */

import { memo } from 'react';
import { useTitleBarHeight } from '../components/layout/use-title-bar-height';

export const DashboardPage = memo(function DashboardPage() {
  const titleBarHeight = useTitleBarHeight();

  // Calculate container height - accounts for title bar and header
  const containerHeight = `calc(100vh - ${titleBarHeight}px - 113px)`;

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        height: containerHeight,
        maxHeight: containerHeight,
      }}
    >
      <div
        className="flex flex-col items-center text-center max-w-lg p-10 rounded-3xl backdrop-blur-md"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg), 0 0 60px -20px var(--color-primary-alpha)',
        }}
      >
        {/* Icon */}
        <div
          className="mb-8 p-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary-alpha) 0%, transparent 100%)',
          }}
        >
          <svg
            className="h-16 w-16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            style={{ color: 'var(--color-primary)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-bold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          Dashboard
        </h2>

        {/* Description */}
        <p
          className="text-base leading-relaxed mb-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          Your personalized dashboard is coming soon. This will be your central hub for quick access to recent notes, pinned items, and personalized recommendations.
        </p>

        {/* Hint */}
        <p
          className="text-sm"
          style={{ color: 'var(--text-tertiary)' }}
        >
          In the meantime, check out the{' '}
          <a
            href="/insights"
            className="font-medium underline-offset-2 hover:underline"
            style={{ color: 'var(--color-primary)' }}
          >
            Insights
          </a>
          {' '}page for analytics and statistics.
        </p>
      </div>
    </div>
  );
});
