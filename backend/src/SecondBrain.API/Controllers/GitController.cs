using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SecondBrain.Application.Services.Git;
using SecondBrain.Application.Services.Git.Models;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Controller for Git operations.
/// Provides secure access to Git repositories with authentication.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
[Produces("application/json")]
public class GitController : ControllerBase
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<GitController> _logger;

    public GitController(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<GitController> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    /// <summary>
    /// Validates that the given path is a valid Git repository.
    /// </summary>
    [HttpGet("validate")]
    public async Task<ActionResult<bool>> ValidateRepository([FromQuery] string repoPath)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(repoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogDebug("User {UserId} validating repository at {RepoPath}", userId, repoPath);

        var result = await _gitService.ValidateRepositoryAsync(authorizedPath.Value!);
        return result.Match<ActionResult<bool>>(
            onSuccess: valid => Ok(valid),
            onFailure: error => error.Code switch
            {
                "InvalidPath" => BadRequest(new { error = error.Message }),
                "PathNotFound" => NotFound(new { error = error.Message }),
                "InvalidRepository" => BadRequest(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Gets the current status of a Git repository.
    /// </summary>
    [HttpGet("status")]
    public async Task<ActionResult<GitStatus>> GetStatus([FromQuery] string repoPath)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(repoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogDebug("User {UserId} getting status for {RepoPath}", userId, repoPath);

        var result = await _gitService.GetStatusAsync(authorizedPath.Value!);
        return result.Match<ActionResult<GitStatus>>(
            onSuccess: status => Ok(status),
            onFailure: error => error.Code switch
            {
                "InvalidPath" => BadRequest(new { error = error.Message }),
                "PathNotFound" => NotFound(new { error = error.Message }),
                "InvalidRepository" => BadRequest(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Gets the diff for a specific file.
    /// </summary>
    [HttpGet("diff")]
    public async Task<ActionResult<GitDiffResult>> GetDiff(
        [FromQuery] string repoPath,
        [FromQuery] string filePath,
        [FromQuery] bool staged = false)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(repoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogDebug("User {UserId} getting diff for {FilePath} (staged: {Staged}) in {RepoPath}",
            userId, filePath, staged, repoPath);

        var result = await _gitService.GetDiffAsync(authorizedPath.Value!, filePath, staged);
        return result.Match<ActionResult<GitDiffResult>>(
            onSuccess: diff => Ok(diff),
            onFailure: error => error.Code switch
            {
                "InvalidPath" => BadRequest(new { error = error.Message }),
                "PathNotFound" => NotFound(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Stages files for commit.
    /// </summary>
    [HttpPost("stage")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult> StageFiles([FromBody] GitStageRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(request.RepoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogInformation("User {UserId} staging {FileCount} files in {RepoPath}",
            userId, request.Files.Length, request.RepoPath);

        var result = await _gitService.StageFilesAsync(authorizedPath.Value!, request.Files);
        return result.Match<ActionResult>(
            onSuccess: _ => Ok(new { success = true }),
            onFailure: error => error.Code switch
            {
                "NoFiles" => BadRequest(new { error = error.Message }),
                "InvalidPaths" => BadRequest(new { error = error.Message }),
                "InvalidPath" => BadRequest(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Unstages files from the staging area.
    /// </summary>
    [HttpPost("unstage")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult> UnstageFiles([FromBody] GitUnstageRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(request.RepoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogInformation("User {UserId} unstaging {FileCount} files in {RepoPath}",
            userId, request.Files.Length, request.RepoPath);

        var result = await _gitService.UnstageFilesAsync(authorizedPath.Value!, request.Files);
        return result.Match<ActionResult>(
            onSuccess: _ => Ok(new { success = true }),
            onFailure: error => error.Code switch
            {
                "NoFiles" => BadRequest(new { error = error.Message }),
                "InvalidPaths" => BadRequest(new { error = error.Message }),
                "InvalidPath" => BadRequest(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Creates a commit with the staged changes.
    /// </summary>
    [HttpPost("commit")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult<object>> Commit([FromBody] GitCommitRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(request.RepoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogInformation("User {UserId} creating commit in {RepoPath}", userId, request.RepoPath);

        var result = await _gitService.CommitAsync(authorizedPath.Value!, request.Message);
        return result.Match<ActionResult<object>>(
            onSuccess: hash => Ok(new { success = true, commitHash = hash }),
            onFailure: error => error.Code switch
            {
                "NoMessage" => BadRequest(new { error = error.Message }),
                "InvalidPath" => BadRequest(new { error = error.Message }),
                "CommitError" => BadRequest(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Pushes commits to the remote repository.
    /// </summary>
    [HttpPost("push")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult<GitOperationResult>> Push([FromBody] GitRemoteRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(request.RepoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogInformation("User {UserId} pushing in {RepoPath}", userId, request.RepoPath);

        var result = await _gitService.PushAsync(authorizedPath.Value!, request.Remote, request.Branch);
        return result.Match<ActionResult<GitOperationResult>>(
            onSuccess: opResult => opResult.Success
                ? Ok(opResult)
                : BadRequest(opResult),
            onFailure: error => error.Code switch
            {
                "InvalidPath" => BadRequest(new GitOperationResult { Success = false, Error = error.Message }),
                "InvalidRemote" => BadRequest(new GitOperationResult { Success = false, Error = error.Message }),
                "InvalidBranch" => BadRequest(new GitOperationResult { Success = false, Error = error.Message }),
                _ => StatusCode(500, new GitOperationResult { Success = false, Error = error.Message })
            }
        );
    }

    /// <summary>
    /// Pulls changes from the remote repository.
    /// </summary>
    [HttpPost("pull")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult<GitOperationResult>> Pull([FromBody] GitRemoteRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(request.RepoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogInformation("User {UserId} pulling in {RepoPath}", userId, request.RepoPath);

        var result = await _gitService.PullAsync(authorizedPath.Value!, request.Remote, request.Branch);
        return result.Match<ActionResult<GitOperationResult>>(
            onSuccess: opResult => opResult.Success
                ? Ok(opResult)
                : BadRequest(opResult),
            onFailure: error => error.Code switch
            {
                "InvalidPath" => BadRequest(new GitOperationResult { Success = false, Error = error.Message }),
                "InvalidRemote" => BadRequest(new GitOperationResult { Success = false, Error = error.Message }),
                "InvalidBranch" => BadRequest(new GitOperationResult { Success = false, Error = error.Message }),
                _ => StatusCode(500, new GitOperationResult { Success = false, Error = error.Message })
            }
        );
    }

    /// <summary>
    /// Gets the commit log for a repository.
    /// </summary>
    [HttpGet("log")]
    public async Task<ActionResult<List<GitLogEntry>>> GetLog(
        [FromQuery] string repoPath,
        [FromQuery] int count = 20)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(repoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogDebug("User {UserId} getting log for {RepoPath}", userId, repoPath);

        var result = await _gitService.GetLogAsync(authorizedPath.Value!, count);
        return result.Match<ActionResult<List<GitLogEntry>>>(
            onSuccess: log => Ok(log),
            onFailure: error => error.Code switch
            {
                "InvalidPath" => BadRequest(new { error = error.Message }),
                "PathNotFound" => NotFound(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Discards changes to a file (restores to last committed state).
    /// </summary>
    [HttpPost("discard")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult> DiscardChanges([FromBody] GitDiffRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(request.RepoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogInformation("User {UserId} discarding changes to {FilePath} in {RepoPath}",
            userId, request.FilePath, request.RepoPath);

        var result = await _gitService.DiscardChangesAsync(authorizedPath.Value!, request.FilePath);
        return result.Match<ActionResult>(
            onSuccess: _ => Ok(new { success = true }),
            onFailure: error => error.Code switch
            {
                "InvalidPath" => BadRequest(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Gets all branches in the repository.
    /// </summary>
    [HttpGet("branches")]
    public async Task<ActionResult<List<GitBranch>>> GetBranches(
        [FromQuery] string repoPath,
        [FromQuery] bool includeRemote = true)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(repoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogDebug("User {UserId} getting branches for {RepoPath}", userId, repoPath);

        var result = await _gitService.GetBranchesAsync(authorizedPath.Value!, includeRemote);
        return result.Match<ActionResult<List<GitBranch>>>(
            onSuccess: branches => Ok(branches),
            onFailure: error => error.Code switch
            {
                "InvalidPath" => BadRequest(new { error = error.Message }),
                "PathNotFound" => NotFound(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Switches to a different branch.
    /// </summary>
    [HttpPost("branches/switch")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult> SwitchBranch([FromBody] GitSwitchBranchRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(request.RepoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogInformation("User {UserId} switching to branch {BranchName} in {RepoPath}",
            userId, request.BranchName, request.RepoPath);

        var result = await _gitService.SwitchBranchAsync(authorizedPath.Value!, request.BranchName);
        return result.Match<ActionResult>(
            onSuccess: _ => Ok(new { success = true }),
            onFailure: error => error.Code switch
            {
                "InvalidPath" => BadRequest(new { error = error.Message }),
                "InvalidBranchName" => BadRequest(new { error = error.Message }),
                "SwitchError" => BadRequest(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Creates a new branch.
    /// </summary>
    [HttpPost("branches/create")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult> CreateBranch([FromBody] GitCreateBranchRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(request.RepoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogInformation("User {UserId} creating branch {BranchName} in {RepoPath}",
            userId, request.BranchName, request.RepoPath);

        var result = await _gitService.CreateBranchAsync(
            authorizedPath.Value!,
            request.BranchName,
            request.SwitchToNewBranch,
            request.BaseBranch);

        return result.Match<ActionResult>(
            onSuccess: _ => Ok(new { success = true }),
            onFailure: error => error.Code switch
            {
                "InvalidPath" => BadRequest(new { error = error.Message }),
                "InvalidBranchName" => BadRequest(new { error = error.Message }),
                "InvalidBaseBranch" => BadRequest(new { error = error.Message }),
                "CreateBranchError" => BadRequest(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Deletes a branch.
    /// </summary>
    [HttpPost("branches/delete")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult> DeleteBranch([FromBody] GitDeleteBranchRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(request.RepoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogInformation("User {UserId} deleting branch {BranchName} in {RepoPath}",
            userId, request.BranchName, request.RepoPath);

        var result = await _gitService.DeleteBranchAsync(authorizedPath.Value!, request.BranchName, request.Force);
        return result.Match<ActionResult>(
            onSuccess: _ => Ok(new { success = true }),
            onFailure: error => error.Code switch
            {
                "InvalidPath" => BadRequest(new { error = error.Message }),
                "InvalidBranchName" => BadRequest(new { error = error.Message }),
                "CannotDeleteCurrent" => BadRequest(new { error = error.Message }),
                "DeleteBranchError" => BadRequest(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Merges a branch into the current branch.
    /// </summary>
    [HttpPost("branches/merge")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult<GitOperationResult>> MergeBranch([FromBody] GitMergeBranchRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(request.RepoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogInformation("User {UserId} merging branch {BranchName} in {RepoPath}",
            userId, request.BranchName, request.RepoPath);

        var result = await _gitService.MergeBranchAsync(authorizedPath.Value!, request.BranchName, request.Message);
        return result.Match<ActionResult<GitOperationResult>>(
            onSuccess: opResult => opResult.Success
                ? Ok(opResult)
                : BadRequest(opResult),
            onFailure: error => error.Code switch
            {
                "InvalidPath" => BadRequest(new GitOperationResult { Success = false, Error = error.Message }),
                "InvalidBranchName" => BadRequest(new GitOperationResult { Success = false, Error = error.Message }),
                "MergeError" => BadRequest(new GitOperationResult { Success = false, Error = error.Message }),
                _ => StatusCode(500, new GitOperationResult { Success = false, Error = error.Message })
            }
        );
    }

    /// <summary>
    /// Publishes a local branch to the remote repository.
    /// </summary>
    [HttpPost("branches/publish")]
    [EnableRateLimiting("ai-requests")]
    public async Task<ActionResult<GitOperationResult>> PublishBranch([FromBody] GitPublishBranchRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Not authenticated" });

        var authorizedPath = AuthorizeRepoPath(request.RepoPath, userId);
        if (authorizedPath.Result is not null)
            return authorizedPath.Result;

        _logger.LogInformation("User {UserId} publishing branch {BranchName} in {RepoPath}",
            userId, request.BranchName, request.RepoPath);

        var result = await _gitService.PublishBranchAsync(authorizedPath.Value!, request.BranchName, request.Remote);
        return result.Match<ActionResult<GitOperationResult>>(
            onSuccess: opResult => opResult.Success
                ? Ok(opResult)
                : BadRequest(opResult),
            onFailure: error => error.Code switch
            {
                "InvalidPath" => BadRequest(new GitOperationResult { Success = false, Error = error.Message }),
                "InvalidBranchName" => BadRequest(new GitOperationResult { Success = false, Error = error.Message }),
                "InvalidRemote" => BadRequest(new GitOperationResult { Success = false, Error = error.Message }),
                "PublishError" => BadRequest(new GitOperationResult { Success = false, Error = error.Message }),
                _ => StatusCode(500, new GitOperationResult { Success = false, Error = error.Message })
            }
        );
    }

    private string? GetUserId()
    {
        return HttpContext.Items["UserId"]?.ToString();
    }

    private ActionResult<string> AuthorizeRepoPath(string repoPath, string userId)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(repoPath, userId);
        if (authResult.IsFailure)
        {
            var error = authResult.Error!;
            return StatusCode(StatusCodes.Status403Forbidden, new { error = error.Message, code = error.Code });
        }

        return authResult.Value!;
    }
}
