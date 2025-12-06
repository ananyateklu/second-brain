/**
 * SessionStatsSection
 * Optional expanded dashboard section showing session analytics
 * Uses PostgreSQL 18 temporal features for session tracking
 */

import { formatDistanceToNow } from 'date-fns';
import { useSessionStats, useActiveSessions } from '../../chat/hooks/use-chat-sessions';
import { StatCard } from './StatCard';

// Icon components
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

const MessageIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export function SessionStatsSection() {
  const { data: stats, isLoading: statsLoading } = useSessionStats();
  const { data: activeSessions, isLoading: activeLoading } = useActiveSessions();

  if (statsLoading || activeLoading) {
    return (
      <div className="animate-pulse rounded-2xl border p-6" style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--border)' }}>
        <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div
      className="rounded-2xl border p-6"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--surface-card)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <svg className="h-5 w-5" style={{ color: 'var(--color-brand-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Session Analytics
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Sessions"
          value={stats.totalSessions}
          icon={<SessionIcon />}
          show={true}
        />

        <StatCard
          title="Avg Duration"
          value={`${stats.avgSessionDurationMinutes.toFixed(1)} min`}
          icon={<TimerIcon />}
          show={true}
        />

        <StatCard
          title="Active Now"
          value={stats.activeSessions}
          icon={<ActivityIcon />}
          subtitle={
            stats.activeSessions > 0 ? (
              <span className="text-green-500 text-xs animate-pulse">● Live</span>
            ) : undefined
          }
          show={true}
        />

        <StatCard
          title="Messages Total"
          value={stats.totalMessagesSent + stats.totalMessagesReceived}
          icon={<MessageIcon />}
          subtitle={
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {stats.totalMessagesSent} sent / {stats.totalMessagesReceived} received
            </span>
          }
          show={true}
        />
      </div>

      {/* Active Sessions List */}
      {activeSessions && activeSessions.length > 0 && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Active Sessions
          </h4>
          <div className="space-y-2">
            {activeSessions.slice(0, 3).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-2 rounded-lg"
                style={{ backgroundColor: 'var(--surface-elevated)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {session.deviceInfo?.browser || 'Unknown device'}
                  </span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Started {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Session Info */}
      {stats.lastSessionAt && (
        <p className="mt-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Last session: {formatDistanceToNow(new Date(stats.lastSessionAt), { addSuffix: true })}
        </p>
      )}
    </div>
  );
}
