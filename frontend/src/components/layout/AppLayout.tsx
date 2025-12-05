import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { useTitleBarHeight } from './use-title-bar-height';
import { CreateNoteModal } from '../../features/notes/components/CreateNoteModal';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const titleBarHeight = useTitleBarHeight();
  const isChatPage = location.pathname === '/chat';
  const isDirectoryPage = location.pathname === '/directory';
  const isAnalyticsPage = location.pathname === '/analytics';
  const isSettingsPage = location.pathname.startsWith('/settings');

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{
        background: 'transparent',
        // Add padding for the title bar when in Tauri
        paddingTop: titleBarHeight > 0 ? `${titleBarHeight}px` : undefined,
      }}
    >
      {/* macOS Title Bar - provides drag region */}
      <TitleBar />

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {!isChatPage && !isDirectoryPage && !isAnalyticsPage && <Header />}

        <main
          className={`flex-1 px-4 md:px-6 ${isChatPage || isDirectoryPage || isAnalyticsPage ? 'md:pt-4' : 'py-4 sm:py-1'} ${isSettingsPage ? 'flex items-center justify-center' : ''} mx-auto max-w-5xl md:max-w-none w-full`}
        >
          {children}
        </main>
      </div>

      {/* Global modals available on all pages */}
      <CreateNoteModal />
    </div>
  );
}
