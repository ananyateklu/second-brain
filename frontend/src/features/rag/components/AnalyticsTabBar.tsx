/**
 * Tab bar component for RAG Analytics page navigation
 * Modern glassmorphism design with animated indicators
 * Styled to match InsightsTabBar
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
    <div className="inline-flex items-center gap-1 p-1 my-1 rounded-xl backdrop-blur-md transition-shadow duration-300 insights-tab-bar">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => { onTabChange(tab.id); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-all duration-200 relative ${isActive ? '' : 'insights-tab-button'}`}
            style={{
              backgroundColor: isActive ? 'var(--color-brand-600)' : undefined,
              color: isActive ? '#ffffff' : undefined,
              fontWeight: isActive ? 600 : 400,
              boxShadow: isActive ? '0 2px 8px color-mix(in srgb, var(--color-brand-600) 30%, transparent)' : undefined,
            }}
          >
            <span className="transition-colors duration-200">
              {tab.icon}
            </span>
            {tab.label}
            {/* Active indicator line */}
            {isActive && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--glass-popup)' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
});
