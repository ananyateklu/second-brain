/**
 * Notes Directory Page
 * Unified notes view with folder navigation, filtering, search, and bulk operations
 */

import { useState, useMemo, useRef, useEffect, useCallback, useDeferredValue } from 'react';
import { useNotesPaged, useBulkDeleteNotes } from '../features/notes/hooks/use-notes-query';
import { NoteList } from '../features/notes/components/NoteList';
import { EditNoteModal } from '../features/notes/components/EditNoteModal';
import { DirectoryContentSkeleton } from '../features/notes/components/DirectorySkeleton';
import { BulkActionsBar } from '../features/notes/components/BulkActionsBar';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { useBoundStore } from '../store/bound-store';
import { isTauri } from '../lib/native-notifications';
import { useDirectoryPageContext } from '../features/notes/context/DirectoryPageContext';
import { toast } from '../hooks/use-toast';
import { NoteListItem } from '../types/notes';
import {
  startOfDay,
  subDays,
  parse,
  endOfDay,
  parseISO,
  isWithinInterval,
  isBefore,
} from 'date-fns';

type FolderFilter = string | null;
type ArchiveFilter = 'all' | 'not-archived' | 'archived';

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

  // Theme and view mode
  const theme = useBoundStore((state) => state.theme);
  const directoryViewMode = useBoundStore((state) => state.directoryViewMode);
  const isDarkMode = theme === 'dark' || theme === 'blue';

  // Fullscreen state for Tauri
  const isFullscreen = useBoundStore((state) => state.isFullscreenDirectory);
  const isInTauri = isTauri();
  const isPageFullscreen = isInTauri && isFullscreen;

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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Use server-side paginated query
  const { data: paginatedResult, isLoading, error, isFetching } = useNotesPaged({
    page: hasClientSideOnlyFilters ? 1 : currentPage,
    pageSize: serverPageSize,
    folder: selectedFolder ?? undefined,
    includeArchived: archiveFilter !== 'not-archived',
    search: deferredSearchQuery.trim() || undefined,
  });

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

  // Calculate folder stats from all notes (need a separate query for this in the future)
  // For now, we'll compute stats from the current result set
  const folderStats = useMemo(() => {
    if (!notes) return { all: 0, archived: 0, active: 0, unfiled: 0, folders: {} as Record<string, number> };

    // Note: This is a simplified version - for accurate stats we'd need all notes
    // For now, we use serverTotalCount for 'all' and estimate others
    const stats = {
      all: serverTotalCount,
      archived: notes.filter((n) => n.isArchived).length,
      active: notes.filter((n) => !n.isArchived).length,
      unfiled: notes.filter((n) => !n.folder && !n.isArchived).length,
      folders: {} as Record<string, number>,
    };

    notes
      .filter((n) => !n.isArchived && n.folder)
      .forEach((note) => {
        if (note.folder) {
          stats.folders[note.folder] = (stats.folders[note.folder] || 0) + 1;
        }
      });

    return stats;
  }, [notes, serverTotalCount]);

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

  const isSelected = (folder: FolderFilter) => selectedFolder === folder;

  const getItemStyle = (itemId: string, selected: boolean) => ({
    backgroundColor: selected
      ? isDarkMode
        ? 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)'
        : 'color-mix(in srgb, var(--color-brand-100) 50%, transparent)'
      : hoveredItem === itemId
        ? 'var(--surface-hover)'
        : 'transparent',
    color: selected ? 'var(--color-brand-600)' : 'var(--text-primary)',
    borderLeft: selected ? '3px solid var(--color-brand-600)' : '3px solid transparent',
  });

  const handleFolderSelect = useCallback((folder: FolderFilter, archive: ArchiveFilter = 'not-archived') => {
    setFilterState({
      ...filterState,
      selectedFolder: folder,
      archiveFilter: archive,
    });
    setCurrentPage(1);
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

  // Calculate container styles based on fullscreen mode
  const containerStyles = isPageFullscreen
    ? {
      backgroundColor: 'transparent',
      height: '100vh',
      maxHeight: '100vh',
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 30,
      borderRadius: 0,
    }
    : {
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
        <div
          className="border-r flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-out w-64 md:w-72"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto thin-scrollbar">
            {/* All Notes */}
            <button
              onClick={() => { handleFolderSelect(null, 'all'); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
              style={getItemStyle('all', selectedFolder === null && archiveFilter === 'all')}
              onMouseEnter={() => { setHoveredItem('all'); }}
              onMouseLeave={() => { setHoveredItem(null); }}
            >
              <span className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                All Notes
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {folderStats.all}
              </span>
            </button>

            {/* Active Notes */}
            <button
              onClick={() => { handleFolderSelect(null, 'not-archived'); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
              style={getItemStyle('active', selectedFolder === null && archiveFilter === 'not-archived')}
              onMouseEnter={() => { setHoveredItem('active'); }}
              onMouseLeave={() => { setHoveredItem(null); }}
            >
              <span className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Active
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {folderStats.active}
              </span>
            </button>

            {/* Archived Notes */}
            <button
              onClick={() => { handleFolderSelect(null, 'archived'); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
              style={getItemStyle('archived', archiveFilter === 'archived')}
              onMouseEnter={() => { setHoveredItem('archived'); }}
              onMouseLeave={() => { setHoveredItem(null); }}
            >
              <span className="flex items-center gap-3">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{
                    color: archiveFilter === 'archived' ? 'var(--color-warning)' : 'currentColor',
                  }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                <span style={{ color: archiveFilter === 'archived' ? 'var(--color-warning)' : 'inherit' }}>
                  Archived
                </span>
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor:
                    archiveFilter === 'archived'
                      ? 'color-mix(in srgb, var(--color-warning) 20%, transparent)'
                      : 'var(--surface-hover)',
                  color: archiveFilter === 'archived' ? 'var(--color-warning)' : 'var(--text-tertiary)',
                }}
              >
                {folderStats.archived}
              </span>
            </button>

            {/* Divider */}
            <div className="mx-4 my-2 border-t" style={{ borderColor: 'var(--border)' }} />

            {/* Unfiled */}
            {folderStats.unfiled > 0 && (
              <button
                onClick={() => { handleFolderSelect('', 'not-archived'); }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
                style={getItemStyle('unfiled', isSelected(''))}
                onMouseEnter={() => { setHoveredItem('unfiled'); }}
                onMouseLeave={() => { setHoveredItem(null); }}
              >
                <span className="flex items-center gap-3">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Unfiled
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--surface-hover)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {folderStats.unfiled}
                </span>
              </button>
            )}

            {/* Folder List */}
            {folderList.length > 0 && (
              <>
                <div
                  className="px-4 py-2 text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Folders
                </div>
                {folderList.map((folder) => (
                  <button
                    key={folder}
                    onClick={() => { handleFolderSelect(folder, 'not-archived'); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
                    style={getItemStyle(`folder-${folder}`, isSelected(folder))}
                    onMouseEnter={() => { setHoveredItem(`folder-${folder}`); }}
                    onMouseLeave={() => { setHoveredItem(null); }}
                  >
                    <span className="flex items-center gap-3 truncate">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                      </svg>
                      <span className="truncate">{folder}</span>
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: 'var(--surface-hover)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {folderStats.folders[folder]}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Notes Content */}
        <div
          className="flex-1 overflow-y-auto p-6 thin-scrollbar transition-opacity duration-200"
          style={{ opacity: isSearchStale || isFetching ? 0.7 : 1 }}
        >
          {isLoading ? (
            <DirectoryContentSkeleton />
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t px-6 py-3" style={{ borderColor: 'var(--border)' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

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
