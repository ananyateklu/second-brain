/**
 * Stats cards for RAG analytics dashboard
 * Modern glassmorphism design with ambient glow effects
 */

import { memo } from 'react';
import type { RagPerformanceStats } from '../../../types/rag';

interface RagStatsCardsProps {
  stats: RagPerformanceStats;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accentColor?: string;
  trend?: {
    type: 'positive' | 'negative' | 'neutral';
    label: string;
  };
}

const StatCard = memo(({
  title,
  value,
  subtitle,
  icon,
  accentColor = 'var(--color-primary)',
  trend,
}: StatCardProps) => {
  const trendColors = {
    positive: 'var(--color-brand-400)',
    negative: 'var(--color-error)',
    neutral: 'var(--text-tertiary)',
  };

  return (
    <div
      className="rounded-2xl border p-3 transition-transform duration-200 hover:-translate-y-0.5 backdrop-blur-md flex flex-col h-full relative overflow-hidden"
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
          background: `radial-gradient(circle, ${accentColor}, transparent)`,
        }}
      />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-1">
          <h3
            className="text-[11px] font-medium flex-1 min-w-0 pr-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {title}
          </h3>
          <div className="scale-90 w-6 flex-shrink-0 flex items-center justify-center" style={{ color: 'var(--color-brand-600)' }}>
            {icon}
          </div>
        </div>

        <div className="flex-grow"></div>

        {subtitle ? (
          <div className="flex items-baseline justify-between">
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {value}
            </p>
            <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
              {subtitle}
            </p>
          </div>
        ) : (
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {value}
          </p>
        )}
        {trend && (
          <p
            className="text-[9px] mt-1 font-medium"
            style={{ color: trendColors[trend.type] }}
          >
            {trend.label}
          </p>
        )}
      </div>
    </div>
  );
});

export const RagStatsCards = memo(({ stats }: RagStatsCardsProps) => {
  const feedbackRate = stats.queriesWithFeedback > 0
    ? Math.round(stats.positiveFeedbackRate * 100)
    : 0;

  const avgTimeFormatted = stats.avgTotalTimeMs > 1000
    ? `${(stats.avgTotalTimeMs / 1000).toFixed(1)}s`
    : `${Math.round(stats.avgTotalTimeMs)}ms`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total Queries */}
      <StatCard
        title="Total Queries"
        value={stats.totalQueries.toLocaleString()}
        subtitle="RAG-enhanced searches"
        accentColor="var(--color-brand-500)"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        }
      />

      {/* Satisfaction Rate */}
      <StatCard
        title="Satisfaction Rate"
        value={`${feedbackRate}%`}
        subtitle={`${stats.queriesWithFeedback} rated`}
        accentColor={feedbackRate >= 70 ? 'var(--color-brand-400)' : 'var(--color-error)'}
        trend={{
          type: feedbackRate >= 70 ? 'positive' : feedbackRate >= 50 ? 'neutral' : 'negative',
          label: `${stats.positiveFeedback} positive / ${stats.negativeFeedback} negative`,
        }}
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"
            />
          </svg>
        }
      />

      {/* Average Response Time */}
      <StatCard
        title="Avg Response Time"
        value={avgTimeFormatted}
        subtitle="Query to results"
        accentColor="var(--color-accent-blue)"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />

      {/* Average Retrieved */}
      <StatCard
        title="Avg Documents"
        value={stats.avgRetrievedCount.toFixed(1)}
        subtitle="Retrieved per query"
        accentColor="var(--color-brand-300)"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
      />
    </div>
  );
});
