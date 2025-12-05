import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/ui-store';
import { useThemeStore } from '../../store/theme-store';
import { ThemeToggle } from '../ui/ThemeToggle';
import { UserMenu } from '../ui/UserMenu';
import logoLight from '../../assets/second-brain-logo-light-mode.png';
import logoDark from '../../assets/second-brain-logo-dark-mode.png';

/**
 * Check if we're running in Tauri
 */
const isTauri = (): boolean => {
  return '__TAURI_INTERNALS__' in window;
};

// Map routes to page titles
const getPageTitle = (pathname: string): string => {
  if (pathname.startsWith('/settings')) return 'Settings';
  const titleMap: Record<string, string> = {
    '/': 'Dashboard',
    '/notes': 'Notes',
    '/chat': 'Chat',
  };
  return titleMap[pathname] || 'Page';
};

export function Header() {
  const location = useLocation();
  const openCreateModal = useUIStore((state) => state.openCreateModal);
  const isMobileMenuOpen = useUIStore((state) => state.isMobileMenuOpen);
  const toggleMobileMenu = useUIStore((state) => state.toggleMobileMenu);
  const closeMobileMenu = useUIStore((state) => state.closeMobileMenu);
  const searchQuery = useUIStore((state) => state.searchQuery);
  const searchMode = useUIStore((state) => state.searchMode);
  const setSearchQuery = useUIStore((state) => state.setSearchQuery);
  const toggleSearchMode = useUIStore((state) => state.toggleSearchMode);
  const { theme } = useThemeStore();
  const logo = theme === 'light' ? logoLight : logoDark;
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Use lazy initialization to avoid setState in useEffect
  const [isTauriApp] = useState(() => isTauri());

  const pageTitle = getPageTitle(location.pathname);
  const isNotesPage = location.pathname === '/notes';
  const isSettingsPage = location.pathname.startsWith('/settings');

  // Calculate title bar offset for desktop header
  const titleBarOffset = isTauriApp ? 28 : 0;

  // Focus search input on mount if on notes page
  useEffect(() => {
    if (isNotesPage && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isNotesPage]);

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <>
      {/* Mobile Header */}
      <div
        className="md:hidden sticky z-40 w-full px-2 sm:px-4"
        style={{
          top: isTauriApp ? `${titleBarOffset}px` : '0',
          paddingTop: isTauriApp ? '0.5rem' : '1rem',
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
        className="hidden md:flex sticky z-50 justify-between md:px-6 transition-all duration-300 w-full backdrop-blur-md"
        style={{
          top: isTauriApp ? `${titleBarOffset}px` : '0',
          backgroundColor: 'transparent',
          paddingTop: '1rem',
          paddingBottom: '0.5rem',
        }}
      >
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
          {/* Search Input - Only on Notes page */}
          {isNotesPage && (
            <div className="flex items-center gap-2">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search notes..."
                className="px-4 py-2 rounded-xl border text-sm transition-all focus:outline-none"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                  width: '300px',
                  boxShadow: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--input-focus-border)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--input-focus-ring)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                onClick={toggleSearchMode}
                onMouseDown={(e) => {
                  // Prevent input blur when clicking toggle button
                  e.preventDefault();
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: 'var(--color-brand-600)',
                  borderColor: 'var(--color-brand-600)',
                  color: '#ffffff',
                  boxShadow: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-brand-700)';
                  e.currentTarget.style.borderColor = 'var(--color-brand-700)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-brand-600)';
                  e.currentTarget.style.borderColor = 'var(--color-brand-600)';
                }}
                title={`Search mode: ${searchMode === 'both' ? 'Title & Content' : searchMode === 'title' ? 'Title only' : 'Content only'}`}
                aria-label={`Search mode: ${searchMode === 'both' ? 'Title & Content' : searchMode === 'title' ? 'Title only' : 'Content only'}`}
              >
                <svg
                  className="h-4 w-4"
                  style={{ color: '#ffffff' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {searchMode === 'both' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  ) : searchMode === 'title' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  )}
                </svg>
                <span className="hidden sm:inline" style={{ color: '#ffffff' }}>
                  {searchMode === 'both' ? 'Both' : searchMode === 'title' ? 'Title' : 'Content'}
                </span>
              </button>
            </div>
          )}

          {/* Settings Navigation - Only on Settings pages */}
          {isSettingsPage && (
            <div
              className="flex items-center p-1 rounded-xl border transition-all duration-200"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <NavLink
                to="/settings/general"
                className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] ${isActive ? 'font-semibold' : 'font-medium'}`}
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
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>General</span>
              </NavLink>
              <NavLink
                to="/settings/ai"
                className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] ${isActive ? 'font-semibold' : 'font-medium'}`}
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
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.638-1.638l-1.183-.394 1.183-.394a2.25 2.25 0 001.638-1.638l.394-1.183.394 1.183a2.25 2.25 0 001.638 1.638l1.183.394-1.183.394a2.25 2.25 0 00-1.638 1.638z" />
                </svg>
                <span>AI Integration</span>
              </NavLink>
              <NavLink
                to="/settings/rag"
                className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] ${isActive ? 'font-semibold' : 'font-medium'}`}
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
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>RAG</span>
              </NavLink>
            </div>
          )}

          {/* User Menu */}
          <UserMenu />
        </div>
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
          {isNotesPage && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search notes..."
                  className="flex-1 px-4 py-2 rounded-xl border text-sm transition-all focus:outline-none"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                    boxShadow: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--input-focus-border)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px var(--input-focus-ring)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              <button
                onClick={toggleSearchMode}
                onMouseDown={(e) => {
                  // Prevent input blur when clicking toggle button
                  e.preventDefault();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <svg
                  className="h-4 w-4"
                  style={{ color: 'var(--text-primary)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {searchMode === 'both' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  ) : searchMode === 'title' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  )}
                </svg>
                <span>
                  Search: {searchMode === 'both' ? 'Title & Content' : searchMode === 'title' ? 'Title only' : 'Content only'}
                </span>
              </button>
            </div>
          )}

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
