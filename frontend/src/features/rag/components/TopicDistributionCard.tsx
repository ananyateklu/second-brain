/**
 * Card showing topic distribution and performance by topic
 * Modern glassmorphism design with animated progress bars
 */

import { useState, memo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ragService } from '../../../services/rag.service';
import { QUERY_KEYS } from '../../../lib/constants';
import type { TopicAnalyticsResponse } from '../../../types/rag';

interface TopicDistributionCardProps {
  topicData: TopicAnalyticsResponse | undefined;
  isLoading: boolean;
}

// Elegant color palette for topics - matches app theme
const TOPIC_COLORS = [
  { main: 'var(--color-brand-400)', bg: 'var(--color-brand-500)' },
  { main: 'var(--color-accent-blue)', bg: '#3b82f6' },
  { main: '#34d399', bg: '#10b981' },
  { main: '#fbbf24', bg: '#f59e0b' },
  { main: '#f472b6', bg: '#ec4899' },
  { main: '#a78bfa', bg: '#8b5cf6' },
  { main: '#fb923c', bg: '#f97316' },
  { main: '#22d3ee', bg: '#06b6d4' },
  { main: '#4ade80', bg: '#22c55e' },
  { main: '#e879f9', bg: '#d946ef' },
];

export const TopicDistributionCard = memo(function TopicDistributionCard({ topicData, isLoading }: TopicDistributionCardProps) {
  const [clusterCount, setClusterCount] = useState(5);
  const queryClient = useQueryClient();

  const clusterMutation = useMutation({
    mutationFn: () => ragService.clusterQueries(clusterCount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ragAnalytics.topics() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ragAnalytics.logs() });
    },
  });

  const hasTopics = topicData && topicData.topics.length > 0;
  const totalQueries = hasTopics
    ? topicData.topics.reduce((sum, t) => sum + t.queryCount, 0)
    : 0;

  return (
    <div
      className="rounded-2xl transition-all duration-200 hover:scale-[1.01] backdrop-blur-md relative overflow-hidden group"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg), 0 0 40px -15px var(--color-primary-alpha)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-20 -left-20 w-40 h-40 rounded-full opacity-15 blur-3xl pointer-events-none transition-opacity duration-500 group-hover:opacity-25"
        style={{
          background: 'radial-gradient(circle, var(--color-accent-blue), transparent)',
        }}
      />

      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between relative z-10"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="p-2.5 rounded-xl"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent-blue) 15%, transparent)',
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--color-accent-blue)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          </div>
          <h3
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Topic Distribution
          </h3>
        </div>

        {/* Cluster action */}
        <div className="flex items-center gap-2">
          <select
            value={clusterCount}
            onChange={(e) => setClusterCount(Number(e.target.value))}
            className="px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {[3, 5, 7, 10].map((n) => (
              <option key={n} value={n}>{n} topics</option>
            ))}
          </select>
          <button
            onClick={() => clusterMutation.mutate()}
            disabled={clusterMutation.isPending}
            className="px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              boxShadow: 'var(--btn-primary-shadow)',
            }}
          >
            {clusterMutation.isPending ? (
              <span className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                />
                Clustering...
              </span>
            ) : 'Run Clustering'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{
                borderColor: 'var(--border)',
                borderTopColor: 'var(--color-brand-400)',
              }}
            />
          </div>
        ) : !hasTopics ? (
          <div
            className="text-center py-8"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <svg
                className="w-8 h-8 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
            </div>
            <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              No topics yet
            </p>
            <p className="text-sm">Run clustering to group your queries into topics</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Topic bars */}
            <div className="space-y-3">
              {topicData.topics.map((topic, index) => {
                const percentage = (topic.queryCount / totalQueries) * 100;
                const colors = TOPIC_COLORS[index % TOPIC_COLORS.length];
                const feedbackRate = topic.positiveFeedback + topic.negativeFeedback > 0
                  ? Math.round(topic.positiveFeedbackRate * 100)
                  : null;

                return (
                  <div
                    key={topic.clusterId}
                    className="space-y-1.5 p-2.5 rounded-xl transition-colors duration-200 hover:bg-opacity-50"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--surface-elevated) 50%, transparent)' }}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: colors.main,
                            boxShadow: `0 0 0 2px var(--surface-card), 0 0 0 4px ${colors.main}`,
                          }}
                        />
                        <span
                          className="font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {topic.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="tabular-nums"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {topic.queryCount} queries
                        </span>
                        {feedbackRate !== null && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium tabular-nums"
                            style={{
                              backgroundColor: feedbackRate >= 70
                                ? 'color-mix(in srgb, var(--color-brand-400) 15%, transparent)'
                                : feedbackRate >= 50
                                  ? 'color-mix(in srgb, #fbbf24 15%, transparent)'
                                  : 'color-mix(in srgb, var(--color-error) 15%, transparent)',
                              color: feedbackRate >= 70
                                ? 'var(--color-brand-400)'
                                : feedbackRate >= 50
                                  ? '#fbbf24'
                                  : 'var(--color-error)',
                            }}
                          >
                            {feedbackRate}% positive
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--surface-elevated)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${percentage}%`,
                          background: `linear-gradient(90deg, ${colors.bg}, ${colors.main})`,
                        }}
                      />
                    </div>
                    {/* Sample queries */}
                    {topic.sampleQueries.length > 0 && (
                      <p
                        className="text-xs italic truncate pl-5"
                        style={{ color: 'var(--text-tertiary)' }}
                        title={topic.sampleQueries[0]}
                      >
                        "{topic.sampleQueries[0]}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary stats */}
            <div
              className="pt-3 border-t grid grid-cols-2 gap-3"
              style={{ borderColor: 'var(--border)' }}
            >
              <div
                className="p-2.5 rounded-xl"
                style={{ backgroundColor: 'var(--surface-elevated)' }}
              >
                <p
                  className="text-xs uppercase tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Clustered
                </p>
                <p
                  className="text-xl font-bold mt-1 tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {topicData.totalClustered}
                </p>
              </div>
              <div
                className="p-2.5 rounded-xl"
                style={{ backgroundColor: 'var(--surface-elevated)' }}
              >
                <p
                  className="text-xs uppercase tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Unclustered
                </p>
                <p
                  className="text-xl font-bold mt-1 tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {topicData.totalUnclustered}
                </p>
              </div>
            </div>

            {/* Insights */}
            {topicData.topics.length > 0 && (
              <div
                className="p-3 rounded-xl"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
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
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  <p
                    className="font-semibold text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Insights
                  </p>
                </div>
                {(() => {
                  const lowestPerforming = [...topicData.topics]
                    .filter(t => t.positiveFeedback + t.negativeFeedback >= 3)
                    .sort((a, b) => a.positiveFeedbackRate - b.positiveFeedbackRate)[0];

                  const highestVolume = [...topicData.topics]
                    .sort((a, b) => b.queryCount - a.queryCount)[0];

                  return (
                    <ul
                      className="space-y-1 text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <li className="flex items-start gap-2">
                        <span style={{ color: 'var(--color-brand-400)' }}>•</span>
                        <span>
                          Most queried: <strong style={{ color: 'var(--text-primary)' }}>{highestVolume.label}</strong> ({highestVolume.queryCount} queries)
                        </span>
                      </li>
                      {lowestPerforming && lowestPerforming.positiveFeedbackRate < 0.5 && (
                        <li className="flex items-start gap-2" style={{ color: '#fbbf24' }}>
                          <span>⚠</span>
                          <span>
                            <strong>{lowestPerforming.label}</strong> has low satisfaction ({Math.round(lowestPerforming.positiveFeedbackRate * 100)}%)
                          </span>
                        </li>
                      )}
                    </ul>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
