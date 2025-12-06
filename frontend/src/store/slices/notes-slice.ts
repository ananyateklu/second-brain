/**
 * Notes Slice
 * Manages notes filter state and bulk mode
 */

import type { NotesSlice, SliceCreator, NotesFilterState } from '../types';

const initialFilterState: NotesFilterState = {
    dateFilter: 'all',
    selectedTags: [],
    sortBy: 'newest',
    archiveFilter: 'all',
    selectedFolder: null,
};

export const createNotesSlice: SliceCreator<NotesSlice> = (set) => ({
    filterState: initialFilterState,
    isBulkMode: false,

    setFilterState: (filterState: NotesFilterState) => set({ filterState }),

    setBulkMode: (isBulkMode: boolean) => set({ isBulkMode }),

    toggleBulkMode: () => set((state) => ({ isBulkMode: !state.isBulkMode })),

    resetFilters: () => set({ filterState: initialFilterState }),
});

