import React from 'react';
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
            onClick={() => onFilterChange('sortBy', 'archivedAt')}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
              ${filters.sortBy === 'archivedAt'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
              }
            `}
          >
            <Calendar className="w-4 h-4" />
            Archive Date
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
            <Calendar className="w-4 h-4" />
            Last Modified
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
            onClick={() => onFilterChange('hasLinks', !filters.hasLinks)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
              ${filters.hasLinks
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by tags
        </label>
        <div className="flex flex-wrap gap-2">
          {/* Add tag filtering UI here */}
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover"
          >
            <Tag className="w-4 h-4" />
            Add Tag Filter
          </button>
        </div>
      </div>
    </div>
  );
}