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
    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${isSelected ? '' : 'insights-time-button'}`}
    style={{
      backgroundColor: isSelected ? 'var(--color-brand-600)' : undefined,
      color: isSelected ? 'white' : undefined,
      border: isSelected ? '1px solid var(--color-brand-600)' : undefined,
      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
    }}
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
    // Smooth opacity-only transition - no movement since skeleton is in place
    opacity: isAnimationReady ? 1 : 0,
    transitionProperty: 'opacity',
    transitionDuration: isWebKit ? '150ms' : '200ms',
    transitionTimingFunction: 'ease-out',
    transitionDelay: `${animationDelay}ms`,
    willChange: isAnimationReady ? 'auto' : 'opacity',
    backfaceVisibility: 'hidden',
  }), [isWebKit, isAnimationReady, animationDelay]);

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-6 insights-card ${isWebKit ? '' : 'backdrop-blur-md'}`}
      style={containerStyles}
    >
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0"
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
              className="text-base sm:text-lg lg:text-xl font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Notes Created Over Time
            </h2>
          </div>

          {/* Time Range Filters */}
          <div className="flex items-center gap-1 overflow-x-auto overflow-y-hidden thin-scrollbar -mx-1 px-1 py-0.5">
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
              <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--text-primary) 6%, transparent)" />
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
                  backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
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
