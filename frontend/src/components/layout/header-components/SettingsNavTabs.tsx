import { NavLink } from 'react-router-dom';

interface SettingsNavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  margin?: 'mr-1' | 'mx-1' | 'ml-1';
}

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    to: '/settings/general',
    label: 'General',
    margin: 'mr-1',
    icon: (
      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/settings/ai',
    label: 'AI Integration',
    margin: 'mx-1',
    icon: (
      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.638-1.638l-1.183-.394 1.183-.394a2.25 2.25 0 001.638-1.638l.394-1.183.394 1.183a2.25 2.25 0 001.638 1.638l1.183.394-1.183.394a2.25 2.25 0 00-1.638 1.638z" />
      </svg>
    ),
  },
  {
    to: '/settings/rag',
    label: 'RAG',
    margin: 'mx-1',
    icon: (
      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ),
  },
  {
    to: '/settings/indexing',
    label: 'Indexing',
    margin: 'ml-1',
    icon: (
      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
];

const getMarginClass = (margin?: string): string => {
  switch (margin) {
    case 'mr-1': return 'mr-1';
    case 'mx-1': return 'mx-1';
    case 'ml-1': return 'ml-1';
    default: return '';
  }
};

/**
 * Settings page navigation tabs
 * Displays horizontal tab bar for settings sub-pages
 */
export const SettingsNavTabs = () => {
  return (
    <div
      className="flex items-center p-1 rounded-2xl border transition-all duration-200"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {SETTINGS_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `px-3 py-2 ${getMarginClass(item.margin)} rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] ${isActive ? 'font-semibold' : 'font-medium'}`
          }
          style={({ isActive }) => ({
            backgroundColor: isActive
              ? 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)'
              : 'transparent',
            color: isActive ? 'var(--color-brand-600)' : 'var(--text-secondary)',
            boxShadow: isActive
              ? '0 2px 8px color-mix(in srgb, var(--color-brand-900) 15%, transparent)'
              : 'none',
          })}
          onMouseEnter={(e) => {
            const link = e.currentTarget;
            const isActive = link.getAttribute('aria-current') === 'page';
            if (!isActive) {
              link.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)';
              link.style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            const link = e.currentTarget;
            const isActive = link.getAttribute('aria-current') === 'page';
            if (!isActive) {
              link.style.backgroundColor = 'transparent';
              link.style.color = 'var(--text-secondary)';
            }
          }}
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
};
