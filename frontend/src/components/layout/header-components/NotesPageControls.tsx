import { useRef, useEffect } from 'react';
import { useBoundStore } from '../../../store/bound-store';

interface NotesPageControlsProps {
  /** Whether to auto-focus the search input on mount */
  autoFocus?: boolean;
}

/**
 * Notes page header controls
 * Includes search input and search mode toggle
 */
export const NotesPageControls = ({ autoFocus = true }: NotesPageControlsProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchQuery = useBoundStore((state) => state.searchQuery);
  const searchMode = useBoundStore((state) => state.searchMode);
  const setSearchQuery = useBoundStore((state) => state.setSearchQuery);
  const toggleSearchMode = useBoundStore((state) => state.toggleSearchMode);

  // Focus search input on mount
  useEffect(() => {
    if (autoFocus && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [autoFocus]);

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

  return (
    <div className="flex items-center gap-2">
      <input
        ref={searchInputRef}
        type="text"
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Search notes..."
        className="px-4 py-2 rounded-xl border text-sm transition-all focus:outline-none"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
          width: '300px',
          boxShadow: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--input-focus-border)';
          e.currentTarget.style.boxShadow = '0 0 0 2px var(--input-focus-ring)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      <button
        onClick={toggleSearchMode}
        onMouseDown={(e) => {
          // Prevent input blur when clicking toggle button
          e.preventDefault();
        }}
        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all hover:scale-105 active:scale-95 bg-[var(--color-brand-600)] border-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] hover:border-[var(--color-brand-700)]"
        style={{
          color: '#ffffff',
          boxShadow: 'none',
        }}
        title={`Search mode: ${getSearchModeTitle()}`}
        aria-label={`Search mode: ${getSearchModeTitle()}`}
      >
        <svg
          className="h-4 w-4"
          style={{ color: '#ffffff' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {getSearchModeIcon()}
        </svg>
        <span className="hidden sm:inline" style={{ color: '#ffffff' }}>
          {getSearchModeLabel()}
        </span>
      </button>
    </div>
  );
};

/**
 * Mobile version of notes search controls
 * Used in the mobile menu drawer
 */
export const NotesPageControlsMobile = () => {
  const searchQuery = useBoundStore((state) => state.searchQuery);
  const searchMode = useBoundStore((state) => state.searchMode);
  const setSearchQuery = useBoundStore((state) => state.setSearchQuery);
  const toggleSearchMode = useBoundStore((state) => state.toggleSearchMode);

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
    if (searchMode === 'both') return 'Title & Content';
    if (searchMode === 'title') return 'Title only';
    return 'Content only';
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search notes..."
          className="flex-1 px-4 py-2 rounded-xl border text-sm transition-all focus:outline-none"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            boxShadow: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--input-focus-border)';
            e.currentTarget.style.boxShadow = '0 0 0 2px var(--input-focus-ring)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>
      <button
        onClick={toggleSearchMode}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        <svg
          className="h-4 w-4"
          style={{ color: 'var(--text-primary)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {getSearchModeIcon()}
        </svg>
        <span>Search: {getSearchModeLabel()}</span>
      </button>
    </div>
  );
};
