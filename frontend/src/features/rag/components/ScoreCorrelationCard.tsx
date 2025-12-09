/**
 * Card showing correlation between scores and user satisfaction
 * Modern glassmorphism design with gradient progress bars
 */

import { memo } from 'react';
import type { RagPerformanceStats } from '../../../types/rag';

interface ScoreCorrelationCardProps {
  stats: RagPerformanceStats;
}

interface CorrelationBarProps {
  label: string;
  value: number | null;
  avgScore: number;
  description: string;
  gradientColors: [string, string];
}

const CorrelationBar = memo(({
  label,
  value,
  avgScore,
  description,
  gradientColors,
}: CorrelationBarProps) => {
  const hasData = value !== null;
  const correlation = value ?? 0;

  // Convert correlation to percentage for bar width (0-100)
  const barWidth = Math.abs(correlation) * 100;
  const isPositive = correlation >= 0;

  // Color based on correlation strength
  const getColor = () => {
    if (!hasData) return 'var(--text-tertiary)';
    if (Math.abs(correlation) < 0.2) return '#fbbf24';
    if (isPositive) return 'var(--color-brand-400)';
    return 'var(--color-error)';
  };

  const getCorrelationLabel = () => {
    if (!hasData) return 'Insufficient data';
    if (Math.abs(correlation) < 0.2) return 'Weak';
    if (Math.abs(correlation) < 0.5) return 'Moderate';
    return 'Strong';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {label}
          </p>
          <p
            className="text-xs mt-0.5 leading-relaxed"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {description}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p
            className="text-base font-mono font-bold tabular-nums"
            style={{ color: getColor() }}
          >
            {hasData ? correlation.toFixed(3) : 'N/A'}
          </p>
          <p
            className="text-xs tabular-nums"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Avg: {avgScore.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Correlation bar with gradient */}
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.max(barWidth, 2)}%`,
            background: hasData
              ? `linear-gradient(90deg, ${gradientColors[0]}, ${gradientColors[1]})`
              : 'var(--text-tertiary)',
            opacity: hasData ? 1 : 0.3,
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-1.5 text-xs"
          style={{ color: getColor() }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getColor() }}
          />
          <span className="font-medium">
            {getCorrelationLabel()} {isPositive && hasData ? 'positive' : hasData ? 'negative' : ''} correlation
          </span>
        </div>
      </div>
    </div>
  );
});

export const ScoreCorrelationCard = memo(({ stats }: ScoreCorrelationCardProps) => {
  const hasEnoughData = stats.queriesWithFeedback >= 10;

  return (
    <div
      className="rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-0.5 backdrop-blur-md relative overflow-hidden group"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg), 0 0 40px -15px var(--color-primary-alpha)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-15 blur-3xl pointer-events-none transition-opacity duration-500 group-hover:opacity-25"
        style={{
          background: 'radial-gradient(circle, var(--color-brand-400), transparent)',
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="p-2.5 rounded-xl"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)',
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--color-brand-400)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Score Correlation Analysis
          </h3>
        </div>

        {!hasEnoughData && (
          <div
            className="p-3 rounded-xl mb-4 text-sm"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: '#fbbf24' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p
                  className="font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Need more feedback data
                </p>
                <p
                  className="mt-1"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Collect at least 10 feedback responses to see meaningful correlations between scores and user satisfaction.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <CorrelationBar
            label="Cosine Similarity"
            value={stats.cosineScoreCorrelation}
            avgScore={stats.avgCosineScore}
            description="Correlation between semantic similarity and positive feedback"
            gradientColors={['var(--color-brand-500)', 'var(--color-brand-300)']}
          />

          <CorrelationBar
            label="Rerank Score"
            value={stats.rerankScoreCorrelation}
            avgScore={stats.avgRerankScore}
            description="Correlation between reranking relevance and positive feedback"
            gradientColors={['var(--color-accent-blue)', '#60a5fa']}
          />
        </div>

        <div
          className="mt-4 pt-3 border-t text-xs leading-relaxed"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-tertiary)'
          }}
        >
          <p>
            <strong style={{ color: 'var(--text-secondary)' }}>Interpretation:</strong> A high positive correlation (closer to 1) indicates that
            higher scores reliably predict user satisfaction. Use this to calibrate your similarity thresholds.
          </p>
        </div>
      </div>
    </div>
  );
});
