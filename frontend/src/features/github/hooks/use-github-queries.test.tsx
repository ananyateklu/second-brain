import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useGitHubRepository,
  useGitHubPullRequests,
  useGitHubPullRequest,
  useGitHubPullRequestReviews,
  useGitHubWorkflowRuns,
  useGitHubWorkflowRun,
  useGitHubWorkflows,
  useGitHubCheckRuns,
  useGitHubPullRequestFiles,
  useGitHubBranches,
  useGitHubIssues,
  useGitHubCommits,
  useGitHubIssueComments,
} from './use-github-queries';
import { githubService } from '../../../services/github.service';
import type {
  GitHubRepositoryInfo,
  GitHubPullRequestsResponse,
  PullRequestSummary,
  ReviewSummary,
  GitHubActionsResponse,
  WorkflowRunSummary,
  GitHubWorkflow,
  CheckRunSummary,
  GitHubPullRequestFilesResponse,
  GitHubBranchesResponse,
  GitHubIssuesResponse,
  GitHubCommitsResponse,
  GitHubCommentsResponse,
} from '../../../types/github';

// Mock the github service
vi.mock('../../../services/github.service', () => ({
  githubService: {
    getRepositoryInfo: vi.fn(),
    getPullRequests: vi.fn(),
    getPullRequest: vi.fn(),
    getPullRequestReviews: vi.fn(),
    getWorkflowRuns: vi.fn(),
    getWorkflowRun: vi.fn(),
    getWorkflows: vi.fn(),
    getCheckRuns: vi.fn(),
    getPullRequestFiles: vi.fn(),
    getBranches: vi.fn(),
    getIssues: vi.fn(),
    getCommits: vi.fn(),
    getIssueComments: vi.fn(),
  },
}));

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('GitHub Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useGitHubRepository', () => {
    it('should fetch repository info successfully', async () => {
      const mockRepo: GitHubRepositoryInfo = {
        owner: 'testowner',
        repo: 'testrepo',
        fullName: 'testowner/testrepo',
        htmlUrl: 'https://github.com/testowner/testrepo',
        defaultBranch: 'main',
        isConfigured: true,
      };

      vi.mocked(githubService.getRepositoryInfo).mockResolvedValue(mockRepo);

      const { result } = renderHook(() => useGitHubRepository(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockRepo);
      expect(githubService.getRepositoryInfo).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should pass owner and repo parameters', async () => {
      const mockRepo: GitHubRepositoryInfo = {
        owner: 'custom',
        repo: 'repo',
        fullName: 'custom/repo',
        htmlUrl: 'https://github.com/custom/repo',
        isConfigured: true,
      };

      vi.mocked(githubService.getRepositoryInfo).mockResolvedValue(mockRepo);

      const { result } = renderHook(() => useGitHubRepository('custom', 'repo'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(githubService.getRepositoryInfo).toHaveBeenCalledWith('custom', 'repo');
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch');
      vi.mocked(githubService.getRepositoryInfo).mockRejectedValue(error);

      const { result } = renderHook(() => useGitHubRepository('testowner', 'testrepo'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });

      expect(result.current.error).toBe(error);
    });
  });

  describe('useGitHubPullRequests', () => {
    it('should fetch pull requests successfully', async () => {
      const mockPRs: GitHubPullRequestsResponse = {
        pullRequests: [
          {
            number: 1,
            title: 'Test PR',
            state: 'open',
            author: 'user',
            authorAvatarUrl: '',
            htmlUrl: '',
            headBranch: 'feature',
            baseBranch: 'main',
            isDraft: false,
            isMerged: false,
            createdAt: '',
            updatedAt: '',
            labels: [],
            commentsCount: 0,
            additions: 0,
            deletions: 0,
            changedFiles: 0,
            reviews: [],
            checkRuns: [],
          },
        ],
        totalCount: 1,
        page: 1,
        perPage: 30,
        hasMore: false,
      };

      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRs);

      const { result } = renderHook(() => useGitHubPullRequests(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockPRs);
    });

    it('should pass request parameters', async () => {
      vi.mocked(githubService.getPullRequests).mockResolvedValue({
        pullRequests: [],
        totalCount: 0,
        page: 2,
        perPage: 50,
        hasMore: false,
      });

      const request = { owner: 'owner', repo: 'repo', state: 'closed' as const, page: 2, perPage: 50 };
      const { result } = renderHook(() => useGitHubPullRequests(request), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(githubService.getPullRequests).toHaveBeenCalledWith(request);
    });
  });

  describe('useGitHubPullRequest', () => {
    it('should fetch a specific pull request', async () => {
      const mockPR: PullRequestSummary = {
        number: 123,
        title: 'Test PR',
        state: 'open',
        author: 'user',
        authorAvatarUrl: '',
        htmlUrl: '',
        headBranch: 'feature',
        baseBranch: 'main',
        isDraft: false,
        isMerged: false,
        createdAt: '',
        updatedAt: '',
        labels: [],
        commentsCount: 5,
        additions: 100,
        deletions: 50,
        changedFiles: 10,
        reviews: [],
        checkRuns: [],
      };

      vi.mocked(githubService.getPullRequest).mockResolvedValue(mockPR);

      const { result } = renderHook(() => useGitHubPullRequest(123), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockPR);
      expect(githubService.getPullRequest).toHaveBeenCalledWith(123, undefined, undefined);
    });

    it('should not fetch when pullNumber is 0', () => {
      const { result } = renderHook(() => useGitHubPullRequest(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(githubService.getPullRequest).not.toHaveBeenCalled();
    });

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() => useGitHubPullRequest(123, undefined, undefined, false), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(githubService.getPullRequest).not.toHaveBeenCalled();
    });
  });

  describe('useGitHubPullRequestReviews', () => {
    it('should fetch reviews for a pull request', async () => {
      const mockReviews: ReviewSummary[] = [
        { author: 'reviewer1', authorAvatarUrl: '', state: 'APPROVED' },
        { author: 'reviewer2', authorAvatarUrl: '', state: 'CHANGES_REQUESTED' },
      ];

      vi.mocked(githubService.getPullRequestReviews).mockResolvedValue(mockReviews);

      const { result } = renderHook(() => useGitHubPullRequestReviews(123), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockReviews);
    });
  });

  describe('useGitHubWorkflowRuns', () => {
    it('should fetch workflow runs successfully', async () => {
      const mockRuns: GitHubActionsResponse = {
        workflowRuns: [
          {
            id: 1,
            name: 'CI',
            displayTitle: 'CI Build',
            headBranch: 'main',
            headSha: 'abc123',
            runNumber: 10,
            event: 'push',
            status: 'completed',
            conclusion: 'success',
            htmlUrl: '',
            createdAt: '',
            actor: 'user',
            actorAvatarUrl: '',
            jobs: [],
          },
        ],
        totalCount: 1,
        page: 1,
        perPage: 30,
        hasMore: false,
      };

      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockRuns);

      const { result } = renderHook(() => useGitHubWorkflowRuns(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockRuns);
    });

    it('should respect autoRefresh option', async () => {
      const mockRuns: GitHubActionsResponse = {
        workflowRuns: [
          {
            id: 1,
            name: 'CI',
            displayTitle: 'CI',
            headBranch: 'main',
            headSha: 'abc',
            runNumber: 1,
            event: 'push',
            status: 'in_progress',
            htmlUrl: '',
            createdAt: '',
            actor: 'user',
            actorAvatarUrl: '',
            jobs: [],
          },
        ],
        totalCount: 1,
        page: 1,
        perPage: 30,
        hasMore: false,
      };

      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockRuns);

      const { result } = renderHook(() => useGitHubWorkflowRuns(undefined, { autoRefresh: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // When autoRefresh is enabled and there are in_progress runs,
      // the hook configures a refetch interval
      expect(result.current.data?.workflowRuns[0].status).toBe('in_progress');
    });
  });

  describe('useGitHubWorkflowRun', () => {
    it('should fetch a specific workflow run', async () => {
      const mockRun: WorkflowRunSummary = {
        id: 12345,
        name: 'CI Pipeline',
        displayTitle: 'CI Pipeline',
        headBranch: 'main',
        headSha: 'abc123',
        runNumber: 10,
        event: 'push',
        status: 'completed',
        conclusion: 'success',
        htmlUrl: '',
        createdAt: '',
        actor: 'user',
        actorAvatarUrl: '',
        jobs: [],
      };

      vi.mocked(githubService.getWorkflowRun).mockResolvedValue(mockRun);

      const { result } = renderHook(() => useGitHubWorkflowRun(12345), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockRun);
    });

    it('should not fetch when runId is 0', () => {
      const { result } = renderHook(() => useGitHubWorkflowRun(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(githubService.getWorkflowRun).not.toHaveBeenCalled();
    });
  });

  describe('useGitHubWorkflows', () => {
    it('should fetch all workflows', async () => {
      const mockWorkflows: GitHubWorkflow[] = [
        { id: 1, name: 'CI', path: '.github/workflows/ci.yml', state: 'active', createdAt: '', updatedAt: '', htmlUrl: '' },
        { id: 2, name: 'Deploy', path: '.github/workflows/deploy.yml', state: 'active', createdAt: '', updatedAt: '', htmlUrl: '' },
      ];

      vi.mocked(githubService.getWorkflows).mockResolvedValue(mockWorkflows);

      const { result } = renderHook(() => useGitHubWorkflows(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockWorkflows);
    });
  });

  describe('useGitHubCheckRuns', () => {
    it('should fetch check runs for a commit SHA', async () => {
      const mockChecks: CheckRunSummary[] = [
        { name: 'build', status: 'completed', conclusion: 'success' },
        { name: 'test', status: 'completed', conclusion: 'success' },
      ];

      vi.mocked(githubService.getCheckRuns).mockResolvedValue(mockChecks);

      const { result } = renderHook(() => useGitHubCheckRuns('abc123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockChecks);
    });

    it('should not fetch when SHA is empty', () => {
      const { result } = renderHook(() => useGitHubCheckRuns(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(githubService.getCheckRuns).not.toHaveBeenCalled();
    });
  });

  describe('useGitHubPullRequestFiles', () => {
    it('should fetch files changed in a PR', async () => {
      const mockFiles: GitHubPullRequestFilesResponse = {
        files: [
          { filename: 'src/app.ts', status: 'modified', additions: 10, deletions: 5, changes: 15 },
        ],
        totalCount: 1,
      };

      vi.mocked(githubService.getPullRequestFiles).mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useGitHubPullRequestFiles(123), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockFiles);
    });

    it('should not fetch when pullNumber is 0', () => {
      const { result } = renderHook(() => useGitHubPullRequestFiles(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(githubService.getPullRequestFiles).not.toHaveBeenCalled();
    });
  });

  describe('useGitHubBranches', () => {
    it('should fetch branches in the repository', async () => {
      const mockBranches: GitHubBranchesResponse = {
        branches: [
          { name: 'main', commitSha: 'abc123', isProtected: true, isDefault: true },
          { name: 'develop', commitSha: 'def456', isProtected: false, isDefault: false },
        ],
      };

      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranches);

      const { result } = renderHook(() => useGitHubBranches(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockBranches);
    });
  });

  describe('useGitHubIssues', () => {
    it('should fetch issues in the repository', async () => {
      const mockIssues: GitHubIssuesResponse = {
        issues: [
          {
            number: 1,
            title: 'Bug report',
            state: 'open',
            author: 'user1',
            authorAvatarUrl: '',
            htmlUrl: '',
            createdAt: '',
            updatedAt: '',
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

      vi.mocked(githubService.getIssues).mockResolvedValue(mockIssues);

      const { result } = renderHook(() => useGitHubIssues(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockIssues);
    });

    it('should pass request parameters', async () => {
      vi.mocked(githubService.getIssues).mockResolvedValue({
        issues: [],
        totalCount: 0,
        page: 2,
        perPage: 50,
        hasMore: false,
      });

      const request = { owner: 'owner', repo: 'repo', state: 'closed' as const, page: 2, perPage: 50 };
      const { result } = renderHook(() => useGitHubIssues(request), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(githubService.getIssues).toHaveBeenCalledWith(request);
    });
  });

  describe('useGitHubCommits', () => {
    it('should fetch commits in the repository', async () => {
      const mockCommits: GitHubCommitsResponse = {
        commits: [
          {
            sha: 'abc123def456',
            shortSha: 'abc123d',
            message: 'Initial commit',
            author: 'user1',
            authorAvatarUrl: '',
            authoredAt: '',
            committer: 'user1',
            htmlUrl: '',
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

      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommits);

      const { result } = renderHook(() => useGitHubCommits(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockCommits);
    });

    it('should pass request parameters including branch', async () => {
      vi.mocked(githubService.getCommits).mockResolvedValue({
        commits: [],
        totalCount: 0,
        page: 1,
        perPage: 30,
        hasMore: false,
      });

      const request = { owner: 'owner', repo: 'repo', branch: 'develop', page: 1, perPage: 30 };
      const { result } = renderHook(() => useGitHubCommits(request), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(githubService.getCommits).toHaveBeenCalledWith(request);
    });
  });

  describe('useGitHubIssueComments', () => {
    it('should fetch comments for an issue', async () => {
      const mockComments: GitHubCommentsResponse = {
        comments: [
          {
            id: 1,
            body: 'First comment',
            author: 'user1',
            authorAvatarUrl: '',
            createdAt: '',
            updatedAt: '',
            htmlUrl: '',
          },
        ],
        totalCount: 1,
      };

      vi.mocked(githubService.getIssueComments).mockResolvedValue(mockComments);

      const { result } = renderHook(() => useGitHubIssueComments(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockComments);
    });

    it('should not fetch when issueNumber is 0', () => {
      const { result } = renderHook(() => useGitHubIssueComments(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(githubService.getIssueComments).not.toHaveBeenCalled();
    });
  });
});
