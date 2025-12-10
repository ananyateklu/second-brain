/**
 * Git Slice
 * State management for Git integration
 */

import type { SliceCreator } from '../types';

// ============================================
// Git Types
// ============================================

export interface GitSliceState {
  /** The configured repository path */
  repositoryPath: string | null;
  /** Selected files for staging/unstaging operations */
  selectedFiles: string[];
  /** The currently selected file for diff viewing */
  selectedDiffFile: string | null;
  /** Whether viewing staged or unstaged diff */
  viewingStagedDiff: boolean;
}

export interface GitSliceActions {
  /** Set the repository path */
  setRepositoryPath: (path: string | null) => void;
  /** Toggle file selection */
  toggleFileSelection: (filePath: string) => void;
  /** Select multiple files */
  selectFiles: (filePaths: string[]) => void;
  /** Select all provided files */
  selectAllFiles: (filePaths: string[]) => void;
  /** Clear all file selections */
  clearSelection: () => void;
  /** Set the file to view diff for */
  setSelectedDiffFile: (filePath: string | null, staged?: boolean) => void;
  /** Clear the diff view */
  clearDiffView: () => void;
}

export type GitSlice = GitSliceState & GitSliceActions;

// ============================================
// Default State
// ============================================

const defaultGitState: GitSliceState = {
  repositoryPath: null,
  selectedFiles: [],
  selectedDiffFile: null,
  viewingStagedDiff: false,
};

// ============================================
// Slice Creator
// ============================================

export const createGitSlice: SliceCreator<GitSlice> = (set) => ({
  ...defaultGitState,

  setRepositoryPath: (path) => {
    set({
      repositoryPath: path,
      // Clear selection when changing repos
      selectedFiles: [],
      selectedDiffFile: null,
    });
  },

  toggleFileSelection: (filePath) => {
    set((state) => {
      const isSelected = state.selectedFiles.includes(filePath);
      return {
        selectedFiles: isSelected
          ? state.selectedFiles.filter((f) => f !== filePath)
          : [...state.selectedFiles, filePath],
      };
    });
  },

  selectFiles: (filePaths) => {
    set({ selectedFiles: filePaths });
  },

  selectAllFiles: (filePaths) => {
    set({ selectedFiles: [...filePaths] });
  },

  clearSelection: () => {
    set({ selectedFiles: [] });
  },

  setSelectedDiffFile: (filePath, staged = false) => {
    set({
      selectedDiffFile: filePath,
      viewingStagedDiff: staged,
    });
  },

  clearDiffView: () => {
    set({
      selectedDiffFile: null,
      viewingStagedDiff: false,
    });
  },
});
