import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

// Lazy load dashboard components
const DashboardHome = lazy(() => import('../components/Dashboard/DashboardHome').then(module => ({ default: module.DashboardHome })));
const NotesPage = lazy(() => import('../components/Dashboard/Notes/NotesPage').then(module => ({ default: module.NotesPage })));
const LinkedNotesPage = lazy(() => import('../components/Dashboard/LinkedNotes/LinkedItemsGraphPage').then(module => ({ default: module.LinkedNotesPage })));
const IdeasPage = lazy(() => import('../components/Dashboard/Ideas/IdeasPage').then(module => ({ default: module.IdeasPage })));
const TagsPage = lazy(() => import('../components/Dashboard/Tags/TagsPage').then(module => ({ default: module.TagsPage })));
const FavoritesPage = lazy(() => import('../components/Dashboard/Favorites/FavoritesPage').then(module => ({ default: module.FavoritesPage })));
const ArchivePage = lazy(() => import('../components/Dashboard/Archive/ArchivePage').then(module => ({ default: module.ArchivePage })));
const TrashPage = lazy(() => import('../components/Dashboard/Trash/TrashPage').then(module => ({ default: module.TrashPage })));
const TasksPage = lazy(() => import('../components/Dashboard/Tasks/TasksPage').then(module => ({ default: module.TasksPage })));
const RemindersPage = lazy(() => import('../components/Dashboard/Reminders/RemindersPage').then(module => ({ default: module.RemindersPage })));
const RecentPage = lazy(() => import('../components/Dashboard/Recent/RecentPage').then(module => ({ default: module.RecentPage })));
const AIAgentsPage = lazy(() => import('../components/Dashboard/AI/Agents/components/AIAgentsPage').then(module => ({ default: module.AIAgentsPage })));
const EnhancedChatPage = lazy(() => import('../components/Dashboard/AI/Chat/EnhancedChatPage').then(module => ({ default: module.EnhancedChatPage })));
const PersonalPage = lazy(() => import('../components/Dashboard/Personal/PersonalPage').then(module => ({ default: module.PersonalPage })));
const SearchPage = lazy(() => import('../components/Dashboard/Search/SearchPage').then(module => ({ default: module.SearchPage })));
const PerplexityPage = lazy(() => import('../components/Dashboard/Perplexity/PerplexityPage').then(module => ({ default: module.PerplexityPage })));
const SettingsPage = lazy(() => import('../components/Dashboard/Settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const TickTickCallback = lazy(() => import('../components/Callback/TickTickCallback').then(module => ({ default: module.TickTickCallback })));

export function DashboardRoutes() {
    return (
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
            <Route path="agents" element={<AIAgentsPage />} />
            <Route path="chat" element={<EnhancedChatPage />} />
            <Route path="profile" element={<PersonalPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="perplexity" element={<PerplexityPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="/callback/ticktick" element={<TickTickCallback />} />
        </Routes>
    );
} 