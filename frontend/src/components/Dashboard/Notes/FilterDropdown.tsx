import { ArrowDownAZ, ArrowUpAZ, Clock, Star, Pin } from 'lucide-react';

interface FilterDropdownProps {
  filters: {
    sortBy: 'createdAt' | 'updatedAt' | 'title';
    sortOrder: 'asc' | 'desc';
    showPinned: boolean;
    showFavorites: boolean;
    tags: string[];
  };
  allTags: string[];
  onFilterChange: (key: string, value: any) => void;
}

export function FilterDropdown({ filters, allTags, onFilterChange }: FilterDropdownProps) {
  return (
    <div className="space-y-4">
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
            onClick={() => onFilterChange('sortBy', 'updatedAt')}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all
              ${filters.sortBy === 'updatedAt'
                ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
              }
            `}
          >
            <Clock className="w-4 h-4" />
            Last Updated
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
            onClick={() => onFilterChange('showPinned', !filters.showPinned)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all
              ${filters.showPinned
                ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
              }
            `}
          >
            <Pin className="w-4 h-4" />
            Pinned
          </button>

          <button
            onClick={() => onFilterChange('showFavorites', !filters.showFavorites)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all
              ${filters.showFavorites
                ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
              }
            `}
          >
            <Star className="w-4 h-4" />
            Favorites
          </button>
        </div>
      </div>

      {/* Tags Filter */}
      {allTags.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            Filter by tags
          </label>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  const newTags = filters.tags.includes(tag)
                    ? filters.tags.filter(t => t !== tag)
                    : [...filters.tags, tag];
                  onFilterChange('tags', newTags);
                }}
                className={`
                  px-3 py-1.5 rounded-lg text-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all
                  ${filters.tags.includes(tag)
                    ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                    : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
                  }
                `}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}