using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Services.Git;

/// <summary>
/// Service interface for Git operations.
/// Provides secure access to Git commands with proper validation and error handling.
/// </summary>
public interface IGitService
{
    /// <summary>
    /// Validates that the given path is a valid Git repository.
    /// </summary>
    /// <param name="repoPath">The path to validate.</param>
    /// <returns>True if the path is a valid Git repository, false otherwise.</returns>
    Task<Result<bool>> ValidateRepositoryAsync(string repoPath);

    /// <summary>
    /// Gets the current status of the Git repository.
    /// </summary>
    /// <param name="repoPath">The path to the Git repository.</param>
    /// <returns>The Git status including staged, unstaged, and untracked files.</returns>
    Task<Result<GitStatus>> GetStatusAsync(string repoPath);

    /// <summary>
    /// Gets the diff for a specific file.
    /// </summary>
    /// <param name="repoPath">The path to the Git repository.</param>
    /// <param name="filePath">The file path relative to the repository root.</param>
    /// <param name="staged">Whether to show the staged diff (vs unstaged).</param>
    /// <returns>The diff result including additions and deletions count.</returns>
    Task<Result<GitDiffResult>> GetDiffAsync(string repoPath, string filePath, bool staged = false);

    /// <summary>
    /// Stages files for commit.
    /// </summary>
    /// <param name="repoPath">The path to the Git repository.</param>
    /// <param name="files">The files to stage. Use "." to stage all.</param>
    /// <returns>True if successful.</returns>
    Task<Result<bool>> StageFilesAsync(string repoPath, string[] files);

    /// <summary>
    /// Unstages files from the staging area.
    /// </summary>
    /// <param name="repoPath">The path to the Git repository.</param>
    /// <param name="files">The files to unstage. Use "." to unstage all.</param>
    /// <returns>True if successful.</returns>
    Task<Result<bool>> UnstageFilesAsync(string repoPath, string[] files);

    /// <summary>
    /// Creates a commit with the staged changes.
    /// </summary>
    /// <param name="repoPath">The path to the Git repository.</param>
    /// <param name="message">The commit message.</param>
    /// <returns>The commit hash if successful.</returns>
    Task<Result<string>> CommitAsync(string repoPath, string message);

    /// <summary>
    /// Pushes commits to the remote repository.
    /// </summary>
    /// <param name="repoPath">The path to the Git repository.</param>
    /// <param name="remote">The remote name (defaults to "origin").</param>
    /// <param name="branch">The branch name (defaults to current branch).</param>
    /// <returns>The operation result.</returns>
    Task<Result<GitOperationResult>> PushAsync(string repoPath, string? remote = null, string? branch = null);

    /// <summary>
    /// Pulls changes from the remote repository.
    /// </summary>
    /// <param name="repoPath">The path to the Git repository.</param>
    /// <param name="remote">The remote name (defaults to "origin").</param>
    /// <param name="branch">The branch name (defaults to current branch).</param>
    /// <returns>The operation result.</returns>
    Task<Result<GitOperationResult>> PullAsync(string repoPath, string? remote = null, string? branch = null);

    /// <summary>
    /// Gets the commit log for the repository.
    /// </summary>
    /// <param name="repoPath">The path to the Git repository.</param>
    /// <param name="count">Maximum number of commits to return.</param>
    /// <returns>A list of commit entries.</returns>
    Task<Result<List<GitLogEntry>>> GetLogAsync(string repoPath, int count = 20);

    /// <summary>
    /// Discards changes to a file (restores to last committed state).
    /// </summary>
    /// <param name="repoPath">The path to the Git repository.</param>
    /// <param name="filePath">The file path to discard.</param>
    /// <returns>True if successful.</returns>
    Task<Result<bool>> DiscardChangesAsync(string repoPath, string filePath);
}
