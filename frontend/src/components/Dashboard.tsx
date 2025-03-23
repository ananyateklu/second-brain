import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './Dashboard/Sidebar';
import { Header } from './Dashboard/Header';
import { WelcomeBar } from './Dashboard/WelcomeBar';
import { DashboardHome } from './Dashboard/DashboardHome';
import { NotesPage } from './Dashboard/Notes/NotesPage';
import { TagsPage } from './Dashboard/Tags/TagsPage';
import { FavoritesPage } from './Dashboard/Favorites/FavoritesPage';
import { SettingsPage } from './Dashboard/Settings/SettingsPage';
import { LinkedNotesPage } from './Dashboard/LinkedNotes/LinkedNotesPage';
import { IdeasPage } from './Dashboard/Ideas/IdeasPage';
import { ArchivePage } from './Dashboard/Archive/ArchivePage';
import { TrashPage } from './Dashboard/Trash/TrashPage';
import { TasksPage } from './Dashboard/Tasks/TasksPage';
import { RemindersPage } from './Dashboard/Reminders/RemindersPage';
import { RecentPage } from './Dashboard/Recent/RecentPage';
import { DailyFocus } from './Dashboard/Focus/FocusPage';
import { AIAgentsPage } from './Dashboard/AI/Agents/components/AIAgentsPage';
import { AIAssistantPage } from './Dashboard/AI/AIAssistantPage';
import { SearchPage } from './Dashboard/Search/SearchPage';
import { LoadingScreen } from './shared/LoadingScreen';
import { useNotes } from '../contexts/notesContextUtils';
import { useTasks } from '../contexts/tasksContextUtils';
import { useReminders } from '../contexts/remindersContextUtils';
import { PersonalPage } from './Dashboard/Personal/PersonalPage';
import { EditNoteModal } from './Dashboard/Notes/EditNoteModal';
import { EditIdeaModal } from './Dashboard/Ideas/EditIdeaModal';
import { useModal } from '../contexts/modalContextUtils';
import { useTheme } from '../contexts/themeContextUtils';
import { useReminderNotifications } from '../hooks/useReminderNotifications';

export function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { isLoading: notesLoading } = useNotes();
  const { isLoading: tasksLoading } = useTasks();
  const { isLoading: remindersLoading } = useReminders();
  const { selectedNote, selectedIdea, setSelectedNote, setSelectedIdea } = useModal();
  const { colors } = useTheme();

  // Initialize reminder notifications
  useReminderNotifications();

  const isLoading = notesLoading || tasksLoading || remindersLoading;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Fixed gradient background - Updated for better dark mode */}
      <div className={`fixed inset-0 ${colors.gradientBackground}`} />

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-60'}`}>
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'lg:pl-60' : 'pl-0'} relative`}>
        {/* Fixed Header */}
        <div className={`fixed top-0 right-0 left-0 transition-all duration-300 ${isSidebarOpen ? 'lg:left-60' : 'left-0'} z-20`}>
          <Header
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-20 relative">
          <div className={`max-w-[1920px] mx-auto transition-all duration-300 ${isSidebarOpen ? 'px-4 sm:px-6 lg:px-12' : 'px-6 sm:px-12 lg:px-16'} py-8`}>
            <WelcomeBar />
            <Routes>
              <Route index element={<DashboardHome />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="linked" element={<LinkedNotesPage />} />
              <Route path="ideas" element={<IdeasPage />} />
              <Route path="tags" element={<TagsPage />} />
              <Route path="favorites" element={<FavoritesPage />} />
              <Route path="archive" element={<ArchivePage />} />
              <Route path="trash" element={<TrashPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="reminders" element={<RemindersPage />} />
              <Route path="recent" element={<RecentPage />} />
              <Route path="focus" element={<DailyFocus />} />
              <Route path="agents" element={<AIAgentsPage />} />
              <Route path="ai" element={<AIAssistantPage />} />
              <Route path="profile" element={<PersonalPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Routes>
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