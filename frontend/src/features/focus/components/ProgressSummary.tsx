/**
 * Progress Summary Component
 * Displays AI-generated progress summary with stats and insights
 */

import { memo, useCallback, useState } from 'react';
import {
  TrendingUp,
  Flame,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { CompletionStats, SummaryPeriod } from '../types';

export interface ProgressSummaryProps {
  /** Time period for the summary */
  period: SummaryPeriod;
  /** AI-generated summary text */
  summary: string;
  /** Completion statistics */
  stats: CompletionStats;
  /** Key highlights from the period */
  highlights: string[];
  /** Encouragement message */
  encouragement: string | null;
  /** Whether summary is loading */
  isLoading: boolean;
  /** Whether summary is being refetched */
  isFetching: boolean;
  /** Error message if summary failed to load */
  error?: string | null;
  /** Called to switch between periods */
  onPeriodChange: (period: SummaryPeriod) => void;
  /** Called to refresh summary */
  onRefresh: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Component displaying AI-generated progress summary.
 * Shows completion stats, highlights, and encouragement.
 */
export const ProgressSummary = memo(function ProgressSummary({
  period,
  summary,
  stats,
  highlights,
  encouragement,
  isLoading,
  isFetching,
  error,
  onPeriodChange,
  onRefresh,
  className,
}: ProgressSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handlePeriodChange = useCallback(
    (newPeriod: SummaryPeriod) => {
      onPeriodChange(newPeriod);
    },
    [onPeriodChange]
  );

  const handleRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  // Format minutes into readable duration
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden transition-all duration-200',
        className
      )}
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpanded();
          }
        }}
        className={cn(
          'w-full flex items-center justify-between p-4 text-left cursor-pointer',
          'hover:bg-[var(--surface-hover)] transition-colors'
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
            }}
          >
            <TrendingUp
              className="h-4 w-4"
              style={{ color: 'var(--color-success)' }}
            />
          </span>
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Progress Summary
            </h3>
            <p
              className="text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {period === 'today' ? "Today's achievements" : 'This week'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div
            className="flex rounded-lg p-0.5"
            style={{ backgroundColor: 'var(--surface-hover)' }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePeriodChange('today');
              }}
              className={cn(
                'px-2 py-1 text-xs rounded-md transition-colors',
                period === 'today'
                  ? 'font-medium'
                  : ''
              )}
              style={{
                backgroundColor: period === 'today' ? 'var(--surface-card)' : 'transparent',
                color: period === 'today' ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePeriodChange('week');
              }}
              className={cn(
                'px-2 py-1 text-xs rounded-md transition-colors',
                period === 'week'
                  ? 'font-medium'
                  : ''
              )}
              style={{
                backgroundColor: period === 'week' ? 'var(--surface-card)' : 'transparent',
                color: period === 'week' ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              Week
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
            disabled={isFetching}
            className="h-8 w-8"
            title="Refresh summary"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
          ) : (
            <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          {/* Loading state */}
          {isLoading && (
            <div className="p-4 space-y-4">
              <div className="animate-pulse flex gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex-1 h-16 rounded-lg"
                    style={{ backgroundColor: 'var(--surface-hover)' }}
                  />
                ))}
              </div>
              <div className="animate-pulse space-y-2">
                <div
                  className="h-4 rounded w-full"
                  style={{ backgroundColor: 'var(--surface-hover)' }}
                />
                <div
                  className="h-4 rounded w-3/4"
                  style={{ backgroundColor: 'var(--surface-hover)' }}
                />
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div
              className="p-4 text-center"
              style={{ color: 'var(--color-error)' }}
            >
              <p className="text-sm">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Summary content */}
          {!isLoading && !error && (
            <div className="p-4 space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Completed"
                  value={stats.totalCompleted.toString()}
                  subValue={stats.totalCompleted === 1 ? 'item' : 'items'}
                  color="var(--color-success)"
                />
                <StatCard
                  icon={<Clock className="h-4 w-4" />}
                  label="Time Tracked"
                  value={formatDuration(stats.totalMinutesTracked)}
                  subValue="focused"
                  color="var(--color-primary)"
                />
                <StatCard
                  icon={<Flame className="h-4 w-4" />}
                  label="Streak"
                  value={stats.streakDays.toString()}
                  subValue={stats.streakDays === 1 ? 'day' : 'days'}
                  color="var(--color-warning)"
                />
              </div>

              {/* Summary text */}
              {summary && (
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: 'var(--surface-hover)',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <Sparkles
                      className="h-4 w-4 mt-0.5 shrink-0"
                      style={{ color: 'var(--color-success)' }}
                    />
                    <p
                      className="text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Highlights */}
              {highlights.length > 0 && (
                <div className="space-y-2">
                  <h4
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Highlights
                  </h4>
                  <ul className="space-y-1.5">
                    {highlights.map((highlight, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <span
                          className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                        />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Encouragement */}
              {encouragement && (
                <div
                  className="p-3 rounded-lg text-center"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
                  }}
                >
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-success)' }}
                  >
                    {encouragement}
                  </p>
                </div>
              )}

              {/* Empty state */}
              {stats.totalCompleted === 0 && !summary && (
                <div className="text-center py-4">
                  <TrendingUp
                    className="h-8 w-8 mx-auto mb-2 opacity-30"
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    No completed items yet {period === 'today' ? 'today' : 'this week'}.
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Complete some focus items to see your progress!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================
// Stat Card Sub-component
// ============================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  color: string;
}

const StatCard = memo(function StatCard({
  icon,
  label,
  value,
  subValue,
  color,
}: StatCardProps) {
  return (
    <div
      className="p-3 rounded-lg text-center"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      <div
        className="inline-flex items-center justify-center w-8 h-8 rounded-full mb-2"
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
          color,
        }}
      >
        {icon}
      </div>
      <div
        className="text-lg font-bold"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </div>
      <div
        className="text-xs"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {subValue}
      </div>
      <div
        className="text-[10px] uppercase tracking-wider mt-1"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </div>
    </div>
  );
});
