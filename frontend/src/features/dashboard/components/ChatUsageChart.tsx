import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TIME_RANGE_OPTIONS, TimeRangeOption } from '../utils/dashboard-utils';

interface ChatUsageDataPoint {
  date: string;
  ragChats: number;
  regularChats: number;
  agentChats: number;
}

interface ChatUsageChartProps {
  chatUsageChartData: ChatUsageDataPoint[];
  selectedTimeRange: number;
  onTimeRangeChange: (days: number) => void;
  ragChartColor: string;
  regularChartColor: string;
  agentChartColor: string;
}

export function ChatUsageChart({
  chatUsageChartData,
  selectedTimeRange,
  onTimeRangeChange,
  ragChartColor,
  regularChartColor,
  agentChartColor,
}: ChatUsageChartProps) {
  if (chatUsageChartData.length === 0) return null;

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Chat Usage Over Time
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
                      ? 0 // Show all weekly labels for 90 days
                      : selectedTimeRange === 30
                        ? Math.max(0, Math.floor(chatUsageChartData.length / 8) - 1) // Show ~8 labels for 30 days
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
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    ragChats: 'RAG-Enhanced Chats',
                    regularChats: 'Regular Chats',
                    agentChats: 'Agent Chats',
                  };
                  return [`${value}`, labels[name] || name];
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="line"
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    ragChats: 'RAG-Enhanced Chats',
                    regularChats: 'Regular Chats',
                    agentChats: 'Agent Chats',
                  };
                  return (
                    <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                      {labels[value] || value}
                    </span>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="ragChats"
                stroke={ragChartColor}
                strokeWidth={2}
                dot={{ fill: ragChartColor, r: 4 }}
                activeDot={{ r: 6 }}
                name="ragChats"
              />
              <Line
                type="monotone"
                dataKey="regularChats"
                stroke={regularChartColor}
                strokeWidth={2}
                dot={{ fill: regularChartColor, r: 4 }}
                activeDot={{ r: 6 }}
                name="regularChats"
              />
              <Line
                type="monotone"
                dataKey="agentChats"
                stroke={agentChartColor}
                strokeWidth={2}
                dot={{ fill: agentChartColor, r: 4 }}
                activeDot={{ r: 6 }}
                name="agentChats"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

