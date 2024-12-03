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
import { useNotes } from '../contexts/notesContextUtils';
import { useTasks } from '../contexts/tasksContextUtils';
import { useReminders } from '../contexts/remindersContextUtils';
import { PersonalPage } from './Dashboard/Personal/PersonalPage';
import { EditNoteModal } from './Dashboard/Notes/EditNoteModal';
import { EditIdeaModal } from './Dashboard/Ideas/EditIdeaModal';
import { useModal } from '../contexts/modalContextUtils';

export function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isLoading: notesLoading } = useNotes();
  const { isLoading: tasksLoading } = useTasks();
  const { isLoading: remindersLoading } = useReminders();
  const { selectedNote, selectedIdea, setSelectedNote, setSelectedIdea } = useModal();

  const isLoading = notesLoading || tasksLoading || remindersLoading;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 dark:bg-[#111111]">
      {/* Fixed background */}
      <div className="fixed inset-0 bg-gray-50 dark:bg-[#111111] -z-10" />

      <div className="flex overflow-x-hidden min-h-screen">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 lg:ml-60 flex flex-col">
          <Header
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {/* Main Content */}
          <main
            className="flex-1 overflow-y-auto overflow-x-hidden mt-20"
            style={{
              overscrollBehavior: 'none',
              backgroundColor: 'transparent'
            }}
          >
            <div className="max-w-[1920px] mx-auto px-6 sm:px-8 lg:px-20 py-8">
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

      <EditNoteModal
        isOpen={selectedNote !== null}
        onClose={() => setSelectedNote(null)}
        note={selectedNote}
      />

      <EditIdeaModal
        isOpen={selectedIdea !== null}
        onClose={() => setSelectedIdea(null)}
        idea={selectedIdea}
      />
    </div>
  );
}