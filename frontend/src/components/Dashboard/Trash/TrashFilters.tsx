import { FileText, CheckSquare, Bell, Lightbulb, Calendar, Tag } from 'lucide-react';

interface TrashFiltersProps {
  filters: {
    types: string[];
    dateRange: 'all' | 'today' | 'week' | 'month';
    tags: string[];
  };
  onFilterChange: (key: string, value: any) => void;
  availableTypes: string[];
}

export function TrashFilters({ filters, onFilterChange, availableTypes }: TrashFiltersProps) {
  const typeIcons = {
    note: FileText,
    task: CheckSquare,
    reminder: Bell,
    idea: Lightbulb
  };

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
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Filter by Type
        </label>
        <div className="flex flex-wrap gap-2">
          {availableTypes.map(type => {
            const Icon = typeIcons[type as keyof typeof typeIcons];
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all
                  ${filters.types.includes(type)
                    ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                    : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {type.charAt(0).toUpperCase() + type.slice(1)}s
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Time Period
        </label>
        <div className="flex flex-wrap gap-2">
          {dateRanges.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onFilterChange('dateRange', id)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all
                ${filters.dateRange === id
                  ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                  : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
                }
              `}
            >
              <Calendar className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tags Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Filter by Tags
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100"
          >
            <Tag className="w-4 h-4" />
            Add Tag Filter
          </button>
        </div>
      </div>
    </div>
  );
}