import React, { useState } from 'react';
import { Bell, Plus, Search, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import { useReminders } from '../../../contexts/remindersContextUtils';
import { ReminderList } from './ReminderList';
import { NewReminderModal } from './NewReminderModal';
import { ReminderFilters } from './ReminderFilters';
import { Input } from '../../shared/Input';

export function RemindersPage() {
  const { reminders, getDueReminders, getUpcomingReminders } = useReminders();
  const [showNewReminderModal, setShowNewReminderModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'due' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

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
      <div className="fixed inset-0 bg-fixed bg-gradient-to-br from-[var(--color-background)] to-[var(--color-surface)] -z-10" />

      <div className="space-y-8 relative">
        <div className="relative overflow-hidden rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-reminder)]/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex flex-col sm:flex-row gap-6 justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[var(--color-reminder)]/10 rounded-lg">
                  <Bell className="w-6 h-6 text-[var(--color-reminder)]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text)]">Reminders</h1>
                  <p className="text-sm text-[var(--color-textSecondary)]">
                    {dueCount} due now • {upcomingCount} upcoming
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewReminderModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--color-reminder)] hover:bg-[var(--color-reminder)]/90 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Reminder</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              label=""
              icon={Search}
              type="text"
              placeholder="Search reminders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg border border-[var(--color-border)] transition-all ${
                viewMode === 'grid'
                  ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                  : 'bg-[var(--color-background)] hover:bg-[var(--color-surface)] text-[var(--color-textSecondary)]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg border border-[var(--color-border)] transition-all ${
                viewMode === 'list'
                  ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                  : 'bg-[var(--color-background)] hover:bg-[var(--color-surface)] text-[var(--color-textSecondary)]'
              }`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)]
                bg-[var(--color-surface)] hover:bg-[var(--color-surface)]/80
                text-[var(--color-text)] transition-colors
                ${showFilters ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : ''}
              `}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">Filters</h3>
              <button
                onClick={() => setSelectedFilter('all')}
                className="text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
              >
                Clear all
              </button>
            </div>
            <ReminderFilters
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
            />
          </div>
        )}

        <div className="w-full">
          <ReminderList 
            reminders={filteredReminders} 
            viewMode={viewMode}
          />
        </div>

        <NewReminderModal
          isOpen={showNewReminderModal}
          onClose={() => setShowNewReminderModal(false)}
        />
      </div>
    </div>
  );
}