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
  GitHubPullRequestsRequest,
  GitHubWorkflowRunsRequest,
  GitHubPullRequestFilesResponse,
  GitHubBranchesResponse,
  GitHubIssuesResponse,
  GitHubIssuesRequest,
  GitHubCommitsResponse,
  GitHubCommitsRequest,
  GitHubCommentsResponse,
} from '../types/github';

// Add GitHub endpoints to constants
const GITHUB_ENDPOINTS = {
  REPOSITORY: '/github/repository',
  PULLS: '/github/pulls',
  PULL_BY_NUMBER: (number: number) => `/github/pulls/${number}`,
  PULL_REVIEWS: (number: number) => `/github/pulls/${number}/reviews`,
  PULL_FILES: (number: number) => `/github/pulls/${number}/files`,
  ACTIONS_RUNS: '/github/actions/runs',
  ACTIONS_RUN_BY_ID: (id: number) => `/github/actions/runs/${id}`,
  ACTIONS_WORKFLOWS: '/github/actions/workflows',
  CHECKS: (sha: string) => `/github/checks/${sha}`,
  RERUN_WORKFLOW: (id: number) => `/github/actions/runs/${id}/rerun`,
  CANCEL_WORKFLOW: (id: number) => `/github/actions/runs/${id}/cancel`,
  BRANCHES: '/github/branches',
  ISSUES: '/github/issues',
  ISSUE_COMMENTS: (issueNumber: number) => `/github/issues/${issueNumber}/comments`,
  COMMITS: '/github/commits',
} as const;

/**
 * Service for GitHub API integration
 */
