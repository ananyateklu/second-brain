/**
 * Notes Directory Page
 * Unified notes view with folder navigation, filtering, search, and bulk operations
 */

import { useState, useMemo, useRef, useEffect, useCallback, useDeferredValue } from 'react';
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

  // Context for sharing state with header
  const { setHeaderState } = useDirectoryPageContext();

  // Global filter state from store
  const filterState = useBoundStore((state) => state.filterState);
  const setFilterState = useBoundStore((state) => state.setFilterState);
  const searchQuery = useBoundStore((state) => state.searchQuery);
  const searchMode = useBoundStore((state) => state.searchMode);
  const isBulkMode = useBoundStore((state) => state.isBulkMode);
  const setBulkMode = useBoundStore((state) => state.setBulkMode);
  const itemsPerPage = useBoundStore((state) => state.itemsPerPage);

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
      {/* Folder Sidebar */}
      {directorySidebarVisible && (
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
          className="flex-1 overflow-y-auto p-6 thin-scrollbar transition-opacity duration-200"
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
        </div>

      </div>

      {/* Floating Pagination */}
      {totalPages > 1 && createPortal(
        <div
          className="fixed z-40 px-6 py-3 rounded-2xl border shadow-2xl transition-all duration-300"
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

      {/* Bulk Actions Bar */}
      {isBulkMode && (
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
