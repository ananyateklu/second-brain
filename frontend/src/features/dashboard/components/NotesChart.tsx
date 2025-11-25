import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TIME_RANGE_OPTIONS, TimeRangeOption } from '../utils/dashboard-utils';

interface ChartDataPoint {
  date: string;
  count: number;
}

interface NotesChartProps {
  chartData: ChartDataPoint[];
  selectedTimeRange: number;
  onTimeRangeChange: (days: number) => void;
}

export function NotesChart({ chartData, selectedTimeRange, onTimeRangeChange }: NotesChartProps) {
  return (
    <div
      className="rounded-3xl border p-6 backdrop-blur-md relative overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg), 0 0 60px -20px var(--color-primary-alpha)',
      }}
    >
      {/* Ambient glow effect */}
      <div
        className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle, var(--color-primary), transparent)`,
        }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" style={{ color: 'var(--color-brand-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Notes Created Over Time
            </h2>
          </div>
          {/* Time Range Filters */}
          <div className="flex items-center gap-1">
            {TIME_RANGE_OPTIONS.map((option: TimeRangeOption) => (
              <button
                key={option.days}
                onClick={() => onTimeRangeChange(option.days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${selectedTimeRange === option.days
                  ? 'scale-105'
                  : 'hover:scale-105'
                  }`}
                style={{
                  backgroundColor: selectedTimeRange === option.days
                    ? 'var(--color-brand-600)'
                    : 'var(--surface-elevated)',
                  color: selectedTimeRange === option.days
                    ? '#ffffff'
                    : 'var(--text-secondary)',
                  border: `1px solid ${selectedTimeRange === option.days
                    ? 'var(--color-brand-600)'
                    : 'var(--border)'}`,
                }}
                onMouseEnter={(e) => {
                  if (selectedTimeRange !== option.days) {
                    e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTimeRange !== option.days) {
                    e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
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
                      ? 0 // Show all weekly labels for 90 days (already grouped by week, ~12-13 points)
                      : selectedTimeRange === 30
                        ? Math.max(0, Math.floor(chartData.length / 8) - 1) // Show ~8 labels for 30 days (every ~4th label)
                        : selectedTimeRange === 7
                          ? 0 // Show all labels for 7 days
                          : 0 // Default: show all
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
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-primary)', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

