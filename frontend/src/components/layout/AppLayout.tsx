import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { CreateNoteModal } from '../../features/notes/components/CreateNoteModal';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';
  const isSettingsPage = location.pathname.startsWith('/settings');

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{
        background: 'transparent',
      }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {!isChatPage && <Header />}

        <main
          className={`flex-1 px-4 md:px-6 ${isChatPage ? 'md:pt-4' : 'py-4 sm:py-1'} ${isSettingsPage ? 'flex items-center justify-center' : ''} mx-auto max-w-5xl md:max-w-none w-full`}
        >
          {children}
        </main>
      </div>

      {/* Global modals available on all pages */}
      <CreateNoteModal />
    </div>
  );
}
