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

    /// <summary>
    /// Gets all branches in the repository.
    /// </summary>
    /// <param name="repoPath">The path to the Git repository.</param>
    /// <param name="includeRemote">Whether to include remote branches.</param>
    /// <returns>List of branches.</returns>
    Task<Result<List<GitBranch>>> GetBranchesAsync(string repoPath, bool includeRemote = true);

    /// <summary>
    /// Switches to a different branch.
    /// </summary>
    /// <param name="repoPath">The path to the Git repository.</param>
    /// <param name="branchName">The branch to switch to.</param>
    /// <returns>True if successful.</returns>
    Task<Result<bool>> SwitchBranchAsync(string repoPath, string branchName);

    /// <summary>
    /// Creates a new branch.
    /// </summary>
    /// <param name="repoPath">The path to the Git repository.</param>
    /// <param name="branchName">The name for the new branch.</param>
    /// <param name="switchToNewBranch">Whether to switch to the new branch after creation.</param>
    /// <param name="baseBranch">Optional base branch or commit. Defaults to current HEAD.</param>
    /// <returns>True if successful.</returns>
    Task<Result<bool>> CreateBranchAsync(string repoPath, string branchName, bool switchToNewBranch = true, string? baseBranch = null);

    /// <summary>
    /// Deletes a branch.
    /// </summary>
    /// <param name="repoPath">The path to the Git repository.</param>
    /// <param name="branchName">The branch to delete.</param>
    /// <param name="force">Force delete even if not fully merged.</param>
    /// <returns>True if successful.</returns>
    Task<Result<bool>> DeleteBranchAsync(string repoPath, string branchName, bool force = false);

    /// <summary>
    /// Merges a branch into the current branch.
    /// </summary>
    /// <param name="repoPath">The path to the Git repository.</param>
    /// <param name="branchName">The branch to merge.</param>
    /// <param name="message">Optional merge commit message.</param>
    /// <returns>The operation result.</returns>
    Task<Result<GitOperationResult>> MergeBranchAsync(string repoPath, string branchName, string? message = null);

    /// <summary>
    /// Publishes a local branch to the remote repository.
    /// </summary>
    /// <param name="repoPath">The path to the Git repository.</param>
    /// <param name="branchName">The branch to publish.</param>
    /// <param name="remote">The remote name (defaults to "origin").</param>
    /// <returns>The operation result.</returns>
    Task<Result<GitOperationResult>> PublishBranchAsync(string repoPath, string branchName, string? remote = null);
}
