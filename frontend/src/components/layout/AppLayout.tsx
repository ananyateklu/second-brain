import { ReactNode, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { useTitleBarHeight } from './use-title-bar-height';
import { PageTransition } from '../PageTransition';
import { CreateNoteModal } from '../../features/notes/components/CreateNoteModal';
import { useUIStore } from '../../store/ui-store';
import { isTauri } from '../../lib/native-notifications';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const titleBarHeight = useTitleBarHeight();
  const isChatPage = location.pathname === '/chat';
  const isDirectoryPage = location.pathname === '/directory';
  const isGitPage = location.pathname === '/git';
  const isSettingsPage = location.pathname.startsWith('/settings');

  // Fullscreen state for Tauri
  const isFullscreenChat = useUIStore((state) => state.isFullscreenChat);
  const isFullscreenDirectory = useUIStore((state) => state.isFullscreenDirectory);

  // Determine if current page is in fullscreen mode
  const isInTauri = isTauri();
  const isPageFullscreen = isInTauri && (
    (isChatPage && isFullscreenChat) ||
    (isDirectoryPage && isFullscreenDirectory)
  );

  // Memoize main content classes to prevent unnecessary recalculations
  const mainClasses = useMemo(() => {
    const classes = ['flex-1'];

    // Padding classes
    if (isPageFullscreen) {
      classes.push('px-0', 'pt-0');
    } else {
      classes.push('px-4', 'md:px-6');
    }

    // Top padding for chat/directory
    if ((isChatPage || isDirectoryPage) && !isPageFullscreen) {
      classes.push('md:pt-4');
    }

    // Padding for other pages (Git handles its own padding)
    if (!isChatPage && !isDirectoryPage && !isGitPage) {
      classes.push('py-4', 'sm:py-1');
    }

    // Settings page centering
    if (isSettingsPage) {
      classes.push('flex', 'items-center', 'justify-center');
    }

    // Width and margin
    if (isPageFullscreen) {
      classes.push('w-full');
    } else {
      classes.push('mx-auto', 'max-w-5xl', 'md:max-w-none', 'w-full');
    }

    // Overflow handling
    if (!isChatPage && !isGitPage) {
      classes.push('overflow-y-auto', 'scrollbar-thin');
    } else {
      classes.push('overflow-hidden');
    }

    return classes.join(' ');
  }, [isChatPage, isDirectoryPage, isGitPage, isSettingsPage, isPageFullscreen]);

  return (
    <div
      className="h-screen overflow-hidden flex flex-col md:flex-row app-layout"
      style={{
        background: 'transparent',
        // Add padding for the title bar when in Tauri
        paddingTop: titleBarHeight > 0 ? `${titleBarHeight}px` : undefined,
      }}
    >
      {/* macOS Title Bar - provides drag region */}
      <TitleBar />

      {/* Sidebar - floats above content when page is fullscreen */}
      <div className={isPageFullscreen ? 'fixed z-40' : ''}>
        <Sidebar />
      </div>

      <div
        className={`flex-1 flex flex-col min-w-0 main-content-wrapper ${isPageFullscreen ? 'ml-0' : ''}`}
        style={{
          // GPU acceleration for the main content area
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          ...(isPageFullscreen ? { marginLeft: 0 } : {}),
        }}
      >
        {!isChatPage && !isDirectoryPage && !isGitPage && <Header />}

        <main className={mainClasses}>
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>

      {/* Global modals available on all pages */}
      <CreateNoteModal />
    </div>
  );
}
