import { useState } from 'react';
import { History, Search, SlidersHorizontal } from 'lucide-react';
import { ActivityFeed } from './ActivityFeed';
import { ActivityFilters } from './ActivityFilters';
import { useActivities } from '../../../contexts/activityContextUtils';
import { Input } from '../../shared/Input';
import { EditNoteModal } from '../Notes/EditNoteModal';
import { EditTaskModal } from '../Tasks/EditTaskModal';
import { EditReminderModal } from '../Reminders/EditReminderModal';
import { EditIdeaModal } from '../Ideas/EditIdeaModal';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { useReminders } from '../../../contexts/remindersContextUtils';
import { Activity } from '../../../api/services/activityService';

export function RecentPage() {
  const { activities } = useActivities();
  const { notes } = useNotes();
  const { tasks } = useTasks();
  const { reminders } = useReminders();
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

  const selectedNote = selectedNoteId ? notes.find(n => n.id === selectedNoteId && !n.isIdea) : null;
  const selectedIdea = selectedIdeaId ? notes.find(n => n.id === selectedIdeaId && n.isIdea) : null;
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-fixed dark:bg-gradient-to-br dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800 bg-gradient-to-br from-zinc-50 to-zinc-100 -z-10" />

      <div className="space-y-8 relative">
        {/* Page Header with gradient overlay */}
        <div className="relative overflow-hidden rounded-xl bg-white/30 dark:bg-zinc-800/30 border border-zinc-200/30 dark:border-zinc-700/30 shadow-sm backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex flex-col sm:flex-row gap-6 justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-lg">
                  <History className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Recent Activity</h1>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Track and manage your recent actions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              label=""
              icon={Search}
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/70 dark:bg-zinc-800/70 border-zinc-200/50 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-200/30 dark:border-zinc-700/30 transition-all ${
              showFilters
                ? 'bg-emerald-100/20 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-white/20 dark:bg-zinc-800/20 hover:bg-white/30 dark:hover:bg-zinc-800/30 text-zinc-900 dark:text-zinc-100'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white/20 dark:bg-zinc-800/20 border border-zinc-200/30 dark:border-zinc-700/30 shadow-sm rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Filters
              </h3>
              <button
                onClick={() => setFilters({
                  actionTypes: [],
                  itemTypes: [],
                  dateRange: 'all'
                })}
                className="text-sm text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
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

        {/* Add Modals */}
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