import { CheckSquare, AlertCircle, Calendar } from 'lucide-react';

interface TaskFiltersProps {
  filters: {
    status: string;
    priority: string;
    dueDate: string;
  };
  onFilterChange: (key: string, value: string) => void;
}

export function TaskFilters({ filters, onFilterChange }: TaskFiltersProps) {
  return (
    <div className="space-y-6">
      {/* Status Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange('status', 'all')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.status === 'all'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
              }`}
          >
            <CheckSquare className="w-4 h-4" />
            All
          </button>
          <button
            onClick={() => onFilterChange('status', 'incomplete')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.status === 'incomplete'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
              }`}
          >
            <CheckSquare className="w-4 h-4" />
            Incomplete
          </button>
          <button
            onClick={() => onFilterChange('status', 'completed')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.status === 'completed'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
              }`}
          >
            <CheckSquare className="w-4 h-4" />
            Completed
          </button>
        </div>
      </div>

      {/* Priority Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Priority
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange('priority', 'all')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.priority === 'all'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
              }`}
          >
            <AlertCircle className="w-4 h-4" />
            All
          </button>
          <button
            onClick={() => onFilterChange('priority', 'high')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.priority === 'high'
                ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
              }`}
          >
            <AlertCircle className="w-4 h-4" />
            High
          </button>
          <button
            onClick={() => onFilterChange('priority', 'medium')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.priority === 'medium'
                ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
              }`}
          >
            <AlertCircle className="w-4 h-4" />
            Medium
          </button>
          <button
            onClick={() => onFilterChange('priority', 'low')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.priority === 'low'
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
              }`}
          >
            <AlertCircle className="w-4 h-4" />
            Low
          </button>
        </div>
      </div>

      {/* Due Date Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Due Date
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange('dueDate', 'all')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.dueDate === 'all'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
              }`}
          >
            <Calendar className="w-4 h-4" />
            All
          </button>
          <button
            onClick={() => onFilterChange('dueDate', 'today')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.dueDate === 'today'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
              }`}
          >
            <Calendar className="w-4 h-4" />
            Today
          </button>
          <button
            onClick={() => onFilterChange('dueDate', 'week')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.dueDate === 'week'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
              }`}
          >
            <Calendar className="w-4 h-4" />
            This Week
          </button>
          <button
            onClick={() => onFilterChange('dueDate', 'overdue')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.dueDate === 'overdue'
                ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
              }`}
          >
            <Calendar className="w-4 h-4" />
            Overdue
          </button>
          <button
            onClick={() => onFilterChange('dueDate', 'no-date')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.dueDate === 'no-date'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
              }`}
          >
            <Calendar className="w-4 h-4" />
            No Date
          </button>
        </div>
      </div>
    </div>
  );
}