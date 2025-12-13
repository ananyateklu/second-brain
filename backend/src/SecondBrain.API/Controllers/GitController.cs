using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SecondBrain.Application.Commands.Git.Commit;
using SecondBrain.Application.Commands.Git.CreateBranch;
using SecondBrain.Application.Commands.Git.DeleteBranch;
using SecondBrain.Application.Commands.Git.DiscardChanges;
using SecondBrain.Application.Commands.Git.MergeBranch;
using SecondBrain.Application.Commands.Git.PublishBranch;
using SecondBrain.Application.Commands.Git.Pull;
using SecondBrain.Application.Commands.Git.Push;
using SecondBrain.Application.Commands.Git.StageFiles;
using SecondBrain.Application.Commands.Git.SwitchBranch;
using SecondBrain.Application.Commands.Git.UnstageFiles;
using SecondBrain.Application.Queries.Git.GetBranches;
using SecondBrain.Application.Queries.Git.GetDiff;
using SecondBrain.Application.Queries.Git.GetLog;
using SecondBrain.Application.Queries.Git.GetStatus;
using SecondBrain.Application.Queries.Git.ValidateRepository;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Controller for Git operations using CQRS pattern.
/// Provides secure access to Git repositories with authentication.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
[Produces("application/json")]
public class GitController : ControllerBase
{
    private readonly IMediator _mediator;

