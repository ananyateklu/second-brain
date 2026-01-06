import type { NavItemConfig } from './sidebar.types';

/**
 * Icon JSX elements for sidebar navigation
 * Using JSX elements instead of function components to avoid fast refresh warnings
 */
const dashboardIcon = (
  <svg
    className="flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:rotate-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const notesIcon = (
  <svg
    className="flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:-rotate-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const chatIcon = (
  <svg
    className="flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:rotate-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);

const insightsIcon = (
  <svg
    className="flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:rotate-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const gitHubIcon = (
  <svg
    className="flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:rotate-3"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const voiceIcon = (
  <svg
    className="flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:rotate-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
    />
  </svg>
);

/**
 * Main navigation items configuration
 * Order determines display order in sidebar
 */
export const NAV_ITEMS: NavItemConfig[] = [
  {
    to: '/',
    label: 'Dashboard',
    routeKey: 'dashboard',
    icon: dashboardIcon,
    end: true,
  },
  {
    to: '/notes',
    label: 'Notes',
    routeKey: 'notes',
    icon: notesIcon,
    end: true,
  },
  {
    to: '/chat',
    label: 'Chat',
    routeKey: 'chat',
    icon: chatIcon,
    end: true,
  },
  {
    to: '/insights',
    label: 'Insights',
    routeKey: 'insights',
    icon: insightsIcon,
    end: true,
  },
  {
    to: '/github',
    label: 'GitHub',
    routeKey: 'github',
    icon: gitHubIcon,
    end: true,
  },
  {
    to: '/voice',
    label: 'Voice Agent',
    routeKey: 'voice',
    icon: voiceIcon,
    end: true,
  },
];
