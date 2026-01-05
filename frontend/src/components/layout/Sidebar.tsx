import { NavLink } from 'react-router-dom';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBoundStore } from '../../store/bound-store';
import { ThemeToggle } from '../ui/ThemeToggle';
import { noteKeys, conversationKeys, statsKeys } from '../../lib/query-keys';
import { notesService, chatService, statsService } from '../../services';
import { CACHE } from '../../lib/constants';
import { useTitleBarHeight } from './use-title-bar-height';
import logoLight from '../../assets/second-brain-logo-light-mode.png';
import logoDark from '../../assets/second-brain-logo-dark-mode.png';
import brainTopTab from '../../assets/brain-top-tab.png';

export function Sidebar() {
  const queryClient = useQueryClient();
  const openCreateModal = useBoundStore((state) => state.openCreateModal);
  const sidebarState = useBoundStore((state) => state.sidebarState);
  const toggleSidebar = useBoundStore((state) => state.toggleSidebar);
  const theme = useBoundStore((state) => state.theme);
  const titleBarHeight = useTitleBarHeight();
  const logo = theme === 'light' ? logoLight : logoDark;

  // Mobile menu state
  const isMobileMenuOpen = useBoundStore((state) => state.isMobileMenuOpen);
  const closeMobileMenu = useBoundStore((state) => state.closeMobileMenu);

  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isTemporarilyOpen, setIsTemporarilyOpen] = useState(false);
  const temporarySidebarRef = useRef<HTMLDivElement>(null);
  const hoverTriggerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle mouse enter on hover trigger zone
  const handleHoverTriggerEnter = useCallback(() => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsTemporarilyOpen(true);
  }, []);

  // Handle mouse leave from the temporary sidebar
  const handleTemporarySidebarLeave = useCallback(() => {
    // Add a small delay before closing to prevent flickering
    closeTimeoutRef.current = setTimeout(() => {
      setIsTemporarilyOpen(false);
    }, 150);
  }, []);

  // Handle mouse enter on the temporary sidebar (cancel close)
  const handleTemporarySidebarEnter = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Handle sidebar toggle button click
  const handleToggleClick = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  // Handle edge button click (when sidebar is closed)
  const handleEdgeClick = useCallback(() => {
    setIsTemporarilyOpen(false);
    toggleSidebar();
  }, [toggleSidebar]);

  // Close mobile menu on escape key
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

  // Ref for create button morph animation
  const createButtonRef = useRef<HTMLButtonElement>(null);

  // Handle nav link click - close mobile menu and temporary sidebar
  const handleNavClick = useCallback(() => {
    closeMobileMenu();
    setIsTemporarilyOpen(false);
  }, [closeMobileMenu]);

  // Handle create button click with morph animation
  const handleCreateClick = useCallback(() => {
    const rect = createButtonRef.current?.getBoundingClientRect();
    const sourceRect = rect ? {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    } : null;
    openCreateModal(sourceRect);
    closeMobileMenu();
  }, [openCreateModal, closeMobileMenu]);

  /**
   * Prefetch data on hover for instant navigation
   * This improves perceived performance by loading data before the user clicks
   */
  const prefetchRouteData = useCallback((route: string) => {
    switch (route) {
      // Dashboard is now a placeholder, no prefetch needed
      case 'notes':
      case 'directory':
        // Prefetch stats and first page instead of all notes (avoids fetching 600+ notes)
        void Promise.all([
          queryClient.prefetchQuery({
            queryKey: noteKeys.stats(),
            queryFn: () => notesService.getStats(),
            staleTime: CACHE.STALE_TIME,
          }),
          queryClient.prefetchQuery({
            queryKey: noteKeys.paged({ page: 1, pageSize: 20, includeArchived: false }),
            queryFn: () => notesService.getPaged({ page: 1, pageSize: 20, includeArchived: false }),
            staleTime: CACHE.STALE_TIME,
          }),
        ]);
        break;
      case 'chat':
        void queryClient.prefetchQuery({
          queryKey: conversationKeys.all,
          queryFn: () => chatService.getConversations(),
          staleTime: CACHE.STALE_TIME,
        });
        break;
      case 'insights':
        // Use stats endpoint instead of all notes (avoids fetching 600+ notes)
        void Promise.all([
          queryClient.prefetchQuery({
            queryKey: statsKeys.ai(),
            queryFn: () => statsService.getAIStats(),
            staleTime: CACHE.STALE_TIME,
          }),
          queryClient.prefetchQuery({
            queryKey: noteKeys.stats(),
            queryFn: () => notesService.getStats(),
            staleTime: CACHE.STALE_TIME,
          }),
        ]);
        break;
      // settings don't need prefetch - data loads quickly
    }
  }, [queryClient]);

  const isCollapsed = sidebarState === 'collapsed';
  const isClosed = sidebarState === 'closed';

  // Calculate top position and height accounting for title bar
  const topPosition = '0.7rem';
  // Height: viewport height - title bar - top margin (1rem) - bottom margin (1rem)
  const sidebarHeight = `calc(100vh - ${titleBarHeight}px - 1rem)`;
  const maxHeight = `calc(100vh - ${titleBarHeight}px - 1.2rem)`;

  // Render nav link with consistent styling
  const renderNavLink = (
    to: string,
    label: string,
    icon: React.ReactNode,
    routeKey: string,
    end: boolean = true
  ) => (
    <NavLink
      to={to}
      end={end}
      onClick={handleNavClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-3.5 transition-all duration-300 overflow-hidden ${isCollapsed ? 'md:justify-center' : ''
        } ${isActive
          ? 'font-semibold shadow-lg'
          : 'font-medium hover:scale-[1.02] active:scale-[0.98]'
        }`
      }
      style={({ isActive }) => ({
        backgroundColor: isActive ? 'var(--color-brand-600)' : 'transparent',
        border: isActive ? '1px solid var(--color-brand-600)' : '1px solid transparent',
        color: isActive ? '#ffffff' : 'var(--text-secondary)',
      })}
      onMouseEnter={(e) => {
        const link = e.currentTarget;
        const isActive = link.getAttribute('aria-current') === 'page';
        setHoveredLink(routeKey);
        prefetchRouteData(routeKey);
        if (!isActive) {
          link.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 4%, transparent)';
          link.style.color = 'var(--text-primary)';
          link.style.borderColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)';
        }
      }}
      onMouseLeave={(e) => {
        const link = e.currentTarget;
        const isActive = link.getAttribute('aria-current') === 'page';
        setHoveredLink(null);
        if (!isActive) {
          link.style.backgroundColor = 'transparent';
          link.style.color = 'var(--text-secondary)';
          link.style.borderColor = 'transparent';
        }
      }}
      title={isCollapsed ? label : undefined}
    >
      {/* Hover shimmer effect */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700"
        style={{
          transform: hoveredLink === routeKey ? 'translateX(100%)' : 'translateX(-100%)',
        }}
      />
      {icon}
      {(!isCollapsed || isMobileMenuOpen) && (
        <span className="whitespace-nowrap transition-all duration-300 ease-out relative z-10">
          {label}
        </span>
      )}
    </NavLink>
  );

  // Sidebar content (shared between mobile and desktop)
  const sidebarContent = (
    <>
      {/* Ambient glow effect */}
      <div
        className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle, var(--color-primary), transparent)`,
        }}
      />

      <div className="flex-1 flex flex-col relative z-10 overflow-y-auto thin-scrollbar min-h-0">
        {/* Logo/Brand - Desktop only, mobile has it in header */}
        <div className={`mb-6 transition-all duration-600 ease-out hidden md:block ${isCollapsed ? 'mb-4' : 'mb-8'}`}>
          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 blur-2xl"
                style={{ background: `radial-gradient(circle at center, var(--color-primary), transparent 70%)` }}
              />
              <img
                src={isCollapsed ? brainTopTab : logo}
                alt="Second Brain"
                className={`relative z-10 transition-all duration-600 ease-out ${isCollapsed ? 'h-12 w-auto' : 'h-16 w-auto'} group-hover:scale-105 drop-shadow-lg`}
                style={{
                  filter: 'drop-shadow(0 4px 12px var(--color-primary-alpha))',
                }}
              />
            </div>
          </div>
        </div>

        {/* Mobile header with logo and close button */}
        <div className="flex md:hidden items-center justify-between mb-6 px-2">
          <img
            src={logo}
            alt="Second Brain"
            className="h-10 w-auto"
          />
          <button
            onClick={closeMobileMenu}
            className="flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
              border: '1px solid color-mix(in srgb, var(--text-primary) 10%, transparent)',
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

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 mb-6 px-4">
          {renderNavLink('/', 'Dashboard', (
            <svg
              className={`flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:rotate-3`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ), 'dashboard')}

          {renderNavLink('/notes', 'Notes', (
            <svg
              className={`flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:-rotate-3`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ), 'notes')}

          {renderNavLink('/chat', 'Chat', (
            <svg
              className={`flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:rotate-6`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ), 'chat')}

          {renderNavLink('/insights', 'Insights', (
            <svg
              className={`flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:rotate-3`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ), 'insights')}

          {renderNavLink('/github', 'GitHub', (
            <svg
              className={`flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:rotate-3`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          ), 'github')}

          {renderNavLink('/voice', 'Voice Agent', (
            <svg
              className={`flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:rotate-6`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ), 'voice')}
        </nav>

        {/* Create Button */}
        <div className="pt-3 pb-3 px-4 transition-all duration-500">
          <button
            ref={createButtonRef}
            onClick={handleCreateClick}
            className={`group relative w-full inline-flex items-center justify-center gap-2.5 rounded-2xl text-base font-semibold transition-all duration-400 hover:scale-[1.03] hover:-translate-y-0.5 active:scale-95 overflow-hidden shadow-lg bg-[var(--btn-primary-bg)] border border-transparent hover:bg-[var(--btn-primary-hover-bg)] hover:border-[var(--btn-primary-hover-border)] ${isCollapsed && !isMobileMenuOpen ? 'md:px-3.5 md:py-3.5' : ''} px-6 py-4`}
            style={{
              color: 'var(--btn-primary-text)',
            }}
            title={isCollapsed ? 'Create New Note' : undefined}
          >
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

            {/* Pulsing glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"
              style={{ backgroundColor: 'var(--btn-primary-text)' }}
            />

            <svg
              className="transition-all duration-400 group-hover:rotate-90 group-hover:scale-110 flex-shrink-0 relative z-10 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {(!isCollapsed || isMobileMenuOpen) && (
              <span className="whitespace-nowrap transition-all duration-300 relative z-10">
                Create New Note
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Settings Link */}
      <div className="pb-3 px-4 border-b transition-all duration-500" style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}>
        <NavLink
          to="/settings"
          onClick={handleNavClick}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-xl px-3 py-3.5 transition-all duration-300 overflow-hidden ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''
            } ${isActive
              ? 'font-semibold shadow-lg'
              : 'font-medium hover:scale-[1.02] active:scale-[0.98]'
            }`
          }
          style={({ isActive }) => ({
            backgroundColor: isActive ? 'var(--color-brand-600)' : 'transparent',
            border: isActive ? '1px solid var(--color-brand-600)' : '1px solid transparent',
            color: isActive ? '#ffffff' : 'var(--text-secondary)',
          })}
          onMouseEnter={(e) => {
            const link = e.currentTarget;
            const isActive = link.getAttribute('aria-current') === 'page';
            setHoveredLink('settings');
            if (!isActive) {
              link.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 4%, transparent)';
              link.style.color = 'var(--text-primary)';
              link.style.borderColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)';
            }
          }}
          onMouseLeave={(e) => {
            const link = e.currentTarget;
            const isActive = link.getAttribute('aria-current') === 'page';
            setHoveredLink(null);
            if (!isActive) {
              link.style.backgroundColor = 'transparent';
              link.style.color = 'var(--text-secondary)';
              link.style.borderColor = 'transparent';
            }
          }}
          title={isCollapsed ? 'Settings' : undefined}
        >
          {/* Hover shimmer effect */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700"
            style={{
              transform: hoveredLink === 'settings' ? 'translateX(100%)' : 'translateX(-100%)',
            }}
          />

          <svg
            className="flex-shrink-0 transition-all duration-500 relative z-10 h-5 w-5 group-hover:rotate-90 group-hover:scale-110"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {(!isCollapsed || isMobileMenuOpen) && (
            <span className="whitespace-nowrap transition-all duration-300 ease-out relative z-10">
              Settings
            </span>
          )}
        </NavLink>
      </div>

      {/* Toggle Button and Theme Toggle */}
      <div className={`transition-all duration-500 relative z-10 ${isCollapsed ? 'pt-4' : 'mt-3 pt-3'}`}>
        <div className={`flex items-center transition-all duration-500 ${isCollapsed && !isMobileMenuOpen ? 'md:flex-col md:gap-3 md:justify-center' : ''} gap-3 justify-between md:justify-end`}>
          {/* Theme Toggle - with label on mobile */}
          <div className="flex md:hidden items-center gap-3">
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Theme
            </span>
            <ThemeToggle />
          </div>

          {/* Desktop toggle button */}
          <button
            onClick={handleToggleClick}
            className="hidden md:flex group relative items-center justify-center w-11 h-11 rounded-lg transition-all duration-300 overflow-hidden hover:scale-110 active:scale-95"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
              border: '1px solid color-mix(in srgb, var(--text-primary) 10%, transparent)',
            }}
            aria-label={isCollapsed ? 'Close sidebar' : 'Open sidebar'}
          >
            {/* Ripple effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Icon: X when collapsed, arrows when closed */}
            {isCollapsed ? (
              <svg
                className="h-5 w-5 transition-all duration-300 group-hover:rotate-90 group-hover:scale-110 relative z-10"
                style={{ color: 'var(--text-primary)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 transition-all duration-300 group-hover:translate-x-0.5 group-hover:scale-110 relative z-10"
                style={{ color: 'var(--text-primary)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            )}
          </button>
          {/* Desktop theme toggle */}
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </>
  );

  // Green toggle button when sidebar is closed (desktop only)
  if (isClosed) {
    return (
      <>
        {/* Desktop closed state button */}
        <button
          onClick={handleEdgeClick}
          className="hidden md:flex fixed left-0 -translate-y-1/2 z-30 w-5 h-10 items-center justify-center rounded-r-xl transition-all duration-500 group overflow-hidden backdrop-blur-md hover:w-7 active:scale-95"
          style={{
            top: '50vh',
            backgroundColor: 'color-mix(in srgb, var(--background) 80%, transparent)',
            border: '1px solid color-mix(in srgb, var(--text-primary) 10%, transparent)',
            borderLeft: 'none',
            color: 'var(--text-primary)',
          }}
          aria-label="Open sidebar"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <svg
            className="h-3.5 w-3.5 transition-all duration-300 group-hover:translate-x-0.5 group-hover:scale-110 relative z-10"
            style={{ color: 'var(--text-primary)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        {/* Hover trigger zone - only triggers when cursor touches the very left edge */}
        <div
          ref={hoverTriggerRef}
          className="hidden md:block fixed left-0 top-0 bottom-0 z-20"
          style={{ width: '2px' }}
          onMouseEnter={handleHoverTriggerEnter}
          aria-hidden="true"
        />

        {/* Temporary sidebar that appears on hover */}
        <aside
          ref={temporarySidebarRef}
          className={`hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-[23rem] flex-col p-6 transform transition-all duration-300 ease-out backdrop-blur-xl ${
            isTemporarilyOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
          }`}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--background) 85%, transparent)',
            borderRight: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
          }}
          onMouseEnter={handleTemporarySidebarEnter}
          onMouseLeave={handleTemporarySidebarLeave}
        >
          {/* Ambient glow effect */}
          <div
            className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none transition-opacity duration-1000"
            style={{
              background: `radial-gradient(circle, var(--color-primary), transparent)`,
            }}
          />

          <div className="flex-1 flex flex-col relative z-10 overflow-y-auto thin-scrollbar min-h-0">
            {/* Logo */}
            <div className="mb-8 transition-all duration-600 ease-out">
              <div className="flex justify-center">
                <div className="relative group">
                  <img
                    src={logo}
                    alt="Second Brain"
                    className="relative z-10 h-16 w-auto group-hover:scale-105 drop-shadow-lg transition-all duration-600 ease-out"
                    style={{
                      filter: 'drop-shadow(0 4px 12px var(--color-primary-alpha))',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 space-y-1.5 mb-6 px-4">
              {renderNavLink('/', 'Dashboard', (
                <svg className="flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:rotate-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ), 'dashboard')}
              {renderNavLink('/notes', 'Notes', (
                <svg className="flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:-rotate-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ), 'notes')}
              {renderNavLink('/chat', 'Chat', (
                <svg className="flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:rotate-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              ), 'chat')}
              {renderNavLink('/insights', 'Insights', (
                <svg className="flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:rotate-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ), 'insights')}
              {renderNavLink('/github', 'GitHub', (
                <svg className="flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:rotate-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              ), 'github')}
              {renderNavLink('/voice', 'Voice Agent', (
                <svg className="flex-shrink-0 transition-all duration-300 relative z-10 h-5 w-5 group-hover:scale-110 group-hover:rotate-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              ), 'voice')}
            </nav>

            {/* Create New Note Button */}
            <div className="py-3 px-4">
              <button
                onClick={() => {
                  setIsTemporarilyOpen(false);
                  openCreateModal(null);
                }}
                className="group relative w-full inline-flex items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-base font-semibold transition-all duration-400 hover:scale-[1.03] hover:-translate-y-0.5 active:scale-95 overflow-hidden shadow-lg bg-[var(--btn-primary-bg)] border border-transparent hover:bg-[var(--btn-primary-hover-bg)] hover:border-[var(--btn-primary-hover-border)]"
                style={{
                  color: 'var(--btn-primary-text)',
                }}
              >
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <svg
                  className="transition-all duration-400 group-hover:rotate-90 group-hover:scale-110 flex-shrink-0 relative z-10 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="whitespace-nowrap transition-all duration-300 relative z-10">
                  Create New Note
                </span>
              </button>
            </div>

            {/* Settings Button and Theme Toggle - inline */}
            <div className="pt-3 px-4 flex items-center justify-center gap-3">
              <NavLink
                to="/settings"
                onClick={handleNavClick}
                className="group flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                }}
                title="Settings"
              >
                <svg
                  className="h-5 w-5 transition-all duration-500 group-hover:rotate-90 group-hover:scale-110"
                  style={{ color: 'var(--text-primary)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </NavLink>
              <ThemeToggle />
            </div>
          </div>
        </aside>

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
        <aside
          className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] transform transition-transform duration-300 ease-out flex flex-col p-6 backdrop-blur-xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)',
            borderRight: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
          }}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  return (
    <>
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
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] transform transition-transform duration-300 ease-out flex flex-col p-6 backdrop-blur-xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)',
          borderRight: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex sticky ml-4 z-30 flex-col pb-4 rounded-3xl border overflow-hidden backdrop-blur-xl ${isCollapsed ? 'w-20' : 'w-[23rem] px-6'
          }`}
        style={{
          top: topPosition,
          height: sidebarHeight,
          maxHeight: maxHeight,
          backgroundColor: 'color-mix(in srgb, var(--background) 85%, transparent)',
          borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
          paddingTop: isCollapsed ? '0.8rem' : '1.5rem',
          transition: 'all 600ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
