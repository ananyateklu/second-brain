/**
 * Feedback Summary Card for RAG Analytics
 * Displays user satisfaction breakdown with progress bars
 */

interface FeedbackSummaryCardProps {
  stats: {
    totalQueries: number;
    queriesWithFeedback: number;
    positiveFeedback: number;
    negativeFeedback: number;
  };
}

export function FeedbackSummaryCard({ stats }: FeedbackSummaryCardProps) {
  return (
    <div
      className="rounded-2xl p-3 transition-transform duration-200 hover:-translate-y-0.5 backdrop-blur-md relative overflow-hidden group"
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
        <div className="flex items-center gap-2 mb-3">
          <div
            className="p-2 rounded-lg"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)',
            }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--color-brand-400)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          <div>
            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Feedback Summary
            </h3>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              User satisfaction breakdown
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Positive Feedback */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: 'var(--text-secondary)' }}>Positive Feedback</span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: 'var(--color-brand-400)' }}
              >
                {stats.positiveFeedback}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: stats.queriesWithFeedback > 0
                    ? `${(stats.positiveFeedback / stats.queriesWithFeedback) * 100}%`
                    : '0%',
                  background: 'linear-gradient(90deg, var(--color-brand-500), var(--color-brand-400))',
                }}
              />
            </div>
          </div>

          {/* Negative Feedback */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: 'var(--text-secondary)' }}>Negative Feedback</span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: 'var(--color-error)' }}
              >
                {stats.negativeFeedback}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: stats.queriesWithFeedback > 0
                    ? `${(stats.negativeFeedback / stats.queriesWithFeedback) * 100}%`
                    : '0%',
                  background: 'linear-gradient(90deg, var(--color-error), #f87171)',
                }}
              />
            </div>
          </div>

          {/* No Feedback */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: 'var(--text-secondary)' }}>Awaiting Feedback</span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {stats.totalQueries - stats.queriesWithFeedback}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${((stats.totalQueries - stats.queriesWithFeedback) / stats.totalQueries) * 100}%`,
                  backgroundColor: 'var(--text-tertiary)',
                  opacity: 0.4,
                }}
              />
            </div>
          </div>
        </div>

        <div
          className="mt-3 pt-2 border-t text-[10px] leading-relaxed"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-tertiary)'
          }}
        >
          <p>
            Collecting more feedback helps identify problem areas and improve RAG quality.
          </p>
        </div>
      </div>
    </div>
  );
}
