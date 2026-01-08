import { ReactNode, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { useTitleBarHeight } from './use-title-bar-height';
import { PageTransition } from '../PageTransition';
import { CreateNoteModal } from '../../features/notes/components/CreateNoteModal';
import { QuickCaptureButton, QuickCaptureModal } from '../../features/focus/components';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const titleBarHeight = useTitleBarHeight();
  const isDashboardPage = location.pathname === '/';
  const isChatPage = location.pathname === '/chat';
  const isDirectoryPage = location.pathname === '/notes';
  const isVoicePage = location.pathname === '/voice';
  const isGitHubPage = location.pathname === '/github';
  const isInsightsPage = location.pathname === '/insights';
  const isSettingsPage = location.pathname.startsWith('/settings');

  // Memoize main content classes to prevent unnecessary recalculations
  const mainClasses = useMemo(() => {
    const classes = ['flex-1'];

    // Padding classes - remove padding for full-width pages
    if (isGitHubPage || isChatPage || isDirectoryPage || isVoicePage || isInsightsPage) {
      classes.push('px-0', 'pt-0');
    } else {
      classes.push('px-4', 'md:px-6');
    }

    // Settings page centering
    if (isSettingsPage) {
      classes.push('flex', 'items-center', 'justify-center', 'py-4', 'sm:py-1');
    }

    // Width and margin
    classes.push('mx-auto', 'max-w-5xl', 'md:max-w-none', 'w-full');

    // Overflow handling - pages with internal scrolling need overflow hidden
    // min-h-0 is critical for flex children to shrink below their content size
    if (isChatPage || isVoicePage || isGitHubPage || isDashboardPage || isInsightsPage) {
      classes.push('overflow-hidden', 'min-h-0');
    } else {
      classes.push('overflow-y-auto', 'thin-scrollbar');
    }

    return classes.join(' ');
  }, [isChatPage, isVoicePage, isGitHubPage, isSettingsPage, isDirectoryPage, isDashboardPage, isInsightsPage]);

  return (
    <div
      className="h-dvh overflow-hidden flex flex-col md:flex-row app-layout"
      style={{
        background: 'transparent',
        // Add padding for the title bar when in Tauri
        paddingTop: titleBarHeight > 0 ? `${titleBarHeight}px` : undefined,
      }}
    >
      {/* macOS Title Bar - provides drag region */}
      <TitleBar />

      {/* Sidebar */}
      <Sidebar />

      <div
        className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden main-content-wrapper"
        style={{
          // GPU acceleration for the main content area
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      >
        <Header />

        <main className={mainClasses}>
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>

      {/* Global modals available on all pages */}
      <CreateNoteModal />

      {/* Quick Capture - floating button + modal */}
      <QuickCaptureButton />
      <QuickCaptureModal />
    </div>
  );
}
