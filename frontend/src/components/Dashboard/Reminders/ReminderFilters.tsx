import React from 'react';
import { Search, Bell, Calendar } from 'lucide-react';

interface ReminderFiltersProps {
  selectedFilter: 'all' | 'due' | 'upcoming';
  onFilterChange: (filter: 'all' | 'due' | 'upcoming') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ReminderFilters({
  selectedFilter,
  onFilterChange,
  searchQuery,
  onSearchChange
}: ReminderFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search reminders..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onFilterChange('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            selectedFilter === 'all'
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
              : 'bg-white dark:bg-dark-bg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>All</span>
        </button>

        <button
          onClick={() => onFilterChange('due')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            selectedFilter === 'due'
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
              : 'bg-white dark:bg-dark-bg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Due</span>
        </button>

        <button
          onClick={() => onFilterChange('upcoming')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            selectedFilter === 'upcoming'
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
              : 'bg-white dark:bg-dark-bg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Upcoming</span>
        </button>
      </div>
    </div>
  );
}