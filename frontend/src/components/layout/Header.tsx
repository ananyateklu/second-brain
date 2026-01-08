import { useLocation } from 'react-router-dom';
import { useRef, useCallback } from 'react';
import { useBoundStore } from '../../store/bound-store';
import { UserMenu } from '../composite/user-menu';
import { IndexingIndicator } from '../ui/IndexingIndicator';
import { SummaryIndicator } from '../ui/SummaryIndicator';
import { AnalyticsTabBar } from '../../features/rag/components/AnalyticsTabBar';
import { SettingsNavTabs, SettingsTabBar, TimeRangeSelector, GitHubNavTabs, GitNavControls, GitHubRepoSelector, GitHubBranchSelector, InsightsTabBar, FocusDashboardControls, HeaderFocusIndicator, ChatPageControls, DirectoryPageControls, VoicePageControls } from './header-components';
import { useChatHeaderState } from '../../features/chat/context/ChatPageContext';
import { useVoiceHeaderState } from '../../features/voice/context/VoicePageContext';
import logoLight from '../../assets/second-brain-logo-light-mode.png';
import logoDark from '../../assets/second-brain-logo-dark-mode.png';

// Map routes to page titles
const getPageTitle = (pathname: string): string => {
  if (pathname.startsWith('/settings')) return 'Settings';
  const titleMap: Record<string, string> = {
    '/': 'Dashboard',
    '/notes': 'Notes',
    '/chat': 'Chat',
    '/voice': 'Voice Agent',
    '/insights': 'Insights',
    '/analytics': 'RAG Analytics',
    '/github': 'GitHub',
  };
  return titleMap[pathname] || 'Page';
};


