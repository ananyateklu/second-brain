import { useMemo, CSSProperties, memo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TIME_RANGE_OPTIONS, TimeRangeOption } from '../utils/dashboard-utils';

// Detect if running in Tauri (WebKit)
const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
};

interface ChartDataPoint {
  date: string;
  count: number;
}

interface NotesChartProps {
  chartData: ChartDataPoint[];
  selectedTimeRange: number;
  onTimeRangeChange: (days: number) => void;
  /** Animation delay for staggered section entrance */
  animationDelay?: number;
  /** Whether animations are ready */
  isAnimationReady?: boolean;
}

// Memoized time range button to prevent unnecessary re-renders
const TimeRangeButton = memo(({
  option,
  isSelected,
  onClick
}: {
  option: TimeRangeOption;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-[transform,background-color,color,border-color] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
      isSelected
        ? 'scale-105 bg-[var(--color-brand-600)] text-white border border-[var(--color-brand-600)]'
        : 'hover:scale-105 bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
    }`}
  >
    {option.label}
  </button>
));

TimeRangeButton.displayName = 'TimeRangeButton';

export function NotesChart({
  chartData,
  selectedTimeRange,
  onTimeRangeChange,
  animationDelay = 0,
  isAnimationReady = true,
}: NotesChartProps) {
  // Check platform once for performance optimizations
  const isWebKit = useMemo(() => isTauri(), []);

  // Container animation styles - smooth opacity-only transition for skeleton blending
  const containerStyles = useMemo<CSSProperties>(() => ({
    backgroundColor: 'var(--surface-card)',
    borderColor: 'var(--border)',
    // Simpler shadow for WebKit
    boxShadow: isWebKit
      ? 'var(--shadow-lg)'
      : 'var(--shadow-lg), 0 0 60px -20px var(--color-primary-alpha)',
    // Smooth opacity-only transition - no movement since skeleton is in place
    opacity: isAnimationReady ? 1 : 0,
    transitionProperty: 'opacity',
    transitionDuration: isWebKit ? '150ms' : '200ms',
    transitionTimingFunction: 'ease-out',
    transitionDelay: `${animationDelay}ms`,
    willChange: isAnimationReady ? 'auto' : 'opacity',
    backfaceVisibility: 'hidden',
  }), [isWebKit, isAnimationReady, animationDelay]);

  // Glow effect styles - disabled on WebKit
  const glowStyles = useMemo<CSSProperties>(() =>
    isWebKit
      ? { display: 'none' }
      : {
        background: 'radial-gradient(circle, var(--color-primary), transparent)',
        opacity: 0.2,
      },
    [isWebKit]
  );

  return (
    <div
      className={`rounded-3xl border p-6 relative overflow-hidden ${isWebKit ? '' : 'backdrop-blur-md'}`}
      style={containerStyles}
    >
      {/* Ambient glow effect - hidden on WebKit for performance */}
      <div
        className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={glowStyles}
        aria-hidden="true"
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5"
              style={{ color: 'var(--color-brand-600)' }}
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
            <h2
              className="text-xl font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Notes Created Over Time
            </h2>
          </div>

          {/* Time Range Filters */}
          <div className="flex items-center gap-1">
            {TIME_RANGE_OPTIONS.map((option: TimeRangeOption) => (
              <TimeRangeButton
                key={option.days}
                option={option}
                isSelected={selectedTimeRange === option.days}
                onClick={() => onTimeRangeChange(option.days)}
              />
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <ResponsiveContainer width="100%" height={192}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                stroke="var(--text-secondary)"
                style={{ fontSize: '12px' }}
                angle={selectedTimeRange > 90 ? -45 : 0}
                textAnchor={selectedTimeRange > 90 ? 'end' : 'middle'}
                height={selectedTimeRange > 90 ? 60 : 30}
                interval={
                  selectedTimeRange > 180
                    ? 'preserveStartEnd'
                    : selectedTimeRange === 90
                      ? 0
                      : selectedTimeRange === 30
                        ? Math.max(0, Math.floor(chartData.length / 8) - 1)
                        : selectedTimeRange === 7
                          ? 0
                          : 0
                }
              />
              <YAxis
                stroke="var(--text-secondary)"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                }}
                labelStyle={{ color: 'var(--text-primary)' }}
                // Disable animation on WebKit for smoother tooltips
                isAnimationActive={!isWebKit}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-primary)', r: 4 }}
                activeDot={{ r: 6 }}
                // Faster animation on WebKit, or disable if needed
                animationDuration={isWebKit ? 300 : 500}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
