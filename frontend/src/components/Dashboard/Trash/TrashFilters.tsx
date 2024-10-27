;
import {
  FileText,
  CheckSquare,
  Lightbulb,
  Bell,
  Tag,
  Calendar
} from 'lucide-react';

interface TrashFiltersProps {
  filters: {
    types: string[];
    dateRange: 'all' | 'today' | 'week' | 'month';
    tags: string[];
  };
  onFilterChange: (key: string, value: any) => void;
}

export function TrashFilters({ filters, onFilterChange }: TrashFiltersProps) {
  const itemTypes = [
    { id: 'note', label: 'Notes', icon: FileText },
    { id: 'task', label: 'Tasks', icon: CheckSquare },
    { id: 'idea', label: 'Ideas', icon: Lightbulb },
    { id: 'reminder', label: 'Reminders', icon: Bell },
    { id: 'tag', label: 'Tags', icon: Tag }
  ];

  const dateRanges = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' }
  ];

  const toggleType = (type: string) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    onFilterChange('types', newTypes);
  };

  return (
    <div className="space-y-6">
      {/* Item Type Filters */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by Type
        </label>
        <div className="flex flex-wrap gap-2">
          {itemTypes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => toggleType(id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.types.includes(id)
                  ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by Date
        </label>
        <div className="flex flex-wrap gap-2">
          {dateRanges.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onFilterChange('dateRange', id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.dateRange === id
                  ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
                }`}
            >
              <Calendar className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}