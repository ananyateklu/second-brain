/**
 * Directory Page Header Controls
 * Renders directory controls (search, filters, view toggle, bulk mode) in the main header
 */

import { memo, useRef, useEffect, useState } from 'react';
import { ViewModeToggle } from '../../ui/ViewModeToggle';
import { useDirectoryHeaderState } from '../../../features/notes/context/DirectoryPageContext';
import { useBoundStore } from '../../../store/bound-store';
import { useNotesFolderStats } from '../../../features/notes/hooks/use-notes-query';
import type { NotesViewMode } from '../../../store/types';

type DateFilter = 'all' | 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'custom';
type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc';

/**
 * Directory page controls for the main header
 * Reads state from DirectoryPageContext (populated by NotesDirectoryPage)
 */
export const DirectoryPageControls = memo(function DirectoryPageControls() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const headerState = useDirectoryHeaderState();
  const directorySidebarVisible = useBoundStore((state) => state.directorySidebarVisible);
  const toggleDirectorySidebar = useBoundStore((state) => state.toggleDirectorySidebar);
  const directoryViewMode = useBoundStore((state) => state.directoryViewMode);
  const setDirectoryViewMode = useBoundStore((state) => state.setDirectoryViewMode);
  const searchQuery = useBoundStore((state) => state.searchQuery);
  const searchMode = useBoundStore((state) => state.searchMode);
  const setSearchQuery = useBoundStore((state) => state.setSearchQuery);
  const toggleSearchMode = useBoundStore((state) => state.toggleSearchMode);
  const filterState = useBoundStore((state) => state.filterState);
  const setFilterState = useBoundStore((state) => state.setFilterState);
  const isBulkMode = useBoundStore((state) => state.isBulkMode);
  const setBulkMode = useBoundStore((state) => state.setBulkMode);
  // Get folder stats (includes all tags) - more efficient than fetching all notes
  const { data: folderStats } = useNotesFolderStats();

  // Dropdown states
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Get all unique tags from stats endpoint (already sorted)
  const allTags = folderStats?.allTags ?? [];

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setIsDateDropdownOpen(false);
      }
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  const handleViewModeChange = (mode: NotesViewMode) => {
    setDirectoryViewMode(mode);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const getSearchModeIcon = () => {
    if (searchMode === 'both') {
      return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />;
    }
    if (searchMode === 'title') {
      return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />;
    }
    return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />;
  };

  const getSearchModeLabel = () => {
    if (searchMode === 'both') return 'Both';
    if (searchMode === 'title') return 'Title';
    return 'Content';
  };

  const getSearchModeTitle = () => {
    if (searchMode === 'both') return 'Title & Content';
    if (searchMode === 'title') return 'Title only';
    return 'Content only';
  };

  const getDateFilterLabel = () => {
    switch (filterState.dateFilter) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'last7days': return '7 days';
      case 'last30days': return '30 days';
      case 'last90days': return '90 days';
      case 'custom': return 'Custom';
      default: return 'All time';
    }
  };

  const getSortLabel = () => {
    switch (filterState.sortBy) {
      case 'newest': return 'Newest';
      case 'oldest': return 'Oldest';
      case 'title-asc': return 'A-Z';
      case 'title-desc': return 'Z-A';
      default: return 'Newest';
    }
  };

  const handleDateFilterChange = (filter: DateFilter) => {
    setFilterState({
      ...filterState,
      dateFilter: filter,
      customDateStart: filter !== 'custom' ? undefined : filterState.customDateStart,
      customDateEnd: filter !== 'custom' ? undefined : filterState.customDateEnd,
    });
    setIsDateDropdownOpen(false);
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filterState.selectedTags.includes(tag)
      ? filterState.selectedTags.filter(t => t !== tag)
      : [...filterState.selectedTags, tag];

    setFilterState({
      ...filterState,
      selectedTags: newTags,
    });
  };

  const handleSortChange = (sort: SortOption) => {
    setFilterState({
      ...filterState,
      sortBy: sort,
    });
    setIsSortDropdownOpen(false);
  };

  const handleBulkModeToggle = () => {
    setBulkMode(!isBulkMode);
  };

  // Default note count to 0 if context not available
  const noteCount = headerState?.noteCount ?? 0;

  // Fixed width left section to align with sidebar border position
  const leftSectionWidth = 'w-[18rem] md:w-[17.5rem] justify-end';

  const renderDropdownMenu = (isOpen: boolean, children: React.ReactNode) => {
    if (!isOpen) return null;

    return (
      <div
        className="absolute top-full left-0 mt-2 min-w-[160px] rounded-xl border shadow-xl z-50"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--background) 22%, transparent)',
          borderColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          animation: 'dropdownFadeIn 0.15s ease-out',
          boxShadow: '0 10px 40px -10px var(--glass-overlay-light), 0 4px 12px -4px var(--glass-overlay-light)',
        }}
      >
        {children}
      </div>
    );
  };

  const filterButtonStyle = (isActive: boolean) => ({
    backgroundColor: isActive ? 'var(--btn-primary-bg)' : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
    color: isActive ? 'var(--btn-primary-text)' : 'var(--text-primary)',
    border: `1px solid ${isActive ? 'var(--btn-primary-border)' : 'color-mix(in srgb, var(--text-primary) 6%, transparent)'}`,
  });

  return (
    <div className="flex items-center gap-2 flex-1">
      {/* Left side controls - fixed width to align with sidebar border position */}
      <div className={`flex items-center gap-2 flex-shrink-0 ${leftSectionWidth}`}>
        {/* Sidebar Toggle */}
        <button
          onClick={toggleDirectorySidebar}
          className="p-2.5 my-1 rounded-xl backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
          style={{
            backgroundColor: directorySidebarVisible ? 'var(--btn-primary-bg)' : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
            color: directorySidebarVisible ? 'var(--btn-primary-text)' : 'var(--text-primary)',
            border: `1px solid ${directorySidebarVisible ? 'var(--btn-primary-border)' : 'color-mix(in srgb, var(--text-primary) 6%, transparent)'}`,
          }}
          title={directorySidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {directorySidebarVisible ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            )}
          </svg>
        </button>
      </div>

      {/* Separator */}
      <div className="h-6 w-px flex-shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }} />

      {/* Search Input */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search notes..."
          data-testid="notes-search"
          className="px-4 py-2 my-1 rounded-xl border text-sm backdrop-blur-md transition-all focus:outline-none"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
            borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
            color: 'var(--text-primary)',
            width: '280px',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--input-focus-border)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        />
        <button
          onClick={toggleSearchMode}
          onMouseDown={(e) => e.preventDefault()}
          className="flex items-center justify-center gap-1 px-3 py-2.5 my-1 rounded-xl border text-xs font-medium backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          style={filterButtonStyle(true)}
          title={`Search mode: ${getSearchModeTitle()}`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {getSearchModeIcon()}
          </svg>
          <span className="hidden lg:inline">{getSearchModeLabel()}</span>
        </button>
      </div>

      {/* View Mode Toggle */}
      <ViewModeToggle
        viewMode={directoryViewMode}
        onViewModeChange={handleViewModeChange}
        size="sm"
      />

      {/* Separator */}
      <div className="h-6 w-px flex-shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }} />

      {/* Date Filter */}
      <div ref={dateDropdownRef} className="relative flex-shrink-0">
        <button
          onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
          className="flex items-center gap-1 px-3 py-2.5 my-1 rounded-xl text-xs font-medium backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          style={filterButtonStyle(isDateDropdownOpen || filterState.dateFilter !== 'all')}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="hidden lg:inline">{getDateFilterLabel()}</span>
          <svg className={`w-3 h-3 transition-transform ${isDateDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {renderDropdownMenu(isDateDropdownOpen, (
          <div className="p-1.5">
            {(['all', 'today', 'yesterday', 'last7days', 'last30days', 'last90days'] as DateFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => handleDateFilterChange(filter)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 hover:translate-x-0.5"
                style={{
                  backgroundColor: filterState.dateFilter === filter
                    ? 'var(--btn-primary-bg)'
                    : 'transparent',
                  color: filterState.dateFilter === filter ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  if (filterState.dateFilter !== filter) {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (filterState.dateFilter !== filter) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {filter === 'all' ? 'All time' :
                  filter === 'today' ? 'Today' :
                    filter === 'yesterday' ? 'Yesterday' :
                      filter === 'last7days' ? 'Last 7 days' :
                        filter === 'last30days' ? 'Last 30 days' : 'Last 90 days'}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Tags Filter */}
      {allTags.length > 0 && (
        <div ref={tagDropdownRef} className="relative flex-shrink-0">
          <button
            onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
            className="flex items-center gap-1 px-3 py-2.5 my-1 rounded-xl text-xs font-medium backdrop-blur-md transition-all hover:scale-105 active:scale-95"
            style={filterButtonStyle(isTagDropdownOpen || filterState.selectedTags.length > 0)}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="hidden lg:inline">Tags</span>
            {filterState.selectedTags.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{
                backgroundColor: isTagDropdownOpen || filterState.selectedTags.length > 0 ? 'var(--btn-primary-text)' : 'var(--btn-primary-bg)',
                color: isTagDropdownOpen || filterState.selectedTags.length > 0 ? 'var(--btn-primary-bg)' : 'var(--btn-primary-text)',
              }}>
                {filterState.selectedTags.length}
              </span>
            )}
            <svg className={`w-3 h-3 transition-transform ${isTagDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {renderDropdownMenu(isTagDropdownOpen, (
            <div className="p-1.5 max-h-64 overflow-y-auto thin-scrollbar">
              {allTags.map((tag) => {
                const isSelected = filterState.selectedTags.includes(tag);
                return (
                  <label
                    key={tag}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all duration-150 hover:translate-x-0.5"
                    style={{
                      backgroundColor: isSelected ? 'var(--btn-primary-bg)' : 'transparent',
                      color: isSelected ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-150"
                      style={{
                        backgroundColor: isSelected ? 'var(--btn-primary-text)' : 'transparent',
                        borderColor: isSelected ? 'var(--btn-primary-text)' : 'color-mix(in srgb, var(--text-primary) 20%, transparent)',
                      }}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="var(--btn-primary-bg)" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTagToggle(tag)}
                      className="sr-only"
                    />
                    <span className="truncate">#{tag}</span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Sort Filter */}
      <div ref={sortDropdownRef} className="relative flex-shrink-0">
        <button
          onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
          className="flex items-center gap-1 px-3 py-2.5 my-1 rounded-xl text-xs font-medium backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          style={filterButtonStyle(isSortDropdownOpen || filterState.sortBy !== 'newest')}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          <span className="hidden lg:inline">{getSortLabel()}</span>
          <svg className={`w-3 h-3 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {renderDropdownMenu(isSortDropdownOpen, (
          <div className="p-1.5">
            {(['newest', 'oldest', 'title-asc', 'title-desc'] as SortOption[]).map((sort) => (
              <button
                key={sort}
                onClick={() => handleSortChange(sort)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 hover:translate-x-0.5"
                style={{
                  backgroundColor: filterState.sortBy === sort ? 'var(--btn-primary-bg)' : 'transparent',
                  color: filterState.sortBy === sort ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  if (filterState.sortBy !== sort) {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (filterState.sortBy !== sort) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {sort === 'newest' ? 'Newest first' :
                  sort === 'oldest' ? 'Oldest first' :
                    sort === 'title-asc' ? 'Title A-Z' : 'Title Z-A'}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Right side: Select button, Note count */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Select/Bulk Mode Button */}
        <button
          onClick={handleBulkModeToggle}
          className="flex items-center gap-1 px-3 py-2.5 my-1 rounded-xl text-xs font-medium backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          style={filterButtonStyle(isBulkMode)}
        >
          {isBulkMode ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Cancel</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Select</span>
            </>
          )}
        </button>

        {/* Note count */}
        <span className="text-xs px-3 py-2.5 my-1 rounded-xl backdrop-blur-md" style={{
          color: 'var(--text-secondary)',
          backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
          border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
        }}>
          {noteCount} {noteCount === 1 ? 'note' : 'notes'}
        </span>
      </div>
    </div>
  );
});
