import React, { useState } from 'react';
import { Bell, Plus, Calendar, Clock } from 'lucide-react';
import { useReminders } from '../../../contexts/RemindersContext';
import { ReminderList } from './ReminderList';
import { NewReminderModal } from './NewReminderModal';
import { ReminderFilters } from './ReminderFilters';

export function RemindersPage() {
  const { reminders, getDueReminders, getUpcomingReminders } = useReminders();
  const [showNewReminderModal, setShowNewReminderModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'due' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReminders = React.useMemo(() => {
    let filtered = reminders;
    
    if (selectedFilter === 'due') {
      filtered = getDueReminders();
    } else if (selectedFilter === 'upcoming') {
      filtered = getUpcomingReminders();
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(reminder =>
        reminder.title.toLowerCase().includes(query) ||
        reminder.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [reminders, selectedFilter, searchQuery, getDueReminders, getUpcomingReminders]);

  const dueCount = getDueReminders().length;
  const upcomingCount = getUpcomingReminders().length;

  return (
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      <div className="fixed inset-0 bg-fixed dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800 bg-gradient-to-br from-white to-gray-100 -z-10" />

      <div className="space-y-8 relative">
        <div className="relative overflow-hidden rounded-xl bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex flex-col sm:flex-row gap-6 justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100/50 dark:bg-purple-900/30 rounded-lg">
                  <Bell className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reminders</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {dueCount} due now • {upcomingCount} upcoming
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewReminderModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Reminder</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <ReminderFilters
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="w-full">
          <ReminderList reminders={filteredReminders} />
        </div>

        <NewReminderModal
          isOpen={showNewReminderModal}
          onClose={() => setShowNewReminderModal(false)}
        />
      </div>
    </div>
  );
}