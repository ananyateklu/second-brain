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
    <div className="flex flex-col min-h-0 flex-1 relative">
      {/* Ambient background effects - subtle for data-heavy pages */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{
            background: 'radial-gradient(circle, var(--color-brand-600), transparent)',
            opacity: 0.08,
            animationDuration: '4s',
          }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl animate-pulse"
          style={{
            background: 'radial-gradient(circle, var(--color-brand-500), transparent)',
            opacity: 0.06,
            animationDelay: '2s',
            animationDuration: '4s',
          }}
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto thin-scrollbar relative z-10">
        {activeInsightsTab === 'overview' && <OverviewTab />}
        {activeInsightsTab === 'rag' && <RagTab />}
        {activeInsightsTab === 'chat' && <ChatTab />}
        {activeInsightsTab === 'agent' && <AgentTab />}
      </div>
    </div>
  );
});
