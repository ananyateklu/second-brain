import { Search } from 'lucide-react';
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
  onSearchChange,
}: ReminderFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <Input
          label=""
          icon={Search}
          type="text"
          placeholder="Search reminders..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-4 py-2 rounded-lg glass-morphism transition-colors ${
            selectedFilter === 'all'
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          All
        </button>
        <button
          onClick={() => onFilterChange('due')}
          className={`px-4 py-2 rounded-lg glass-morphism transition-colors ${
            selectedFilter === 'due'
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          Due
        </button>
        <button
          onClick={() => onFilterChange('upcoming')}
          className={`px-4 py-2 rounded-lg glass-morphism transition-colors ${
            selectedFilter === 'upcoming'
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          Upcoming
        </button>
      </div>
    </div>
  );
}