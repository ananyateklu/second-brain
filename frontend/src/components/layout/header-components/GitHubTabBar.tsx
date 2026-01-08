/**
 * Mobile tab bar component for GitHub page navigation
 * Compact design with icon + short labels, horizontal scroll for narrow screens
 */

import { memo } from 'react';
import { useBoundStore } from '../../../store/bound-store';
import type { GitHubTabType } from '../../../store/types';

// Tab configuration with very short labels for mobile
const GITHUB_TABS: { id: GitHubTabType; label: string; icon: React.ReactNode }[] = [
  {
    id: 'local-changes',
    label: 'Git',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'code',
    label: 'Code',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
        <path d="M4.72 3.22a.75.75 0 011.06 1.06L2.06 8l3.72 3.72a.75.75 0 11-1.06 1.06L.47 8.53a.75.75 0 010-1.06l4.25-4.25zm6.56 0a.75.75 0 10-1.06 1.06L13.94 8l-3.72 3.72a.75.75 0 101.06 1.06l4.25-4.25a.75.75 0 000-1.06l-4.25-4.25z" />
      </svg>
    ),
  },
  {
    id: 'pull-requests',
    label: 'PRs',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
        <path d="M1.5 3.25a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zm5.677-.177L9.573.677A.25.25 0 0110 .854V2.5h1A2.5 2.5 0 0113.5 5v5.628a2.251 2.251 0 11-1.5 0V5a1 1 0 00-1-1h-1v1.646a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm0 9.5a.75.75 0 100 1.5.75.75 0 000-1.5zm8.25.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
  },
  {
    id: 'issues',
    label: 'Issues',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
      </svg>
    ),
  },
  {
    id: 'actions',
    label: 'CI',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
        <path d="M3.25 1A2.25 2.25 0 001 3.25v9.5A2.25 2.25 0 003.25 15h9.5A2.25 2.25 0 0015 12.75v-9.5A2.25 2.25 0 0012.75 1h-9.5zM2.5 3.25a.75.75 0 01.75-.75h9.5a.75.75 0 01.75.75v9.5a.75.75 0 01-.75.75h-9.5a.75.75 0 01-.75-.75v-9.5zM11.28 6.28a.75.75 0 00-1.06-1.06L7.25 8.19l-.97-.97a.75.75 0 10-1.06 1.06l1.5 1.5a.75.75 0 001.06 0l3.5-3.5z" />
      </svg>
    ),
  },
  {
    id: 'commits',
    label: 'Log',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
        <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32zm-1.43-.75a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0z" />
      </svg>
    ),
  },
  {
    id: 'branches',
    label: 'Branch',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
        <path d="M9.5 3.25a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zm-6 0a.75.75 0 101.5 0 .75.75 0 00-1.5 0zm8.25-.75a.75.75 0 100 1.5.75.75 0 000-1.5zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
      </svg>
    ),
  },
];

/**
 * Mobile GitHub page navigation tabs
 * Compact horizontal scrollable bar with icon + short labels
 */
export const GitHubTabBar = memo(function GitHubTabBar() {
  const activeTab = useBoundStore((state) => state.githubActiveTab);
  const setActiveTab = useBoundStore((state) => state.setGitHubActiveTab);

  return (
    <div
      className="inline-flex items-center gap-0.5 p-1 my-1 rounded-xl backdrop-blur-md transition-shadow duration-300"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
        border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      {GITHUB_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); }}
            className="flex items-center gap-0.5 px-1.5 py-1 text-[11px] rounded-md transition-all duration-200 relative whitespace-nowrap"
            style={{
              backgroundColor: isActive ? 'var(--color-brand-600)' : undefined,
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 400,
              boxShadow: isActive ? '0 2px 8px color-mix(in srgb, var(--color-brand-600) 30%, transparent)' : undefined,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <span className="transition-colors duration-200">
              {tab.icon}
            </span>
            {tab.label}
            {/* Active indicator line */}
            {isActive && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
});
