using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Services.GitHub;

/// <summary>
/// Service for interacting with the GitHub API.
/// </summary>
public interface IGitHubService
{
    /// <summary>
    /// Checks if the GitHub integration is configured with a valid token.
    /// </summary>
    Task<Result<GitHubRepositoryInfo>> GetRepositoryInfoAsync(
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a list of pull requests for the configured repository.
    /// </summary>
    Task<Result<GitHubPullRequestsResponse>> GetPullRequestsAsync(
        string? owner = null,
        string? repo = null,
        string state = "open",
        int page = 1,
        int perPage = 30,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets details of a specific pull request.
    /// </summary>
    Task<Result<PullRequestSummary>> GetPullRequestAsync(
        int pullNumber,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets workflow runs (GitHub Actions) for the configured repository.
    /// </summary>
    Task<Result<GitHubActionsResponse>> GetWorkflowRunsAsync(
        string? owner = null,
        string? repo = null,
        string? branch = null,
        string? status = null,
        int page = 1,
        int perPage = 30,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets details of a specific workflow run including jobs.
    /// </summary>
    Task<Result<WorkflowRunSummary>> GetWorkflowRunAsync(
        long runId,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the list of workflows defined in the repository.
    /// </summary>
    Task<Result<List<GitHubWorkflow>>> GetWorkflowsAsync(
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets check runs for a specific commit SHA.
    /// </summary>
    Task<Result<List<CheckRunSummary>>> GetCheckRunsAsync(
        string sha,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets reviews for a specific pull request.
    /// </summary>
    Task<Result<List<ReviewSummary>>> GetPullRequestReviewsAsync(
        int pullNumber,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Triggers a re-run of a workflow.
    /// </summary>
    Task<Result<bool>> RerunWorkflowAsync(
        long runId,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Cancels a running workflow.
    /// </summary>
    Task<Result<bool>> CancelWorkflowRunAsync(
        long runId,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the files changed in a pull request.
    /// </summary>
    Task<Result<GitHubPullRequestFilesResponse>> GetPullRequestFilesAsync(
        int pullNumber,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the list of branches in the repository.
    /// </summary>
    Task<Result<GitHubBranchesResponse>> GetBranchesAsync(
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the list of issues (not PRs) in the repository.
    /// </summary>
    Task<Result<GitHubIssuesResponse>> GetIssuesAsync(
        string? owner = null,
        string? repo = null,
        string state = "open",
        int page = 1,
        int perPage = 30,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets commits for a branch or the default branch.
    /// </summary>
    Task<Result<GitHubCommitsResponse>> GetCommitsAsync(
        string? owner = null,
        string? repo = null,
        string? branch = null,
        int page = 1,
        int perPage = 30,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets comments on a pull request or issue.
    /// </summary>
    Task<Result<GitHubCommentsResponse>> GetIssueCommentsAsync(
        int issueNumber,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets repositories accessible to the authenticated user.
    /// </summary>
    Task<Result<GitHubRepositoriesResponse>> GetUserRepositoriesAsync(
        string? type = "all",
        string? sort = "pushed",
        int page = 1,
        int perPage = 30,
        CancellationToken cancellationToken = default);
}
