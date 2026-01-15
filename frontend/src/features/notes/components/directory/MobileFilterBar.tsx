/**
 * Mobile Filter Bar Component
 * Search input and filter dropdowns for mobile view
 */

import { memo } from 'react';
import type { NotesFilterState, NotesViewMode, SearchMode } from '../../../../store/types';

export type MobileFilterDropdown = 'date' | 'tags' | 'sort' | null;

export interface MobileFilterBarProps {
  /** Current search query */
  searchQuery: string;
  /** Callback when search query changes */
  onSearchQueryChange: (query: string) => void;
  /** Current search mode */
  searchMode: SearchMode;
  /** Toggle search mode callback */
  onToggleSearchMode: () => void;
  /** Current filter state */
  filterState: NotesFilterState;
  /** Callback when filter state changes */
  onFilterStateChange: (filterState: NotesFilterState) => void;
  /** Current view mode */
  viewMode: NotesViewMode;
  /** Callback when view mode changes */
  onViewModeChange: (mode: NotesViewMode) => void;
  /** Available tags from notes */
  availableTags: string[];
  /** Currently open dropdown */
  openDropdown: MobileFilterDropdown;
  /** Callback when dropdown open state changes */
  onDropdownChange: (dropdown: MobileFilterDropdown) => void;
  /** Whether there are any notes (to show/hide tags filter) */
  hasNotes: boolean;
}

const DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 days' },
  { value: 'last30days', label: 'Last 30 days' },
  { value: 'last90days', label: 'Last 90 days' },
] as const;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
] as const;

const getDateFilterLabel = (filter: string): string => {
  switch (filter) {
    case 'all': return 'All time';
    case 'today': return 'Today';
    case 'yesterday': return 'Yesterday';
    case 'last7days': return '7 days';
    case 'last30days': return '30 days';
    case 'last90days': return '90 days';
    default: return 'All time';
  }
};

const getSortLabel = (sortBy: string): string => {
  switch (sortBy) {
    case 'newest': return 'Newest';
    case 'oldest': return 'Oldest';
    case 'title-asc': return 'A-Z';
    case 'title-desc': return 'Z-A';
    default: return 'Newest';
  }
};

