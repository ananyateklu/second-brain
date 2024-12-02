import { Bell, Calendar } from 'lucide-react';

type ReminderFiltersProps = {
  selectedFilter: 'all' | 'due' | 'upcoming';
  onFilterChange: (filter: 'all' | 'due' | 'upcoming') => void;
};

export function ReminderFilters(props: Readonly<ReminderFiltersProps>) {
  const { selectedFilter, onFilterChange } = props;

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onFilterChange('all')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
            ${selectedFilter === 'all'
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-2 border-primary-500'
              : 'bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-[#2C2C2E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'
            }
            transition-colors
          `}
        >
          All
        </button>

        <button
          onClick={() => onFilterChange('due')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
            ${selectedFilter === 'due'
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-2 border-purple-500'
              : 'bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-[#2C2C2E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'
            }
            transition-colors
          `}
        >
          <Bell className="w-4 h-4" />
          Due Now
        </button>

        <button
          onClick={() => onFilterChange('upcoming')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
            ${selectedFilter === 'upcoming'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-2 border-blue-500'
              : 'bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-[#2C2C2E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'
            }
            transition-colors
          `}
        >
          <Calendar className="w-4 h-4" />
          Upcoming
        </button>
      </div>
    </div>
  );
}