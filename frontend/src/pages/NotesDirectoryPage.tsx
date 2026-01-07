/**
 * Notes Directory Page
 * Unified notes view with folder navigation, filtering, search, and bulk operations
 */

import { useState, useMemo, useRef, useEffect, useCallback, useDeferredValue, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  useNotesPaged,
  useNotesFolderStats,
  useBulkDeleteNotes,
  useNotesTrash,
  useRestoreNote,
  usePermanentDeleteNote,
  useEmptyTrash,
} from '../features/notes/hooks/use-notes-query';
import { NoteList } from '../features/notes/components/NoteList';
import { EditNoteModal } from '../features/notes/components/EditNoteModal';
import { DirectoryContentSkeleton } from '../features/notes/components/DirectorySkeleton';
import { BulkActionsBar } from '../features/notes/components/BulkActionsBar';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { useBoundStore } from '../store/bound-store';
import { useDirectoryPageContext } from '../features/notes/context/DirectoryPageContext';
import { toast } from '../hooks/use-toast';
import { NoteListItem } from '../types/notes';
import { DirectorySidebar } from './notes-directory/components/DirectorySidebar';
import { TrashNotesContent } from './notes-directory/components/TrashNotesContent';
import { TrashHeader } from './notes-directory/components/TrashHeader';
import type { ArchiveFilter, FolderFilter } from './notes-directory/notes-directory.types';
import {
  startOfDay,
  subDays,
  parse,
  endOfDay,
  parseISO,
  isWithinInterval,
  isBefore,
} from 'date-fns';


// Cache for date calculations to avoid recreating Date objects
const getDateBoundaries = () => {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = subDays(today, 1);
  const sevenDaysAgo = subDays(today, 7);
  const thirtyDaysAgo = subDays(today, 30);
  const ninetyDaysAgo = subDays(today, 90);

  return {
    today,
    yesterday,
    sevenDaysAgo,
    thirtyDaysAgo,
    ninetyDaysAgo,
    todayTime: today.getTime(),
    yesterdayTime: yesterday.getTime(),
  };
};

// Optimized filter function for client-side date filtering
const applyDateFilter = (
  note: NoteListItem,
  dateFilter: string,
  boundaries: ReturnType<typeof getDateBoundaries>,
  customDateStart?: string,
  customDateEnd?: string
): boolean => {
  if (dateFilter === 'all') return true;

  const noteDate = parseISO(note.createdAt);
  const noteDateOnly = startOfDay(noteDate);
  const noteDateOnlyTime = noteDateOnly.getTime();

  switch (dateFilter) {
    case 'today':
      return noteDateOnlyTime === boundaries.todayTime;
    case 'yesterday':
      return noteDateOnlyTime === boundaries.yesterdayTime;
    case 'last7days':
      return !isBefore(noteDate, boundaries.sevenDaysAgo);
    case 'last30days':
      return !isBefore(noteDate, boundaries.thirtyDaysAgo);
    case 'last90days':
      return !isBefore(noteDate, boundaries.ninetyDaysAgo);
    case 'custom':
      if (customDateStart && customDateEnd) {
        const start = parse(customDateStart, 'yyyy-MM-dd', new Date());
        const end = endOfDay(parse(customDateEnd, 'yyyy-MM-dd', new Date()));
        return isWithinInterval(noteDate, { start, end });
      }
      return true;
    default:
      return true;
  }
};

