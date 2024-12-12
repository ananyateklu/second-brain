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
        <div className="w-[320px] border-r border-[0.5px] border-white/10 flex flex-col bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))] dark:bg-gray-900/30 midnight:bg-[#1e293b]/30 rounded-l-2xl backdrop-blur-xl ring-1 ring-white/5">
            {/* Search and filters */}
            <div className="flex-none sticky top-0 z-10 bg-[color-mix(in_srgb,var(--color-background)_90%,var(--color-surface))] dark:bg-gray-900/40 midnight:bg-[#1e293b]/40 p-4 border-b border-[0.5px] border-white/10 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-textSecondary)]" />
                        <input
                            type="text"
                            placeholder="Search tags..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white/5 dark:bg-gray-900/20 midnight:bg-[#0f172a]/20 border-[0.5px] border-white/10 rounded-lg text-sm text-[var(--color-text)] placeholder-[var(--color-textSecondary)] ring-1 ring-white/5 focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200"
                        />
                    </div>
                    <button
                        onClick={onToggleFilters}
                        className={`p-2 rounded-lg transition-all duration-200 ${showFilters
                                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 midnight:text-indigo-300 ring-1 ring-indigo-500/30'
                                : 'bg-white/5 dark:bg-gray-900/20 midnight:bg-[#0f172a]/20 text-[var(--color-textSecondary)] hover:bg-white/10 dark:hover:bg-gray-900/30 midnight:hover:bg-[#0f172a]/30 ring-1 ring-white/5'
                            }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                    </button>
                </div>

                {/* Filters Panel */}
                {showFilters && <div className="mt-4"><FiltersPanel filters={filters} setFilters={setFilters} /></div>}
            </div>

            {/* Tags list */}
            <div className="flex-1 overflow-y-auto">
                <div className="space-y-2 py-4 px-2.5">
                    {tagStats.map(({ tag, byType }) => (
                        <div
                            key={tag}
                            onClick={() => onTagSelect(tag)}
                            className={`group flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${selectedTag === tag
                                    ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 midnight:text-indigo-300 ring-1 ring-indigo-500/30'
                                    : 'text-[var(--color-text)] hover:bg-white/5 dark:hover:bg-gray-900/20 midnight:hover:bg-[#0f172a]/20 ring-1 ring-white/5'
                                }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <Hash
                                    className={`w-3.5 h-3.5 ${selectedTag === tag
                                            ? 'text-indigo-600 dark:text-indigo-400 midnight:text-indigo-300'
                                            : 'text-[var(--color-textSecondary)]'
                                        }`}
                                />
                                <span className="text-sm font-medium">{tag}</span>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Type indicators */}
                                <div className="flex items-center gap-3">
                                    {byType.note > 0 && (
                                        <span className="flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 midnight:text-cyan-300">
                                            <FileText className="w-3 h-3" />
                                            {byType.note}
                                        </span>
                                    )}
                                    {byType.idea > 0 && (
                                        <span className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400 midnight:text-yellow-300">
                                            <Lightbulb className="w-3 h-3" />
                                            {byType.idea}
                                        </span>
                                    )}
                                    {byType.task > 0 && (
                                        <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 midnight:text-green-300">
                                            <CheckSquare className="w-3 h-3" />
                                            {byType.task}
                                        </span>
                                    )}
                                    {byType.reminder > 0 && (
                                        <span className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 midnight:text-purple-300">
                                            <Bell className="w-3 h-3" />
                                            {byType.reminder}
                                        </span>
                                    )}
                                </div>

                                <ChevronRight
                                    className={`w-3.5 h-3.5 transition-colors ${selectedTag === tag
                                            ? 'text-indigo-600 dark:text-indigo-400 midnight:text-indigo-300'
                                            : 'text-[var(--color-textSecondary)] group-hover:text-[var(--color-text)]'
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