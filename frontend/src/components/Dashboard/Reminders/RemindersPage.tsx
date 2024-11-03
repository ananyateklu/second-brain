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
    <div className="space-y-6">
      <div className="glass-morphism p-6 rounded-xl">
        <div className="flex flex-col sm:flex-row gap-6 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Bell className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reminders</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {dueCount} due now • {upcomingCount} upcoming
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowNewReminderModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Reminder</span>
          </button>
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
  );
}