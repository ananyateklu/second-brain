/**
 * Git Slice Tests
 * Unit tests for Git integration store slice
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGitSlice } from '../git-slice';
import type { GitSlice } from '../git-slice';
import type { BoundStore } from '../../types';

describe('gitSlice', () => {
  let state: Partial<BoundStore>;
  let slice: GitSlice;

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
    slice = createGitSlice(mockSet, mockGet, {});
    Object.assign(state, slice);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('initial state', () => {
    it('should have null repository path', () => {
      expect(slice.repositoryPath).toBeNull();
    });

    it('should have empty selected files', () => {
      expect(slice.selectedFiles).toEqual([]);
    });

    it('should have null selected diff file', () => {
      expect(slice.selectedDiffFile).toBeNull();
    });

    it('should have viewingStagedDiff false', () => {
      expect(slice.viewingStagedDiff).toBe(false);
    });

    it('should have empty pending files sets', () => {
      expect(slice.pendingStagingFiles.size).toBe(0);
      expect(slice.pendingUnstagingFiles.size).toBe(0);
    });
  });

  // ============================================
  // setRepositoryPath Tests
  // ============================================
  describe('setRepositoryPath', () => {
    it('should set repository path', () => {
      slice.setRepositoryPath('/path/to/repo');

      expect(mockSet).toHaveBeenCalledWith({
        repositoryPath: '/path/to/repo',
        selectedFiles: [],
        selectedDiffFile: null,
        pendingStagingFiles: expect.any(Set),
        pendingUnstagingFiles: expect.any(Set),
      });
    });

    it('should clear selection when changing repos', () => {
      state.selectedFiles = ['file1.ts', 'file2.ts'];
      state.selectedDiffFile = 'file1.ts';

      slice.setRepositoryPath('/new/repo');

      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        selectedFiles: [],
        selectedDiffFile: null,
      }));
    });

    it('should set to null', () => {
      slice.setRepositoryPath(null);

      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        repositoryPath: null,
      }));
    });
  });

  // ============================================
  // toggleFileSelection Tests
  // ============================================
  describe('toggleFileSelection', () => {
    it('should add file to selection', () => {
      state.selectedFiles = [];

      slice.toggleFileSelection('file1.ts');

      expect(state.selectedFiles).toContain('file1.ts');
    });

    it('should remove file from selection', () => {
      state.selectedFiles = ['file1.ts', 'file2.ts'];

      slice.toggleFileSelection('file1.ts');

      expect(state.selectedFiles).not.toContain('file1.ts');
      expect(state.selectedFiles).toContain('file2.ts');
    });
  });

  // ============================================
  // selectFiles Tests
  // ============================================
  describe('selectFiles', () => {
    it('should set selected files', () => {
      slice.selectFiles(['file1.ts', 'file2.ts']);

      expect(mockSet).toHaveBeenCalledWith({ selectedFiles: ['file1.ts', 'file2.ts'] });
    });

    it('should replace existing selection', () => {
      state.selectedFiles = ['old.ts'];

      slice.selectFiles(['new.ts']);

      expect(mockSet).toHaveBeenCalledWith({ selectedFiles: ['new.ts'] });
    });
  });

  // ============================================
  // selectAllFiles Tests
  // ============================================
  describe('selectAllFiles', () => {
    it('should select all provided files', () => {
      slice.selectAllFiles(['file1.ts', 'file2.ts', 'file3.ts']);

      expect(mockSet).toHaveBeenCalledWith({ selectedFiles: ['file1.ts', 'file2.ts', 'file3.ts'] });
    });

    it('should handle empty array', () => {
      slice.selectAllFiles([]);

      expect(mockSet).toHaveBeenCalledWith({ selectedFiles: [] });
    });
  });

  // ============================================
  // clearSelection Tests
  // ============================================
  describe('clearSelection', () => {
    it('should clear all selected files', () => {
      state.selectedFiles = ['file1.ts', 'file2.ts'];

      slice.clearSelection();

      expect(mockSet).toHaveBeenCalledWith({ selectedFiles: [] });
    });
  });

  // ============================================
  // setSelectedDiffFile Tests
  // ============================================
  describe('setSelectedDiffFile', () => {
    it('should set selected diff file', () => {
      slice.setSelectedDiffFile('file.ts');

      expect(mockSet).toHaveBeenCalledWith({
        selectedDiffFile: 'file.ts',
        viewingStagedDiff: false,
      });
    });

    it('should set staged diff flag', () => {
      slice.setSelectedDiffFile('file.ts', true);

      expect(mockSet).toHaveBeenCalledWith({
        selectedDiffFile: 'file.ts',
        viewingStagedDiff: true,
      });
    });

    it('should set to null', () => {
      slice.setSelectedDiffFile(null);

      expect(mockSet).toHaveBeenCalledWith({
        selectedDiffFile: null,
        viewingStagedDiff: false,
      });
    });
  });

  // ============================================
  // clearDiffView Tests
  // ============================================
  describe('clearDiffView', () => {
    it('should clear diff view', () => {
      state.selectedDiffFile = 'file.ts';
      state.viewingStagedDiff = true;

      slice.clearDiffView();

      expect(mockSet).toHaveBeenCalledWith({
        selectedDiffFile: null,
        viewingStagedDiff: false,
      });
    });
  });

  // ============================================
  // setPendingStagingFiles Tests
  // ============================================
  describe('setPendingStagingFiles', () => {
    it('should set pending staging files', () => {
      slice.setPendingStagingFiles(['file1.ts', 'file2.ts']);

      const setCall = mockSet.mock.calls[0][0] as { pendingStagingFiles: Set<string> };
      expect(setCall.pendingStagingFiles).toBeInstanceOf(Set);
      expect(setCall.pendingStagingFiles.size).toBe(2);
    });
  });

  // ============================================
  // setPendingUnstagingFiles Tests
  // ============================================
  describe('setPendingUnstagingFiles', () => {
    it('should set pending unstaging files', () => {
      slice.setPendingUnstagingFiles(['file1.ts']);

      const setCall = mockSet.mock.calls[0][0] as { pendingUnstagingFiles: Set<string> };
      expect(setCall.pendingUnstagingFiles).toBeInstanceOf(Set);
      expect(setCall.pendingUnstagingFiles.size).toBe(1);
    });
  });

  // ============================================
  // clearPendingFiles Tests
  // ============================================
  describe('clearPendingFiles', () => {
    it('should clear all pending files', () => {
      slice.clearPendingFiles();

      const setCall = mockSet.mock.calls[0][0] as {
        pendingStagingFiles: Set<string>;
        pendingUnstagingFiles: Set<string>;
      };
      expect(setCall.pendingStagingFiles.size).toBe(0);
      expect(setCall.pendingUnstagingFiles.size).toBe(0);
    });
  });
});
