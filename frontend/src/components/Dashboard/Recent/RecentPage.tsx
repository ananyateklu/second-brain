import { useState } from 'react';
import { Search, SlidersHorizontal, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { ActivityFeed } from './ActivityFeed';
import { ActivityFilters } from './ActivityFilters';
import { useActivities } from '../../../contexts/activityContextUtils';
import { Input } from '../../shared/Input';
import { EditNoteModal } from '../Notes/EditNoteModal';
import { EditTaskModal } from '../Tasks/EditTaskModal';
import { EditReminderModal } from '../Reminders/EditReminderModal/index';
import { EditIdeaModal } from '../Ideas/EditIdeaModal';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { useReminders } from '../../../contexts/remindersContextUtils';
import { useTheme } from '../../../contexts/themeContextUtils';
import { Activity } from '../../../services/api/activities.service';
import { useIdeas } from '../../../contexts/ideasContextUtils';
import { Idea } from '../../../types/idea';

export function RecentPage() {
  const { theme } = useTheme();
  const { activities } = useActivities();
  const { notes } = useNotes();
  const { tasks } = useTasks();
  const { reminders } = useReminders();
  const { state: { ideas } } = useIdeas();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    actionTypes: [] as string[],
    itemTypes: [] as string[],
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month'
  });
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  const selectedNote = selectedNoteId ? notes.find(n => n.id === selectedNoteId) : null;
  const selectedIdea = selectedIdeaId ? ideas.find((i: Idea) => i.id === selectedIdeaId) : null;
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;
  const selectedReminder = selectedReminderId ? reminders.find(r => r.id === selectedReminderId) : null;

  const handleActivityClick = (activity: Activity) => {
    switch (activity.itemType.toLowerCase()) {
      case 'note':
        setSelectedNoteId(activity.itemId);
        break;
      case 'idea':
        setSelectedIdeaId(activity.itemId);
        break;
      case 'task':
        setSelectedTaskId(activity.itemId);
        break;
      case 'reminder':
        setSelectedReminderId(activity.itemId);
        break;
    }
  };

  const getThemeStyles = () => {
    const isDarkTheme = theme === 'dark' || theme === 'midnight' || theme === 'full-dark';

    // Light theme styles
    if (!isDarkTheme) {
      return {
        headerGradient: 'from-emerald-500/10 to-transparent',
        iconBg: 'bg-emerald-100/50',
        iconColor: 'text-emerald-600'
      };
    }

    // Dark theme styles (for dark, midnight, and full-dark)
    switch (theme) {
      case 'midnight':
        return {
          headerGradient: 'from-emerald-400/20 to-transparent',
          iconBg: 'bg-emerald-400/20',
          iconColor: 'text-emerald-300'
        };
      default: // handles 'dark' and 'full-dark'
        return {
          headerGradient: 'from-emerald-500/20 to-transparent',
          iconBg: 'bg-emerald-500/20',
          iconColor: 'text-emerald-400'
        };
    }
  };

  const getBackgroundGradient = (theme: string) => {
    if (theme === 'light') return 'from-zinc-50 to-zinc-100';
    if (theme === 'dark' || theme === 'full-dark') return 'from-zinc-900 via-zinc-900 to-zinc-800';
    return 'from-[#0F172A] via-[#1E293B] to-[#334155]'; // midnight
  };

  const getContainerBackground = () => {
    if (theme === 'dark' || theme === 'full-dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      <div className={`fixed inset-0 bg-fixed bg-gradient-to-br ${getBackgroundGradient(theme)} -z-10`} />

      <div className="w-full py-8 space-y-8 relative">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0, y: -20 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
          }}
          className={`
            relative 
            overflow-hidden 
            rounded-2xl 
            ${getContainerBackground()}
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
          `}
        >
          <div className={`absolute inset-0 bg-gradient-to-r ${getThemeStyles().headerGradient}`} />
          <div className="relative flex flex-col sm:flex-row gap-6 justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 ${getThemeStyles().iconBg} rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10`}>
                <Clock className={`w-6 h-6 ${getThemeStyles().iconColor}`} />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-[var(--color-text)]">Recent Activity</h1>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  {activities.length} activities recorded
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Updated Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              label=""
              icon={Search}
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-textSecondary)] focus:ring-[var(--color-accent)]/30"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${showFilters
              ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/30'
              : 'bg-[var(--color-surface)] hover:bg-[var(--color-surfaceHover)] text-[var(--color-text)] border-[var(--color-border)]'
              }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Updated Filters Panel */}
        {showFilters && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">
                Filters
              </h3>
              <button
                onClick={() => setFilters({
                  actionTypes: [],
                  itemTypes: [],
                  dateRange: 'all'
                })}
                className="text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors"
              >
                Clear all
              </button>
            </div>
            <ActivityFilters
              filters={filters}
              onFilterChange={(key, value) =>
                setFilters(prev => ({ ...prev, [key]: value }))
              }
            />
          </div>
        )}

        {/* Activity Feed */}
        <ActivityFeed
          activities={activities}
          filters={filters}
          searchQuery={searchQuery}
          onActivityClick={handleActivityClick}
        />

        {/* Modals */}
        {selectedNote && (
          <EditNoteModal
            isOpen={!!selectedNoteId}
            onClose={() => setSelectedNoteId(null)}
            note={selectedNote}
          />
        )}

        {selectedIdea && (
          <EditIdeaModal
            isOpen={!!selectedIdeaId}
            onClose={() => setSelectedIdeaId(null)}
            idea={selectedIdea}
          />
        )}

        {selectedTask && (
          <EditTaskModal
            isOpen={!!selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
            task={selectedTask}
          />
        )}

        {selectedReminder && (
          <EditReminderModal
            isOpen={!!selectedReminderId}
            onClose={() => setSelectedReminderId(null)}
            reminder={selectedReminder}
          />
        )}
      </div>
    </div>
  );
}