/**
 * Notes Slice Tests
 * Unit tests for notes filter store slice
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNotesSlice } from '../notes-slice';
import type { NotesSlice, BoundStore, NotesFilterState } from '../../types';

describe('notesSlice', () => {
  let state: Partial<BoundStore>;
  let slice: NotesSlice;

  const mockSet = vi.fn((partial: Partial<BoundStore> | ((state: BoundStore) => Partial<BoundStore>)) => {
    if (typeof partial === 'function') {
      const newState = partial(state as BoundStore);
      Object.assign(state, newState);
    } else {
      Object.assign(state, partial);
    }
  });

  const mockGet = vi.fn(() => state as BoundStore);

  beforeEach(() => {
    vi.clearAllMocks();

    state = {};
    // @ts-expect-error - Partial store mock
    slice = createNotesSlice(mockSet, mockGet, {});
    Object.assign(state, slice);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('initial state', () => {
    it('should have default filter state', () => {
      expect(slice.filterState).toEqual({
        dateFilter: 'all',
        selectedTags: [],
        sortBy: 'newest',
        archiveFilter: 'all',
        selectedFolder: null,
      });
    });

    it('should have bulk mode disabled', () => {
      expect(slice.isBulkMode).toBe(false);
    });
  });

  // ============================================
  // setFilterState Tests
  // ============================================
  describe('setFilterState', () => {
    it('should set filter state', () => {
      const newFilterState: NotesFilterState = {
        dateFilter: 'today',
        selectedTags: ['work', 'important'],
        sortBy: 'oldest',
        archiveFilter: 'archived',
        selectedFolder: 'projects',
      };

      slice.setFilterState(newFilterState);

      expect(mockSet).toHaveBeenCalledWith({ filterState: newFilterState });
    });

    it('should update individual filter properties', () => {
      const newFilterState: NotesFilterState = {
        dateFilter: 'last7days',
        selectedTags: [],
        sortBy: 'title-asc',
        archiveFilter: 'not-archived',
        selectedFolder: null,
      };

      slice.setFilterState(newFilterState);

      expect(mockSet).toHaveBeenCalledWith({ filterState: newFilterState });
    });

    it('should handle custom date range', () => {
      const newFilterState: NotesFilterState = {
        dateFilter: 'custom',
        customDateStart: '2024-01-01',
        customDateEnd: '2024-01-31',
        selectedTags: [],
        sortBy: 'newest',
        archiveFilter: 'all',
        selectedFolder: null,
      };

      slice.setFilterState(newFilterState);

      expect(mockSet).toHaveBeenCalledWith({ filterState: newFilterState });
    });
  });

  // ============================================
  // setBulkMode Tests
  // ============================================
  describe('setBulkMode', () => {
    it('should set bulk mode to true', () => {
      slice.setBulkMode(true);

      expect(mockSet).toHaveBeenCalledWith({ isBulkMode: true });
    });

    it('should set bulk mode to false', () => {
      slice.setBulkMode(false);

      expect(mockSet).toHaveBeenCalledWith({ isBulkMode: false });
    });
  });

  // ============================================
  // toggleBulkMode Tests
  // ============================================
  describe('toggleBulkMode', () => {
    it('should toggle from false to true', () => {
      state.isBulkMode = false;

      slice.toggleBulkMode();

      expect(state.isBulkMode).toBe(true);
    });

    it('should toggle from true to false', () => {
      state.isBulkMode = true;

      slice.toggleBulkMode();

      expect(state.isBulkMode).toBe(false);
    });
  });

  // ============================================
  // resetFilters Tests
  // ============================================
  describe('resetFilters', () => {
    it('should reset to initial filter state', () => {
      state.filterState = {
        dateFilter: 'today',
        selectedTags: ['work'],
        sortBy: 'oldest',
        archiveFilter: 'archived',
        selectedFolder: 'projects',
      };

      slice.resetFilters();

      expect(mockSet).toHaveBeenCalledWith({
        filterState: {
          dateFilter: 'all',
          selectedTags: [],
          sortBy: 'newest',
          archiveFilter: 'all',
          selectedFolder: null,
        },
      });
    });
  });
});
