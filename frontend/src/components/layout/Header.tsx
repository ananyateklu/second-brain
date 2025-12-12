import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useBoundStore } from '../../store/bound-store';
import { ThemeToggle } from '../ui/ThemeToggle';
import { UserMenu } from '../ui/UserMenu';
import { IndexingIndicator } from '../ui/IndexingIndicator';
import { SummaryIndicator } from '../ui/SummaryIndicator';
import { NotesFilter } from '../../features/notes/components/NotesFilter';
import { useNotes } from '../../features/notes/hooks/use-notes-query';
import { AnalyticsTabBar } from '../../features/rag/components/AnalyticsTabBar';
import { SettingsNavTabs, NotesPageControls, NotesPageControlsMobile, TimeRangeSelector } from './header-components';
import logoLight from '../../assets/second-brain-logo-light-mode.png';
import logoDark from '../../assets/second-brain-logo-dark-mode.png';

// Map routes to page titles
const getPageTitle = (pathname: string): string => {
  if (pathname.startsWith('/settings')) return 'Settings';
  const titleMap: Record<string, string> = {
    '/': 'Dashboard',
    '/notes': 'Notes',
    '/chat': 'Chat',
    '/analytics': 'RAG Analytics',
    '/git': 'Source Control',
  };
  return titleMap[pathname] || 'Page';
};


export function Header() {
  const location = useLocation();
  // UI state - unified store access
  const openCreateModal = useBoundStore((state) => state.openCreateModal);
  const isMobileMenuOpen = useBoundStore((state) => state.isMobileMenuOpen);
  const toggleMobileMenu = useBoundStore((state) => state.toggleMobileMenu);
  const closeMobileMenu = useBoundStore((state) => state.closeMobileMenu);
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

  // RAG Analytics state
  const activeTab = useBoundStore((state) => state.activeTab);
  const setActiveTab = useBoundStore((state) => state.setActiveTab);

  // Close mobile menu when clicking outside or on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        closeMobileMenu();
      }
    };

    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen, closeMobileMenu]);

  const handleCreateClick = () => {
    openCreateModal();
    closeMobileMenu();
  };

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
          paddingTop: '1.8rem',
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

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 transition-opacity duration-300"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] transform transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        style={{
          backgroundColor: 'var(--surface-card)',
          borderRight: '1px solid var(--border)',
          boxShadow: 'var(--shadow-2xl)',
        }}
      >
        <div className="flex flex-col h-full p-6">
          {/* Header with Logo and Close Button */}
          <div className="flex items-center justify-between mb-8">
            <img
              src={logo}
              alt="Second Brain"
              className="h-10 w-auto"
            />
            <button
              onClick={closeMobileMenu}
              className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
              }}
              aria-label="Close menu"
            >
              <svg
                className="h-5 w-5"
                style={{ color: 'var(--text-primary)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile Search - Only on Notes page */}
          {isNotesPage && <NotesPageControlsMobile />}

          {/* Navigation Links */}
          <nav className="space-y-2 mb-6">
            <NavLink
              to="/"
              end
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${isActive
                  ? 'font-semibold'
                  : 'font-medium'
                }`
              }
              style={({ isActive }) => {
                const baseStyle: React.CSSProperties = {
                  backgroundColor: isActive ? 'var(--surface-elevated)' : 'transparent',
                  border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                };
                return baseStyle;
              }}
              onMouseEnter={(e) => {
                const link = e.currentTarget;
                const isActive = link.getAttribute('aria-current') === 'page';
                if (!isActive) {
                  link.style.backgroundColor = 'var(--surface-elevated)';
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
              <svg
                className="h-5 w-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="whitespace-nowrap">Dashboard</span>
            </NavLink>
            <NavLink
              to="/notes"
              end
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${isActive
                  ? 'font-semibold'
                  : 'font-medium'
                }`
              }
              style={({ isActive }) => {
                const baseStyle: React.CSSProperties = {
                  backgroundColor: isActive ? 'var(--surface-elevated)' : 'transparent',
                  border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                };
                return baseStyle;
              }}
              onMouseEnter={(e) => {
                const link = e.currentTarget;
                const isActive = link.getAttribute('aria-current') === 'page';
                if (!isActive) {
                  link.style.backgroundColor = 'var(--surface-elevated)';
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
              <svg
                className="h-5 w-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="whitespace-nowrap">Notes</span>
            </NavLink>
          </nav>

          {/* Create Button */}
          <button
            onClick={handleCreateClick}
            className="group w-full inline-flex items-center justify-center gap-3 rounded-[1.5rem] px-6 py-4 text-base font-semibold transition-all duration-200 hover:scale-105 active:scale-95 mb-6"
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
          >
            <svg className="h-5 w-5 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Create New Note
          </button>

          {/* Settings Link */}
          <NavLink
            to="/settings"
            onClick={closeMobileMenu}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 mb-4 ${isActive
                ? 'font-semibold'
                : 'font-medium'
              }`
            }
            style={({ isActive }) => {
              const baseStyle: React.CSSProperties = {
                backgroundColor: isActive ? 'var(--surface-elevated)' : 'transparent',
                border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              };
              return baseStyle;
            }}
            onMouseEnter={(e) => {
              const link = e.currentTarget;
              const isActive = link.getAttribute('aria-current') === 'page';
              if (!isActive) {
                link.style.backgroundColor = 'var(--surface-elevated)';
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
            <svg
              className="h-5 w-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="whitespace-nowrap">Settings</span>
          </NavLink>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Theme Toggle */}
          <div
            className="pt-6 border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Theme
              </span>
              <ThemeToggle />
            </div>

            {/* User Menu */}
            <UserMenu />
          </div>
        </div>
      </div>
    </>
  );
}
