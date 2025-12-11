import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { githubService } from './github.service';
import { apiClient } from '../lib/api-client';
import type {
  GitHubRepositoryInfo,
  GitHubPullRequestsResponse,
  PullRequestSummary,
  GitHubActionsResponse,
  WorkflowRunSummary,
  GitHubWorkflow,
  CheckRunSummary,
  ReviewSummary,
  GitHubPullRequestFilesResponse,
  GitHubBranchesResponse,
  GitHubIssuesResponse,
  GitHubCommitsResponse,
  GitHubCommentsResponse,
} from '../types/github';

// Mock the api-client
vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('githubService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getRepositoryInfo', () => {
    it('should call the correct endpoint without parameters', async () => {
      const mockResponse: GitHubRepositoryInfo = {
        owner: 'testowner',
        repo: 'testrepo',
        fullName: 'testowner/testrepo',
        htmlUrl: 'https://github.com/testowner/testrepo',
        defaultBranch: 'main',
        isConfigured: true,
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await githubService.getRepositoryInfo();

      expect(apiClient.get).toHaveBeenCalledWith('/github/repository');
      expect(result).toEqual(mockResponse);
    });

    it('should include owner and repo as query parameters when provided', async () => {
      const mockResponse: GitHubRepositoryInfo = {
        owner: 'custom',
        repo: 'repo',
        fullName: 'custom/repo',
        htmlUrl: 'https://github.com/custom/repo',
        isConfigured: true,
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await githubService.getRepositoryInfo('custom', 'repo');

      expect(apiClient.get).toHaveBeenCalledWith('/github/repository?owner=custom&repo=repo');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPullRequests', () => {
    it('should call the correct endpoint without parameters', async () => {
      const mockResponse: GitHubPullRequestsResponse = {
        pullRequests: [],
        totalCount: 0,
        page: 1,
        perPage: 30,
        hasMore: false,
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await githubService.getPullRequests();

      expect(apiClient.get).toHaveBeenCalledWith('/github/pulls');
      expect(result).toEqual(mockResponse);
    });

    it('should include all request parameters', async () => {
      const mockResponse: GitHubPullRequestsResponse = {
        pullRequests: [],
        totalCount: 0,
        page: 2,
        perPage: 50,
        hasMore: false,
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      await githubService.getPullRequests({
        owner: 'owner',
        repo: 'repo',
        state: 'closed',
        page: 2,
        perPage: 50,
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/github/pulls?owner=owner&repo=repo&state=closed&page=2&perPage=50'
      );
    });
  });

  describe('getPullRequest', () => {
    it('should call the correct endpoint with pull number', async () => {
      const mockPR: PullRequestSummary = {
        number: 123,
        title: 'Test PR',
        state: 'open',
        author: 'user',
        authorAvatarUrl: 'https://example.com/avatar',
        htmlUrl: 'https://github.com/owner/repo/pull/123',
        headBranch: 'feature',
        baseBranch: 'main',
        isDraft: false,
        isMerged: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        labels: [],
        commentsCount: 0,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
        reviews: [],
        checkRuns: [],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockPR);

      const result = await githubService.getPullRequest(123);

      expect(apiClient.get).toHaveBeenCalledWith('/github/pulls/123');
      expect(result).toEqual(mockPR);
    });

    it('should include owner and repo as query parameters', async () => {
      const mockPR: PullRequestSummary = {
        number: 123,
        title: 'Test PR',
        state: 'open',
        author: 'user',
        authorAvatarUrl: 'https://example.com/avatar',
        htmlUrl: 'https://github.com/owner/repo/pull/123',
        headBranch: 'feature',
        baseBranch: 'main',
        isDraft: false,
        isMerged: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        labels: [],
        commentsCount: 0,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
        reviews: [],
        checkRuns: [],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockPR);

      await githubService.getPullRequest(123, 'owner', 'repo');

      expect(apiClient.get).toHaveBeenCalledWith('/github/pulls/123?owner=owner&repo=repo');
    });
  });

  describe('getPullRequestReviews', () => {
    it('should return reviews for a pull request', async () => {
      const mockReviews: ReviewSummary[] = [
        {
          author: 'reviewer1',
          authorAvatarUrl: 'https://example.com/avatar1',
          state: 'APPROVED',
        },
        {
          author: 'reviewer2',
          authorAvatarUrl: 'https://example.com/avatar2',
          state: 'CHANGES_REQUESTED',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue(mockReviews);

      const result = await githubService.getPullRequestReviews(123);

      expect(apiClient.get).toHaveBeenCalledWith('/github/pulls/123/reviews');
      expect(result).toEqual(mockReviews);
    });
  });

  describe('getWorkflowRuns', () => {
    it('should call the correct endpoint without parameters', async () => {
      const mockResponse: GitHubActionsResponse = {
        workflowRuns: [],
        totalCount: 0,
        page: 1,
        perPage: 30,
        hasMore: false,
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await githubService.getWorkflowRuns();

      expect(apiClient.get).toHaveBeenCalledWith('/github/actions/runs');
      expect(result).toEqual(mockResponse);
    });

    it('should include all request parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ workflowRuns: [] });

      await githubService.getWorkflowRuns({
        owner: 'owner',
        repo: 'repo',
        branch: 'main',
        status: 'completed',
        page: 2,
        perPage: 50,
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/github/actions/runs?owner=owner&repo=repo&branch=main&status=completed&page=2&perPage=50'
      );
    });
  });

  describe('getWorkflowRun', () => {
    it('should return a specific workflow run', async () => {
      const mockRun: WorkflowRunSummary = {
        id: 12345,
        name: 'CI',
        displayTitle: 'CI Build',
        headBranch: 'main',
        headSha: 'abc123',
        runNumber: 10,
        event: 'push',
        status: 'completed',
        conclusion: 'success',
        htmlUrl: 'https://github.com/owner/repo/actions/runs/12345',
        createdAt: '2024-01-01T00:00:00Z',
        actor: 'user',
        actorAvatarUrl: 'https://example.com/avatar',
        jobs: [],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockRun);

      const result = await githubService.getWorkflowRun(12345);

      expect(apiClient.get).toHaveBeenCalledWith('/github/actions/runs/12345');
      expect(result).toEqual(mockRun);
    });
  });

  describe('getWorkflows', () => {
    it('should return all workflows', async () => {
      const mockWorkflows: GitHubWorkflow[] = [
        {
          id: 1,
          name: 'CI',
          path: '.github/workflows/ci.yml',
          state: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          htmlUrl: 'https://github.com/owner/repo/actions/workflows/ci.yml',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue(mockWorkflows);

      const result = await githubService.getWorkflows();

      expect(apiClient.get).toHaveBeenCalledWith('/github/actions/workflows');
      expect(result).toEqual(mockWorkflows);
    });
  });

  describe('getCheckRuns', () => {
    it('should return check runs for a commit SHA', async () => {
      const mockChecks: CheckRunSummary[] = [
        { name: 'build', status: 'completed', conclusion: 'success' },
        { name: 'test', status: 'completed', conclusion: 'success' },
      ];

      vi.mocked(apiClient.get).mockResolvedValue(mockChecks);

      const result = await githubService.getCheckRuns('abc123');

      expect(apiClient.get).toHaveBeenCalledWith('/github/checks/abc123');
      expect(result).toEqual(mockChecks);
    });

    it('should include owner and repo as query parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue([]);

      await githubService.getCheckRuns('abc123', 'owner', 'repo');

      expect(apiClient.get).toHaveBeenCalledWith('/github/checks/abc123?owner=owner&repo=repo');
    });
  });

  describe('rerunWorkflow', () => {
    it('should call POST to rerun endpoint', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      await githubService.rerunWorkflow(12345);

      expect(apiClient.post).toHaveBeenCalledWith('/github/actions/runs/12345/rerun');
    });

    it('should include owner and repo as query parameters', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      await githubService.rerunWorkflow(12345, 'owner', 'repo');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/github/actions/runs/12345/rerun?owner=owner&repo=repo'
      );
    });
  });

  describe('cancelWorkflowRun', () => {
    it('should call POST to cancel endpoint', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      await githubService.cancelWorkflowRun(12345);

      expect(apiClient.post).toHaveBeenCalledWith('/github/actions/runs/12345/cancel');
    });
  });

  describe('getPullRequestFiles', () => {
    it('should return files changed in a PR', async () => {
      const mockFiles: GitHubPullRequestFilesResponse = {
        files: [
          {
            filename: 'src/app.ts',
            status: 'modified',
            additions: 10,
            deletions: 5,
            changes: 15,
          },
        ],
        totalCount: 1,
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockFiles);

      const result = await githubService.getPullRequestFiles(123);

      expect(apiClient.get).toHaveBeenCalledWith('/github/pulls/123/files');
      expect(result).toEqual(mockFiles);
    });

    it('should include owner and repo as query parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ files: [], totalCount: 0 });

      await githubService.getPullRequestFiles(123, 'owner', 'repo');

      expect(apiClient.get).toHaveBeenCalledWith('/github/pulls/123/files?owner=owner&repo=repo');
    });
  });

  describe('getBranches', () => {
    it('should return branches in the repository', async () => {
      const mockBranches: GitHubBranchesResponse = {
        branches: [
          { name: 'main', sha: 'abc123', isProtected: true, isDefault: true, htmlUrl: '' },
          { name: 'develop', sha: 'def456', isProtected: false, isDefault: false, htmlUrl: '' },
        ],
        totalCount: 2,
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockBranches);

      const result = await githubService.getBranches();

      expect(apiClient.get).toHaveBeenCalledWith('/github/branches');
      expect(result).toEqual(mockBranches);
    });

    it('should include owner and repo as query parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ branches: [], totalCount: 0 });

      await githubService.getBranches('owner', 'repo');

      expect(apiClient.get).toHaveBeenCalledWith('/github/branches?owner=owner&repo=repo');
    });
  });

  describe('getIssues', () => {
    it('should return issues in the repository', async () => {
      const mockIssues: GitHubIssuesResponse = {
        issues: [
          {
            number: 1,
            title: 'Bug report',
            state: 'open',
            author: 'user1',
            authorAvatarUrl: 'https://example.com/avatar',
            htmlUrl: 'https://github.com/owner/repo/issues/1',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            labels: [],
            commentsCount: 0,
            assignees: [],
          },
        ],
        totalCount: 1,
        page: 1,
        perPage: 30,
        hasMore: false,
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockIssues);

      const result = await githubService.getIssues();

      expect(apiClient.get).toHaveBeenCalledWith('/github/issues');
      expect(result).toEqual(mockIssues);
    });

    it('should include all request parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ issues: [] });

      await githubService.getIssues({
        owner: 'owner',
        repo: 'repo',
        state: 'closed',
        page: 2,
        perPage: 50,
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/github/issues?owner=owner&repo=repo&state=closed&page=2&perPage=50'
      );
    });
  });

  describe('getCommits', () => {
    it('should return commits in the repository', async () => {
      const mockCommits: GitHubCommitsResponse = {
        commits: [
          {
            sha: 'abc123def456',
            shortSha: 'abc123d',
            message: 'Initial commit',
            author: 'user1',
            authorAvatarUrl: 'https://example.com/avatar',
            authoredAt: '2024-01-01T00:00:00Z',
            committer: 'user1',
            htmlUrl: 'https://github.com/owner/repo/commit/abc123',
            additions: 100,
            deletions: 0,
            filesChanged: 5,
          },
        ],
        totalCount: 1,
        page: 1,
        perPage: 30,
        hasMore: false,
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockCommits);

      const result = await githubService.getCommits();

      expect(apiClient.get).toHaveBeenCalledWith('/github/commits');
      expect(result).toEqual(mockCommits);
    });

    it('should include all request parameters including branch', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ commits: [] });

      await githubService.getCommits({
        owner: 'owner',
        repo: 'repo',
        branch: 'develop',
        page: 2,
        perPage: 50,
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/github/commits?owner=owner&repo=repo&branch=develop&page=2&perPage=50'
      );
    });
  });

  describe('getIssueComments', () => {
    it('should return comments for an issue', async () => {
      const mockComments: GitHubCommentsResponse = {
        comments: [
          {
            id: 1,
            body: 'First comment',
            author: 'user1',
            authorAvatarUrl: 'https://example.com/avatar',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            htmlUrl: 'https://github.com/owner/repo/issues/1#issuecomment-1',
          },
        ],
        totalCount: 1,
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockComments);

      const result = await githubService.getIssueComments(1);

      expect(apiClient.get).toHaveBeenCalledWith('/github/issues/1/comments');
      expect(result).toEqual(mockComments);
    });

    it('should include owner and repo as query parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ comments: [], totalCount: 0 });

      await githubService.getIssueComments(1, 'owner', 'repo');

      expect(apiClient.get).toHaveBeenCalledWith('/github/issues/1/comments?owner=owner&repo=repo');
    });
  });
});