export const githubService = {
  /**
   * Get repository information and validate configuration
   */
  async getRepositoryInfo(owner?: string, repo?: string): Promise<GitHubRepositoryInfo> {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);
    if (repo) params.append('repo', repo);

    const queryString = params.toString();
    const url = queryString
      ? `${GITHUB_ENDPOINTS.REPOSITORY}?${queryString}`
      : GITHUB_ENDPOINTS.REPOSITORY;

    return apiClient.get<GitHubRepositoryInfo>(url);
  },

  /**
   * Get pull requests for the repository
   */
  async getPullRequests(request?: GitHubPullRequestsRequest): Promise<GitHubPullRequestsResponse> {
    const params = new URLSearchParams();
    if (request?.owner) params.append('owner', request.owner);
    if (request?.repo) params.append('repo', request.repo);
    if (request?.state) params.append('state', request.state);
    if (request?.page) params.append('page', request.page.toString());
    if (request?.perPage) params.append('perPage', request.perPage.toString());

    const queryString = params.toString();
    const url = queryString
      ? `${GITHUB_ENDPOINTS.PULLS}?${queryString}`
      : GITHUB_ENDPOINTS.PULLS;

    return apiClient.get<GitHubPullRequestsResponse>(url);
  },

  /**
   * Get a specific pull request with reviews and check runs
   */
  async getPullRequest(
    pullNumber: number,
    owner?: string,
    repo?: string
  ): Promise<PullRequestSummary> {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);
    if (repo) params.append('repo', repo);

    const queryString = params.toString();
    const url = queryString
      ? `${GITHUB_ENDPOINTS.PULL_BY_NUMBER(pullNumber)}?${queryString}`
      : GITHUB_ENDPOINTS.PULL_BY_NUMBER(pullNumber);

    return apiClient.get<PullRequestSummary>(url);
  },

  /**
   * Get reviews for a pull request
   */
  async getPullRequestReviews(
    pullNumber: number,
    owner?: string,
    repo?: string
  ): Promise<ReviewSummary[]> {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);
    if (repo) params.append('repo', repo);

    const queryString = params.toString();
    const url = queryString
      ? `${GITHUB_ENDPOINTS.PULL_REVIEWS(pullNumber)}?${queryString}`
      : GITHUB_ENDPOINTS.PULL_REVIEWS(pullNumber);

    return apiClient.get<ReviewSummary[]>(url);
  },

  /**
   * Get workflow runs (GitHub Actions)
   */
  async getWorkflowRuns(request?: GitHubWorkflowRunsRequest): Promise<GitHubActionsResponse> {
    const params = new URLSearchParams();
    if (request?.owner) params.append('owner', request.owner);
    if (request?.repo) params.append('repo', request.repo);
    if (request?.branch) params.append('branch', request.branch);
    if (request?.status) params.append('status', request.status);
    if (request?.page) params.append('page', request.page.toString());
    if (request?.perPage) params.append('perPage', request.perPage.toString());

    const queryString = params.toString();
    const url = queryString
      ? `${GITHUB_ENDPOINTS.ACTIONS_RUNS}?${queryString}`
      : GITHUB_ENDPOINTS.ACTIONS_RUNS;

    return apiClient.get<GitHubActionsResponse>(url);
  },

  /**
   * Get a specific workflow run with jobs
   */
  async getWorkflowRun(
    runId: number,
    owner?: string,
    repo?: string
  ): Promise<WorkflowRunSummary> {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);
    if (repo) params.append('repo', repo);

    const queryString = params.toString();
    const url = queryString
      ? `${GITHUB_ENDPOINTS.ACTIONS_RUN_BY_ID(runId)}?${queryString}`
      : GITHUB_ENDPOINTS.ACTIONS_RUN_BY_ID(runId);

    return apiClient.get<WorkflowRunSummary>(url);
  },

  /**
   * Get all workflows in the repository
   */
  async getWorkflows(owner?: string, repo?: string): Promise<GitHubWorkflow[]> {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);
    if (repo) params.append('repo', repo);

    const queryString = params.toString();
    const url = queryString
      ? `${GITHUB_ENDPOINTS.ACTIONS_WORKFLOWS}?${queryString}`
      : GITHUB_ENDPOINTS.ACTIONS_WORKFLOWS;

    return apiClient.get<GitHubWorkflow[]>(url);
  },

  /**
   * Get check runs for a commit SHA
   */
  async getCheckRuns(
    sha: string,
    owner?: string,
    repo?: string
  ): Promise<CheckRunSummary[]> {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);
    if (repo) params.append('repo', repo);

    const queryString = params.toString();
    const url = queryString
      ? `${GITHUB_ENDPOINTS.CHECKS(sha)}?${queryString}`
      : GITHUB_ENDPOINTS.CHECKS(sha);

    return apiClient.get<CheckRunSummary[]>(url);
  },

  /**
   * Rerun a workflow
   */
  async rerunWorkflow(runId: number, owner?: string, repo?: string): Promise<void> {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);
    if (repo) params.append('repo', repo);

    const queryString = params.toString();
    const url = queryString
      ? `${GITHUB_ENDPOINTS.RERUN_WORKFLOW(runId)}?${queryString}`
      : GITHUB_ENDPOINTS.RERUN_WORKFLOW(runId);

    await apiClient.post(url);
  },

  /**
   * Cancel a running workflow
   */
  async cancelWorkflowRun(runId: number, owner?: string, repo?: string): Promise<void> {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);
    if (repo) params.append('repo', repo);

    const queryString = params.toString();
    const url = queryString
      ? `${GITHUB_ENDPOINTS.CANCEL_WORKFLOW(runId)}?${queryString}`
      : GITHUB_ENDPOINTS.CANCEL_WORKFLOW(runId);

    await apiClient.post(url);
  },

  /**
   * Get files changed in a pull request
   */
  async getPullRequestFiles(
    pullNumber: number,
    owner?: string,
    repo?: string
  ): Promise<GitHubPullRequestFilesResponse> {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);
    if (repo) params.append('repo', repo);

    const queryString = params.toString();
    const url = queryString
      ? `${GITHUB_ENDPOINTS.PULL_FILES(pullNumber)}?${queryString}`
      : GITHUB_ENDPOINTS.PULL_FILES(pullNumber);

    return apiClient.get<GitHubPullRequestFilesResponse>(url);
  },

  /**
   * Get branches in the repository
   */
  async getBranches(owner?: string, repo?: string): Promise<GitHubBranchesResponse> {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);
    if (repo) params.append('repo', repo);

    const queryString = params.toString();
    const url = queryString
      ? `${GITHUB_ENDPOINTS.BRANCHES}?${queryString}`
      : GITHUB_ENDPOINTS.BRANCHES;

    return apiClient.get<GitHubBranchesResponse>(url);
  },

  /**
   * Get issues in the repository (not pull requests)
   */
  async getIssues(request?: GitHubIssuesRequest): Promise<GitHubIssuesResponse> {
    const params = new URLSearchParams();
    if (request?.owner) params.append('owner', request.owner);
    if (request?.repo) params.append('repo', request.repo);
    if (request?.state) params.append('state', request.state);
    if (request?.page) params.append('page', request.page.toString());
    if (request?.perPage) params.append('perPage', request.perPage.toString());

    const queryString = params.toString();
    const url = queryString
      ? `${GITHUB_ENDPOINTS.ISSUES}?${queryString}`
      : GITHUB_ENDPOINTS.ISSUES;

    return apiClient.get<GitHubIssuesResponse>(url);
  },

  /**
   * Get commits for a branch
   */
  async getCommits(request?: GitHubCommitsRequest): Promise<GitHubCommitsResponse> {
    const params = new URLSearchParams();
    if (request?.owner) params.append('owner', request.owner);
    if (request?.repo) params.append('repo', request.repo);
    if (request?.branch) params.append('branch', request.branch);
    if (request?.page) params.append('page', request.page.toString());
    if (request?.perPage) params.append('perPage', request.perPage.toString());

    const queryString = params.toString();
    const url = queryString
      ? `${GITHUB_ENDPOINTS.COMMITS}?${queryString}`
      : GITHUB_ENDPOINTS.COMMITS;

    return apiClient.get<GitHubCommitsResponse>(url);
  },

  /**
   * Get comments on an issue or pull request
   */
  async getIssueComments(
    issueNumber: number,
    owner?: string,
    repo?: string
  ): Promise<GitHubCommentsResponse> {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);
    if (repo) params.append('repo', repo);

    const queryString = params.toString();
    const url = queryString
      ? `${GITHUB_ENDPOINTS.ISSUE_COMMENTS(issueNumber)}?${queryString}`
      : GITHUB_ENDPOINTS.ISSUE_COMMENTS(issueNumber);

    return apiClient.get<GitHubCommentsResponse>(url);
  },
};

export default githubService;
