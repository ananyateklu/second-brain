/**
 * Notes Directory Page
 * Unified notes view with folder navigation, filtering, search, and bulk operations
 */

import { useState, useMemo, useRef, useEffect, useCallback, useDeferredValue, useLayoutEffect } from 'react';
import {
  useNotesPaged,
  useNotesFolderStats,
  useBulkDeleteNotes,
  useNotesTrash,
  useRestoreNote,
  usePermanentDeleteNote,
  useEmptyTrash,
} from '../features/notes/hooks/use-notes-query';
import { useNotesFiltering } from '../features/notes/hooks/use-notes-filtering';
import { EditNoteModal } from '../features/notes/components/EditNoteModal';
import { BulkActionsBar } from '../features/notes/components/BulkActionsBar';
import { useBoundStore } from '../store/bound-store';
import { useDirectoryPageContext } from '../features/notes/context/DirectoryPageContext';
import { toast } from '../hooks/use-toast';
import { DirectorySidebar } from './notes-directory/components/DirectorySidebar';
import { TrashHeader } from './notes-directory/components/TrashHeader';
import {
  MobileSidebarDrawer,
  MobileFilterBar,
  NotesMainContent,
  FloatingPagination,
  type MobileFilterDropdown,
} from '../features/notes/components/directory';
import type { ArchiveFilter, FolderFilter } from './notes-directory/notes-directory.types';

export function NotesDirectoryPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const bulkDeleteMutation = useBulkDeleteNotes();

  // Trash mode state and mutations
  const [isTrashMode, setIsTrashMode] = useState(false);
  const { data: trashData, isLoading: isTrashLoading } = useNotesTrash();
  const restoreMutation = useRestoreNote();
  const permanentDeleteMutation = usePermanentDeleteNote();
  const emptyTrashMutation = useEmptyTrash();

  // View mode
  const directoryViewMode = useBoundStore((state) => state.directoryViewMode);
  const setDirectoryViewMode = useBoundStore((state) => state.setDirectoryViewMode);

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

  // Mobile filter dropdown states
  const [mobileFilterOpen, setMobileFilterOpen] = useState<MobileFilterDropdown>(null);

  // Local UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPagination, setShowPagination] = useState(true);

  // Defer search query updates to keep typing responsive
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const isSearchStale = searchQuery !== deferredSearchQuery;

  // Extract folder and archive filter from global state
  const selectedFolder = filterState.selectedFolder ?? null;
  const archiveFilter = filterState.archiveFilter;

  // Use the filtering hook for client-side filtering logic
  const {
    hasClientSideOnlyFilters,
    serverPageSize,
  } = useNotesFiltering({
    notes: [],
    filterState,
    itemsPerPage,
    currentPage,
    serverTotalCount: 0,
  });

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

  // Use the filtering hook with actual notes data
  const {
    displayedNotes,
    totalItems,
    totalPages,
    availableTags,
  } = useNotesFiltering({
    notes,
    filterState,
    itemsPerPage,
    currentPage,
    serverTotalCount,
  });

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

  // Folder navigation handlers
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

  // Generate empty state description
  const emptyStateDescription = useMemo(() => {
    if (deferredSearchQuery.trim()) {
      return `No notes match "${deferredSearchQuery}" ${searchMode === 'both' ? 'in title or content' : searchMode === 'title' ? 'in title' : 'in content'}.`;
    }
    if (selectedFolder) {
      return `No notes in "${selectedFolder}" folder.`;
    }
    if (archiveFilter === 'archived') {
      return 'No archived notes.';
    }
    return 'No notes match the current filter.';
  }, [deferredSearchQuery, searchMode, selectedFolder, archiveFilter]);

  const containerStyles = {
    backgroundColor: 'transparent',
    height: '100%',
  };

  // Error state
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
      {/* Mobile Sidebar Drawer */}
      {isMobile && (
        <MobileSidebarDrawer
          isOpen={directorySidebarVisible}
          onClose={() => setDirectorySidebarVisible(false)}
        >
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
        </MobileSidebarDrawer>
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
        {/* Mobile Filter Bar */}
        {isMobile && (
          <MobileFilterBar
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            searchMode={searchMode}
            onToggleSearchMode={toggleSearchMode}
            filterState={filterState}
            onFilterStateChange={setFilterState}
            viewMode={directoryViewMode}
            onViewModeChange={setDirectoryViewMode}
            availableTags={availableTags}
            openDropdown={mobileFilterOpen}
            onDropdownChange={setMobileFilterOpen}
            hasNotes={folderStats.all > 0}
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
        <NotesMainContent
          isLoading={isLoading}
          isSearchStale={isSearchStale}
          isFetching={isFetching}
          isTrashMode={isTrashMode}
          isTrashLoading={isTrashLoading}
          displayedNotes={displayedNotes}
          trashData={trashData}
          viewMode={directoryViewMode}
          isBulkMode={isBulkMode}
          selectedNoteIds={selectedNoteIds}
          onNoteSelect={handleNoteSelect}
          onRestoreNote={(noteId) => { restoreMutation.mutate(noteId); }}
          isRestorePending={restoreMutation.isPending}
          onPermanentDelete={(noteId) => { permanentDeleteMutation.mutate(noteId); }}
          isPermanentDeletePending={permanentDeleteMutation.isPending}
          emptyStateDescription={emptyStateDescription}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          scrollableRef={scrollableRef}
        />
      </div>

      {/* Floating Pagination - desktop only, hidden when any mobile sidebar is open */}
      {!isMobileMenuOpen && !(isMobile && directorySidebarVisible) && (
        <FloatingPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          isVisible={showPagination}
          isBulkMode={isBulkMode}
        />
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
