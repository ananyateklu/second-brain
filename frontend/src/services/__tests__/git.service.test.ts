/**
 * Git Service Tests
 * Unit tests for Git service URL building and method signatures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gitService } from '../git.service';
import { apiClient } from '../../lib/api-client';
import { API_ENDPOINTS } from '../../lib/constants';
import type {
  GitStatus,
  GitDiffResult,
  GitLogEntry,
  GitBranch,
  GitOperationResult,
  GitCommitResult,
} from '../../types/git';

// Mock the apiClient
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('gitService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // validateRepository Tests
  // ============================================
  describe('validateRepository', () => {
    it('should call apiClient.get with correct URL', async () => {
      // Arrange
      const repoPath = '/path/to/repo';
      vi.mocked(apiClient.get).mockResolvedValue(true);

      // Act
      await gitService.validateRepository(repoPath);

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining(API_ENDPOINTS.GIT.VALIDATE)
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining(`repoPath=${encodeURIComponent(repoPath)}`)
      );
    });

    it('should return true for valid repository', async () => {
      // Arrange
      vi.mocked(apiClient.get).mockResolvedValue(true);

      // Act
      const result = await gitService.validateRepository('/valid/repo');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for invalid repository', async () => {
      // Arrange
      vi.mocked(apiClient.get).mockResolvedValue(false);

      // Act
      const result = await gitService.validateRepository('/invalid/repo');

      // Assert
      expect(result).toBe(false);
    });
  });

  // ============================================
  // getStatus Tests
  // ============================================
  describe('getStatus', () => {
    it('should call apiClient.get with correct URL', async () => {
      // Arrange
      const repoPath = '/path/to/repo';
      const mockStatus: GitStatus = {
        branch: 'main',
        hasRemote: true,
        remoteName: 'origin',
        ahead: 0,
        behind: 0,
        stagedChanges: [],
        unstagedChanges: [],
        untrackedFiles: [],
        hasChanges: false,
        hasStagedChanges: false,
        totalChanges: 0,
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockStatus);

      // Act
      await gitService.getStatus(repoPath);

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining(API_ENDPOINTS.GIT.STATUS)
      );
    });

    it('should return GitStatus object', async () => {
      // Arrange
      const mockStatus: GitStatus = {
        branch: 'feature/test',
        hasRemote: true,
        remoteName: 'origin',
        ahead: 2,
        behind: 1,
        stagedChanges: [{ filePath: 'test.ts', status: 'M', statusDescription: 'Modified' }],
        unstagedChanges: [],
        untrackedFiles: [],
        hasChanges: true,
        hasStagedChanges: true,
        totalChanges: 1,
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockStatus);

      // Act
      const result = await gitService.getStatus('/repo');

      // Assert
      expect(result.branch).toBe('feature/test');
      expect(result.ahead).toBe(2);
      expect(result.behind).toBe(1);
      expect(result.stagedChanges).toHaveLength(1);
    });
  });

  // ============================================
  // getDiff Tests
  // ============================================
  describe('getDiff', () => {
    it('should call apiClient.get with correct URL including filePath and staged', async () => {
      // Arrange
      const repoPath = '/path/to/repo';
      const filePath = 'src/app.ts';
      const mockDiff: GitDiffResult = {
        filePath,
        diff: '+new line',
        additions: 1,
        deletions: 0,
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockDiff);

      // Act
      await gitService.getDiff(repoPath, filePath, true);

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('staged=true')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining(`filePath=${encodeURIComponent(filePath)}`)
      );
    });

    it('should default staged to false', async () => {
      // Arrange
      vi.mocked(apiClient.get).mockResolvedValue({
        filePath: 'test.ts',
        diff: '',
        additions: 0,
        deletions: 0,
      });

      // Act
      await gitService.getDiff('/repo', 'test.ts');

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('staged=false')
      );
    });
  });

  // ============================================
  // stageFiles Tests
  // ============================================
  describe('stageFiles', () => {
    it('should call apiClient.post with correct endpoint and request body', async () => {
      // Arrange
      const request = { repoPath: '/repo', files: ['file1.ts', 'file2.ts'] };
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      // Act
      await gitService.stageFiles(request);

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.GIT.STAGE,
        request
      );
    });

    it('should return success response', async () => {
      // Arrange
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      // Act
      const result = await gitService.stageFiles({ repoPath: '/repo', files: ['test.ts'] });

      // Assert
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // stageAll Tests
  // ============================================
  describe('stageAll', () => {
    it('should call stageFiles with "." to stage all', async () => {
      // Arrange
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      // Act
      await gitService.stageAll('/repo');

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.GIT.STAGE,
        { repoPath: '/repo', files: ['.'] }
      );
    });
  });

  // ============================================
  // unstageFiles Tests
  // ============================================
  describe('unstageFiles', () => {
    it('should call apiClient.post with correct endpoint and request body', async () => {
      // Arrange
      const request = { repoPath: '/repo', files: ['file1.ts'] };
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      // Act
      await gitService.unstageFiles(request);

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.GIT.UNSTAGE,
        request
      );
    });
  });

  // ============================================
  // unstageAll Tests
  // ============================================
  describe('unstageAll', () => {
    it('should call unstageFiles with "." to unstage all', async () => {
      // Arrange
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      // Act
      await gitService.unstageAll('/repo');

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.GIT.UNSTAGE,
        { repoPath: '/repo', files: ['.'] }
      );
    });
  });

  // ============================================
  // commit Tests
  // ============================================
  describe('commit', () => {
    it('should call apiClient.post with correct endpoint and request body', async () => {
      // Arrange
      const request = { repoPath: '/repo', message: 'Initial commit' };
      const mockResult: GitCommitResult = { success: true, commitHash: 'abc1234' };
      vi.mocked(apiClient.post).mockResolvedValue(mockResult);

      // Act
      await gitService.commit(request);

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.GIT.COMMIT,
        request
      );
    });

    it('should return commit result with hash', async () => {
      // Arrange
      const mockResult: GitCommitResult = { success: true, commitHash: 'abc1234567890' };
      vi.mocked(apiClient.post).mockResolvedValue(mockResult);

      // Act
      const result = await gitService.commit({ repoPath: '/repo', message: 'Test' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.commitHash).toBe('abc1234567890');
    });
  });

  // ============================================
  // push Tests
  // ============================================
  describe('push', () => {
    it('should call apiClient.post with correct endpoint and request body', async () => {
      // Arrange
      const request = { repoPath: '/repo', remote: 'origin', branch: 'main' };
      const mockResult: GitOperationResult = { success: true, message: 'Pushed successfully' };
      vi.mocked(apiClient.post).mockResolvedValue(mockResult);

      // Act
      await gitService.push(request);

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.GIT.PUSH,
        request
      );
    });

    it('should handle push failure', async () => {
      // Arrange
      const mockResult: GitOperationResult = {
        success: false,
        message: '',
        error: 'Authentication failed',
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResult);

      // Act
      const result = await gitService.push({ repoPath: '/repo' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });
  });

  // ============================================
  // pull Tests
  // ============================================
  describe('pull', () => {
    it('should call apiClient.post with correct endpoint and request body', async () => {
      // Arrange
      const request = { repoPath: '/repo' };
      const mockResult: GitOperationResult = { success: true, message: 'Already up to date' };
      vi.mocked(apiClient.post).mockResolvedValue(mockResult);

      // Act
      await gitService.pull(request);

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.GIT.PULL,
        request
      );
    });
  });

  // ============================================
  // getLog Tests
  // ============================================
  describe('getLog', () => {
    it('should call apiClient.get with correct URL including count', async () => {
      // Arrange
      const mockLog: GitLogEntry[] = [
        {
          hash: 'abc123',
          shortHash: 'abc123',
          message: 'Test commit',
          author: 'Test User',
          authorEmail: 'test@example.com',
          date: '2024-01-15T10:00:00Z',
        },
      ];
      vi.mocked(apiClient.get).mockResolvedValue(mockLog);

      // Act
      await gitService.getLog('/repo', 50);

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('count=50')
      );
    });

    it('should default count to 20', async () => {
      // Arrange
      vi.mocked(apiClient.get).mockResolvedValue([]);

      // Act
      await gitService.getLog('/repo');

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('count=20')
      );
    });
  });

  // ============================================
  // discardChanges Tests
  // ============================================
  describe('discardChanges', () => {
    it('should call apiClient.post with correct endpoint and request body', async () => {
      // Arrange
      const request = { repoPath: '/repo', filePath: 'test.ts' };
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      // Act
      await gitService.discardChanges(request);

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.GIT.DISCARD,
        request
      );
    });
  });

  // ============================================
  // getBranches Tests
  // ============================================
  describe('getBranches', () => {
    it('should call apiClient.get with includeRemote parameter', async () => {
      // Arrange
      const mockBranches: GitBranch[] = [
        { name: 'main', isCurrent: true, isRemote: false },
        { name: 'origin/main', isCurrent: false, isRemote: true, remoteName: 'origin' },
      ];
      vi.mocked(apiClient.get).mockResolvedValue(mockBranches);

      // Act
      await gitService.getBranches('/repo', true);

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('includeRemote=true')
      );
    });

    it('should default includeRemote to true', async () => {
      // Arrange
      vi.mocked(apiClient.get).mockResolvedValue([]);

      // Act
      await gitService.getBranches('/repo');

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('includeRemote=true')
      );
    });

    it('should handle includeRemote=false', async () => {
      // Arrange
      vi.mocked(apiClient.get).mockResolvedValue([]);

      // Act
      await gitService.getBranches('/repo', false);

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('includeRemote=false')
      );
    });
  });

  // ============================================
  // switchBranch Tests
  // ============================================
  describe('switchBranch', () => {
    it('should call apiClient.post with correct endpoint and request body', async () => {
      // Arrange
      const request = { repoPath: '/repo', branchName: 'feature/test' };
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      // Act
      await gitService.switchBranch(request);

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.GIT.BRANCH_SWITCH,
        request
      );
    });
  });

  // ============================================
  // createBranch Tests
  // ============================================
  describe('createBranch', () => {
    it('should call apiClient.post with correct endpoint and request body', async () => {
      // Arrange
      const request = {
        repoPath: '/repo',
        branchName: 'feature/new',
        switchToNewBranch: true,
        baseBranch: 'main',
      };
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      // Act
      await gitService.createBranch(request);

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.GIT.BRANCH_CREATE,
        request
      );
    });
  });

  // ============================================
  // deleteBranch Tests
  // ============================================
  describe('deleteBranch', () => {
    it('should call apiClient.post with correct endpoint and request body', async () => {
      // Arrange
      const request = { repoPath: '/repo', branchName: 'old-branch', force: false };
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      // Act
      await gitService.deleteBranch(request);

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.GIT.BRANCH_DELETE,
        request
      );
    });

    it('should handle force delete', async () => {
      // Arrange
      const request = { repoPath: '/repo', branchName: 'unmerged-branch', force: true };
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      // Act
      await gitService.deleteBranch(request);

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.GIT.BRANCH_DELETE,
        expect.objectContaining({ force: true })
      );
    });
  });

  // ============================================
  // mergeBranch Tests
  // ============================================
  describe('mergeBranch', () => {
    it('should call apiClient.post with correct endpoint and request body', async () => {
      // Arrange
      const request = { repoPath: '/repo', branchName: 'feature/test', message: 'Merge feature' };
      const mockResult: GitOperationResult = { success: true, message: 'Merge successful' };
      vi.mocked(apiClient.post).mockResolvedValue(mockResult);

      // Act
      await gitService.mergeBranch(request);

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.GIT.BRANCH_MERGE,
        request
      );
    });

    it('should handle merge conflicts', async () => {
      // Arrange
      const mockResult: GitOperationResult = {
        success: false,
        message: 'CONFLICT detected',
        error: 'Merge conflicts detected. Please resolve conflicts manually.',
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResult);

      // Act
      const result = await gitService.mergeBranch({ repoPath: '/repo', branchName: 'conflicting' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('conflicts');
    });
  });

  // ============================================
  // publishBranch Tests
  // ============================================
  describe('publishBranch', () => {
    it('should call apiClient.post with correct endpoint and request body', async () => {
      // Arrange
      const request = { repoPath: '/repo', branchName: 'feature/new', remote: 'origin' };
      const mockResult: GitOperationResult = { success: true, message: 'Branch published' };
      vi.mocked(apiClient.post).mockResolvedValue(mockResult);

      // Act
      await gitService.publishBranch(request);

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.GIT.BRANCH_PUBLISH,
        request
      );
    });
  });
});
