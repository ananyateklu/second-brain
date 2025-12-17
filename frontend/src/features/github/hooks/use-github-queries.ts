import { useQuery } from '@tanstack/react-query';
import { githubKeys } from '../../../lib/query-keys';
import { githubService } from '../../../services/github.service';
import type {
  GitHubPullRequestsRequest,
  GitHubWorkflowRunsRequest,
  GitHubIssuesRequest,
  GitHubCommitsRequest,
  GitHubRepositoriesRequest,
  GitHubRepositoryTreeRequest,
  GitHubFileContentRequest,
} from '../../../types/github';

/**
 * Hook to fetch GitHub repository information
 */
export const useGitHubRepository = (owner?: string, repo?: string) => {
  return useQuery({
    queryKey: githubKeys.repository(owner, repo),
    queryFn: () => githubService.getRepositoryInfo(owner, repo),
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch user's accessible repositories
 */
export const useGitHubRepositories = (request?: GitHubRepositoriesRequest) => {
  return useQuery({
    queryKey: githubKeys.repositories({
      type: request?.type,
      sort: request?.sort,
      page: request?.page,
      perPage: request?.perPage,
    }),
    queryFn: () => githubService.getUserRepositories(request),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
};

/**
 * Hook to fetch GitHub pull requests
 */
export const useGitHubPullRequests = (request?: GitHubPullRequestsRequest) => {
  return useQuery({
    queryKey: githubKeys.pullRequests({
      owner: request?.owner,
      repo: request?.repo,
      state: request?.state,
      page: request?.page,
      perPage: request?.perPage,
    }),
    queryFn: () => githubService.getPullRequests(request),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  });
};

/**
 * Hook to fetch a specific pull request with details
 */
export const useGitHubPullRequest = (
  pullNumber: number,
  owner?: string,
  repo?: string,
  enabled = true
) => {
  return useQuery({
    queryKey: githubKeys.pullRequest(pullNumber, owner, repo),
    queryFn: () => githubService.getPullRequest(pullNumber, owner, repo),
    enabled: enabled && pullNumber > 0,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to fetch pull request reviews
 */
export const useGitHubPullRequestReviews = (
  pullNumber: number,
  owner?: string,
  repo?: string,
  enabled = true
) => {
  return useQuery({
    queryKey: githubKeys.pullRequestReviews(pullNumber, owner, repo),
    queryFn: () => githubService.getPullRequestReviews(pullNumber, owner, repo),
    enabled: enabled && pullNumber > 0,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to fetch GitHub Actions workflow runs
 */
export const useGitHubWorkflowRuns = (
  request?: GitHubWorkflowRunsRequest,
  options?: { autoRefresh?: boolean }
) => {
  return useQuery({
    queryKey: githubKeys.workflowRuns({
      owner: request?.owner,
      repo: request?.repo,
      branch: request?.branch,
      status: request?.status,
      page: request?.page,
      perPage: request?.perPage,
    }),
    queryFn: () => githubService.getWorkflowRuns(request),
    staleTime: 1000 * 15, // 15 seconds (Actions update frequently)
    refetchInterval: (query) => {
      if (!options?.autoRefresh) return false;
      // Auto-refetch more frequently when there are in-progress runs
      const data = query.state.data;
      const hasInProgress = data?.workflowRuns?.some(
        (run) => run.status === 'in_progress' || run.status === 'queued'
      );
      if (hasInProgress) {
        return 1000 * 10; // 10 seconds when there are running workflows
      }
      return 1000 * 30; // 30 seconds otherwise
    },
  });
};

/**
 * Hook to fetch a specific workflow run with jobs
 */
export const useGitHubWorkflowRun = (
  runId: number,
  owner?: string,
  repo?: string,
  enabled = true
) => {
  return useQuery({
    queryKey: githubKeys.workflowRun(runId, owner, repo),
    queryFn: () => githubService.getWorkflowRun(runId, owner, repo),
    enabled: enabled && runId > 0,
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: (query) => {
      // Auto-refetch more frequently when in progress
      const data = query.state.data;
      if (data?.status === 'in_progress' || data?.status === 'queued') {
        return 1000 * 5; // 5 seconds when running
      }
      return false; // Don't refetch when completed
    },
  });
};

/**
 * Hook to fetch all workflows in the repository
 */
export const useGitHubWorkflows = (owner?: string, repo?: string) => {
  return useQuery({
    queryKey: githubKeys.workflows(owner, repo),
    queryFn: () => githubService.getWorkflows(owner, repo),
    staleTime: 1000 * 60 * 10, // 10 minutes (workflows don't change often)
  });
};

/**
 * Hook to fetch check runs for a commit
 */
export const useGitHubCheckRuns = (
  sha: string,
  owner?: string,
  repo?: string,
  enabled = true
) => {
  return useQuery({
    queryKey: githubKeys.checkRuns(sha, owner, repo),
    queryFn: () => githubService.getCheckRuns(sha, owner, repo),
    enabled: enabled && !!sha,
    staleTime: 1000 * 15, // 15 seconds
  });
};

/**
 * Hook to fetch files changed in a pull request
 */
export const useGitHubPullRequestFiles = (
  pullNumber: number,
  owner?: string,
  repo?: string,
  enabled = true
) => {
  return useQuery({
    queryKey: githubKeys.pullRequestFiles(pullNumber, owner, repo),
    queryFn: () => githubService.getPullRequestFiles(pullNumber, owner, repo),
    enabled: enabled && pullNumber > 0,
    staleTime: 1000 * 60, // 1 minute (files don't change often for a PR)
  });
};

/**
 * Hook to fetch branches in the repository
 */
export const useGitHubBranches = (owner?: string, repo?: string) => {
  return useQuery({
    queryKey: githubKeys.branches(owner, repo),
    queryFn: () => githubService.getBranches(owner, repo),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch issues in the repository
 */
export const useGitHubIssues = (request?: GitHubIssuesRequest) => {
  return useQuery({
    queryKey: githubKeys.issues({
      owner: request?.owner,
      repo: request?.repo,
      state: request?.state,
      page: request?.page,
      perPage: request?.perPage,
    }),
    queryFn: () => githubService.getIssues(request),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  });
};

/**
 * Hook to fetch commits in the repository
 */
export const useGitHubCommits = (request?: GitHubCommitsRequest) => {
  return useQuery({
    queryKey: githubKeys.commits({
      owner: request?.owner,
      repo: request?.repo,
      branch: request?.branch,
      page: request?.page,
      perPage: request?.perPage,
    }),
    queryFn: () => githubService.getCommits(request),
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to fetch comments on an issue or PR
 */
export const useGitHubIssueComments = (
  issueNumber: number,
  owner?: string,
  repo?: string,
  enabled = true
) => {
  return useQuery({
    queryKey: githubKeys.issueComments(issueNumber, owner, repo),
    queryFn: () => githubService.getIssueComments(issueNumber, owner, repo),
    enabled: enabled && issueNumber > 0,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to fetch repository file tree (recursive)
 * Uses the tree SHA from a branch to fetch all files/directories
 */
export const useGitHubRepositoryTree = (
  request: GitHubRepositoryTreeRequest | null,
  enabled = true
) => {
  return useQuery({
    queryKey: githubKeys.repositoryTree(
      request?.treeSha ?? '',
      request?.owner,
      request?.repo
    ),
    queryFn: () => githubService.getRepositoryTree(request!),
    enabled: enabled && !!request?.treeSha,
    staleTime: 1000 * 60 * 5, // 5 minutes (tree doesn't change often)
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });
};

/**
 * Hook to fetch file content from repository
 * Returns decoded content with language detection
 */
export const useGitHubFileContent = (
  request: GitHubFileContentRequest | null,
  enabled = true
) => {
  return useQuery({
    queryKey: githubKeys.fileContent(
      request?.path ?? '',
      request?.ref,
      request?.owner,
      request?.repo
    ),
    queryFn: () => githubService.getFileContent(request!),
    enabled: enabled && !!request?.path,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });
};
