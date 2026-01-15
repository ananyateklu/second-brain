/**
 * Insights Page
 * Unified analytics dashboard with tabs for Overview, RAG, Chat, and Agent insights
 */

import { memo } from 'react';
import { useBoundStore } from '../store/bound-store';
import {
  OverviewTab,
  RagTab,
  ChatTab,
  AgentTab,
} from '../features/insights/components';

export const InsightsPage = memo(function InsightsPage() {
  // Get active tab from store
  const activeInsightsTab = useBoundStore((state) => state.activeInsightsTab);

  return (
    <div className="flex flex-col min-h-0 flex-1 h-full overflow-hidden px-4 md:px-6">
      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
        {activeInsightsTab === 'overview' && <OverviewTab />}
        {activeInsightsTab === 'rag' && <RagTab />}
        {activeInsightsTab === 'chat' && <ChatTab />}
        {activeInsightsTab === 'agent' && <AgentTab />}
      </div>
    </div>
  );
});