export function NotesDirectoryPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bulkDeleteMutation = useBulkDeleteNotes();

  // Trash mode state and mutations
  const [isTrashMode, setIsTrashMode] = useState(false);
  const { data: trashData, isLoading: isTrashLoading } = useNotesTrash();
  const restoreMutation = useRestoreNote();
  const permanentDeleteMutation = usePermanentDeleteNote();
  const emptyTrashMutation = useEmptyTrash();

  // View mode
  const directoryViewMode = useBoundStore((state) => state.directoryViewMode);

  // Sidebar visibility from Zustand (shared with header)
  const directorySidebarVisible = useBoundStore((state) => state.directorySidebarVisible);
  const setDirectorySidebarVisible = useBoundStore((state) => state.setDirectorySidebarVisible);

  // Main navigation sidebar state (hamburger menu)
  const isMobileMenuOpen = useBoundStore((state) => state.isMobileMenuOpen);

  // Track if we're on mobile for drawer behavior
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  // Update mobile state on resize
  useLayoutEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-close sidebar when switching to mobile
      if (mobile && directorySidebarVisible) {
        setDirectorySidebarVisible(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [directorySidebarVisible, setDirectorySidebarVisible]);

  // Handle escape key to close mobile sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobile && directorySidebarVisible) {
        setDirectorySidebarVisible(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobile, directorySidebarVisible, setDirectorySidebarVisible]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && directorySidebarVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, directorySidebarVisible]);

  // Context for sharing state with header
  const { setHeaderState } = useDirectoryPageContext();

  // Global filter state from store
  const filterState = useBoundStore((state) => state.filterState);
  const setFilterState = useBoundStore((state) => state.setFilterState);
  const searchQuery = useBoundStore((state) => state.searchQuery);
  const setSearchQuery = useBoundStore((state) => state.setSearchQuery);
  const searchMode = useBoundStore((state) => state.searchMode);
  const toggleSearchMode = useBoundStore((state) => state.toggleSearchMode);
  const isBulkMode = useBoundStore((state) => state.isBulkMode);
  const setBulkMode = useBoundStore((state) => state.setBulkMode);
  const itemsPerPage = useBoundStore((state) => state.itemsPerPage);
  const setDirectoryViewMode = useBoundStore((state) => state.setDirectoryViewMode);

  // Mobile filter dropdown states
  const [mobileFilterOpen, setMobileFilterOpen] = useState<'date' | 'tags' | 'sort' | null>(null);

  // Local UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPagination, setShowPagination] = useState(true);
  const lastScrollTop = useRef(0);
  const scrollableRef = useRef<HTMLDivElement>(null);

  // Defer search query updates to keep typing responsive
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const isSearchStale = searchQuery !== deferredSearchQuery;

  // Extract folder and archive filter from global state
  const selectedFolder = filterState.selectedFolder ?? null;
  const archiveFilter = filterState.archiveFilter;

  // Determine if we have client-side-only filters that backend doesn't support
  const hasClientSideOnlyFilters = useMemo(() => {
    return (
      filterState.dateFilter !== 'all' ||
      filterState.selectedTags.length > 0 ||
      filterState.archiveFilter === 'archived'
    );
  }, [filterState.dateFilter, filterState.selectedTags, filterState.archiveFilter]);

  // For server-side pagination, we need a larger page size when using client-side filters
  const serverPageSize = hasClientSideOnlyFilters ? 100 : itemsPerPage;

  // Use server-side paginated query for displaying notes (with folder filter)
  const { data: paginatedResult, isLoading, error, isFetching } = useNotesPaged({
    page: hasClientSideOnlyFilters ? 1 : currentPage,
    pageSize: serverPageSize,
    folder: selectedFolder ?? undefined,
    includeArchived: archiveFilter !== 'not-archived',
    search: deferredSearchQuery.trim() || undefined,
  });

  // Dedicated stats endpoint for accurate folder counts (no pagination limit)
  const { data: folderStatsData } = useNotesFolderStats();

  // Extract notes from paginated result
  const notes = useMemo(() => {
    return paginatedResult?.items ?? [];
  }, [paginatedResult?.items]);
  const serverTotalCount = paginatedResult?.totalCount ?? 0;

  // Memoize date boundaries - only recalculate when date filter changes
  const dateBoundaries = useMemo(() => {
    if (filterState.dateFilter === 'all') return null;
    return getDateBoundaries();
  }, [filterState.dateFilter]);

  // Use dedicated stats endpoint for accurate folder counts (no pagination limit)
  const folderStats = useMemo(() => {
    if (!folderStatsData) {
      return { all: 0, archived: 0, active: 0, unfiled: 0, folders: {} as Record<string, number> };
    }

    return {
      all: folderStatsData.totalCount,
      archived: folderStatsData.archivedCount,
      active: folderStatsData.activeCount,
      unfiled: folderStatsData.unfiledCount,
      folders: folderStatsData.folderCounts,
    };
  }, [folderStatsData]);

  // Get sorted list of folders
  const folderList = useMemo(() => {
    return Object.keys(folderStats.folders).sort();
  }, [folderStats.folders]);

  // Apply client-side filters (date, tags, archived-only) and sorting
  const filteredNotes = useMemo(() => {
    if (!notes.length) return [];

    const hasDateFilter = filterState.dateFilter !== 'all';
    const hasTagFilter = filterState.selectedTags.length > 0;
    const hasArchivedOnlyFilter = filterState.archiveFilter === 'archived';

    // If no client-side filters needed, just sort
    if (!hasDateFilter && !hasTagFilter && !hasArchivedOnlyFilter) {
      const sorted = [...notes];
      sorted.sort((a, b) => {
        switch (filterState.sortBy) {
          case 'newest':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'oldest':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'title-asc':
            return (a.title || '').localeCompare(b.title || '');
          case 'title-desc':
            return (b.title || '').localeCompare(a.title || '');
          default:
            return 0;
        }
      });
      return sorted;
    }

    // Apply client-side filters
    const filtered = notes.filter((note) => {
      // Archive filter - show only archived notes when filter is 'archived'
      if (hasArchivedOnlyFilter && !note.isArchived) {
        return false;
      }

      // Date filter (client-side only)
      if (hasDateFilter && dateBoundaries) {
        if (!applyDateFilter(
          note,
          filterState.dateFilter,
          dateBoundaries,
          filterState.customDateStart,
          filterState.customDateEnd
        )) {
          return false;
        }
      }

      // Tag filter (client-side only)
      if (hasTagFilter) {
        if (!filterState.selectedTags.some(tag => note.tags?.includes(tag))) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filterState.sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title-desc':
          return (b.title || '').localeCompare(a.title || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [notes, filterState, dateBoundaries]);

  // Calculate pagination
  const totalItems = hasClientSideOnlyFilters ? filteredNotes.length : serverTotalCount;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const displayedNotes = useMemo(() => {
    if (hasClientSideOnlyFilters) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return filteredNotes.slice(startIndex, endIndex);
    }
    return filteredNotes;
  }, [hasClientSideOnlyFilters, filteredNotes, currentPage, itemsPerPage]);

  // Populate header context with note count
  useEffect(() => {
    setHeaderState({
      noteCount: totalItems,
    });

    return () => {
      setHeaderState(null);
    };
  }, [setHeaderState, totalItems]);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedNoteIds(new Set());
  }, [deferredSearchQuery, filterState]);

  // Reset page if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Scroll direction detection for floating pagination
  useEffect(() => {
    const scrollable = scrollableRef.current;
    if (!scrollable) return;

    const handleScroll = () => {
      const currentScrollTop = scrollable.scrollTop;
      const scrollDiff = currentScrollTop - lastScrollTop.current;

      // Only trigger if scroll difference is significant (> 5px)
      if (Math.abs(scrollDiff) > 5) {
        // Scrolling down - show pagination
        if (scrollDiff > 0) {
          setShowPagination(true);
        } else {
          // Scrolling up - hide pagination
          setShowPagination(false);
        }
      }

      // Always show when at top or bottom
      const isAtTop = currentScrollTop < 10;
      const isAtBottom = scrollable.scrollHeight - scrollable.clientHeight - currentScrollTop < 10;
      if (isAtTop || isAtBottom) {
        setShowPagination(true);
      }

      lastScrollTop.current = currentScrollTop;
    };

    scrollable.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollable.removeEventListener('scroll', handleScroll);
  }, []);

  const handleFolderSelect = useCallback((folder: FolderFilter, archive: ArchiveFilter = 'not-archived') => {
    setFilterState({
      ...filterState,
      selectedFolder: folder,
      archiveFilter: archive,
    });
    setCurrentPage(1);
    setSelectedNoteIds(new Set());
  }, [filterState, setFilterState]);

  const handleFolderNavigation = useCallback((folder: FolderFilter, archive: ArchiveFilter = 'not-archived') => {
    setIsTrashMode(false);
    handleFolderSelect(folder, archive);
  }, [handleFolderSelect]);

  const handleTrashSelect = useCallback(() => {
    setIsTrashMode(true);
    setFilterState({ ...filterState, selectedFolder: null, archiveFilter: 'all' });
    setSelectedNoteIds(new Set());
  }, [filterState, setFilterState]);

  // Mobile-aware folder selection (closes drawer after selection)
  const handleMobileFolderSelect = useCallback((folder: FolderFilter, archive: ArchiveFilter = 'not-archived') => {
    handleFolderNavigation(folder, archive);
    if (isMobile) {
      setDirectorySidebarVisible(false);
    }
  }, [handleFolderNavigation, isMobile, setDirectorySidebarVisible]);

  // Mobile-aware trash selection (closes drawer after selection)
  const handleMobileTrashSelect = useCallback(() => {
    handleTrashSelect();
    if (isMobile) {
      setDirectorySidebarVisible(false);
    }
  }, [handleTrashSelect, isMobile, setDirectorySidebarVisible]);

  // Bulk operation handlers
  const handleNoteSelect = useCallback((noteId: string) => {
    setSelectedNoteIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedNoteIds(new Set(displayedNotes.map((note) => note.id)));
  }, [displayedNotes]);

  const handleDeselectAll = useCallback(() => {
    setSelectedNoteIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedNoteIds.size === 0) return;

    setIsDeleting(true);
    const idsToDelete = Array.from(selectedNoteIds);
    const totalCount = idsToDelete.length;

    toast.info('Deleting notes...', `Deleting ${totalCount} note${totalCount === 1 ? '' : 's'}...`);

    try {
      const result = await bulkDeleteMutation.mutateAsync(idsToDelete);

      toast.success('Notes deleted', `Successfully deleted ${result.deletedCount} note${result.deletedCount === 1 ? '' : 's'}.`);
      setSelectedNoteIds(new Set());
      setBulkMode(false);
    } catch (err) {
      console.error('Failed to delete notes:', { error: err, idsToDelete });
      toast.error('Failed to delete notes', 'An error occurred while deleting notes.');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedNoteIds, bulkDeleteMutation, setBulkMode]);

  const containerStyles = {
    backgroundColor: 'transparent',
    height: '100%',
  };

  if (error) {
    return (
      <div
        ref={containerRef}
        className="flex overflow-hidden flex-1 transition-all duration-300"
        style={containerStyles}
      >
        <div className="flex-1 flex items-center justify-center">
          <div
            className="rounded-xl border p-6 text-center shadow-sm"
            style={{
              backgroundColor: 'var(--color-error-light)',
              borderColor: 'var(--color-error-border)',
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg
                className="h-5 w-5"
                style={{ color: 'var(--color-error-text)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-base font-semibold" style={{ color: 'var(--color-error-text)' }}>
                Error: {error instanceof Error ? error.message : 'Failed to load notes'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex overflow-hidden flex-1 transition-all duration-300"
      style={containerStyles}
    >
      {/* Mobile Sidebar Overlay - z-50 to be above pagination (z-40) */}
      {isMobile && directorySidebarVisible && (
        <div
          className="fixed inset-0 z-50 transition-opacity duration-300"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setDirectorySidebarVisible(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar Drawer - z-[60] to be above overlay */}
      {isMobile && (
        <aside
          className={`fixed top-0 left-0 bottom-0 z-[60] w-72 max-w-[80vw] transform transition-transform duration-300 ease-out flex flex-col backdrop-blur-xl ${
            directorySidebarVisible ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--background) 92%, transparent)',
            borderRight: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
          }}
        >
          {/* Mobile Drawer Header */}
          <div
            className="flex items-center justify-between px-4 py-4 border-b shrink-0"
            style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}
          >
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Folders
            </h2>
            <button
              onClick={() => setDirectorySidebarVisible(false)}
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
                border: '1px solid color-mix(in srgb, var(--text-primary) 10%, transparent)',
              }}
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-primary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile Drawer Content */}
          <div className="flex-1 overflow-y-auto">
            <DirectorySidebar
              folderStats={folderStats}
              folderList={folderList}
              selectedFolder={selectedFolder}
              archiveFilter={archiveFilter}
              isTrashMode={isTrashMode}
              trashCount={trashData?.totalCount ?? 0}
              onSelectFolder={handleMobileFolderSelect}
              onSelectTrash={handleMobileTrashSelect}
            />
          </div>
        </aside>
      )}

      {/* Desktop Folder Sidebar */}
      {!isMobile && directorySidebarVisible && (
        <DirectorySidebar
          folderStats={folderStats}
          folderList={folderList}
          selectedFolder={selectedFolder}
          archiveFilter={archiveFilter}
          isTrashMode={isTrashMode}
          trashCount={trashData?.totalCount ?? 0}
          onSelectFolder={handleFolderNavigation}
          onSelectTrash={handleTrashSelect}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Mobile Filter Bar - Only on mobile */}
        <div className="md:hidden shrink-0">
          {/* Search Row */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}>
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border text-sm transition-all focus:outline-none"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
                  color: 'var(--text-primary)',
                }}
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={toggleSearchMode}
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
          <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto thin-scrollbar border-b" style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}>
            {/* Date Filter */}
            <div className="relative shrink-0">
              <button
                onClick={() => setMobileFilterOpen(mobileFilterOpen === 'date' ? null : 'date')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: filterState.dateFilter !== 'all' ? 'var(--btn-primary-bg)' : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
                  color: filterState.dateFilter !== 'all' ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {filterState.dateFilter === 'all' ? 'All time' : filterState.dateFilter === 'today' ? 'Today' : filterState.dateFilter === 'yesterday' ? 'Yesterday' : filterState.dateFilter === 'last7days' ? '7 days' : filterState.dateFilter === 'last30days' ? '30 days' : '90 days'}
              </button>
              {mobileFilterOpen === 'date' && (
                <div
                  className="absolute top-full left-0 mt-1 min-w-[140px] rounded-xl border shadow-xl z-50 p-1"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--background) 95%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  {(['all', 'today', 'yesterday', 'last7days', 'last30days', 'last90days'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => {
                        setFilterState({ ...filterState, dateFilter: filter });
                        setMobileFilterOpen(null);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: filterState.dateFilter === filter ? 'var(--btn-primary-bg)' : 'transparent',
                        color: filterState.dateFilter === filter ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                      }}
                    >
                      {filter === 'all' ? 'All time' : filter === 'today' ? 'Today' : filter === 'yesterday' ? 'Yesterday' : filter === 'last7days' ? 'Last 7 days' : filter === 'last30days' ? 'Last 30 days' : 'Last 90 days'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tags Filter */}
            {folderStats.all > 0 && (
              <div className="relative shrink-0">
                <button
                  onClick={() => setMobileFilterOpen(mobileFilterOpen === 'tags' ? null : 'tags')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: filterState.selectedTags.length > 0 ? 'var(--btn-primary-bg)' : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
                    color: filterState.selectedTags.length > 0 ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Tags{filterState.selectedTags.length > 0 && ` (${filterState.selectedTags.length})`}
                </button>
                {mobileFilterOpen === 'tags' && (
                  <div
                    className="absolute top-full left-0 mt-1 min-w-[160px] max-h-48 overflow-y-auto rounded-xl border shadow-xl z-50 p-1"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--background) 95%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
                      backdropFilter: 'blur(20px)',
                    }}
                  >
                    {filterState.selectedTags.length > 0 && (
                      <button
                        onClick={() => {
                          setFilterState({ ...filterState, selectedTags: [] });
                          setMobileFilterOpen(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm mb-1"
                        style={{ color: 'var(--color-error)' }}
                      >
                        Clear all
                      </button>
                    )}
                    {Array.from(new Set(notes.flatMap(n => n.tags || []))).sort().map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          const newTags = filterState.selectedTags.includes(tag)
                            ? filterState.selectedTags.filter(t => t !== tag)
                            : [...filterState.selectedTags, tag];
                          setFilterState({ ...filterState, selectedTags: newTags });
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                        style={{
                          backgroundColor: filterState.selectedTags.includes(tag) ? 'var(--btn-primary-bg)' : 'transparent',
                          color: filterState.selectedTags.includes(tag) ? 'var(--btn-primary-text)' : 'var(--text-primary)',
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
                onClick={() => setMobileFilterOpen(mobileFilterOpen === 'sort' ? null : 'sort')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: filterState.sortBy !== 'newest' ? 'var(--btn-primary-bg)' : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
                  color: filterState.sortBy !== 'newest' ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                {filterState.sortBy === 'newest' ? 'Newest' : filterState.sortBy === 'oldest' ? 'Oldest' : filterState.sortBy === 'title-asc' ? 'A-Z' : 'Z-A'}
              </button>
              {mobileFilterOpen === 'sort' && (
                <div
                  className="absolute top-full left-0 mt-1 min-w-[130px] rounded-xl border shadow-xl z-50 p-1"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--background) 95%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  {(['newest', 'oldest', 'title-asc', 'title-desc'] as const).map((sort) => (
                    <button
                      key={sort}
                      onClick={() => {
                        setFilterState({ ...filterState, sortBy: sort });
                        setMobileFilterOpen(null);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: filterState.sortBy === sort ? 'var(--btn-primary-bg)' : 'transparent',
                        color: filterState.sortBy === sort ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                      }}
                    >
                      {sort === 'newest' ? 'Newest first' : sort === 'oldest' ? 'Oldest first' : sort === 'title-asc' ? 'Title A-Z' : 'Title Z-A'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="shrink-0 flex items-center gap-1 ml-auto">
              <button
                onClick={() => setDirectoryViewMode('card')}
                className="p-1.5 rounded-lg transition-all"
                style={{
                  backgroundColor: directoryViewMode === 'card' ? 'var(--btn-primary-bg)' : 'transparent',
                  color: directoryViewMode === 'card' ? 'var(--btn-primary-text)' : 'var(--text-tertiary)',
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setDirectoryViewMode('list')}
                className="p-1.5 rounded-lg transition-all"
                style={{
                  backgroundColor: directoryViewMode === 'list' ? 'var(--btn-primary-bg)' : 'transparent',
                  color: directoryViewMode === 'list' ? 'var(--btn-primary-text)' : 'var(--text-tertiary)',
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Click outside to close mobile filter dropdowns */}
        {mobileFilterOpen && (
          <div
            className="md:hidden fixed inset-0 z-40"
            onClick={() => setMobileFilterOpen(null)}
          />
        )}

        {/* Trash Header with Empty Trash Button */}
        {isTrashMode && trashData && trashData.totalCount > 0 && (
          <TrashHeader
            trashData={trashData}
            isEmptying={emptyTrashMutation.isPending}
            onEmptyTrash={() => {
              emptyTrashMutation.mutate();
            }}
          />
        )}

        {/* Notes Content */}
        <div
          ref={scrollableRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 thin-scrollbar transition-opacity duration-200"
          style={{ opacity: isSearchStale || isFetching ? 0.7 : 1 }}
        >
          {(isTrashMode ? isTrashLoading : isLoading) ? (
            <DirectoryContentSkeleton />
          ) : isTrashMode ? (
            <TrashNotesContent
              trashData={trashData}
              directoryViewMode={directoryViewMode}
              onRestoreNote={(noteId) => { restoreMutation.mutate(noteId); }}
              isRestorePending={restoreMutation.isPending}
              onPermanentDelete={(noteId) => { permanentDeleteMutation.mutate(noteId); }}
              isPermanentDeletePending={permanentDeleteMutation.isPending}
            />
          ) : displayedNotes.length === 0 ? (
            <EmptyState
              icon={
                <svg
                  className="h-8 w-8"
                  style={{ color: 'var(--text-secondary)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
              title="No notes found"
              description={
                deferredSearchQuery.trim()
                  ? `No notes match "${deferredSearchQuery}" ${searchMode === 'both' ? 'in title or content' : searchMode === 'title' ? 'in title' : 'in content'}.`
                  : selectedFolder
                    ? `No notes in "${selectedFolder}" folder.`
                    : archiveFilter === 'archived'
                      ? 'No archived notes.'
                      : 'No notes match the current filter.'
              }
            />
          ) : (
            <NoteList
              notes={displayedNotes}
              viewMode={directoryViewMode}
              isBulkMode={isBulkMode}
              selectedNoteIds={selectedNoteIds}
              onNoteSelect={handleNoteSelect}
            />
          )}

          {/* Mobile Inline Pagination - at bottom of content */}
          {totalPages > 1 && !isTrashMode && displayedNotes.length > 0 && (
            <div className="md:hidden mt-6 pb-4 flex justify-center">
              <div
                className="px-4 py-2.5 rounded-2xl border"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
                }}
              >
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Floating Pagination - desktop only, hidden when any mobile sidebar is open */}
      {totalPages > 1 && !isMobileMenuOpen && !(isMobile && directorySidebarVisible) && createPortal(
        <div
          className="hidden md:block fixed z-40 px-6 py-3 rounded-2xl border shadow-2xl transition-all duration-300"
          style={{
            left: '50%',
            bottom: isBulkMode ? '5.75rem' : '1.5rem',
            backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)',
            borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            opacity: showPagination ? 1 : 0,
            transform: `translate(-50%, ${showPagination ? '0' : '20px'})`,
            pointerEvents: showPagination ? 'auto' : 'none',
          }}
        >
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>,
        document.body
      )}

      {/* Bulk Actions Bar - hidden when any mobile sidebar is open */}
      {isBulkMode && !isMobileMenuOpen && !(isMobile && directorySidebarVisible) && (
        <BulkActionsBar
          selectedCount={selectedNoteIds.size}
          totalCount={displayedNotes.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onDelete={handleBulkDelete}
          isDeleting={isDeleting}
        />
      )}

      {/* Edit Note Modal */}
      <EditNoteModal />
    </div>
  );
}
