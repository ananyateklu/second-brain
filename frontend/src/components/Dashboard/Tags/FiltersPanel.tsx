import { FileText, Lightbulb, CheckSquare, Bell, LucideIcon } from 'lucide-react';
import { ItemType } from '../../../components/Dashboard/Tags/types';

interface FiltersPanelProps {
  filters: {
    types: ItemType[];
    sortBy: 'count' | 'name';
    sortOrder: 'asc' | 'desc';
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    types: ItemType[];
    sortBy: 'count' | 'name';
    sortOrder: 'asc' | 'desc';
  }>>;
}

export function FiltersPanel({ filters, setFilters }: FiltersPanelProps) {
  return (
    <div className="mt-3 p-3 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 rounded-xl">
      {/* Type Filters */}
      <div className="space-y-2 mb-3">
        <h3 className="text-xs font-medium text-gray-900 dark:text-white">Filter by Type</h3>
        <div className="flex flex-wrap gap-1.5">
          <FilterButton
            type="note"
            icon={FileText}
            label="Notes"
            filters={filters}
            setFilters={setFilters}
          />
          <FilterButton
            type="idea"
            icon={Lightbulb}
            label="Ideas"
            filters={filters}
            setFilters={setFilters}
          />
          <FilterButton
            type="task"
            icon={CheckSquare}
            label="Tasks"
            filters={filters}
            setFilters={setFilters}
          />
          <FilterButton
            type="reminder"
            icon={Bell}
            label="Reminders"
            filters={filters}
            setFilters={setFilters}
          />
        </div>
      </div>

      {/* Sort Options */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-900 dark:text-white">Sort by</h3>
        <div className="flex gap-1.5">
          <SortButton
            sortType="count"
            label="Count"
            filters={filters}
            setFilters={setFilters}
          />
          <SortButton
            sortType="name"
            label="Name"
            filters={filters}
            setFilters={setFilters}
          />
        </div>
      </div>
    </div>
  );
}

interface FilterButtonProps {
  type: ItemType;
  icon: LucideIcon;
  label: string;
  filters: FiltersPanelProps['filters'];
  setFilters: FiltersPanelProps['setFilters'];
}

function FilterButton({ type, icon: Icon, label, filters, setFilters }: FilterButtonProps) {
  return (
    <button
      onClick={() => {
        setFilters(prev => {
          const newTypes = prev.types.includes(type)
            ? prev.types.filter(t => t !== type)
            : [...prev.types, type];
          return { ...prev, types: newTypes };
        });
      }}
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
        filters.types.includes(type)
          ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
          : 'bg-white/60 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

interface SortButtonProps {
  sortType: 'count' | 'name';
  label: string;
  filters: FiltersPanelProps['filters'];
  setFilters: FiltersPanelProps['setFilters'];
}

function SortButton({ sortType, label, filters, setFilters }: SortButtonProps) {
  return (
    <button
      onClick={() => setFilters(prev => ({
        ...prev,
        sortBy: sortType,
        sortOrder: prev.sortBy === sortType && prev.sortOrder === 'desc' ? 'asc' : 'desc'
      }))}
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
        filters.sortBy === sortType
          ? 'bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-200 border border-primary-200 dark:border-primary-800'
          : 'bg-white/60 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
    >
      {label} {filters.sortBy === sortType && (filters.sortOrder === 'desc' ? '↓' : '↑')}
    </button>
  );
} 