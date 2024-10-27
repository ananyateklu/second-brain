import {
  FileText,
  CheckSquare,
  Lightbulb,
  Bell,
  Tag,
  Settings,
  Plus,
  Pencil,
  Trash2,
  Link2,
  Star,
  Calendar
} from 'lucide-react';

interface ActivityFiltersProps {
  filters: {
    actionTypes: string[];
    itemTypes: string[];
    dateRange: 'all' | 'today' | 'week' | 'month';
  };
  onFilterChange: (key: string, value: any) => void;
}

export function ActivityFilters({ filters, onFilterChange }: ActivityFiltersProps) {
  const actionTypes = [
    { id: 'create', label: 'Created', icon: Plus },
    { id: 'edit', label: 'Modified', icon: Pencil },
    { id: 'delete', label: 'Deleted', icon: Trash2 },
    { id: 'link', label: 'Linked', icon: Link2 },
    { id: 'favorite', label: 'Favorited', icon: Star }
  ];

  const itemTypes = [
    { id: 'note', label: 'Notes', icon: FileText },
    { id: 'task', label: 'Tasks', icon: CheckSquare },
    { id: 'idea', label: 'Ideas', icon: Lightbulb },
    { id: 'reminder', label: 'Reminders', icon: Bell },
    { id: 'tag', label: 'Tags', icon: Tag },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const dateRanges = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' }
  ];

  const toggleActionType = (actionType: string) => {
    const newActionTypes = filters.actionTypes.includes(actionType)
      ? filters.actionTypes.filter(type => type !== actionType)
      : [...filters.actionTypes, actionType];
    onFilterChange('actionTypes', newActionTypes);
  };

  const toggleItemType = (itemType: string) => {
    const newItemTypes = filters.itemTypes.includes(itemType)
      ? filters.itemTypes.filter(type => type !== itemType)
      : [...filters.itemTypes, itemType];
    onFilterChange('itemTypes', newItemTypes);
  };

  return (
    <div className="space-y-6">
      {/* Action Type Filters */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by Action
        </label>
        <div className="flex flex-wrap gap-2">
          {actionTypes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => toggleActionType(id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.actionTypes.includes(id)
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

      {/* Item Type Filters */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by Type
        </label>
        <div className="flex flex-wrap gap-2">
          {itemTypes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => toggleItemType(id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.itemTypes.includes(id)
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
          Time Period
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