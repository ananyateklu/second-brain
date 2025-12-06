/**
 * Topics section for RAG Analytics
 * Displays topic distribution full screen
 */

import { memo } from 'react';
import { TopicDistributionCard } from './TopicDistributionCard';
import type { TopicAnalyticsResponse } from '../../../types/rag';

interface TopicsSectionProps {
  topicData: TopicAnalyticsResponse | undefined;
  topicsLoading: boolean;
}

export const TopicsSection = memo(({
  topicData,
  topicsLoading,
}: TopicsSectionProps) => {
  return (
    <div className="min-h-full overflow-visible">
      <TopicDistributionCard topicData={topicData} isLoading={topicsLoading} />
    </div>
  );
});