export const MobileFilterBar = memo(({
  searchQuery,
  onSearchQueryChange,
  searchMode,
  onToggleSearchMode,
  filterState,
  onFilterStateChange,
  viewMode,
  onViewModeChange,
  availableTags,
  openDropdown,
  onDropdownChange,
  hasNotes,
}: MobileFilterBarProps) => {
  const handleDateFilterChange = (filter: typeof DATE_FILTER_OPTIONS[number]['value']) => {
    onFilterStateChange({ ...filterState, dateFilter: filter });
    onDropdownChange(null);
  };

  const handleSortChange = (sortBy: typeof SORT_OPTIONS[number]['value']) => {
    onFilterStateChange({ ...filterState, sortBy });
    onDropdownChange(null);
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filterState.selectedTags.includes(tag)
      ? filterState.selectedTags.filter(t => t !== tag)
      : [...filterState.selectedTags, tag];
    onFilterStateChange({ ...filterState, selectedTags: newTags });
  };

  const handleClearTags = () => {
    onFilterStateChange({ ...filterState, selectedTags: [] });
    onDropdownChange(null);
  };

  return (
    <div className="md:hidden shrink-0">
      {/* Search Row */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}
      >
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search notes..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border text-sm transition-all focus:outline-none"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
              borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
              color: 'var(--text-primary)',
            }}
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--text-tertiary)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <button
          onClick={onToggleSearchMode}
          className="shrink-0 h-9 px-3 rounded-xl text-xs font-medium"
          style={{
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
          }}
        >
          {searchMode === 'both' ? 'All' : searchMode === 'title' ? 'Title' : 'Content'}
        </button>
      </div>

      {/* Filter Pills Row */}
      <div
        className="flex items-center gap-2 px-4 py-2 overflow-x-auto thin-scrollbar border-b"
        style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}
      >
        {/* Date Filter */}
        <div className="relative shrink-0">
          <button
            onClick={() => onDropdownChange(openDropdown === 'date' ? null : 'date')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: filterState.dateFilter !== 'all'
                ? 'var(--btn-primary-bg)'
                : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
              color: filterState.dateFilter !== 'all'
                ? 'var(--btn-primary-text)'
                : 'var(--text-primary)',
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {getDateFilterLabel(filterState.dateFilter)}
          </button>
          {openDropdown === 'date' && (
            <div
              className="absolute top-full left-0 mt-1 min-w-[140px] rounded-xl border shadow-xl z-50 p-1 backdrop-blur-xl"
              style={{
                backgroundColor: 'var(--glass-popup)',
                borderColor: 'var(--border)',
              }}
            >
              {DATE_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleDateFilterChange(option.value)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: filterState.dateFilter === option.value
                      ? 'var(--btn-primary-bg)'
                      : 'transparent',
                    color: filterState.dateFilter === option.value
                      ? 'var(--btn-primary-text)'
                      : 'var(--text-primary)',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tags Filter */}
        {hasNotes && (
          <div className="relative shrink-0">
            <button
              onClick={() => onDropdownChange(openDropdown === 'tags' ? null : 'tags')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: filterState.selectedTags.length > 0
                  ? 'var(--btn-primary-bg)'
                  : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
                color: filterState.selectedTags.length > 0
                  ? 'var(--btn-primary-text)'
                  : 'var(--text-primary)',
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Tags{filterState.selectedTags.length > 0 && ` (${filterState.selectedTags.length})`}
            </button>
            {openDropdown === 'tags' && (
              <div
                className="absolute top-full left-0 mt-1 min-w-[160px] max-h-48 overflow-y-auto rounded-xl border shadow-xl z-50 p-1 backdrop-blur-xl"
                style={{
                  backgroundColor: 'var(--glass-popup)',
                  borderColor: 'var(--border)',
                }}
              >
                {filterState.selectedTags.length > 0 && (
                  <button
                    onClick={handleClearTags}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm mb-1"
                    style={{ color: 'var(--color-error)' }}
                  >
                    Clear all
                  </button>
                )}
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                    style={{
                      backgroundColor: filterState.selectedTags.includes(tag)
                        ? 'var(--btn-primary-bg)'
                        : 'transparent',
                      color: filterState.selectedTags.includes(tag)
                        ? 'var(--btn-primary-text)'
                        : 'var(--text-primary)',
                    }}
                  >
                    <span className="truncate">#{tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sort Filter */}
        <div className="relative shrink-0">
          <button
            onClick={() => onDropdownChange(openDropdown === 'sort' ? null : 'sort')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: filterState.sortBy !== 'newest'
                ? 'var(--btn-primary-bg)'
                : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
              color: filterState.sortBy !== 'newest'
                ? 'var(--btn-primary-text)'
                : 'var(--text-primary)',
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
              />
            </svg>
            {getSortLabel(filterState.sortBy)}
          </button>
          {openDropdown === 'sort' && (
            <div
              className="absolute top-full left-0 mt-1 min-w-[130px] rounded-xl border shadow-xl z-50 p-1 backdrop-blur-xl"
              style={{
                backgroundColor: 'var(--glass-popup)',
                borderColor: 'var(--border)',
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: filterState.sortBy === option.value
                      ? 'var(--btn-primary-bg)'
                      : 'transparent',
                    color: filterState.sortBy === option.value
                      ? 'var(--btn-primary-text)'
                      : 'var(--text-primary)',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="shrink-0 flex items-center gap-1 ml-auto">
          <button
            onClick={() => onViewModeChange('card')}
            className="p-1.5 rounded-lg transition-all"
            style={{
              backgroundColor: viewMode === 'card' ? 'var(--btn-primary-bg)' : 'transparent',
              color: viewMode === 'card' ? 'var(--btn-primary-text)' : 'var(--text-tertiary)',
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className="p-1.5 rounded-lg transition-all"
            style={{
              backgroundColor: viewMode === 'list' ? 'var(--btn-primary-bg)' : 'transparent',
              color: viewMode === 'list' ? 'var(--btn-primary-text)' : 'var(--text-tertiary)',
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Click outside to close mobile filter dropdowns */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => onDropdownChange(null)}
        />
      )}
    </div>
  );
});

MobileFilterBar.displayName = 'MobileFilterBar';
