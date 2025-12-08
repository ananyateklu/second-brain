import { useMemo, CSSProperties, memo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TIME_RANGE_OPTIONS, TimeRangeOption } from '../utils/dashboard-utils';

// Detect if running in Tauri (WebKit)
const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
};

interface ChatUsageDataPoint {
  date: string;
  ragChats: number;
  regularChats: number;
  agentChats: number;
  imageGenChats: number;
}

interface ChatUsageChartProps {
  chatUsageChartData: ChatUsageDataPoint[];
  selectedTimeRange: number;
  onTimeRangeChange: (days: number) => void;
  ragChartColor: string;
  regularChartColor: string;
  agentChartColor: string;
  imageGenChartColor: string;
  /** Animation delay for staggered section entrance */
  animationDelay?: number;
  /** Whether animations are ready */
  isAnimationReady?: boolean;
}

// Line labels for display
const LINE_LABELS: Record<string, string> = {
  ragChats: 'RAG-Enhanced Chats',
  regularChats: 'Regular Chats',
  agentChats: 'Agent Chats',
  imageGenChats: 'Image Generation',
};

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
    className={`px-3 py-1.5 text-xs font-medium rounded-lg ${isSelected ? 'scale-105' : 'hover:scale-105'
      }`}
    style={{
      backgroundColor: isSelected ? 'var(--color-brand-600)' : 'var(--surface-elevated)',
      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
      border: `1px solid ${isSelected ? 'var(--color-brand-600)' : 'var(--border)'}`,
      // GPU-accelerated transitions on specific properties only
      transitionProperty: 'transform, background-color, color, border-color',
      transitionDuration: '200ms',
      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    }}
    onMouseEnter={(e) => {
      if (!isSelected) {
        e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }
    }}
    onMouseLeave={(e) => {
      if (!isSelected) {
        e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }
    }}
  >
    {option.label}
  </button>
));

TimeRangeButton.displayName = 'TimeRangeButton';

export function ChatUsageChart({
  chatUsageChartData,
  selectedTimeRange,
  onTimeRangeChange,
  ragChartColor,
  regularChartColor,
  agentChartColor,
  imageGenChartColor,
  animationDelay = 0,
  isAnimationReady = true,
}: ChatUsageChartProps) {
  // Check platform once for performance optimizations
  const isWebKit = useMemo(() => isTauri(), []);

  // Container animation styles - GPU accelerated
  const containerStyles = useMemo<CSSProperties>(() => ({
    backgroundColor: 'var(--surface-card)',
    borderColor: 'var(--border)',
    // Simpler shadow for WebKit
    boxShadow: isWebKit
      ? 'var(--shadow-lg)'
      : 'var(--shadow-lg), 0 0 60px -20px var(--color-primary-alpha)',
    // Animation properties
    opacity: isAnimationReady ? 1 : 0,
    transform: isAnimationReady ? 'translateY(0)' : 'translateY(16px)',
    transitionProperty: 'opacity, transform',
    transitionDuration: isWebKit ? '300ms' : '400ms',
    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
    transitionDelay: `${animationDelay}ms`,
    willChange: isAnimationReady ? 'auto' : 'transform, opacity',
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

  if (chatUsageChartData.length === 0) return null;

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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h2
              className="text-xl font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Chat Usage Over Time
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
            <LineChart data={chatUsageChartData}>
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
                        ? Math.max(0, Math.floor(chatUsageChartData.length / 8) - 1)
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
                formatter={(value: number, name: string) => [
                  `${value}`,
                  LINE_LABELS[name] || name
                ]}
                // Disable animation on WebKit for smoother tooltips
                isAnimationActive={!isWebKit}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="line"
                formatter={(value) => (
                  <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                    {LINE_LABELS[value] || value}
                  </span>
                )}
              />
              <Line
                type="monotone"
                dataKey="ragChats"
                stroke={ragChartColor}
                strokeWidth={2}
                dot={{ fill: ragChartColor, r: 4 }}
                activeDot={{ r: 6 }}
                name="ragChats"
                animationDuration={isWebKit ? 300 : 500}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="regularChats"
                stroke={regularChartColor}
                strokeWidth={2}
                dot={{ fill: regularChartColor, r: 4 }}
                activeDot={{ r: 6 }}
                name="regularChats"
                animationDuration={isWebKit ? 300 : 500}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="agentChats"
                stroke={agentChartColor}
                strokeWidth={2}
                dot={{ fill: agentChartColor, r: 4 }}
                activeDot={{ r: 6 }}
                name="agentChats"
                animationDuration={isWebKit ? 300 : 500}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="imageGenChats"
                stroke={imageGenChartColor}
                strokeWidth={2}
                dot={{ fill: imageGenChartColor, r: 4 }}
                activeDot={{ r: 6 }}
                name="imageGenChats"
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
