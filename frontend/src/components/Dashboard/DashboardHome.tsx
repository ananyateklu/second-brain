import { useNavigate } from 'react-router-dom';
import { useNotes } from '../../hooks/useNotes';
import { useTheme } from '../../contexts/themeContextUtils';
import {
  ChevronRight,
  PinIcon
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { NoteCard } from './NoteCard';
import { WelcomeSection } from './WelcomeSection';
import { useTasks } from '../../contexts/tasksContextUtils';
import { useModal } from '../../contexts/modalContextUtils';
import { Note } from '../../types/note';
import { WelcomeBar } from './WelcomeBar';
import { IdeaCard } from './Ideas/IdeaCard';

export function DashboardHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notes } = useNotes();
  const { tasks } = useTasks();
  const { setSelectedNote, setSelectedIdea } = useModal();
  const { theme } = useTheme();

  const stats = {
    totalNotes: notes.length,
    newThisWeek: notes.filter(note => {
      const noteDate = new Date(note.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return noteDate > weekAgo;
    }).length,
    pinnedNotes: notes.filter(note => note.isPinned && !note.isIdea),
    pinnedIdeas: notes.filter(note => note.isPinned && note.isIdea),
    lastUpdated: notes.length > 0
      ? new Date(Math.max(...notes.map(note => new Date(note.updatedAt).getTime())))
      : null,
    totalTasks: tasks.length,
    completedTasks: tasks.filter(task => task.status === 'Completed').length
  };

  const handleEditNote = (note: Note) => {
    setSelectedNote(note);
  };

  const handleEditIdea = (idea: Note) => {
    setSelectedIdea(idea);
  };

  const getBackgroundClass = (theme: string) => {
    if (theme === 'dark') return 'bg-gray-900/30'
    if (theme === 'midnight') return 'bg-[#1e293b]/30'
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]'
  }

  return (
    <div
      className="space-y-8 px-4 py-4 w-full max-w-[1800px] mx-auto overflow-visible"
      style={{
        contain: 'paint'
      }}
    >
      {/* Greeting Section */}
      <div
        className="shadow-sm rounded-xl transition-all duration-300 overflow-visible"
        data-type="welcome-section"
      >
        <WelcomeSection
          user={{ ...user!, experience: user!.experiencePoints }}
          onNewNote={() => { }}
          onNavigate={navigate}
          stats={stats}
          tasks={tasks.map(task => ({
            ...task,
            status: task.status === 'Incomplete' ? 'Pending' : task.status,
            dueDate: task.dueDate ?? undefined
          }))}
        />
      </div>

      {/* Quick Stats */}
      <div className="overflow-visible">
        <WelcomeBar isDashboardHome={true} />
      </div>

      {/* Pinned Notes & Ideas */}
      {(stats.pinnedNotes.length > 0 || stats.pinnedIdeas.length > 0) && (
        <div className={`
          relative 
          overflow-hidden 
          rounded-2xl 
          ${getBackgroundClass(theme)} 
          backdrop-blur-xl 
          border-[0.5px] 
          border-white/10
          shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
          dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
          ring-1
          ring-white/5
          transition-all 
          duration-300 
          p-6
          mb-6
        `}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg bg-[var(--color-accent)]/20 backdrop-blur-sm text-[var(--color-accent)]`}>
                <PinIcon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                Pinned Notes & Ideas
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard/notes')}
                className={`
                  flex items-center gap-1 text-sm 
                  text-[var(--color-accent)] hover:text-[var(--color-accent)]/80
                  transition-colors duration-200
                `}
              >
                View all notes
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/dashboard/ideas')}
                className={`
                  flex items-center gap-1 text-sm 
                  text-[var(--color-accent)] hover:text-[var(--color-accent)]/80
                  transition-colors duration-200
                `}
              >
                View all ideas
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.pinnedNotes.map(note => (
              <div
                key={note.id}
                className="cursor-pointer w-full text-left transition-transform duration-200 hover:-translate-y-0.5"
                onClick={() => handleEditNote(note)}
              >
                <NoteCard note={note} />
              </div>
            ))}
            {stats.pinnedIdeas.map(idea => (
              <div
                key={idea.id}
                className="cursor-pointer w-full text-left transition-transform duration-200 hover:-translate-y-0.5"
                onClick={() => handleEditIdea(idea)}
              >
                <IdeaCard idea={idea} viewMode="grid" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}