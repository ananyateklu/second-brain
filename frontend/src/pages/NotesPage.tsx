import { useMemo, useState } from 'react';
import { useNotes } from '../features/notes/hooks/use-notes-query';
import { NoteList } from '../features/notes/components/NoteList';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { useUIStore } from '../store/ui-store';
import { EditNoteModal } from '../features/notes/components/EditNoteModal';
import { Note } from '../features/notes/types/note';
import { NotesFilter, NotesFilterState } from '../features/notes/components/NotesFilter';

// Cache for date calculations to avoid recreating Date objects
const getDateBoundaries = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

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

// Optimized filter function
const applyDateFilter = (
  note: Note,
  dateFilter: string,
  boundaries: ReturnType<typeof getDateBoundaries>,
  customDateStart?: string,
  customDateEnd?: string
): boolean => {
  if (dateFilter === 'all') return true;

  const noteDate = new Date(note.createdAt);
  const noteDateOnly = new Date(noteDate.getFullYear(), noteDate.getMonth(), noteDate.getDate());
  const noteDateOnlyTime = noteDateOnly.getTime();

  switch (dateFilter) {
    case 'today':
      return noteDateOnlyTime === boundaries.todayTime;
    case 'yesterday':
      return noteDateOnlyTime === boundaries.yesterdayTime;
    case 'last7days':
      return noteDate >= boundaries.sevenDaysAgo;
    case 'last30days':
      return noteDate >= boundaries.thirtyDaysAgo;
    case 'last90days':
      return noteDate >= boundaries.ninetyDaysAgo;
    case 'custom':
      if (customDateStart && customDateEnd) {
        const startDate = new Date(customDateStart);
        const endDate = new Date(customDateEnd);
        endDate.setHours(23, 59, 59, 999);
        return noteDate >= startDate && noteDate <= endDate;
      }
      return true;
    default:
      return true;
  }
};

export function NotesPage() {
  const { data: notes, isLoading, error } = useNotes();
  const openCreateModal = useUIStore((state) => state.openCreateModal);
  const searchQuery = useUIStore((state) => state.searchQuery);
  const searchMode = useUIStore((state) => state.searchMode);

  const [filterState, setFilterState] = useState<NotesFilterState>({
    dateFilter: 'all',
    selectedTags: [],
    sortBy: 'newest',
    archiveFilter: 'all',
  });

  // Memoize date boundaries - only recalculate when date filter changes
  const dateBoundaries = useMemo(() => {
    if (filterState.dateFilter === 'all') return null;
    return getDateBoundaries();
  }, [filterState.dateFilter]);

  // Apply all filters and sorting - optimized version
  const filteredNotes = useMemo(() => {
    if (!notes) return [];

    const query = searchQuery.trim().toLowerCase();
    const hasSearchQuery = query.length > 0;
    const hasDateFilter = filterState.dateFilter !== 'all';
    const hasTagFilter = filterState.selectedTags.length > 0;
    const hasArchiveFilter = filterState.archiveFilter !== 'all';

    // Early return if no filters
    if (!hasSearchQuery && !hasDateFilter && !hasTagFilter && !hasArchiveFilter) {
      // Only need to sort
      const sorted = [...notes];
      sorted.sort((a, b) => {
        switch (filterState.sortBy) {
          case 'newest':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'oldest':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'title-asc':
            return a.title.localeCompare(b.title);
          case 'title-desc':
            return b.title.localeCompare(a.title);
          default:
            return 0;
        }
      });
      return sorted;
    }

    // Apply filters
    let filtered = notes.filter((note: Note) => {
      // Search query filter
      if (hasSearchQuery) {
        const titleMatch = note.title.toLowerCase().includes(query);
        const contentMatch = note.content.toLowerCase().includes(query);

        const searchMatches =
          searchMode === 'title' ? titleMatch :
            searchMode === 'content' ? contentMatch :
              titleMatch || contentMatch;

        if (!searchMatches) return false;
      }

      // Date filter
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

      // Tag filter
      if (hasTagFilter) {
        if (!filterState.selectedTags.some(tag => note.tags?.includes(tag))) {
          return false;
        }
      }

      // Archive filter
      if (hasArchiveFilter) {
        const isArchived = filterState.archiveFilter === 'archived';
        if (note.isArchived !== isArchived) {
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
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [notes, searchQuery, searchMode, filterState, dateBoundaries]);

  if (error) {
    return (
      <div
        className="rounded-xl border p-6 text-center shadow-sm"
        style={{
          backgroundColor: 'var(--color-error-light)',
          borderColor: 'var(--color-error-border)',
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <svg className="h-5 w-5" style={{ color: 'var(--color-error-text)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-base font-semibold" style={{ color: 'var(--color-error-text)' }}>
            Error: {error instanceof Error ? error.message : 'Failed to load notes'}
          </p>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-error-text-light)' }}>
          Please check that the backend server is running and accessible
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <LoadingSpinner message="Loading your notes..." />
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <>
        <EmptyState
          icon={
            <svg className="h-8 w-8" style={{ color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          title="No notes yet"
          description="Start capturing your thoughts and ideas by creating your first note!"
          action={
            <Button onClick={openCreateModal} variant="primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Note
            </Button>
          }
        />
      </>
    );
  }

  // Show empty state if filters don't match any notes
  const hasActiveFilters =
    filterState.dateFilter !== 'all' ||
    filterState.selectedTags.length > 0 ||
    filterState.archiveFilter !== 'all' ||
    searchQuery.trim() !== '';

  if (hasActiveFilters && filteredNotes.length === 0) {
    return (
      <>
        {notes && notes.length > 0 && (
          <NotesFilter
            notes={notes}
            filterState={filterState}
            onFilterChange={setFilterState}
          />
        )}
        <EmptyState
          icon={
            <svg className="h-8 w-8" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
          title="No notes found"
          description={
            searchQuery.trim()
              ? `No notes match "${searchQuery}" ${searchMode === 'both' ? 'in title or content' : searchMode === 'title' ? 'in title' : 'in content'}.`
              : 'No notes match the current filters. Try adjusting your filters to see more results.'
          }
        />
        <EditNoteModal />
      </>
    );
  }

  return (
    <>
      {notes && notes.length > 0 && (
        <NotesFilter
          notes={notes}
          filterState={filterState}
          onFilterChange={setFilterState}
        />
      )}
      <div className={notes && notes.length > 0 ? 'pt-10' : ''}>
        <NoteList notes={filteredNotes} />
      </div>
      <EditNoteModal />
    </>
  );
}

