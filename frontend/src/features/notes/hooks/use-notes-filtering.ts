/**
 * useNotesFiltering Hook
 * Handles client-side filtering, sorting, and pagination of notes
 */

import { useMemo } from 'react';
import {
  startOfDay,
  subDays,
  parse,
  endOfDay,
  parseISO,
  isWithinInterval,
  isBefore,
} from 'date-fns';
import type { NoteListItem } from '../../../types/notes';
import type { NotesFilterState } from '../../../store/types';

// ============================================
// Types
// ============================================

export interface DateBoundaries {
  today: Date;
  yesterday: Date;
  sevenDaysAgo: Date;
  thirtyDaysAgo: Date;
  ninetyDaysAgo: Date;
  todayTime: number;
  yesterdayTime: number;
}

export interface UseNotesFilteringOptions {
  /** Notes to filter */
  notes: NoteListItem[];
  /** Current filter state */
  filterState: NotesFilterState;
  /** Number of items per page */
  itemsPerPage: number;
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Server total count (for non-filtered results) */
  serverTotalCount: number;
}

export interface UseNotesFilteringResult {
  /** Notes after client-side filtering and sorting */
  filteredNotes: NoteListItem[];
  /** Notes for current page */
  displayedNotes: NoteListItem[];
  /** Whether client-side-only filters are active */
  hasClientSideOnlyFilters: boolean;
  /** Total items (filtered count or server count) */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Date boundaries for filtering (null when not needed) */
  dateBoundaries: DateBoundaries | null;
  /** Available tags from all notes */
  availableTags: string[];
  /** Server page size (adjusted for client-side filtering) */
  serverPageSize: number;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Creates date boundaries for filtering
 * Cached to avoid recreating Date objects on every render
 */
export const getDateBoundaries = (): DateBoundaries => {
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

/**
 * Applies date filter to a single note
 */
export const applyDateFilter = (
  note: NoteListItem,
  dateFilter: string,
  boundaries: DateBoundaries,
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

/**
 * Sorts notes by the given sort option
 */
const sortNotes = (notes: NoteListItem[], sortBy: string): NoteListItem[] => {
  const sorted = [...notes];
  sorted.sort((a, b) => {
    switch (sortBy) {
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
};

// ============================================
// Main Hook
// ============================================

export function useNotesFiltering({
  notes,
  filterState,
  itemsPerPage,
  currentPage,
  serverTotalCount,
}: UseNotesFilteringOptions): UseNotesFilteringResult {
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

  // Memoize date boundaries - only recalculate when date filter changes
  const dateBoundaries = useMemo(() => {
    if (filterState.dateFilter === 'all') return null;
    return getDateBoundaries();
  }, [filterState.dateFilter]);

  // Extract available tags from notes
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      note.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Apply client-side filters (date, tags, archived-only) and sorting
  const filteredNotes = useMemo(() => {
    if (!notes.length) return [];

    const hasDateFilter = filterState.dateFilter !== 'all';
    const hasTagFilter = filterState.selectedTags.length > 0;
    const hasArchivedOnlyFilter = filterState.archiveFilter === 'archived';

    // If no client-side filters needed, just sort
    if (!hasDateFilter && !hasTagFilter && !hasArchivedOnlyFilter) {
      return sortNotes(notes, filterState.sortBy);
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
    return sortNotes(filtered, filterState.sortBy);
  }, [notes, filterState, dateBoundaries]);

  // Calculate pagination
  const totalItems = hasClientSideOnlyFilters ? filteredNotes.length : serverTotalCount;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Get notes for current page
  const displayedNotes = useMemo(() => {
    if (hasClientSideOnlyFilters) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return filteredNotes.slice(startIndex, endIndex);
    }
    return filteredNotes;
  }, [hasClientSideOnlyFilters, filteredNotes, currentPage, itemsPerPage]);

  return {
    filteredNotes,
    displayedNotes,
    hasClientSideOnlyFilters,
    totalItems,
    totalPages,
    dateBoundaries,
    availableTags,
    serverPageSize,
  };
}
