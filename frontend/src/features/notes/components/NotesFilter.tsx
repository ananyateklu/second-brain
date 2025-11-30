import { useState, useRef, useEffect, useMemo } from 'react';
import { Note } from '../types/note';
import { useThemeStore } from '../../../store/theme-store';

export type DateFilter = 'all' | 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'custom';
export type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc';
export type ArchiveFilter = 'all' | 'archived' | 'not-archived';

export interface NotesFilterState {
  dateFilter: DateFilter;
  customDateStart?: string;
  customDateEnd?: string;
  selectedTags: string[];
  sortBy: SortOption;
  archiveFilter: ArchiveFilter;
}

interface NotesFilterProps {
  notes: Note[];
  filterState: NotesFilterState;
  onFilterChange: (filters: NotesFilterState) => void;
  isBulkMode?: boolean;
  onBulkModeToggle?: () => void;
}

export function NotesFilter({ notes, filterState, onFilterChange, isBulkMode = false, onBulkModeToggle }: NotesFilterProps) {
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isArchiveDropdownOpen, setIsArchiveDropdownOpen] = useState(false);
  const [topPosition, setTopPosition] = useState('80px'); // Default for mobile
  const filterRef = useRef<HTMLDivElement>(null);
  const { theme } = useThemeStore();
  const isBlueTheme = theme === 'blue';
  
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const archiveDropdownRef = useRef<HTMLDivElement>(null);

  // Handle responsive positioning
  useEffect(() => {
    const updatePosition = () => {
      if (window.innerWidth >= 768) {
        // Desktop: below header (h-12 + padding = ~72px)
        setTopPosition('72px');
        if (filterRef.current) {
          filterRef.current.style.marginLeft = '-1.5rem';
          filterRef.current.style.marginRight = '-1.5rem';
          filterRef.current.style.paddingLeft = '1.5rem';
          filterRef.current.style.paddingRight = '1.5rem';
        }
      } else {
        // Mobile: below header (h-20 = 80px on sm+)
        setTopPosition('80px');
        if (filterRef.current) {
          filterRef.current.style.marginLeft = '-1rem';
          filterRef.current.style.marginRight = '-1rem';
          filterRef.current.style.paddingLeft = '1rem';
          filterRef.current.style.paddingRight = '1rem';
        }
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);

  // Memoize expensive tag calculation - only recalculate when notes array changes
  const allTags = useMemo(() => 
    Array.from(new Set(notes.flatMap(note => note.tags || []))).sort(),
    [notes]
  );

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
      if (archiveDropdownRef.current && !archiveDropdownRef.current.contains(event.target as Node)) {
        setIsArchiveDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDateFilterLabel = () => {
    switch (filterState.dateFilter) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'last7days': return 'Last 7 days';
      case 'last30days': return 'Last 30 days';
      case 'last90days': return 'Last 90 days';
      case 'custom': return 'Custom range';
      default: return 'All time';
    }
  };

  const getSortLabel = () => {
    switch (filterState.sortBy) {
      case 'newest': return 'Newest first';
      case 'oldest': return 'Oldest first';
      case 'title-asc': return 'Title A-Z';
      case 'title-desc': return 'Title Z-A';
      default: return 'Newest first';
    }
  };

  const getArchiveLabel = () => {
    switch (filterState.archiveFilter) {
      case 'archived': return 'Archived';
      case 'not-archived': return 'Not archived';
      default: return 'All notes';
    }
  };

  const handleDateFilterChange = (filter: DateFilter) => {
    onFilterChange({
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
    
    onFilterChange({
      ...filterState,
      selectedTags: newTags,
    });
  };

  const handleSortChange = (sort: SortOption) => {
    onFilterChange({
      ...filterState,
      sortBy: sort,
    });
    setIsSortDropdownOpen(false);
  };

  const handleArchiveFilterChange = (filter: ArchiveFilter) => {
    onFilterChange({
      ...filterState,
      archiveFilter: filter,
    });
    setIsArchiveDropdownOpen(false);
  };

  const clearFilters = () => {
    onFilterChange({
      dateFilter: 'all',
      selectedTags: [],
      sortBy: 'newest',
      archiveFilter: 'all',
    });
  };

  const hasActiveFilters = 
    filterState.dateFilter !== 'all' ||
    filterState.selectedTags.length > 0 ||
    filterState.sortBy !== 'newest' ||
    filterState.archiveFilter !== 'all';

  const DropdownButton = ({ 
    label, 
    isOpen, 
    onClick, 
    count 
  }: { 
    label: string; 
    isOpen: boolean; 
    onClick: () => void;
    count?: number;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
      style={{
        backgroundColor: isOpen ? 'var(--color-brand-600)' : 'var(--surface-elevated)',
        color: isOpen ? '#ffffff' : 'var(--text-primary)',
        border: `1px solid ${isOpen ? 'var(--color-brand-600)' : 'var(--border)'}`,
        boxShadow: isOpen ? 'var(--shadow-lg), 0 0 20px -10px var(--color-primary-alpha)' : 'var(--shadow-md)',
      }}
    >
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: isOpen ? '#ffffff' : 'var(--color-brand-600)',
            color: isOpen ? 'var(--color-brand-600)' : '#ffffff',
          }}
        >
          {count}
        </span>
      )}
      <svg
        className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  const renderDropdownMenu = (isOpen: boolean, children: React.ReactNode) => {
    if (!isOpen) return null;
    
    return (
      <div
        className="absolute top-full left-0 mt-2 min-w-[200px] max-w-[calc(100vw-3rem)] rounded-2xl border shadow-2xl z-50"
        style={{
          backgroundColor: isBlueTheme 
            ? 'rgba(10, 22, 40, 0.98)' // Darker blue for blue theme - less transparent
            : 'var(--surface-card-solid)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-xl), 0 0 60px -20px var(--color-primary-alpha)',
          animation: 'scaleIn 0.2s ease-out',
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        }}
      >
        {children}
      </div>
    );
  };

  return (
    <div 
      ref={filterRef}
      className="flex flex-wrap items-center gap-3 px-4 md:px-6 py-4 sticky"
      style={{
        top: topPosition,
        backgroundColor: 'transparent',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        marginTop: '-1rem', // Offset main padding
        marginLeft: '-1rem', // Offset main padding (px-4 = 1rem)
        marginRight: '-1rem', // Offset main padding
        paddingLeft: '1rem', // Restore padding
        paddingRight: '1rem', // Restore padding
        zIndex: 40, // Below header (z-50) but above content
      }}
    >
      {/* Date Filter */}
      <div ref={dateDropdownRef} className="relative" style={{ zIndex: 51 }}>
        <DropdownButton
          label={getDateFilterLabel()}
          isOpen={isDateDropdownOpen}
          onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
        />
        {renderDropdownMenu(isDateDropdownOpen, (
          <div className="p-2">
            {(['all', 'today', 'yesterday', 'last7days', 'last30days', 'last90days'] as DateFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => handleDateFilterChange(filter)}
                className="w-full text-left px-4 py-2.5 rounded-lg transition-all duration-150 text-sm"
                style={{
                  backgroundColor: filterState.dateFilter === filter
                    ? 'var(--color-brand-600)'
                    : 'transparent',
                  color: filterState.dateFilter === filter
                    ? '#ffffff'
                    : 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  if (filterState.dateFilter !== filter) {
                    e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
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
                 filter === 'last30days' ? 'Last 30 days' :
                 'Last 90 days'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                onFilterChange({ ...filterState, dateFilter: 'custom' });
                setIsDateDropdownOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 rounded-lg transition-all duration-150 text-sm mt-1 border-t"
              style={{
                backgroundColor: filterState.dateFilter === 'custom'
                  ? 'var(--color-brand-600)'
                  : 'transparent',
                color: filterState.dateFilter === 'custom'
                  ? '#ffffff'
                  : 'var(--text-primary)',
                borderColor: 'var(--border)',
              }}
              onMouseEnter={(e) => {
                if (filterState.dateFilter !== 'custom') {
                  e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (filterState.dateFilter !== 'custom') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              Custom range
            </button>
          </div>
        ))}
      </div>

      {/* Custom Date Range Inputs */}
      {filterState.dateFilter === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filterState.customDateStart || ''}
            onChange={(e) => onFilterChange({ ...filterState, customDateStart: e.target.value })}
            className="px-3 py-2 rounded-xl text-sm border"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border)',
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>to</span>
          <input
            type="date"
            value={filterState.customDateEnd || ''}
            onChange={(e) => onFilterChange({ ...filterState, customDateEnd: e.target.value })}
            className="px-3 py-2 rounded-xl text-sm border"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border)',
            }}
          />
        </div>
      )}

      {/* Tag Filter */}
      {allTags.length > 0 && (
        <div ref={tagDropdownRef} className="relative" style={{ zIndex: 51 }}>
          <DropdownButton
            label="Tags"
            isOpen={isTagDropdownOpen}
            onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
            count={filterState.selectedTags.length}
          />
          {renderDropdownMenu(isTagDropdownOpen, (
            <div className="p-2 max-h-64 overflow-y-auto">
              {allTags.map((tag) => (
                <label
                  key={tag}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-150 text-sm cursor-pointer hover:bg-opacity-50"
                  style={{
                    backgroundColor: filterState.selectedTags.includes(tag)
                      ? 'var(--color-brand-600)'
                      : 'transparent',
                    color: filterState.selectedTags.includes(tag)
                      ? '#ffffff'
                      : 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!filterState.selectedTags.includes(tag)) {
                      e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!filterState.selectedTags.includes(tag)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={filterState.selectedTags.includes(tag)}
                    onChange={() => handleTagToggle(tag)}
                    className="w-4 h-4 rounded"
                    style={{
                      accentColor: 'var(--color-primary)',
                    }}
                  />
                  <span>{tag}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Sort Filter */}
      <div ref={sortDropdownRef} className="relative" style={{ zIndex: 51 }}>
        <DropdownButton
          label={getSortLabel()}
          isOpen={isSortDropdownOpen}
          onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
        />
        {renderDropdownMenu(isSortDropdownOpen, (
          <div className="p-2">
            {(['newest', 'oldest', 'title-asc', 'title-desc'] as SortOption[]).map((sort) => (
              <button
                key={sort}
                type="button"
                onClick={() => handleSortChange(sort)}
                className="w-full text-left px-4 py-2.5 rounded-lg transition-all duration-150 text-sm"
                style={{
                  backgroundColor: filterState.sortBy === sort
                    ? 'var(--color-brand-600)'
                    : 'transparent',
                  color: filterState.sortBy === sort
                    ? '#ffffff'
                    : 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  if (filterState.sortBy !== sort) {
                    e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
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
                 sort === 'title-asc' ? 'Title A-Z' :
                 'Title Z-A'}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Archive Filter */}
      <div ref={archiveDropdownRef} className="relative" style={{ zIndex: 51 }}>
        <DropdownButton
          label={getArchiveLabel()}
          isOpen={isArchiveDropdownOpen}
          onClick={() => setIsArchiveDropdownOpen(!isArchiveDropdownOpen)}
        />
        {renderDropdownMenu(isArchiveDropdownOpen, (
          <div className="p-2">
            {(['all', 'not-archived', 'archived'] as ArchiveFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => handleArchiveFilterChange(filter)}
                className="w-full text-left px-4 py-2.5 rounded-lg transition-all duration-150 text-sm"
                style={{
                  backgroundColor: filterState.archiveFilter === filter
                    ? 'var(--color-brand-600)'
                    : 'transparent',
                  color: filterState.archiveFilter === filter
                    ? '#ffffff'
                    : 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  if (filterState.archiveFilter !== filter) {
                    e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (filterState.archiveFilter !== filter) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {filter === 'all' ? 'All notes' :
                 filter === 'archived' ? 'Archived' :
                 'Not archived'}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear filters
        </button>
      )}

      {/* Bulk Select Toggle Button */}
      {onBulkModeToggle && (
        <button
          type="button"
          onClick={onBulkModeToggle}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 ml-auto"
          style={{
            backgroundColor: isBulkMode ? 'var(--color-brand-600)' : 'transparent',
            color: isBulkMode ? '#ffffff' : 'var(--text-secondary)',
            border: `1px solid ${isBulkMode ? 'var(--color-brand-600)' : 'var(--border)'}`,
            boxShadow: isBulkMode ? 'var(--shadow-lg), 0 0 20px -10px var(--color-primary-alpha)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isBulkMode) {
              e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isBulkMode) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }
          }}
        >
          {isBulkMode ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Select
            </>
          )}
        </button>
      )}
    </div>
  );
}

