import { Hash, ChevronRight, FileText, Lightbulb, CheckSquare, Bell, Search, SlidersHorizontal } from 'lucide-react';
import { TagStats, TagFilters } from './TagsTypes';
import { FiltersPanel } from './FiltersPanel';

interface TagsListProps {
  tagStats: TagStats[];
  selectedTag: string | null;
  searchQuery: string;
  showFilters: boolean;
  filters: TagFilters;
  onTagSelect: (tag: string) => void;
  onSearchChange: (query: string) => void;
  onToggleFilters: () => void;
  setFilters: (filters: TagFilters) => void;
}

export function TagsList({
  tagStats,
  selectedTag,
  searchQuery,
  showFilters,
  filters,
  onTagSelect,
  onSearchChange,
  onToggleFilters,
  setFilters,
}: TagsListProps) {
  return (
    <div className="w-[320px] border-r border-white/40 dark:border-white/30 flex flex-col bg-white/10 dark:bg-gray-800/10 rounded-l-xl">
      {/* Search and filters */}
      <div className="flex-none sticky top-0 z-10 bg-white/20 dark:bg-gray-800/20 p-2 border-b border-white/40 dark:border-white/30">
        <div className="flex items-center gap-0.5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={onToggleFilters}
            className={`p-2 rounded-lg transition-colors ${
              showFilters
                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && <FiltersPanel filters={filters} setFilters={setFilters} />}
      </div>

      {/* Tags list */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1 p-2">
          {tagStats.map(({ tag, byType }) => (
            <div
              key={tag}
              onClick={() => onTagSelect(tag)}
              className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                selectedTag === tag
                  ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-900 dark:text-white hover:bg-white/20 dark:hover:bg-gray-800/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <Hash
                  className={`w-4 h-4 ${
                    selectedTag === tag
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
                <span className="text-sm font-medium">{tag}</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Type indicators */}
                <div className="flex items-center gap-2">
                  {byType.note > 0 && (
                    <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                      <FileText className="w-3.5 h-3.5" />
                      {byType.note}
                    </span>
                  )}
                  {byType.idea > 0 && (
                    <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                      <Lightbulb className="w-3.5 h-3.5" />
                      {byType.idea}
                    </span>
                  )}
                  {byType.task > 0 && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckSquare className="w-3.5 h-3.5" />
                      {byType.task}
                    </span>
                  )}
                  {byType.reminder > 0 && (
                    <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                      <Bell className="w-3.5 h-3.5" />
                      {byType.reminder}
                    </span>
                  )}
                </div>

                <ChevronRight
                  className={`w-4 h-4 transition-colors ${
                    selectedTag === tag
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 