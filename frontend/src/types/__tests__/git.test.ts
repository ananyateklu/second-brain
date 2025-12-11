/**
 * Git Types Tests
 * Unit tests for Git type utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  getStatusDescription,
  getStatusColor,
  getStatusBgColor,
  getDisplayStatus,
  type GitFileStatus,
  type GitStatus,
  type GitFileChange,
  type GitBranch,
  type GitLogEntry,
  type GitDiffResult,
} from '../git';

describe('Git Types', () => {
  // ============================================
  // getStatusDescription Tests
  // ============================================
  describe('getStatusDescription', () => {
    it('should return "Modified" for status M', () => {
      expect(getStatusDescription('M')).toBe('Modified');
    });

    it('should return "Added" for status A', () => {
      expect(getStatusDescription('A')).toBe('Added');
    });

    it('should return "Deleted" for status D', () => {
      expect(getStatusDescription('D')).toBe('Deleted');
    });

    it('should return "Renamed" for status R', () => {
      expect(getStatusDescription('R')).toBe('Renamed');
    });

    it('should return "Copied" for status C', () => {
      expect(getStatusDescription('C')).toBe('Copied');
    });

    it('should return "Untracked" for status ?', () => {
      expect(getStatusDescription('?')).toBe('Untracked');
    });

    it('should return "Unmerged" for status U', () => {
      expect(getStatusDescription('U')).toBe('Unmerged');
    });

    it('should return "Unknown" for unrecognized status', () => {
      expect(getStatusDescription('X' as GitFileStatus)).toBe('Unknown');
    });
  });

  // ============================================
  // getStatusColor Tests
  // ============================================
  describe('getStatusColor', () => {
    it('should return yellow color for Modified', () => {
      expect(getStatusColor('M')).toBe('text-yellow-500');
    });

    it('should return green color for Added', () => {
      expect(getStatusColor('A')).toBe('text-green-500');
    });

    it('should return red color for Deleted', () => {
      expect(getStatusColor('D')).toBe('text-red-500');
    });

    it('should return blue color for Renamed', () => {
      expect(getStatusColor('R')).toBe('text-blue-500');
    });

    it('should return blue color for Copied', () => {
      expect(getStatusColor('C')).toBe('text-blue-500');
    });

    it('should return green color for Untracked (like VS Code)', () => {
      expect(getStatusColor('?')).toBe('text-green-500');
    });

    it('should return orange color for Unmerged', () => {
      expect(getStatusColor('U')).toBe('text-orange-500');
    });

    it('should return gray color for unknown status', () => {
      expect(getStatusColor('X' as GitFileStatus)).toBe('text-gray-500');
    });
  });

  // ============================================
  // getStatusBgColor Tests
  // ============================================
  describe('getStatusBgColor', () => {
    it('should return yellow background for Modified', () => {
      expect(getStatusBgColor('M')).toBe('bg-yellow-500/20');
    });

    it('should return green background for Added', () => {
      expect(getStatusBgColor('A')).toBe('bg-green-500/20');
    });

    it('should return red background for Deleted', () => {
      expect(getStatusBgColor('D')).toBe('bg-red-500/20');
    });

    it('should return blue background for Renamed', () => {
      expect(getStatusBgColor('R')).toBe('bg-blue-500/20');
    });

    it('should return blue background for Copied', () => {
      expect(getStatusBgColor('C')).toBe('bg-blue-500/20');
    });

    it('should return green background for Untracked (like VS Code)', () => {
      expect(getStatusBgColor('?')).toBe('bg-green-500/20');
    });

    it('should return orange background for Unmerged', () => {
      expect(getStatusBgColor('U')).toBe('bg-orange-500/20');
    });

    it('should return gray background for unknown status', () => {
      expect(getStatusBgColor('X' as GitFileStatus)).toBe('bg-gray-500/20');
    });
  });

  // ============================================
  // getDisplayStatus Tests
  // ============================================
  describe('getDisplayStatus', () => {
    it('should return "U" for untracked files (? -> U like VS Code)', () => {
      expect(getDisplayStatus('?')).toBe('U');
    });

    it('should return the same status for non-untracked files', () => {
      expect(getDisplayStatus('M')).toBe('M');
      expect(getDisplayStatus('A')).toBe('A');
      expect(getDisplayStatus('D')).toBe('D');
      expect(getDisplayStatus('R')).toBe('R');
      expect(getDisplayStatus('C')).toBe('C');
      expect(getDisplayStatus('U')).toBe('U');
    });
  });

  // ============================================
  // Type Interface Tests (compile-time + runtime shape)
  // ============================================
  describe('Type Interfaces', () => {
    describe('GitStatus', () => {
      it('should have correct shape', () => {
        const status: GitStatus = {
          branch: 'main',
          hasRemote: true,
          remoteName: 'origin',
          ahead: 2,
          behind: 1,
          stagedChanges: [],
          unstagedChanges: [],
          untrackedFiles: [],
          hasChanges: false,
          hasStagedChanges: false,
          totalChanges: 0,
        };

        expect(status.branch).toBe('main');
        expect(status.hasRemote).toBe(true);
        expect(status.remoteName).toBe('origin');
        expect(status.ahead).toBe(2);
        expect(status.behind).toBe(1);
        expect(status.stagedChanges).toEqual([]);
        expect(status.unstagedChanges).toEqual([]);
        expect(status.untrackedFiles).toEqual([]);
      });

      it('should correctly represent repository with changes', () => {
        const stagedFile: GitFileChange = {
          filePath: 'src/app.ts',
          status: 'M',
          statusDescription: 'Modified',
        };
        const untrackedFile: GitFileChange = {
          filePath: 'new-file.ts',
          status: '?',
          statusDescription: 'Untracked',
        };

        const status: GitStatus = {
          branch: 'feature/test',
          hasRemote: true,
          remoteName: 'origin',
          ahead: 0,
          behind: 0,
          stagedChanges: [stagedFile],
          unstagedChanges: [],
          untrackedFiles: [untrackedFile],
          hasChanges: true,
          hasStagedChanges: true,
          totalChanges: 2,
        };

        expect(status.hasChanges).toBe(true);
        expect(status.hasStagedChanges).toBe(true);
        expect(status.totalChanges).toBe(2);
        expect(status.stagedChanges).toHaveLength(1);
        expect(status.untrackedFiles).toHaveLength(1);
      });
    });

    describe('GitFileChange', () => {
      it('should represent a modified file', () => {
        const change: GitFileChange = {
          filePath: 'src/index.ts',
          status: 'M',
          statusDescription: 'Modified',
        };

        expect(change.filePath).toBe('src/index.ts');
        expect(change.status).toBe('M');
        expect(change.statusDescription).toBe('Modified');
        expect(change.oldPath).toBeUndefined();
      });

      it('should represent a renamed file with oldPath', () => {
        const change: GitFileChange = {
          filePath: 'src/new-name.ts',
          status: 'R',
          statusDescription: 'Renamed',
          oldPath: 'src/old-name.ts',
        };

        expect(change.oldPath).toBe('src/old-name.ts');
        expect(change.status).toBe('R');
      });
    });

    describe('GitBranch', () => {
      it('should represent a local branch', () => {
        const branch: GitBranch = {
          name: 'feature/new-feature',
          isCurrent: true,
          isRemote: false,
          upstream: 'origin/feature/new-feature',
          lastCommitHash: 'abc1234',
          lastCommitMessage: 'Add new feature',
        };

        expect(branch.isCurrent).toBe(true);
        expect(branch.isRemote).toBe(false);
        expect(branch.upstream).toBe('origin/feature/new-feature');
      });

      it('should represent a remote branch', () => {
        const branch: GitBranch = {
          name: 'origin/main',
          isCurrent: false,
          isRemote: true,
          remoteName: 'origin',
        };

        expect(branch.isRemote).toBe(true);
        expect(branch.remoteName).toBe('origin');
        expect(branch.isCurrent).toBe(false);
      });
    });

    describe('GitLogEntry', () => {
      it('should represent a commit', () => {
        const entry: GitLogEntry = {
          hash: 'abc123def456789012345678901234567890abcd',
          shortHash: 'abc123d',
          message: 'Add new feature',
          author: 'John Doe',
          authorEmail: 'john@example.com',
          date: '2024-01-15T10:30:00Z',
        };

        expect(entry.hash).toHaveLength(40);
        expect(entry.shortHash).toHaveLength(7);
        expect(entry.message).toBe('Add new feature');
        expect(entry.author).toBe('John Doe');
        expect(entry.authorEmail).toBe('john@example.com');
      });
    });

    describe('GitDiffResult', () => {
      it('should represent a diff with additions and deletions', () => {
        const diff: GitDiffResult = {
          filePath: 'src/app.ts',
          diff: '+new line\n-old line\n context',
          additions: 5,
          deletions: 2,
        };

        expect(diff.filePath).toBe('src/app.ts');
        expect(diff.additions).toBe(5);
        expect(diff.deletions).toBe(2);
        expect(diff.diff).toContain('+new line');
      });

      it('should represent an empty diff', () => {
        const diff: GitDiffResult = {
          filePath: 'unchanged.ts',
          diff: '',
          additions: 0,
          deletions: 0,
        };

        expect(diff.diff).toBe('');
        expect(diff.additions).toBe(0);
        expect(diff.deletions).toBe(0);
      });
    });
  });
});
