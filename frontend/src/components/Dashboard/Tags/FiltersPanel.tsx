import { FileText, Lightbulb, CheckSquare, Bell } from 'lucide-react';
import { TagFilters } from './TagsTypes';

interface FiltersPanelProps {
  filters: TagFilters;
  setFilters: (filters: TagFilters) => void;
}

export function FiltersPanel({ filters, setFilters }: FiltersPanelProps) {
  const toggleType = (type: 'note' | 'idea' | 'task' | 'reminder') => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    setFilters({ ...filters, types: newTypes });
  };

  return (
    <div className="mt-2 p-2 bg-white/10 dark:bg-gray-800/10 rounded-lg border border-gray-200/30 dark:border-gray-700/30">
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by type</div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => toggleType('note')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
              filters.types.includes('note')
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Notes
          </button>
          <button
            onClick={() => toggleType('idea')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
              filters.types.includes('idea')
                ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Ideas
          </button>
          <button
            onClick={() => toggleType('task')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
              filters.types.includes('task')
                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Tasks
          </button>
          <button
            onClick={() => toggleType('reminder')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
              filters.types.includes('reminder')
                ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Reminders
          </button>
        </div>

        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-3">Sort by</div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilters({ ...filters, sortBy: 'count' })}
            className={`px-2 py-1 rounded-md text-xs ${
              filters.sortBy === 'count'
                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
            }`}
          >
            Count
          </button>
          <button
            onClick={() => setFilters({ ...filters, sortBy: 'name' })}
            className={`px-2 py-1 rounded-md text-xs ${
              filters.sortBy === 'name'
                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
            }`}
          >
            Name
          </button>
        </div>

        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-3">Order</div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilters({ ...filters, sortOrder: 'asc' })}
            className={`px-2 py-1 rounded-md text-xs ${
              filters.sortOrder === 'asc'
                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
            }`}
          >
            Ascending
          </button>
          <button
            onClick={() => setFilters({ ...filters, sortOrder: 'desc' })}
            className={`px-2 py-1 rounded-md text-xs ${
              filters.sortOrder === 'desc'
                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
            }`}
          >
            Descending
          </button>
        </div>
      </div>
    </div>
  );
} 