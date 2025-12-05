import { useMemo, ReactNode } from 'react';
import { StatCard } from './StatCard';
import { formatTokenCount } from '../utils/dashboard-utils';
import type { AIUsageStats } from '../../../types/stats';
import type { SessionStats } from '../../../types/chat';

interface NotesStats {
  totalNotes: number;
  notesCreatedThisWeek: number;
  notesCreatedThisMonth: number;
  notesUpdatedThisWeek: number;
}

interface StatCardsGridProps {
  stats: NotesStats | null;
  aiStats: AIUsageStats | undefined;
  totalTokens: number;
  sessionStats?: SessionStats;
}

interface StatConfig {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: ReactNode;
  show: boolean;
}

// Icon components
const NotesIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const TrendingIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const ChatIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const ComputerIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ImageIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

// Session Stats Icons
const SessionIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TimerIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export function StatCardsGrid({ stats, aiStats, totalTokens, sessionStats }: StatCardsGridProps) {
  const statsConfig = useMemo<StatConfig[]>(() => [
    {
      title: 'Total Notes',
      value: stats?.totalNotes || 0,
      icon: <NotesIcon />,
      show: true,
    },
    {
      title: 'Notes Created This Week',
      value: stats?.notesCreatedThisWeek || 0,
      icon: <ClockIcon />,
      show: true,
    },
    {
      title: 'Notes Created This Month',
      value: stats?.notesCreatedThisMonth || 0,
      icon: <CalendarIcon />,
      show: true,
    },
    {
      title: 'Notes Updated This Week',
      value: stats?.notesUpdatedThisWeek || 0,
      icon: <TrendingIcon />,
      show: true,
    },
    {
      title: 'Total Conversations',
      value: aiStats?.totalConversations || 0,
      icon: <ChatIcon />,
      show: !!aiStats,
    },
    {
      title: 'RAG-Enhanced Conversations',
      value: aiStats?.ragConversationsCount || 0,
      icon: <DatabaseIcon />,
      subtitle: aiStats && aiStats.totalConversations > 0 ? (
        <p className="text-[9px] whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
          <span className="font-bold text-[13px]" style={{ color: 'var(--color-brand-600)' }}>
            {((aiStats.ragConversationsCount / aiStats.totalConversations) * 100).toFixed(0)}%
          </span>
          {' '}of total
        </p>
      ) : undefined,
      show: !!aiStats,
    },
    {
      title: 'Agent Conversations',
      value: aiStats?.agentConversationsCount || 0,
      icon: <ComputerIcon />,
      subtitle: aiStats && aiStats.totalConversations > 0 ? (
        <p className="text-[9px] whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
          <span className="font-bold text-[13px]" style={{ color: 'var(--color-brand-600)' }}>
            {((aiStats.agentConversationsCount / aiStats.totalConversations) * 100).toFixed(0)}%
          </span>
          {' '}of total
        </p>
      ) : undefined,
      show: !!aiStats,
    },
    {
      title: 'Image Generation',
      value: aiStats?.imageGenerationConversationsCount || 0,
      icon: <ImageIcon />,
      subtitle: aiStats && aiStats.totalImagesGenerated > 0 ? (
        <p className="text-[9px] whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
          <span className="font-bold text-[13px]" style={{ color: 'var(--color-brand-600)' }}>
            {aiStats.totalImagesGenerated}
          </span>
          {' '}images
        </p>
      ) : undefined,
      show: !!aiStats,
    },
    {
      title: 'Total Messages',
      value: aiStats?.totalMessages || 0,
      icon: <ChatIcon />,
      show: !!aiStats,
    },
    {
      title: 'Total Tokens Used',
      value: `${formatTokenCount(totalTokens)} tokens`,
      icon: <ChartIcon />,
      show: !!aiStats,
    },
    // Session Stats (PostgreSQL 18 Temporal Features)
    {
      title: 'Total Sessions',
      value: sessionStats?.totalSessions || 0,
      icon: <SessionIcon />,
      show: !!sessionStats,
    },
    {
      title: 'Avg Session Duration',
      value: sessionStats ? `${sessionStats.avgSessionDurationMinutes.toFixed(1)} min` : '0 min',
      icon: <TimerIcon />,
      show: !!sessionStats,
    },
    {
      title: 'Active Sessions',
      value: sessionStats?.activeSessions || 0,
      icon: <ActivityIcon />,
      subtitle: sessionStats?.activeSessions ? (
        <span className="text-green-500 animate-pulse text-xs">● Live</span>
      ) : undefined,
      show: !!sessionStats,
    },
  ], [stats, aiStats, totalTokens, sessionStats]);

  return (
    <div
      className="flex gap-2"
      style={{
        flexWrap: 'wrap',
      }}
    >
      {statsConfig.map((stat, index) => (
        <div
          key={index}
          style={{
            flex: '1 1 0',
            minWidth: '150px',
            maxWidth: '100%',
          }}
        >
          <StatCard
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            subtitle={stat.subtitle}
            show={stat.show}
          />
        </div>
      ))}
    </div>
  );
}

