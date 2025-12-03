/**
 * Performance section for RAG Analytics
 * Displays stats cards, score correlation analysis, and feedback summary
 */

import { memo } from 'react';
import type { RagPerformanceStats } from '../../../types/rag';
import { RagStatsCards } from './RagStatsCards';
import { ScoreCorrelationCard } from './ScoreCorrelationCard';
import { FeedbackSummaryCard } from './FeedbackSummaryCard';

interface PerformanceSectionProps {
  stats: RagPerformanceStats;
}

export const PerformanceSection = memo(function PerformanceSection({
  stats,
}: PerformanceSectionProps) {
  return (
    <div className="flex flex-col min-h-full gap-4 overflow-visible">
      {/* Stats Cards - 2x2 Grid */}
      <div className="flex-shrink-0 overflow-visible">
        <RagStatsCards stats={stats} />
      </div>

      {/* Score Correlation & Feedback Summary - Side by side */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-visible">
        <ScoreCorrelationCard stats={stats} />
        <FeedbackSummaryCard stats={stats} />
      </div>
    </div>
  );
});