    public GitController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Validates that the given path is a valid Git repository.
    /// </summary>
    [HttpGet("validate")]
    public async Task<ActionResult<bool>> ValidateRepository([FromQuery] string repoPath, CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new ValidateRepositoryQuery(repoPath, userId), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Gets the current status of a Git repository.
    /// </summary>
    [HttpGet("status")]
    public async Task<ActionResult<GitStatus>> GetStatus([FromQuery] string repoPath, CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new GetStatusQuery(repoPath, userId), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Gets the diff for a specific file.
    /// </summary>
    [HttpGet("diff")]
    public async Task<ActionResult<GitDiffResult>> GetDiff(
        [FromQuery] string repoPath,
        [FromQuery] string filePath,
        [FromQuery] bool staged = false,
        CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new GetDiffQuery(repoPath, filePath, staged, userId), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Stages files for commit.
    /// </summary>
    [HttpPost("stage")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult> StageFiles([FromBody] GitStageRequest request, CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new StageFilesCommand(request.RepoPath, request.Files, userId), cancellationToken);
        return HandleSuccessResult(result);
    }

    /// <summary>
    /// Unstages files from the staging area.
    /// </summary>
    [HttpPost("unstage")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult> UnstageFiles([FromBody] GitUnstageRequest request, CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new UnstageFilesCommand(request.RepoPath, request.Files, userId), cancellationToken);
        return HandleSuccessResult(result);
    }

    /// <summary>
    /// Creates a commit with the staged changes.
    /// </summary>
    [HttpPost("commit")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult<object>> Commit([FromBody] GitCommitRequest request, CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new CommitCommand(request.RepoPath, request.Message, userId), cancellationToken);
        return result.Match<ActionResult<object>>(
            onSuccess: hash => Ok(new { success = true, commitHash = hash }),
            onFailure: HandleError<object>
        );
    }

    /// <summary>
    /// Pushes commits to the remote repository.
    /// </summary>
    [HttpPost("push")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult<GitOperationResult>> Push([FromBody] GitRemoteRequest request, CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new PushCommand(request.RepoPath, request.Remote, request.Branch, userId), cancellationToken);
        return HandleOperationResult(result);
    }

    /// <summary>
    /// Pulls changes from the remote repository.
    /// </summary>
    [HttpPost("pull")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult<GitOperationResult>> Pull([FromBody] GitRemoteRequest request, CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new PullCommand(request.RepoPath, request.Remote, request.Branch, userId), cancellationToken);
        return HandleOperationResult(result);
    }

    /// <summary>
    /// Gets the commit log for a repository.
    /// </summary>
    [HttpGet("log")]
    public async Task<ActionResult<List<GitLogEntry>>> GetLog(
        [FromQuery] string repoPath,
        [FromQuery] int count = 20,
        CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new GetLogQuery(repoPath, count, userId), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Discards changes to a file (restores to last committed state).
    /// </summary>
    [HttpPost("discard")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult> DiscardChanges([FromBody] GitDiffRequest request, CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new DiscardChangesCommand(request.RepoPath, request.FilePath, userId), cancellationToken);
        return HandleSuccessResult(result);
    }

    /// <summary>
    /// Gets all branches in the repository.
    /// </summary>
    [HttpGet("branches")]
    public async Task<ActionResult<List<GitBranch>>> GetBranches(
        [FromQuery] string repoPath,
        [FromQuery] bool includeRemote = true,
        CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new GetBranchesQuery(repoPath, includeRemote, userId), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Switches to a different branch.
    /// </summary>
    [HttpPost("branches/switch")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult> SwitchBranch([FromBody] GitSwitchBranchRequest request, CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new SwitchBranchCommand(request.RepoPath, request.BranchName, userId), cancellationToken);
        return HandleSuccessResult(result);
    }

    /// <summary>
    /// Creates a new branch.
    /// </summary>
    [HttpPost("branches/create")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult> CreateBranch([FromBody] GitCreateBranchRequest request, CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new CreateBranchCommand(
            request.RepoPath,
            request.BranchName,
            request.SwitchToNewBranch,
            request.BaseBranch,
            userId), cancellationToken);
        return HandleSuccessResult(result);
    }

    /// <summary>
    /// Deletes a branch.
    /// </summary>
    [HttpPost("branches/delete")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult> DeleteBranch([FromBody] GitDeleteBranchRequest request, CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new DeleteBranchCommand(request.RepoPath, request.BranchName, request.Force, userId), cancellationToken);
        return HandleSuccessResult(result);
    }

    /// <summary>
    /// Merges a branch into the current branch.
    /// </summary>
    [HttpPost("branches/merge")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult<GitOperationResult>> MergeBranch([FromBody] GitMergeBranchRequest request, CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new MergeBranchCommand(request.RepoPath, request.BranchName, request.Message, userId), cancellationToken);
        return HandleOperationResult(result);
    }

    /// <summary>
    /// Publishes a local branch to the remote repository.
    /// </summary>
    [HttpPost("branches/publish")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult<GitOperationResult>> PublishBranch([FromBody] GitPublishBranchRequest request, CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var result = await _mediator.Send(new PublishBranchCommand(request.RepoPath, request.BranchName, request.Remote, userId), cancellationToken);
        return HandleOperationResult(result);
    }

    #region Helper Methods

    private string? GetUserId() => HttpContext.Items["UserId"]?.ToString();

    private ActionResult<T> HandleResult<T>(Result<T> result)
    {
        return result.Match<ActionResult<T>>(
            onSuccess: value => Ok(value),
            onFailure: HandleError<T>
        );
    }

    private ActionResult HandleSuccessResult(Result<bool> result)
    {
        return result.Match<ActionResult>(
            onSuccess: _ => Ok(new { success = true }),
            onFailure: error => error.Code switch
            {
                "Forbidden" or "Unauthorized" => StatusCode(StatusCodes.Status403Forbidden, new { error = error.Message, code = error.Code }),
                "InvalidPath" or "InvalidRepository" or "NoFiles" or "InvalidPaths" or "NoMessage" or
                "CommitError" or "InvalidRemote" or "InvalidBranch" or "InvalidBranchName" or
                "InvalidBaseBranch" or "CreateBranchError" or "CannotDeleteCurrent" or "DeleteBranchError" or
                "SwitchError" or "MergeError" or "PublishError" => BadRequest(new { error = error.Message }),
                "PathNotFound" => NotFound(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    private ActionResult<GitOperationResult> HandleOperationResult(Result<GitOperationResult> result)
    {
        return result.Match<ActionResult<GitOperationResult>>(
            onSuccess: opResult => opResult.Success
                ? Ok(opResult)
                : BadRequest(opResult),
            onFailure: error => HandleError<GitOperationResult>(error)
        );
    }

    private ActionResult<T> HandleError<T>(Error error)
    {
        return error.Code switch
        {
            "Forbidden" or "Unauthorized" => StatusCode(StatusCodes.Status403Forbidden, new { error = error.Message, code = error.Code }),
            "InvalidPath" or "InvalidRepository" or "NoFiles" or "InvalidPaths" or "NoMessage" or
            "CommitError" or "InvalidRemote" or "InvalidBranch" or "InvalidBranchName" or
            "InvalidBaseBranch" or "CreateBranchError" or "CannotDeleteCurrent" or "DeleteBranchError" or
            "SwitchError" or "MergeError" or "PublishError" => BadRequest(new { error = error.Message }),
            "PathNotFound" => NotFound(new { error = error.Message }),
            _ => StatusCode(500, new { error = error.Message })
        };
    }

    #endregion
}
