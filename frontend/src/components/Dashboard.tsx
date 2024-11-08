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
import { AIAssistantPage } from './Dashboard/AI/AIAssistantPage';
import { SearchPage } from './Dashboard/Search/SearchPage';
import { HelpPage } from './Dashboard/Help/HelpPage';
import { LoadingScreen } from './shared/LoadingScreen';
import { useNotes } from '../contexts/NotesContext';
import { useTasks } from '../contexts/TasksContext';
import { useReminders } from '../contexts/RemindersContext';
import { PersonalPage } from './Dashboard/Personal/PersonalPage';

export function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { isLoading: notesLoading } = useNotes();
  const { isLoading: tasksLoading } = useTasks();
  const { isLoading: remindersLoading } = useReminders();

  const isLoading = notesLoading || tasksLoading || remindersLoading;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-primary-900/50 bg-gradient-to-br from-white to-gray-100">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 lg:hidden z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} />

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 lg:ml-56"> {/* Updated left margin */}
          {/* Fixed Header */}
          <Header
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {/* Scrollable Content Area */}
          <main className="pt-16"> {/* Add padding-top for header height */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <Route path="ai" element={<AIAssistantPage />} />
                <Route path="profile" element={<PersonalPage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="help" element={<HelpPage />} />

              </Routes>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}