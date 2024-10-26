import React, { useState } from 'react';
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
import { FocusPage } from './Dashboard/Focus/FocusPage';
import { AIAssistantPage } from './Dashboard/AI/AIAssistantPage';
import { SearchPage } from './Dashboard/Search/SearchPage';
import { HelpPage } from './Dashboard/Help/HelpPage';

export function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
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
        <div className="flex-1 min-w-0 lg:ml-64"> {/* Add left margin for sidebar width */}
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
                <Route path="focus" element={<FocusPage />} />
                <Route path="ai" element={<AIAssistantPage />} />
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