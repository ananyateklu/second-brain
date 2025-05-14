import { Suspense, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Dashboard/Sidebar';
import { Header } from './Dashboard/Header';
import { WelcomeBar } from './Dashboard/WelcomeBar';
import { DashboardRoutes } from '../routes/DashboardRoutes';
import { LoadingScreen } from './shared/LoadingScreen';
import { useNotes } from '../contexts/notesContextUtils';
import { useTasks } from '../contexts/tasksContextUtils';
import { useReminders } from '../contexts/remindersContextUtils';
import { useModal } from '../contexts/modalContextUtils';
import { useTheme } from '../contexts/themeContextUtils';
import { useReminderNotifications } from '../hooks/useReminderNotifications';
import { EditNoteModal } from './Dashboard/Notes/EditNoteModal';
import { EditIdeaModal } from './Dashboard/Ideas/EditIdeaModal';

export function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { isLoading: notesLoading } = useNotes();
  const { isLoading: tasksLoading } = useTasks();
  const { isLoading: remindersLoading } = useReminders();
  const { selectedNote, selectedIdea, setSelectedNote, setSelectedIdea } = useModal();
  const { colors } = useTheme();
  const location = useLocation();

  // Initialize reminder notifications
  useReminderNotifications();

  const isLoading = notesLoading || tasksLoading || remindersLoading;

  // Check if current path is profile or chat to hide WelcomeBar
  const shouldHideWelcomeBar = location.pathname.includes('/profile') || location.pathname.includes('/chat');

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Fixed gradient background - Updated for better dark mode */}
      <div className={`fixed inset-0 ${colors.gradientBackground}`} />

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[15.85rem]'}`}>
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'lg:pl-60' : 'pl-0'} relative`}>
        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-0 relative">
          <div className={`max-w-[1920px] mx-auto transition-all duration-300 ${isSidebarOpen ? 'px-4 sm:px-6 lg:px-12' : 'px-6 sm:px-12 lg:px-16'} py-8`}>
            <Header
              isSidebarOpen={isSidebarOpen}
              toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
            {!shouldHideWelcomeBar && <WelcomeBar />}
            <Suspense fallback={<div className="flex justify-center items-center h-64"><LoadingScreen message="Loading content..." /></div>}>
              <DashboardRoutes />
            </Suspense>
          </div>
        </main>
      </div>

      {selectedNote && (
        <EditNoteModal
          isOpen={true}
          onClose={() => setSelectedNote(null)}
          note={selectedNote}
        />
      )}

      {selectedIdea && (
        <EditIdeaModal
          isOpen={true}
          onClose={() => setSelectedIdea(null)}
          idea={selectedIdea}
        />
      )}
    </div>
  );
}