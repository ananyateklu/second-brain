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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Sort by
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange('sortBy', 'title')}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
              ${filters.sortBy === 'title'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
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
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
              ${filters.sortBy === 'updatedAt'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
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
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
              ${filters.sortOrder === 'asc'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
              }
            `}
          >
            <ArrowUpAZ className="w-4 h-4" />
            Ascending
          </button>

          <button
            onClick={() => onFilterChange('sortOrder', 'desc')}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
              ${filters.sortOrder === 'desc'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Show only
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange('showPinned', !filters.showPinned)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
              ${filters.showPinned
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
              }
            `}
          >
            <Pin className="w-4 h-4" />
            Pinned
          </button>

          <button
            onClick={() => onFilterChange('showFavorites', !filters.showFavorites)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
              ${filters.showFavorites
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  px-3 py-1.5 rounded-lg text-sm
                  ${filters.tags.includes(tag)
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
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