export function Header() {
  const location = useLocation();
  // UI state - unified store access
  const openCreateModal = useBoundStore((state) => state.openCreateModal);
  const openQuickCapture = useBoundStore((state) => state.openQuickCapture);
  const isMobileMenuOpen = useBoundStore((state) => state.isMobileMenuOpen);
  const toggleMobileMenu = useBoundStore((state) => state.toggleMobileMenu);

  // Directory sidebar state (for Notes page mobile)
  const directorySidebarVisible = useBoundStore((state) => state.directorySidebarVisible);
  const toggleDirectorySidebar = useBoundStore((state) => state.toggleDirectorySidebar);
  // Theme state
  const theme = useBoundStore((state) => state.theme);
  const logo = theme === 'light' ? logoLight : logoDark;

  // Chat/Voice page context state (must be before handleCreateAction which uses chatHeaderState)
  const chatHeaderState = useChatHeaderState();
  const voiceHeaderState = useVoiceHeaderState();

  // Ref for create button morph animation
  const createButtonRef = useRef<HTMLButtonElement>(null);

  // Handle create button click - page-aware action
  const handleCreateAction = useCallback(() => {
    const pathname = location.pathname;

    // Dashboard: Open quick capture for new focus item
    if (pathname === '/') {
      const rect = createButtonRef.current?.getBoundingClientRect();
      const sourceRect = rect ? {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      } : null;
      openQuickCapture(sourceRect);
      return;
    }

    // Chat page: Start new chat
    if (pathname === '/chat' && chatHeaderState?.onNewChat) {
      chatHeaderState.onNewChat();
      return;
    }

    // Voice page: Start new voice session
    if (pathname === '/voice' && voiceHeaderState?.onNewSession) {
      voiceHeaderState.onNewSession();
      return;
    }

    // Notes page (default): Open create note modal
    const rect = createButtonRef.current?.getBoundingClientRect();
    const sourceRect = rect ? {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    } : null;
    openCreateModal(sourceRect);
  }, [location.pathname, openQuickCapture, openCreateModal, chatHeaderState, voiceHeaderState]);

  // Get context-aware label for the create button
  const getCreateButtonLabel = useCallback(() => {
    const pathname = location.pathname;
    if (pathname === '/') return 'Create new task';
    if (pathname === '/chat') return 'Start new chat';
    if (pathname === '/voice') return 'New voice session';
    return 'Create new note';
  }, [location.pathname]);

  const pageTitle = getPageTitle(location.pathname);
  const isDashboardPage = location.pathname === '/';
  const isNotesPage = location.pathname === '/notes';
  const isSettingsPage = location.pathname.startsWith('/settings');
  const isRagAnalyticsPage = location.pathname === '/analytics';
  const isInsightsPage = location.pathname === '/insights';
  const isGitHubPage = location.pathname === '/github';
  const isChatPage = location.pathname === '/chat';
  const isVoicePage = location.pathname === '/voice';

  // GitHub tab state for showing Git controls on local-changes tab
  const githubActiveTab = useBoundStore((state) => state.githubActiveTab);
  const showGitControls = isGitHubPage && githubActiveTab === 'local-changes';

  // RAG Analytics state (legacy)
  const activeTab = useBoundStore((state) => state.activeTab);
  const setActiveTab = useBoundStore((state) => state.setActiveTab);

  // Insights state
  const activeInsightsTab = useBoundStore((state) => state.activeInsightsTab);
  const setActiveInsightsTab = useBoundStore((state) => state.setActiveInsightsTab);

  // Chat page selection mode state
  const isChatSelectionMode = isChatPage && chatHeaderState?.isSelectionMode;

  // Voice page selection mode state
  const isVoiceSelectionMode = isVoicePage && voiceHeaderState?.isSelectionMode;

  // Hide page title when in any selection mode
  const isAnySelectionMode = isChatSelectionMode || isVoiceSelectionMode;

  return (
    <>
      {/* Mobile Header */}
      <div
        className="md:hidden w-full sm:px-4"
        style={{
          paddingTop: '1rem',
        }}
      >
        <header
          className="mx-auto max-w-[95%] sm:max-w-[92%] rounded-3xl backdrop-blur-xl shadow-xl"
          style={{
            border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
          }}
        >
          <div className="flex h-16 sm:h-20 items-center justify-between px-5 sm:px-8">
            {/* Left side - Hamburger Menu + Notes Folder Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMobileMenu}
                className="group relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
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

              {/* Folder Toggle - Only on Notes page */}
              {isNotesPage && (
                <button
                  onClick={toggleDirectorySidebar}
                  className="group flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: directorySidebarVisible
                      ? 'var(--btn-primary-bg)'
                      : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                    border: directorySidebarVisible
                      ? '1px solid var(--btn-primary-border)'
                      : '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                    color: directorySidebarVisible ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                  }}
                  aria-label={directorySidebarVisible ? 'Hide folders' : 'Show folders'}
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </button>
              )}

              {/* Chat Sidebar Toggle - Only on Chat page */}
              {isChatPage && chatHeaderState && (
                <button
                  onClick={chatHeaderState.onToggleSidebar}
                  className="group flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: chatHeaderState.showSidebar
                      ? 'var(--btn-primary-bg)'
                      : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                    border: chatHeaderState.showSidebar
                      ? '1px solid var(--btn-primary-border)'
                      : '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                    color: chatHeaderState.showSidebar ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                  }}
                  aria-label={chatHeaderState.showSidebar ? 'Hide conversations' : 'Show conversations'}
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
              )}

              {/* Voice Sidebar Toggle - Only on Voice page */}
              {isVoicePage && voiceHeaderState && (
                <button
                  onClick={voiceHeaderState.onToggleSidebar}
                  className="group flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: voiceHeaderState.showSidebar
                      ? 'var(--btn-primary-bg)'
                      : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                    border: voiceHeaderState.showSidebar
                      ? '1px solid var(--btn-primary-border)'
                      : '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                    color: voiceHeaderState.showSidebar ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                  }}
                  aria-label={voiceHeaderState.showSidebar ? 'Hide voice sessions' : 'Show voice sessions'}
                >
                  {/* Clock/History icon for voice sessions */}
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Center - Logo/Brand */}
            <div className="flex items-center flex-1 justify-center">
              <img
                src={logo}
                alt="Second Brain"
                className="h-8 sm:h-10 w-auto"
              />
            </div>

            {/* Right side - Chat toggles + Create Button */}
            <div className="flex items-center gap-1.5">
              {/* RAG/Agent Toggles - Chat page only */}
              {isChatPage && chatHeaderState && (
                <>
                  {/* RAG Toggle */}
                  <button
                    onClick={() => chatHeaderState.onRagToggle(!chatHeaderState.ragEnabled)}
                    className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: chatHeaderState.ragEnabled
                        ? 'var(--color-brand-600)'
                        : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                      border: chatHeaderState.ragEnabled
                        ? '1px solid var(--color-brand-500)'
                        : '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                      color: chatHeaderState.ragEnabled ? 'white' : 'var(--text-secondary)',
                    }}
                    title={chatHeaderState.ragEnabled ? 'RAG enabled - using notes context' : 'RAG disabled'}
                    aria-label={chatHeaderState.ragEnabled ? 'Disable RAG' : 'Enable RAG'}
                  >
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </button>

                  {/* Agent Toggle */}
                  <button
                    onClick={() => chatHeaderState.onAgentModeChange(!chatHeaderState.agentModeEnabled)}
                    className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: chatHeaderState.agentModeEnabled
                        ? 'var(--color-brand-600)'
                        : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                      border: chatHeaderState.agentModeEnabled
                        ? '1px solid var(--color-brand-500)'
                        : '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                      color: chatHeaderState.agentModeEnabled ? 'white' : 'var(--text-secondary)',
                    }}
                    title={chatHeaderState.agentModeEnabled ? 'Agent mode enabled - can use tools' : 'Agent mode disabled'}
                    aria-label={chatHeaderState.agentModeEnabled ? 'Disable Agent mode' : 'Enable Agent mode'}
                  >
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </button>
                </>
              )}

              {/* Voice Session Status - Voice page only */}
              {isVoicePage && voiceHeaderState?.isConnected && (
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
                  style={{
                    backgroundColor: voiceHeaderState.sessionState === 'Listening'
                      ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
                      : voiceHeaderState.sessionState === 'Speaking'
                        ? 'color-mix(in srgb, var(--color-accent-purple) 15%, transparent)'
                        : 'color-mix(in srgb, var(--color-accent-blue) 15%, transparent)',
                    color: voiceHeaderState.sessionState === 'Listening'
                      ? 'var(--color-success)'
                      : voiceHeaderState.sessionState === 'Speaking'
                        ? 'var(--color-accent-purple)'
                        : 'var(--color-accent-blue)',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{
                      backgroundColor: voiceHeaderState.sessionState === 'Listening'
                        ? 'var(--color-success)'
                        : voiceHeaderState.sessionState === 'Speaking'
                          ? 'var(--color-accent-purple)'
                          : 'var(--color-accent-blue)',
                    }}
                  />
                  <span className="hidden sm:inline">
                    {voiceHeaderState.sessionState === 'Listening' && 'Listening'}
                    {voiceHeaderState.sessionState === 'Speaking' && 'Speaking'}
                    {voiceHeaderState.sessionState === 'Processing' && 'Processing'}
                    {voiceHeaderState.sessionState !== 'Listening' &&
                      voiceHeaderState.sessionState !== 'Speaking' &&
                      voiceHeaderState.sessionState !== 'Processing' && 'Active'}
                  </span>
                </div>
              )}

              {/* Insights/Settings pages: Show User Menu instead of Create button */}
              {(isInsightsPage || isSettingsPage) ? (
                <UserMenu />
              ) : (
                /* Create Button (compact) - page-aware action */
                <button
                  ref={createButtonRef}
                  onClick={handleCreateAction}
                  className="group inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 bg-[var(--btn-primary-bg)] border-[var(--btn-primary-border)] shadow-[var(--btn-primary-shadow)] hover:bg-[var(--btn-primary-hover-bg)] hover:border-[var(--btn-primary-hover-border)] hover:shadow-[var(--btn-primary-hover-shadow)]"
                  style={{
                    color: 'var(--btn-primary-text)',
                  }}
                  aria-label={getCreateButtonLabel()}
                >
                  {/* Dashboard: Target/Focus icon */}
                  {isDashboardPage ? (
                    <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : isChatPage ? (
                    /* Chat: Message/Plus icon */
                    <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  ) : isVoicePage ? (
                    /* Voice: Microphone icon */
                    <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  ) : (
                    /* Notes/Default: Plus icon with rotation */
                    <svg className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Insights Tab Bar - Only on Insights page (Mobile) */}
          {isInsightsPage && (
            <div className="px-2 pb-3 space-y-2 flex flex-col items-center">
              <InsightsTabBar activeTab={activeInsightsTab} onTabChange={setActiveInsightsTab} />
              {/* Time Range Selector - Only on RAG tab */}
              {activeInsightsTab === 'rag' && <TimeRangeSelector />}
            </div>
          )}

          {/* Settings Tab Bar - Only on Settings pages (Mobile) */}
          {isSettingsPage && (
            <div className="px-2 pb-3 flex justify-center overflow-x-auto scrollbar-none">
              <SettingsTabBar />
            </div>
          )}
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
          {/* Left side - Page Title (hidden in selection mode) */}
          {!isAnySelectionMode && (
            <div className="flex items-center h-12">
              <h1
                className="text-xl font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {pageTitle}
              </h1>
            </div>
          )}

          {/* Right side - Page-specific controls and User Menu */}
          {/* Chat Page - Full-width controls */}
          {isChatPage ? (
            <div className="flex items-center gap-4 h-12 flex-1">
              <ChatPageControls />
              <HeaderFocusIndicator />
              <SummaryIndicator />
              <IndexingIndicator />
              <UserMenu />
            </div>
          ) : isVoicePage ? (
            <div className="flex items-center gap-4 h-12 flex-1">
              <VoicePageControls />
              <HeaderFocusIndicator />
              <SummaryIndicator />
              <IndexingIndicator />
              <UserMenu />
            </div>
          ) : isNotesPage ? (
            <div className="flex items-center gap-4 h-12 flex-1">
              <DirectoryPageControls />
              <HeaderFocusIndicator />
              <SummaryIndicator />
              <IndexingIndicator />
              <UserMenu />
            </div>
          ) : (
            <div className="flex items-start gap-4 min-h-12 flex-1 flex-wrap flex-row-reverse">
              {/* Fixed right section - Focus, Indicators, User Menu (first in DOM, appears on right due to row-reverse) */}
              <div className="flex items-center gap-4 shrink-0">
                {/* Focus Indicator - On all pages except Dashboard (shows when focus is active) */}
                {!isDashboardPage && <HeaderFocusIndicator />}

                {/* Summary Generation Indicator */}
                <SummaryIndicator />

                {/* Indexing Indicator */}
                <IndexingIndicator />

                {/* User Menu */}
                <UserMenu />
              </div>

              {/* Page-specific controls - These can wrap when space is limited */}

              {/* GitHub Navigation */}
              {isGitHubPage && <GitHubNavTabs />}

              {/* GitHub Repo Selector */}
              {isGitHubPage && <GitHubRepoSelector />}

              {/* GitHub Branch Selector - Only on Code tab */}
              {isGitHubPage && githubActiveTab === 'code' && <GitHubBranchSelector />}

              {/* Git Navigation Controls - On GitHub page when Local Changes tab is active */}
              {showGitControls && <GitNavControls />}

              {/* Settings Navigation - Only on Settings pages */}
              {isSettingsPage && <SettingsNavTabs />}

              {/* RAG Analytics Tab Bar - Only on Analytics page (legacy) */}
              {isRagAnalyticsPage && (
                <AnalyticsTabBar activeTab={activeTab} onTabChange={setActiveTab} />
              )}

              {/* Insights Tab Bar - Only on Insights page */}
              {isInsightsPage && (
                <InsightsTabBar activeTab={activeInsightsTab} onTabChange={setActiveInsightsTab} />
              )}

              {/* Focus Dashboard Controls - Only on Dashboard page */}
              {isDashboardPage && <FocusDashboardControls />}
            </div>
          )}
        </div>

        {/* RAG Analytics Time Range Selector - Only on Analytics page or Insights RAG tab */}
        {(isRagAnalyticsPage || (isInsightsPage && activeInsightsTab === 'rag')) && <TimeRangeSelector />}
      </header>
    </>
  );
}
