using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Controller for GitHub API integration - Pull Requests and Actions.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GitHubController : ControllerBase
{
    private readonly IGitHubService _gitHubService;
    private readonly ILogger<GitHubController> _logger;

    public GitHubController(
        IGitHubService gitHubService,
        ILogger<GitHubController> logger)
    {
        _gitHubService = gitHubService;
        _logger = logger;
    }

    /// <summary>
    /// Gets repository information and validates GitHub configuration.
    /// </summary>
    [HttpGet("repository")]
    [ProducesResponseType(typeof(GitHubRepositoryInfo), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetRepositoryInfo(
        [FromQuery] string? owner = null,
        [FromQuery] string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _gitHubService.GetRepositoryInfoAsync(owner, repo, cancellationToken);

        return result.Match(
            onSuccess: info => Ok(info),
            onFailure: error => error.Code switch
            {
                "ValidationFailed" => BadRequest(new { error = error.Code, message = error.Message }),
                "GitHub.Unauthorized" => Unauthorized(new { error = error.Code, message = error.Message }),
                "NotFound" => NotFound(new { error = error.Code, message = error.Message }),
                _ => StatusCode(500, new { error = error.Code, message = error.Message })
            }
        );
    }

    /// <summary>
    /// Gets a list of pull requests for the repository.
    /// </summary>
    [HttpGet("pulls")]
    [ProducesResponseType(typeof(GitHubPullRequestsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetPullRequests(
        [FromQuery] string? owner = null,
        [FromQuery] string? repo = null,
        [FromQuery] string state = "open",
        [FromQuery] int page = 1,
        [FromQuery] int perPage = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _gitHubService.GetPullRequestsAsync(
            owner, repo, state, page, perPage, cancellationToken);

        return result.Match(
            onSuccess: prs => Ok(prs),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Gets details of a specific pull request.
    /// </summary>
    [HttpGet("pulls/{pullNumber:int}")]
    [ProducesResponseType(typeof(PullRequestSummary), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPullRequest(
        int pullNumber,
        [FromQuery] string? owner = null,
        [FromQuery] string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _gitHubService.GetPullRequestAsync(
            pullNumber, owner, repo, cancellationToken);

        return result.Match(
            onSuccess: pr => Ok(pr),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Gets reviews for a specific pull request.
    /// </summary>
    [HttpGet("pulls/{pullNumber:int}/reviews")]
    [ProducesResponseType(typeof(List<ReviewSummary>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPullRequestReviews(
        int pullNumber,
        [FromQuery] string? owner = null,
        [FromQuery] string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _gitHubService.GetPullRequestReviewsAsync(
            pullNumber, owner, repo, cancellationToken);

        return result.Match(
            onSuccess: reviews => Ok(reviews),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Gets workflow runs (GitHub Actions) for the repository.
    /// </summary>
    [HttpGet("actions/runs")]
    [ProducesResponseType(typeof(GitHubActionsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetWorkflowRuns(
        [FromQuery] string? owner = null,
        [FromQuery] string? repo = null,
        [FromQuery] string? branch = null,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int perPage = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _gitHubService.GetWorkflowRunsAsync(
            owner, repo, branch, status, page, perPage, cancellationToken);

        return result.Match(
            onSuccess: runs => Ok(runs),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Gets details of a specific workflow run including jobs.
    /// </summary>
    [HttpGet("actions/runs/{runId:long}")]
    [ProducesResponseType(typeof(WorkflowRunSummary), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetWorkflowRun(
        long runId,
        [FromQuery] string? owner = null,
        [FromQuery] string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _gitHubService.GetWorkflowRunAsync(
            runId, owner, repo, cancellationToken);

        return result.Match(
            onSuccess: run => Ok(run),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Gets the list of workflows defined in the repository.
    /// </summary>
    [HttpGet("actions/workflows")]
    [ProducesResponseType(typeof(List<GitHubWorkflow>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetWorkflows(
        [FromQuery] string? owner = null,
        [FromQuery] string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _gitHubService.GetWorkflowsAsync(owner, repo, cancellationToken);

        return result.Match(
            onSuccess: workflows => Ok(workflows),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Gets check runs for a specific commit SHA.
    /// </summary>
    [HttpGet("checks/{sha}")]
    [ProducesResponseType(typeof(List<CheckRunSummary>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCheckRuns(
        string sha,
        [FromQuery] string? owner = null,
        [FromQuery] string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _gitHubService.GetCheckRunsAsync(sha, owner, repo, cancellationToken);

        return result.Match(
            onSuccess: checks => Ok(checks),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Triggers a re-run of a workflow.
    /// </summary>
    [HttpPost("actions/runs/{runId:long}/rerun")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RerunWorkflow(
        long runId,
        [FromQuery] string? owner = null,
        [FromQuery] string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _gitHubService.RerunWorkflowAsync(runId, owner, repo, cancellationToken);

        return result.Match(
            onSuccess: _ => Accepted(),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Cancels a running workflow.
    /// </summary>
    [HttpPost("actions/runs/{runId:long}/cancel")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CancelWorkflowRun(
        long runId,
        [FromQuery] string? owner = null,
        [FromQuery] string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _gitHubService.CancelWorkflowRunAsync(runId, owner, repo, cancellationToken);

        return result.Match(
            onSuccess: _ => Accepted(),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Gets the files changed in a pull request.
    /// </summary>
    [HttpGet("pulls/{pullNumber:int}/files")]
    [ProducesResponseType(typeof(GitHubPullRequestFilesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPullRequestFiles(
        int pullNumber,
        [FromQuery] string? owner = null,
        [FromQuery] string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _gitHubService.GetPullRequestFilesAsync(
            pullNumber, owner, repo, cancellationToken);

        return result.Match(
            onSuccess: files => Ok(files),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Gets the list of branches in the repository.
    /// </summary>
    [HttpGet("branches")]
    [ProducesResponseType(typeof(GitHubBranchesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetBranches(
        [FromQuery] string? owner = null,
        [FromQuery] string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _gitHubService.GetBranchesAsync(owner, repo, cancellationToken);

        return result.Match(
            onSuccess: branches => Ok(branches),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Gets the list of issues (not PRs) in the repository.
    /// </summary>
    [HttpGet("issues")]
    [ProducesResponseType(typeof(GitHubIssuesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetIssues(
        [FromQuery] string? owner = null,
        [FromQuery] string? repo = null,
        [FromQuery] string state = "open",
        [FromQuery] int page = 1,
        [FromQuery] int perPage = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _gitHubService.GetIssuesAsync(
            owner, repo, state, page, perPage, cancellationToken);

        return result.Match(
            onSuccess: issues => Ok(issues),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Gets commits for a branch or the default branch.
    /// </summary>
    [HttpGet("commits")]
    [ProducesResponseType(typeof(GitHubCommitsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetCommits(
        [FromQuery] string? owner = null,
        [FromQuery] string? repo = null,
        [FromQuery] string? branch = null,
        [FromQuery] int page = 1,
        [FromQuery] int perPage = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _gitHubService.GetCommitsAsync(
            owner, repo, branch, page, perPage, cancellationToken);

        return result.Match(
            onSuccess: commits => Ok(commits),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Gets comments on a pull request or issue.
    /// </summary>
    [HttpGet("issues/{issueNumber:int}/comments")]
    [ProducesResponseType(typeof(GitHubCommentsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetIssueComments(
        int issueNumber,
        [FromQuery] string? owner = null,
        [FromQuery] string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _gitHubService.GetIssueCommentsAsync(
            issueNumber, owner, repo, cancellationToken);

        return result.Match(
            onSuccess: comments => Ok(comments),
            onFailure: error => HandleError(error)
        );
    }

    private IActionResult HandleError(SecondBrain.Core.Common.Error error)
    {
        return error.Code switch
        {
            "ValidationFailed" => BadRequest(new { error = error.Code, message = error.Message }),
            "GitHub.Unauthorized" => Unauthorized(new { error = error.Code, message = error.Message }),
            "GitHub.Forbidden" or "Forbidden" => StatusCode(403, new { error = error.Code, message = error.Message }),
            "GitHub.NotFound" or "NotFound" => NotFound(new { error = error.Code, message = error.Message }),
            "GitHub.ValidationError" => BadRequest(new { error = error.Code, message = error.Message }),
            "ExternalServiceError" => StatusCode(502, new { error = error.Code, message = error.Message }),
            _ => StatusCode(500, new { error = error.Code, message = error.Message })
        };
    }
}
