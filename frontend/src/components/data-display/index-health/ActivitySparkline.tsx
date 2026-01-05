interface ActivitySparklineProps {
  lastIndexedAt: string | null;
}

/**
 * Generate mock activity data based on last indexed time.
 * Shows higher values near the last indexed time.
 */
function generateActivityData(lastIndexedAt: string | null): number[] {
  if (!lastIndexedAt) {
    // No indexing activity - return flat low values
    return [1, 1, 1, 1, 1, 1, 1];
  }

  const lastIndexedDate = new Date(lastIndexedAt);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - lastIndexedDate.getTime()) / (1000 * 60 * 60 * 24));

  // Generate 7 data points for last 7 days
  // Higher values near the last indexed day
  return Array.from({ length: 7 }, (_, i) => {
    const daysAgo = 6 - i;
    const distanceFromLastIndexed = Math.abs(daysAgo - Math.min(daysDiff, 6));

    // Create a peak near the last indexed day
    const value = Math.max(1, 7 - distanceFromLastIndexed * 1.2);
    return Math.round(value);
  });
}

/**
 * Simple SVG sparkline showing indexing activity trend.
 */
export function ActivitySparkline({ lastIndexedAt }: ActivitySparklineProps) {
  const data = generateActivityData(lastIndexedAt);
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const width = 80;
  const height = 20;
  const padding = 2;

  // Generate path points
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  // Create area fill path
  const areaPathD = `${pathD} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <div className="flex items-center gap-2">
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        aria-label="Indexing activity over last 7 days"
      >
        {/* Area fill */}
        <path
          d={areaPathD}
          fill="color-mix(in srgb, var(--color-brand-600) 10%, transparent)"
        />
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-brand-600)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dots at each point */}
        {data.map((value, index) => {
          const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
          const y = height - padding - ((value - min) / range) * (height - 2 * padding);
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={1.5}
              fill="var(--color-brand-600)"
            />
          );
        })}
      </svg>
      <span className="text-[10px] text-[var(--text-secondary)] whitespace-nowrap">
        Last 7 days
      </span>
    </div>
  );
}
