/**
 * Tab bar component for Insights page navigation
 * Modern glassmorphism design with animated indicators
 */

import { memo } from 'react';
import type { InsightsTabType } from '../../../store/types';

// Tab configuration
const TABS: { id: InsightsTabType; label: string; icon: React.ReactNode }[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'rag',
    label: 'RAG',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'agent',
    label: 'Agent',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

interface InsightsTabBarProps {
  activeTab: InsightsTabType;
  onTabChange: (tab: InsightsTabType) => void;
}

export const InsightsTabBar = memo(function InsightsTabBar({
  activeTab,
  onTabChange,
}: InsightsTabBarProps) {
  return (
    <div
      className="flex items-center gap-1 p-1 my-1 rounded-xl backdrop-blur-md"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => { onTabChange(tab.id); }}
          className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg transition-all duration-200 relative"
          style={{
            backgroundColor: activeTab === tab.id ? 'var(--surface-card)' : 'transparent',
            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontWeight: activeTab === tab.id ? 600 : 400,
            boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <span
            className="transition-colors duration-200"
            style={{ color: activeTab === tab.id ? 'var(--color-brand-400)' : 'inherit' }}
          >
            {tab.icon}
          </span>
          {tab.label}
          {activeTab === tab.id && (
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
              style={{ backgroundColor: 'var(--color-brand-400)' }}
            />
          )}
        </button>
      ))}
    </div>
  );
});
