import type { HealthIndicatorProps } from './types';

/**
 * Health indicator dot that shows indexing status.
 * Green = healthy, warning = needs attention, muted = no data.
 */
export function HealthIndicator({ isHealthy, hasData }: HealthIndicatorProps) {
  if (!hasData) {
    return (
      <span
        className="w-1.5 h-1.5 rounded-full opacity-50"
        style={{ backgroundColor: 'var(--text-secondary)' }}
        title="No data"
      />
    );
  }

  const color = isHealthy ? 'var(--color-success)' : 'var(--color-warning)';

  return (
    <span
      className="w-1.5 h-1.5 rounded-full"
      style={{
        backgroundColor: color,
      }}
      title={isHealthy ? 'Healthy' : 'Needs attention'}
    />
  );
}
