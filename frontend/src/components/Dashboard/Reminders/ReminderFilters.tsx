import React from 'react';
import { Search, Bell, Calendar } from 'lucide-react';
import { Input } from '../../shared/Input';

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
      {/* Search Input */}
      <div className="flex-1">
        <Input
          label=""
          icon={Search}
          type="text"
          placeholder="Search reminders..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-white/70 dark:bg-gray-800/70 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onFilterChange('all')}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all
            ${selectedFilter === 'all'
              ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
              : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
            }
          `}
        >
          All
        </button>

        <button
          onClick={() => onFilterChange('due')}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all
            ${selectedFilter === 'due'
              ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
              : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
            }
          `}
        >
          <Bell className="w-4 h-4" />
          Due Now
        </button>

        <button
          onClick={() => onFilterChange('upcoming')}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all
            ${selectedFilter === 'upcoming'
              ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
              : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
            }
          `}
        >
          <Calendar className="w-4 h-4" />
          Upcoming
        </button>
      </div>
    </div>
  );
}