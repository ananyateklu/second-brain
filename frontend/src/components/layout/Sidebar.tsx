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
import {
  NAV_ITEMS,
  SettingsIcon,
  PlusIcon,
  CloseIcon,
  ChevronRightIcon,
  SidebarNavLink,
} from './sidebar-components';

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
  const createButtonRef = useRef<HTMLButtonElement>(null);

  // Handle mouse enter on hover trigger zone
  const handleHoverTriggerEnter = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsTemporarilyOpen(true);
  }, []);

  // Handle mouse leave from the temporary sidebar
  const handleTemporarySidebarLeave = useCallback(() => {
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

  // Handle nav link click - close mobile menu and temporary sidebar
  const handleNavClick = useCallback(() => {
    closeMobileMenu();
    setIsTemporarilyOpen(false);
  }, [closeMobileMenu]);

  // Handle create button click with morph animation
  const handleCreateClick = useCallback(() => {
    const rect = createButtonRef.current?.getBoundingClientRect();
    const sourceRect = rect
      ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      : null;
    openCreateModal(sourceRect);
    closeMobileMenu();
  }, [openCreateModal, closeMobileMenu]);

  /**
   * Prefetch data on hover for instant navigation
   */
  const prefetchRouteData = useCallback(
    (route: string) => {
      switch (route) {
        case 'notes':
        case 'directory':
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
      }
    },
    [queryClient]
  );

  const isCollapsed = sidebarState === 'collapsed';
  const isClosed = sidebarState === 'closed';

  // Calculate top position and height accounting for title bar
  const topPosition = '0.7rem';
  const sidebarHeight = `calc(100vh - ${titleBarHeight}px - 1rem)`;
  const maxHeight = `calc(100vh - ${titleBarHeight}px - 1.2rem)`;

  // Render settings link with hover effects
  const renderSettingsLink = (showLabel: boolean) => (
    <NavLink
      to="/settings"
      onClick={handleNavClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-3.5 transition-all duration-300 overflow-hidden ${
          !showLabel ? 'md:justify-center' : ''
        } ${isActive ? 'font-semibold shadow-lg' : 'font-medium hover:scale-[1.02] active:scale-[0.98]'}`
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
      title={!showLabel ? 'Settings' : undefined}
    >
      {/* Hover shimmer effect */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700"
        style={{
          transform: hoveredLink === 'settings' ? 'translateX(100%)' : 'translateX(-100%)',
        }}
      />
      <SettingsIcon />
      {showLabel && (
        <span className="whitespace-nowrap transition-all duration-300 ease-out relative z-10">
          Settings
        </span>
      )}
    </NavLink>
  );

  // Render create button
  const renderCreateButton = (showLabel: boolean, ref?: React.RefObject<HTMLButtonElement | null>) => (
    <button
      ref={ref}
      onClick={handleCreateClick}
      data-testid="create-note-button"
      className={`group relative w-full inline-flex items-center justify-center gap-2.5 rounded-2xl text-base font-semibold transition-all duration-400 hover:scale-[1.03] hover:-translate-y-0.5 active:scale-95 overflow-hidden shadow-lg bg-[var(--btn-primary-bg)] border border-transparent hover:bg-[var(--btn-primary-hover-bg)] hover:border-[var(--btn-primary-hover-border)] ${
        !showLabel ? 'md:px-3.5 md:py-3.5' : ''
      } px-6 py-4`}
      style={{ color: 'var(--btn-primary-text)' }}
      title={!showLabel ? 'Create New Note' : undefined}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      {/* Pulsing glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"
        style={{ backgroundColor: 'var(--btn-primary-text)' }}
      />
      <PlusIcon />
      {showLabel && (
        <span className="whitespace-nowrap transition-all duration-300 relative z-10">
          Create New Note
        </span>
      )}
    </button>
  );

  // Sidebar content (shared between mobile and desktop)
  const sidebarContent = (
    <>
      {/* Ambient glow effect */}
      <div
        className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none transition-opacity duration-1000"
        style={{ background: `radial-gradient(circle, var(--color-primary), transparent)` }}
      />

      <div className="flex-1 flex flex-col relative z-10 overflow-y-auto thin-scrollbar min-h-0">
        {/* Logo/Brand - Desktop only */}
        <div className={`mb-6 transition-all duration-600 ease-out hidden md:block ${isCollapsed ? 'mb-4' : 'mb-8'}`}>
          <div className="flex justify-center">
            <div className="relative group">
              <div
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 blur-2xl"
                style={{ background: `radial-gradient(circle at center, var(--color-primary), transparent 70%)` }}
              />
              <img
                src={isCollapsed ? brainTopTab : logo}
                alt="Second Brain"
                className={`relative z-10 transition-all duration-600 ease-out ${
                  isCollapsed ? 'h-12 w-auto' : 'h-16 w-auto'
                } group-hover:scale-105 drop-shadow-lg`}
                style={{ filter: 'drop-shadow(0 4px 12px var(--color-primary-alpha))' }}
              />
            </div>
          </div>
        </div>

        {/* Mobile header with logo and close button */}
        <div className="flex md:hidden items-center justify-between mb-6 px-2">
          <img src={logo} alt="Second Brain" className="h-10 w-auto" />
          <button
            onClick={closeMobileMenu}
            className="flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
              border: '1px solid color-mix(in srgb, var(--text-primary) 10%, transparent)',
            }}
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 mb-6 px-4">
          {NAV_ITEMS.map((item) => (
            <SidebarNavLink
              key={item.routeKey}
              item={item}
              isCollapsed={isCollapsed}
              isMobileMenuOpen={isMobileMenuOpen}
              hoveredLink={hoveredLink}
              onHover={setHoveredLink}
              onPrefetch={prefetchRouteData}
              onClick={handleNavClick}
            />
          ))}
        </nav>

        {/* Create Button */}
        <div className="pt-3 pb-3 px-4 transition-all duration-500">
          {renderCreateButton(!isCollapsed || isMobileMenuOpen, createButtonRef)}
        </div>
      </div>

      {/* Settings Link - Desktop only */}
      <div
        className="hidden md:block pb-3 px-4 border-b transition-all duration-500"
        style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}
      >
        {renderSettingsLink(!isCollapsed || isMobileMenuOpen)}
      </div>

      {/* Mobile: Settings icon + Theme toggle side by side */}
      <div className="md:hidden px-4 py-4 flex items-center justify-center gap-3 shrink-0">
        <NavLink
          to="/settings"
          onClick={handleNavClick}
          className={({ isActive }) =>
            `group flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
              isActive ? 'shadow-lg' : ''
            }`
          }
          style={({ isActive }) => ({
            backgroundColor: isActive
              ? 'var(--color-brand-600)'
              : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
            border: isActive
              ? '1px solid var(--color-brand-600)'
              : '1px solid color-mix(in srgb, var(--text-primary) 10%, transparent)',
            color: isActive ? '#ffffff' : 'var(--text-secondary)',
          })}
          title="Settings"
        >
          <SettingsIcon />
        </NavLink>
        <ThemeToggle />
      </div>

      {/* Desktop: Toggle Button and Theme Toggle */}
      <div className={`hidden md:block transition-all duration-500 relative z-10 ${isCollapsed ? 'pt-4' : 'mt-3 pt-3'}`}>
        <div
          className={`flex items-center transition-all duration-500 ${
            isCollapsed ? 'flex-col gap-3 justify-center' : ''
          } gap-3 justify-end`}
        >
          {/* Desktop toggle button */}
          <button
            onClick={handleToggleClick}
            className="group relative flex items-center justify-center w-11 h-11 rounded-lg transition-all duration-300 overflow-hidden hover:scale-110 active:scale-95"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
              border: '1px solid color-mix(in srgb, var(--text-primary) 10%, transparent)',
            }}
            aria-label={isCollapsed ? 'Close sidebar' : 'Open sidebar'}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {isCollapsed ? <CloseIcon /> : <ChevronRightIcon />}
          </button>
          <ThemeToggle />
        </div>
      </div>
    </>
  );

  // Closed state with hover trigger
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
          <ChevronRightIcon className="h-3.5 w-3.5 transition-all duration-300 group-hover:translate-x-0.5 group-hover:scale-110 relative z-10" />
        </button>

        {/* Hover trigger zone */}
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
          data-testid="main-sidebar"
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
            style={{ background: `radial-gradient(circle, var(--color-primary), transparent)` }}
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
                    style={{ filter: 'drop-shadow(0 4px 12px var(--color-primary-alpha))' }}
                  />
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 space-y-1.5 mb-6 px-4">
              {NAV_ITEMS.map((item) => (
                <SidebarNavLink
                  key={item.routeKey}
                  item={item}
                  isCollapsed={false}
                  isMobileMenuOpen={false}
                  hoveredLink={hoveredLink}
                  onHover={setHoveredLink}
                  onPrefetch={prefetchRouteData}
                  onClick={handleNavClick}
                />
              ))}
            </nav>

            {/* Create New Note Button */}
            <div className="py-3 px-4">
              <button
                onClick={() => {
                  setIsTemporarilyOpen(false);
                  openCreateModal(null);
                }}
                className="group relative w-full inline-flex items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-base font-semibold transition-all duration-400 hover:scale-[1.03] hover:-translate-y-0.5 active:scale-95 overflow-hidden shadow-lg bg-[var(--btn-primary-bg)] border border-transparent hover:bg-[var(--btn-primary-hover-bg)] hover:border-[var(--btn-primary-hover-border)]"
                style={{ color: 'var(--btn-primary-text)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <PlusIcon />
                <span className="whitespace-nowrap transition-all duration-300 relative z-10">
                  Create New Note
                </span>
              </button>
            </div>

            {/* Settings Button and Theme Toggle */}
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
                <SettingsIcon />
              </NavLink>
              <ThemeToggle />
            </div>
          </div>
        </aside>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 transition-opacity duration-300"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
        )}

        {/* Mobile Menu Drawer */}
        <aside
          className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[80vw] transform transition-transform duration-300 ease-out flex flex-col pt-6 px-4 pb-8 backdrop-blur-xl ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--background) 92%, transparent)',
            borderRight: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
            paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
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
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[80vw] transform transition-transform duration-300 ease-out flex flex-col pt-6 px-4 pb-8 backdrop-blur-xl ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--background) 92%, transparent)',
          borderRight: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside
        data-testid="main-sidebar"
        className={`hidden md:flex sticky ml-4 z-30 flex-col pb-4 rounded-3xl border overflow-hidden backdrop-blur-xl ${
          isCollapsed ? 'w-20' : 'w-[23rem] px-6'
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
