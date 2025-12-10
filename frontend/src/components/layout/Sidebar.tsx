import { NavLink } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../../store/ui-store';
import { useThemeStore } from '../../store/theme-store';
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
  const openCreateModal = useUIStore((state) => state.openCreateModal);
  const sidebarState = useUIStore((state) => state.sidebarState);
  const previousSidebarState = useUIStore((state) => state.previousSidebarState);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const { theme } = useThemeStore();
  const titleBarHeight = useTitleBarHeight();
  const logo = theme === 'light' ? logoLight : logoDark;

  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  /**
   * Prefetch data on hover for instant navigation
   * This improves perceived performance by loading data before the user clicks
   */
  const prefetchRouteData = useCallback((route: string) => {
    switch (route) {
      case 'dashboard':
        void queryClient.prefetchQuery({
          queryKey: statsKeys.ai(),
          queryFn: () => statsService.getAIStats(),
          staleTime: CACHE.STALE_TIME,
        });
        break;
      case 'notes':
      case 'directory':
        void queryClient.prefetchQuery({
          queryKey: noteKeys.all,
          queryFn: () => notesService.getAll(),
          staleTime: CACHE.STALE_TIME,
        });
        break;
      case 'chat':
        void queryClient.prefetchQuery({
          queryKey: conversationKeys.all,
          queryFn: () => chatService.getConversations(),
          staleTime: CACHE.STALE_TIME,
        });
        break;
      // analytics and settings don't need prefetch - data loads quickly
    }
  }, [queryClient]);

  const isCollapsed = sidebarState === 'collapsed';
  const isExpanded = sidebarState === 'expanded';
  const isClosed = sidebarState === 'closed';
  const canCloseFromCollapsed = isCollapsed && previousSidebarState === 'expanded';

  // Calculate top position and height accounting for title bar
  const topPosition = '1rem';
  // Height: viewport height - title bar - top margin (1rem) - bottom margin (1rem)
  const sidebarHeight = `calc(100vh - ${titleBarHeight}px - 2rem)`;
  const maxHeight = `calc(100vh - ${titleBarHeight}px - 2rem)`;

  // Green toggle button when sidebar is closed
  if (isClosed) {
    // Calculate vertical center
    const centerOffset = '50%';

    return (
      <button
        onClick={toggleSidebar}
        className="hidden md:flex fixed left-0 -translate-y-1/2 z-30 w-8 h-16 items-center justify-center rounded-r-2xl transition-all duration-500 hover:w-10 hover:shadow-2xl active:scale-95 group overflow-hidden"
        style={{
          top: centerOffset,
          backgroundColor: 'var(--btn-primary-bg)',
          color: 'var(--btn-primary-text)',
          boxShadow: 'var(--btn-primary-shadow)',
        }}
        aria-label="Open sidebar"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover-bg)';
          e.currentTarget.style.boxShadow = 'var(--btn-primary-hover-shadow)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--btn-primary-bg)';
          e.currentTarget.style.boxShadow = 'var(--btn-primary-shadow)';
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        <svg
          className="h-5 w-5 transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110 relative z-10"
          style={{ color: 'var(--btn-primary-text)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  return (
    <aside
      className={`hidden md:flex sticky ml-4 z-30 flex-col pb-6 rounded-2xl border overflow-hidden ${isCollapsed ? 'w-20' : 'w-72 px-6'
        }`}
      style={{
        top: topPosition,
        height: sidebarHeight,
        maxHeight: maxHeight,
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-2xl), 0 0 80px -20px var(--color-primary-alpha)',
        paddingTop: isCollapsed ? '1rem' : '2rem',
        transition: 'all 600ms cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(20px)',
        background: `linear-gradient(to bottom, var(--surface-card), var(--surface-card))`,
      }}
    >
      {/* Ambient glow effect */}
      <div
        className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle, var(--color-primary), transparent)`,
        }}
      />

      <div className="flex-1 flex flex-col relative z-10 overflow-y-auto min-h-0">
        {/* Logo/Brand */}
        <div className={`mb-6 transition-all duration-600 ease-out ${isCollapsed ? 'mb-4' : 'mb-8'}`}>
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

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 mb-6 px-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-3.5 transition-all duration-300 overflow-hidden ${isCollapsed ? 'justify-center' : ''
              } ${isActive
                ? 'font-semibold shadow-lg'
                : 'font-medium hover:scale-[1.02] active:scale-[0.98]'
              }`
            }
            style={({ isActive }) => {
              const baseStyle: React.CSSProperties = {
                backgroundColor: isActive ? 'var(--surface-elevated)' : 'transparent',
                border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 4px 12px -2px var(--color-primary-alpha), inset 0 1px 0 0 rgba(255,255,255,0.1)' : 'none',
              };
              return baseStyle;
            }}
            onMouseEnter={(e) => {
              const link = e.currentTarget;
              const isActive = link.getAttribute('aria-current') === 'page';
              setHoveredLink('dashboard');
              prefetchRouteData('dashboard'); // Prefetch dashboard data on hover
              if (!isActive) {
                link.style.backgroundColor = 'var(--surface-elevated)';
                link.style.color = 'var(--text-primary)';
                link.style.borderColor = 'var(--border)';
                link.style.boxShadow = '0 4px 12px -4px var(--color-primary-alpha)';
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
                link.style.boxShadow = 'none';
              }
            }}
            title={isCollapsed ? 'Dashboard' : undefined}
          >
            {/* Hover shimmer effect */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700"
              style={{
                transform: hoveredLink === 'dashboard' ? 'translateX(100%)' : 'translateX(-100%)',
              }}
            />

            <svg
              className={`flex-shrink-0 transition-all duration-300 relative z-10 ${isCollapsed ? 'h-5 w-5' : 'h-5 w-5'} group-hover:scale-110 group-hover:rotate-3`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {!isCollapsed && (
              <span className="whitespace-nowrap transition-all duration-300 ease-out relative z-10">
                Dashboard
              </span>
            )}
          </NavLink>
          <NavLink
            to="/notes"
            end
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-3.5 transition-all duration-300 overflow-hidden ${isCollapsed ? 'justify-center' : ''
              } ${isActive
                ? 'font-semibold shadow-lg'
                : 'font-medium hover:scale-[1.02] active:scale-[0.98]'
              }`
            }
            style={({ isActive }) => {
              const baseStyle: React.CSSProperties = {
                backgroundColor: isActive ? 'var(--surface-elevated)' : 'transparent',
                border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 4px 12px -2px var(--color-primary-alpha), inset 0 1px 0 0 rgba(255,255,255,0.1)' : 'none',
              };
              return baseStyle;
            }}
            onMouseEnter={(e) => {
              const link = e.currentTarget;
              const isActive = link.getAttribute('aria-current') === 'page';
              setHoveredLink('notes');
              prefetchRouteData('notes'); // Prefetch notes data on hover
              if (!isActive) {
                link.style.backgroundColor = 'var(--surface-elevated)';
                link.style.color = 'var(--text-primary)';
                link.style.borderColor = 'var(--border)';
                link.style.boxShadow = '0 4px 12px -4px var(--color-primary-alpha)';
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
                link.style.boxShadow = 'none';
              }
            }}
            title={isCollapsed ? 'Notes' : undefined}
          >
            {/* Hover shimmer effect */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700"
              style={{
                transform: hoveredLink === 'notes' ? 'translateX(100%)' : 'translateX(-100%)',
              }}
            />

            <svg
              className={`flex-shrink-0 transition-all duration-300 relative z-10 ${isCollapsed ? 'h-5 w-5' : 'h-5 w-5'} group-hover:scale-110 group-hover:-rotate-3`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {!isCollapsed && (
              <span className="whitespace-nowrap transition-all duration-300 ease-out relative z-10">
                Notes
              </span>
            )}
          </NavLink>
          <NavLink
            to="/directory"
            end
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-3.5 transition-all duration-300 overflow-hidden ${isCollapsed ? 'justify-center' : ''
              } ${isActive
                ? 'font-semibold shadow-lg'
                : 'font-medium hover:scale-[1.02] active:scale-[0.98]'
              }`
            }
            style={({ isActive }) => {
              const baseStyle: React.CSSProperties = {
                backgroundColor: isActive ? 'var(--surface-elevated)' : 'transparent',
                border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 4px 12px -2px var(--color-primary-alpha), inset 0 1px 0 0 rgba(255,255,255,0.1)' : 'none',
              };
              return baseStyle;
            }}
            onMouseEnter={(e) => {
              const link = e.currentTarget;
              const isActive = link.getAttribute('aria-current') === 'page';
              setHoveredLink('directory');
              prefetchRouteData('directory'); // Prefetch notes data on hover (shared with notes)
              if (!isActive) {
                link.style.backgroundColor = 'var(--surface-elevated)';
                link.style.color = 'var(--text-primary)';
                link.style.borderColor = 'var(--border)';
                link.style.boxShadow = '0 4px 12px -4px var(--color-primary-alpha)';
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
                link.style.boxShadow = 'none';
              }
            }}
            title={isCollapsed ? 'Directory' : undefined}
          >
            {/* Hover shimmer effect */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700"
              style={{
                transform: hoveredLink === 'directory' ? 'translateX(100%)' : 'translateX(-100%)',
              }}
            />

            <svg
              className={`flex-shrink-0 transition-all duration-300 relative z-10 ${isCollapsed ? 'h-5 w-5' : 'h-5 w-5'} group-hover:scale-110 group-hover:rotate-3`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            {!isCollapsed && (
              <span className="whitespace-nowrap transition-all duration-300 ease-out relative z-10">
                Directory
              </span>
            )}
          </NavLink>
          <NavLink
            to="/chat"
            end
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-3.5 transition-all duration-300 overflow-hidden ${isCollapsed ? 'justify-center' : ''
              } ${isActive
                ? 'font-semibold shadow-lg'
                : 'font-medium hover:scale-[1.02] active:scale-[0.98]'
              }`
            }
            style={({ isActive }) => {
              const baseStyle: React.CSSProperties = {
                backgroundColor: isActive ? 'var(--surface-elevated)' : 'transparent',
                border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 4px 12px -2px var(--color-primary-alpha), inset 0 1px 0 0 rgba(255,255,255,0.1)' : 'none',
              };
              return baseStyle;
            }}
            onMouseEnter={(e) => {
              const link = e.currentTarget;
              const isActive = link.getAttribute('aria-current') === 'page';
              setHoveredLink('chat');
              prefetchRouteData('chat'); // Prefetch conversations on hover
              if (!isActive) {
                link.style.backgroundColor = 'var(--surface-elevated)';
                link.style.color = 'var(--text-primary)';
                link.style.borderColor = 'var(--border)';
                link.style.boxShadow = '0 4px 12px -4px var(--color-primary-alpha)';
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
                link.style.boxShadow = 'none';
              }
            }}
            title={isCollapsed ? 'AI Chat' : undefined}
          >
            {/* Hover shimmer effect */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700"
              style={{
                transform: hoveredLink === 'chat' ? 'translateX(100%)' : 'translateX(-100%)',
              }}
            />

            <svg
              className={`flex-shrink-0 transition-all duration-300 relative z-10 ${isCollapsed ? 'h-5 w-5' : 'h-5 w-5'} group-hover:scale-110 group-hover:rotate-6`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {!isCollapsed && (
              <span className="whitespace-nowrap transition-all duration-300 ease-out relative z-10">
                AI Chat
              </span>
            )}
          </NavLink>
          <NavLink
            to="/analytics"
            end
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-3.5 transition-all duration-300 overflow-hidden ${isCollapsed ? 'justify-center' : ''
              } ${isActive
                ? 'font-semibold shadow-lg'
                : 'font-medium hover:scale-[1.02] active:scale-[0.98]'
              }`
            }
            style={({ isActive }) => {
              const baseStyle: React.CSSProperties = {
                backgroundColor: isActive ? 'var(--surface-elevated)' : 'transparent',
                border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 4px 12px -2px var(--color-primary-alpha), inset 0 1px 0 0 rgba(255,255,255,0.1)' : 'none',
              };
              return baseStyle;
            }}
            onMouseEnter={(e) => {
              const link = e.currentTarget;
              const isActive = link.getAttribute('aria-current') === 'page';
              setHoveredLink('analytics');
              if (!isActive) {
                link.style.backgroundColor = 'var(--surface-elevated)';
                link.style.color = 'var(--text-primary)';
                link.style.borderColor = 'var(--border)';
                link.style.boxShadow = '0 4px 12px -4px var(--color-primary-alpha)';
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
                link.style.boxShadow = 'none';
              }
            }}
            title={isCollapsed ? 'RAG Analytics' : undefined}
          >
            {/* Hover shimmer effect */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700"
              style={{
                transform: hoveredLink === 'analytics' ? 'translateX(100%)' : 'translateX(-100%)',
              }}
            />

            <svg
              className={`flex-shrink-0 transition-all duration-300 relative z-10 ${isCollapsed ? 'h-5 w-5' : 'h-5 w-5'} group-hover:scale-110 group-hover:rotate-3`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            {!isCollapsed && (
              <span className="whitespace-nowrap transition-all duration-300 ease-out relative z-10">
                RAG Analytics
              </span>
            )}
          </NavLink>
          <NavLink
            to="/git"
            end
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-3.5 transition-all duration-300 overflow-hidden ${isCollapsed ? 'justify-center' : ''
              } ${isActive
                ? 'font-semibold shadow-lg'
                : 'font-medium hover:scale-[1.02] active:scale-[0.98]'
              }`
            }
            style={({ isActive }) => {
              const baseStyle: React.CSSProperties = {
                backgroundColor: isActive ? 'var(--surface-elevated)' : 'transparent',
                border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 4px 12px -2px var(--color-primary-alpha), inset 0 1px 0 0 rgba(255,255,255,0.1)' : 'none',
              };
              return baseStyle;
            }}
            onMouseEnter={(e) => {
              const link = e.currentTarget;
              const isActive = link.getAttribute('aria-current') === 'page';
              setHoveredLink('git');
              if (!isActive) {
                link.style.backgroundColor = 'var(--surface-elevated)';
                link.style.color = 'var(--text-primary)';
                link.style.borderColor = 'var(--border)';
                link.style.boxShadow = '0 4px 12px -4px var(--color-primary-alpha)';
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
                link.style.boxShadow = 'none';
              }
            }}
            title={isCollapsed ? 'Source Control' : undefined}
          >
            {/* Hover shimmer effect */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700"
              style={{
                transform: hoveredLink === 'git' ? 'translateX(100%)' : 'translateX(-100%)',
              }}
            />

            <svg
              className={`flex-shrink-0 transition-all duration-300 relative z-10 ${isCollapsed ? 'h-5 w-5' : 'h-5 w-5'} group-hover:scale-110 group-hover:rotate-3`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {!isCollapsed && (
              <span className="whitespace-nowrap transition-all duration-300 ease-out relative z-10">
                Source Control
              </span>
            )}
          </NavLink>
        </nav>

        {/* Create Button */}
        <div
          className="pt-6 pb-6 px-4 transition-all duration-500"
        >
          <button
            onClick={openCreateModal}
            className={`group relative w-full inline-flex items-center justify-center gap-2.5 rounded-2xl text-base font-semibold transition-all duration-400 hover:scale-[1.03] active:scale-95 overflow-hidden shadow-lg ${isCollapsed ? 'px-3.5 py-3.5' : 'px-6 py-4'
              }`}
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              borderColor: 'var(--btn-primary-border)',
              boxShadow: 'var(--btn-primary-shadow), 0 0 30px -10px var(--color-primary)',
              border: '1px solid transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover-bg)';
              e.currentTarget.style.borderColor = 'var(--btn-primary-hover-border)';
              e.currentTarget.style.boxShadow = 'var(--btn-primary-hover-shadow), 0 0 40px -10px var(--color-primary)';
              e.currentTarget.style.transform = 'scale(1.03) translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--btn-primary-bg)';
              e.currentTarget.style.borderColor = 'var(--btn-primary-border)';
              e.currentTarget.style.boxShadow = 'var(--btn-primary-shadow), 0 0 30px -10px var(--color-primary)';
              e.currentTarget.style.transform = 'scale(1) translateY(0)';
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
              className={`transition-all duration-400 group-hover:rotate-90 group-hover:scale-110 flex-shrink-0 relative z-10 ${isCollapsed ? 'h-5 w-5' : 'h-5 w-5'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {!isCollapsed && (
              <span className="whitespace-nowrap transition-all duration-300 relative z-10">
                Create New Note
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Settings Link */}
      <div className="pb-6 px-4 border-b transition-all duration-500" style={{ borderColor: 'var(--border)' }}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-xl px-3 py-3.5 transition-all duration-300 overflow-hidden ${isCollapsed ? 'justify-center' : ''
            } ${isActive
              ? 'font-semibold shadow-lg'
              : 'font-medium hover:scale-[1.02] active:scale-[0.98]'
            }`
          }
          style={({ isActive }) => {
            const baseStyle: React.CSSProperties = {
              backgroundColor: isActive ? 'var(--surface-elevated)' : 'transparent',
              border: isActive ? '1px solid var(--border)' : '1px solid transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: isActive ? '0 4px 12px -2px var(--color-primary-alpha), inset 0 1px 0 0 rgba(255,255,255,0.1)' : 'none',
            };
            return baseStyle;
          }}
          onMouseEnter={(e) => {
            const link = e.currentTarget;
            const isActive = link.getAttribute('aria-current') === 'page';
            setHoveredLink('settings');
            if (!isActive) {
              link.style.backgroundColor = 'var(--surface-elevated)';
              link.style.color = 'var(--text-primary)';
              link.style.borderColor = 'var(--border)';
              link.style.boxShadow = '0 4px 12px -4px var(--color-primary-alpha)';
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
              link.style.boxShadow = 'none';
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
            className={`flex-shrink-0 transition-all duration-500 relative z-10 ${isCollapsed ? 'h-5 w-5' : 'h-5 w-5'} group-hover:rotate-90 group-hover:scale-110`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {!isCollapsed && (
            <span className="whitespace-nowrap transition-all duration-300 ease-out relative z-10">
              Settings
            </span>
          )}
        </NavLink>
      </div>

      {/* Toggle Button and Theme Toggle */}
      <div
        className={`pt-6 transition-all duration-500 relative z-10 ${isCollapsed ? 'pt-4' : ''}`}
      >
        <div className={`flex items-center transition-all duration-500 ${isCollapsed ? 'flex-col gap-3 justify-center' : 'gap-3 justify-end'}`}>
          <button
            onClick={toggleSidebar}
            className="group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 overflow-hidden"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px -2px var(--color-primary-alpha)',
            }}
            aria-label={
              isExpanded
                ? 'Collapse sidebar'
                : canCloseFromCollapsed
                  ? 'Close sidebar'
                  : 'Expand sidebar'
            }
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 16px -4px var(--color-primary-alpha)';
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px -2px var(--color-primary-alpha)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            {/* Ripple effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {isExpanded ? (
              <svg
                className="h-5 w-5 transition-all duration-300 group-hover:-translate-x-0.5 group-hover:scale-110 relative z-10"
                style={{ color: 'var(--text-primary)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            ) : canCloseFromCollapsed ? (
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
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

