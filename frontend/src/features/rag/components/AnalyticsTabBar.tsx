/**
 * Tab bar component for RAG Analytics page navigation
 * Modern glassmorphism design with animated indicators
 */

import { memo } from 'react';

// Tab types
export type TabType = 'performance' | 'topics' | 'logs';

// Tab configuration
const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  {
    id: 'performance',
    label: 'Performance',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'topics',
    label: 'Topics',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    id: 'logs',
    label: 'Query Logs',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
];

interface AnalyticsTabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const AnalyticsTabBar = memo(function AnalyticsTabBar({
  activeTab,
  onTabChange,
}: AnalyticsTabBarProps) {
  return (
    <div
      className="flex items-center p-1 rounded-xl backdrop-blur-md"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-lg transition-all duration-200 relative"
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

