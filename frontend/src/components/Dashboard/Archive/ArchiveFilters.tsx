import { ArrowDownAZ, ArrowUpAZ, Calendar, Tag, Link2 } from 'lucide-react';

interface ArchiveFiltersProps {
  filters: {
    sortBy: 'archivedAt' | 'updatedAt' | 'title';
    sortOrder: 'asc' | 'desc';
    tags: string[];
    hasLinks: boolean;
  };
  onFilterChange: (key: string, value: any) => void;
}

export function ArchiveFilters({ filters, onFilterChange }: ArchiveFiltersProps) {
  return (
    <div className="space-y-6">
      {/* Sort Options */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Sort by
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange('sortBy', 'title')}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all
              ${filters.sortBy === 'title'
                ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
              }
            `}
          >
            {filters.sortBy === 'title' && filters.sortOrder === 'asc' ? (
              <ArrowUpAZ className="w-4 h-4" />
            ) : (
              <ArrowDownAZ className="w-4 h-4" />
            )}
            Title
          </button>

          <button
            onClick={() => onFilterChange('sortBy', 'archivedAt')}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all
              ${filters.sortBy === 'archivedAt'
                ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
              }
            `}
          >
            <Calendar className="w-4 h-4" />
            Archive Date
          </button>

          <button
            onClick={() => onFilterChange('sortBy', 'updatedAt')}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all
              ${filters.sortBy === 'updatedAt'
                ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
              }
            `}
          >
            <Calendar className="w-4 h-4" />
            Last Modified
          </button>
        </div>

        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onFilterChange('sortOrder', 'asc')}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all
              ${filters.sortOrder === 'asc'
                ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
              }
            `}
          >
            <ArrowUpAZ className="w-4 h-4" />
            Ascending
          </button>

          <button
            onClick={() => onFilterChange('sortOrder', 'desc')}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all
              ${filters.sortOrder === 'desc'
                ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
              }
            `}
          >
            <ArrowDownAZ className="w-4 h-4" />
            Descending
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Show only
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange('hasLinks', !filters.hasLinks)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all
              ${filters.hasLinks
                ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
              }
            `}
          >
            <Link2 className="w-4 h-4" />
            With Links
          </button>
        </div>
      </div>

      {/* Tags Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Filter by tags
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