import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { useTitleBarHeight } from './use-title-bar-height';
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

  return (
    <div
      className="h-screen overflow-hidden flex flex-col md:flex-row"
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
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isPageFullscreen ? 'ml-0' : ''}`}
        style={isPageFullscreen ? { marginLeft: 0 } : undefined}
      >
        {!isChatPage && !isDirectoryPage && <Header />}

        <main
          className={`flex-1 ${isPageFullscreen ? 'px-0 pt-0' : 'px-4 md:px-6'} ${(isChatPage || isDirectoryPage) && !isPageFullscreen ? 'md:pt-4' : ''} ${!isChatPage && !isDirectoryPage ? 'py-4 sm:py-1' : ''} ${isSettingsPage ? 'flex items-center justify-center' : ''} ${isPageFullscreen ? 'w-full' : 'mx-auto max-w-5xl md:max-w-none w-full'} ${!isChatPage ? 'overflow-y-auto scrollbar-thin' : 'overflow-hidden'}`}
        >
          {children}
        </main>
      </div>

      {/* Global modals available on all pages */}
      <CreateNoteModal />
    </div>
  );
}
