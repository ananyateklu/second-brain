import { useLocation } from 'react-router-dom';
import { useBoundStore } from '../../store/bound-store';
import { UserMenu } from '../ui/UserMenu';
import { IndexingIndicator } from '../ui/IndexingIndicator';
import { SummaryIndicator } from '../ui/SummaryIndicator';
import { NotesFilter } from '../../features/notes/components/NotesFilter';
import { useNotes } from '../../features/notes/hooks/use-notes-query';
import { AnalyticsTabBar } from '../../features/rag/components/AnalyticsTabBar';
import { SettingsNavTabs, NotesPageControls, TimeRangeSelector, GitHubNavTabs, GitNavControls, GitHubRepoSelector } from './header-components';
import logoLight from '../../assets/second-brain-logo-light-mode.png';
import logoDark from '../../assets/second-brain-logo-dark-mode.png';

// Map routes to page titles
const getPageTitle = (pathname: string): string => {
  if (pathname.startsWith('/settings')) return 'Settings';
  const titleMap: Record<string, string> = {
    '/': 'Dashboard',
    '/notes': 'Notes',
    '/directory': 'Directory',
    '/chat': 'Chat',
    '/analytics': 'RAG Analytics',
    '/github': 'GitHub',
  };
  return titleMap[pathname] || 'Page';
};


export function Header() {
  const location = useLocation();
  // UI state - unified store access
  const openCreateModal = useBoundStore((state) => state.openCreateModal);
  const isMobileMenuOpen = useBoundStore((state) => state.isMobileMenuOpen);
  const toggleMobileMenu = useBoundStore((state) => state.toggleMobileMenu);
  // Theme state
  const theme = useBoundStore((state) => state.theme);
  const logo = theme === 'light' ? logoLight : logoDark;

  // Notes specific state
  const { data: notes } = useNotes();
  const filterState = useBoundStore((state) => state.filterState);
  const setFilterState = useBoundStore((state) => state.setFilterState);
  const notesViewMode = useBoundStore((state) => state.notesViewMode);
  const setNotesViewMode = useBoundStore((state) => state.setNotesViewMode);
  const isBulkMode = useBoundStore((state) => state.isBulkMode);
  const toggleBulkMode = useBoundStore((state) => state.toggleBulkMode);

  const pageTitle = getPageTitle(location.pathname);
  const isNotesPage = location.pathname === '/notes';
  const isSettingsPage = location.pathname.startsWith('/settings');
  const isRagAnalyticsPage = location.pathname === '/analytics';
  const isGitHubPage = location.pathname === '/github';

  // GitHub tab state for showing Git controls on local-changes tab
  const githubActiveTab = useBoundStore((state) => state.githubActiveTab);
  const showGitControls = isGitHubPage && githubActiveTab === 'local-changes';

  // RAG Analytics state
  const activeTab = useBoundStore((state) => state.activeTab);
  const setActiveTab = useBoundStore((state) => state.setActiveTab);

  return (
    <>
      {/* Mobile Header */}
      <div
        className="md:hidden w-full px-2 sm:px-4"
        style={{
          paddingTop: '1rem',
        }}
      >
        <header
          className="mx-auto max-w-[95%] sm:max-w-[92%] rounded-[2.5rem] backdrop-blur-xl shadow-xl"
          style={{
            border: `1px solid var(--border)`,
            backgroundColor: 'var(--surface-card)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          <div className="flex h-16 sm:h-20 items-center justify-between px-5 sm:px-8">
            {/* Left side - Hamburger Menu */}
            <button
              onClick={toggleMobileMenu}
              className="group relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
              }}
              aria-label="Toggle menu"
            >
              <svg
                className={`h-5 w-5 sm:h-6 sm:w-6 transition-all duration-300 ${isMobileMenuOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                  }`}
                style={{ color: 'var(--text-primary)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`h-5 w-5 sm:h-6 sm:w-6 absolute transition-all duration-300 ${isMobileMenuOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
                  }`}
                style={{ color: 'var(--text-primary)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Center - Logo/Brand */}
            <div className="flex items-center flex-1 justify-center">
              <img
                src={logo}
                alt="Second Brain"
                className="h-8 sm:h-10 w-auto"
              />
            </div>

            {/* Right side - Create Button (compact) */}
            <button
              onClick={openCreateModal}
              className="group inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
                borderColor: 'var(--btn-primary-border)',
                boxShadow: 'var(--btn-primary-shadow)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover-bg)';
                e.currentTarget.style.borderColor = 'var(--btn-primary-hover-border)';
                e.currentTarget.style.boxShadow = 'var(--btn-primary-hover-shadow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--btn-primary-bg)';
                e.currentTarget.style.borderColor = 'var(--btn-primary-border)';
                e.currentTarget.style.boxShadow = 'var(--btn-primary-shadow)';
              }}
              aria-label="Create new note"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </header>
      </div>

      {/* Desktop Header */}
      <header
        className="hidden md:flex flex-col md:px-6 transition-all duration-300 w-full"
        style={{
          backgroundColor: 'transparent',
          paddingTop: '1.2rem',
          paddingBottom: '0.2rem'
        }}
      >
        <div className="flex justify-between w-full pb-2">
          {/* Left side - Page Title */}
          <div className="flex items-center h-12">
            <h1
              className="text-xl font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {pageTitle}
            </h1>
          </div>

          {/* Right side - Search/Tabs and User */}
          <div className="flex items-center gap-4 h-12">
            {/* RAG Analytics Tab Bar - Only on Analytics page */}
            {isRagAnalyticsPage && (
              <AnalyticsTabBar activeTab={activeTab} onTabChange={setActiveTab} />
            )}

            {/* Search Input - Only on Notes page */}
            {isNotesPage && <NotesPageControls />}

            {/* Settings Navigation - Only on Settings pages */}
            {isSettingsPage && <SettingsNavTabs />}

            {/* Git Navigation Controls - On GitHub page when Local Changes tab is active */}
            {showGitControls && <GitNavControls />}

            {/* GitHub Repo Selector - Always visible on GitHub page so users can switch repos even on error */}
            {isGitHubPage && <GitHubRepoSelector />}

            {/* GitHub Navigation - Only on GitHub page */}
            {isGitHubPage && <GitHubNavTabs />}

            {/* Summary Generation Indicator */}
            <SummaryIndicator />

            {/* Indexing Indicator */}
            <IndexingIndicator />

            {/* User Menu */}
            <UserMenu />
          </div>
        </div>

        {/* Notes Filter - Only on Notes page */}
        {isNotesPage && notes && (
          <div className="w-full">
            <NotesFilter
              notes={notes}
              filterState={filterState}
              onFilterChange={setFilterState}
              viewMode={notesViewMode}
              onViewModeChange={setNotesViewMode}
              isBulkMode={isBulkMode}
              onBulkModeToggle={toggleBulkMode}
              variant="embedded"
            />
          </div>
        )}

        {/* RAG Analytics Time Range Selector - Only on Analytics page */}
        {isRagAnalyticsPage && <TimeRangeSelector />}
      </header>
    </>
  );
}
