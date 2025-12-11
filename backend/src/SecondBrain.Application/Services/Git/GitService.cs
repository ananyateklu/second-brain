using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Services.Git;

/// <summary>
/// Service for executing Git commands securely.
/// All commands are whitelisted and executed without shell to prevent injection attacks.
/// </summary>
public partial class GitService : IGitService
{
    private readonly ILogger<GitService> _logger;
    private static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan LongTimeout = TimeSpan.FromMinutes(5); // For push/pull

    // Whitelist of allowed git subcommands
    private static readonly HashSet<string> AllowedCommands = new(StringComparer.OrdinalIgnoreCase)
    {
        "status", "diff", "add", "reset", "commit", "push", "pull", "log", "branch", "rev-parse", "remote", "restore", "rev-list", "switch", "checkout", "merge", "for-each-ref"
    };

    public GitService(ILogger<GitService> logger)
    {
        _logger = logger;
    }

    public async Task<Result<bool>> ValidateRepositoryAsync(string repoPath)
    {
        try
        {
            var validationResult = ValidateRepoPath(repoPath);
            if (validationResult.IsFailure)
                return Result<bool>.Failure(validationResult.Error!);

            var gitDir = Path.Combine(repoPath, ".git");
            if (!Directory.Exists(gitDir) && !File.Exists(gitDir)) // .git can be a file for worktrees
            {
                return Result<bool>.Failure("InvalidRepository", "The specified path is not a Git repository (no .git directory found)");
            }

            // Verify it's a valid git repo by running git rev-parse
            var (exitCode, _, _) = await ExecuteGitCommandAsync(repoPath, ["rev-parse", "--git-dir"]);
            if (exitCode != 0)
            {
                return Result<bool>.Failure("InvalidRepository", "The specified path is not a valid Git repository");
            }

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating repository at {RepoPath}", repoPath);
            return Result<bool>.Failure("ValidationError", $"Failed to validate repository: {ex.Message}");
        }
    }

    public async Task<Result<GitStatus>> GetStatusAsync(string repoPath)
    {
        try
        {
            var validationResult = await ValidateRepositoryAsync(repoPath);
            if (validationResult.IsFailure)
                return Result<GitStatus>.Failure(validationResult.Error!);

            var status = new GitStatus();

            // Run independent git commands in parallel for better performance
            var branchTask = ExecuteGitCommandAsync(repoPath, ["branch", "--show-current"]);
            var remoteTask = ExecuteGitCommandAsync(repoPath, ["remote"]);
            var statusTask = ExecuteGitCommandAsync(repoPath, ["status", "--porcelain=v1", "-z", "-uall"]);

            // Wait for all to complete
            await Task.WhenAll(branchTask, remoteTask, statusTask);

            // Process branch result
            var (branchExitCode, branchOutput, _) = branchTask.Result;
            status.Branch = branchExitCode == 0 ? branchOutput.Trim() : "HEAD (detached)";

            // Process remote result
            var (remoteExitCode, remoteOutput, _) = remoteTask.Result;
            status.HasRemote = remoteExitCode == 0 && !string.IsNullOrWhiteSpace(remoteOutput);
            if (status.HasRemote)
            {
                status.RemoteName = remoteOutput.Split('\n', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.Trim() ?? "origin";
            }

            // Get ahead/behind counts (requires branch and remote info first)
            if (status.HasRemote && !string.IsNullOrEmpty(status.Branch))
            {
                var (countExitCode, countOutput, _) = await ExecuteGitCommandAsync(repoPath,
                    ["rev-list", "--left-right", "--count", $"{status.RemoteName}/{status.Branch}...HEAD"]);

                if (countExitCode == 0 && !string.IsNullOrWhiteSpace(countOutput))
                {
                    var parts = countOutput.Trim().Split('\t');
                    if (parts.Length >= 2)
                    {
                        int.TryParse(parts[0], out var behind);
                        int.TryParse(parts[1], out var ahead);
                        status.Behind = behind;
                        status.Ahead = ahead;
                    }
                }
            }

            // Process porcelain status for staged/unstaged/untracked
            var (statusExitCode, statusOutput, _) = statusTask.Result;
            if (statusExitCode == 0 && !string.IsNullOrEmpty(statusOutput))
            {
                ParsePorcelainStatus(statusOutput, status);
            }

            return Result<GitStatus>.Success(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting status for repository at {RepoPath}", repoPath);
            return Result<GitStatus>.Failure("StatusError", $"Failed to get repository status: {ex.Message}");
        }
    }

    public async Task<Result<GitDiffResult>> GetDiffAsync(string repoPath, string filePath, bool staged = false)
    {
        try
        {
            var validationResult = await ValidateRepositoryAsync(repoPath);
            if (validationResult.IsFailure)
                return Result<GitDiffResult>.Failure(validationResult.Error!);

            // Sanitize file path
            var sanitizedPath = SanitizeFilePath(filePath);
            if (sanitizedPath == null)
                return Result<GitDiffResult>.Failure("InvalidPath", "Invalid file path");

            var args = staged
                ? new[] { "diff", "--cached", "--", sanitizedPath }
                : new[] { "diff", "--", sanitizedPath };

            var (exitCode, output, error) = await ExecuteGitCommandAsync(repoPath, args);

            if (exitCode != 0 && !string.IsNullOrEmpty(error))
            {
                return Result<GitDiffResult>.Failure("DiffError", $"Failed to get diff: {error}");
            }

            // If diff is empty, check if this is an untracked file or newly added file
            if (string.IsNullOrWhiteSpace(output))
            {
                var fullPath = Path.Combine(repoPath, sanitizedPath);
                _logger.LogDebug("Empty diff for {FilePath}, checking if file exists at {FullPath}", filePath, fullPath);

                if (File.Exists(fullPath))
                {
                    // Check if file is untracked or newly staged using git status
                    var (statusExitCode, statusOutput, _) = await ExecuteGitCommandAsync(repoPath,
                        ["status", "--porcelain", "--", sanitizedPath]);

                    _logger.LogDebug("Git status for {FilePath}: exitCode={ExitCode}, output='{Output}'",
                        filePath, statusExitCode, statusOutput.Trim());

                    // Check for untracked (??) or newly added (A ) files
                    var trimmedStatus = statusOutput.Trim();
                    var isUntracked = trimmedStatus.StartsWith("??");
                    var isNewlyAdded = trimmedStatus.StartsWith("A ");

                    if (statusExitCode == 0 && (isUntracked || isNewlyAdded))
                    {
                        // This is an untracked or newly added file - show content as new file diff
                        try
                        {
                            var fileContent = await File.ReadAllTextAsync(fullPath);
                            var lines = fileContent.Split('\n');
                            var diffBuilder = new StringBuilder();
                            diffBuilder.AppendLine($"diff --git a/{sanitizedPath} b/{sanitizedPath}");
                            diffBuilder.AppendLine("new file mode 100644");
                            diffBuilder.AppendLine("--- /dev/null");
                            diffBuilder.AppendLine($"+++ b/{sanitizedPath}");
                            diffBuilder.AppendLine($"@@ -0,0 +1,{lines.Length} @@");

                            foreach (var line in lines)
                            {
                                diffBuilder.AppendLine($"+{line}");
                            }

                            _logger.LogDebug("Generated diff for new file {FilePath} with {Lines} lines", filePath, lines.Length);

                            return Result<GitDiffResult>.Success(new GitDiffResult
                            {
                                FilePath = filePath,
                                Diff = diffBuilder.ToString(),
                                Additions = lines.Length,
                                Deletions = 0
                            });
                        }
                        catch (Exception readEx)
                        {
                            _logger.LogWarning(readEx, "Could not read file {FilePath}", filePath);
                            // Fall through to return empty diff
                        }
                    }
                }
                else
                {
                    _logger.LogDebug("File does not exist at {FullPath}", fullPath);
                }
            }

            var result = new GitDiffResult
            {
                FilePath = filePath,
                Diff = output
            };

            // Count additions and deletions
            foreach (var line in output.Split('\n'))
            {
                if (line.StartsWith('+') && !line.StartsWith("+++"))
                    result.Additions++;
                else if (line.StartsWith('-') && !line.StartsWith("---"))
                    result.Deletions++;
            }

            return Result<GitDiffResult>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting diff for {FilePath} in {RepoPath}", filePath, repoPath);
            return Result<GitDiffResult>.Failure("DiffError", $"Failed to get diff: {ex.Message}");
        }
    }

    public async Task<Result<bool>> StageFilesAsync(string repoPath, string[] files)
    {
        try
        {
            // Fast path validation - skip full validation for performance
            // Git command will fail if repo is invalid anyway
            var pathValidation = ValidateRepoPath(repoPath);
            if (pathValidation.IsFailure)
                return Result<bool>.Failure(pathValidation.Error!);

            if (files.Length == 0)
                return Result<bool>.Failure("NoFiles", "No files specified to stage");

            var sanitizedFiles = files.Select(SanitizeFilePath).Where(f => f != null).ToArray();
            if (sanitizedFiles.Length == 0)
                return Result<bool>.Failure("InvalidPaths", "All specified file paths are invalid");

            var args = new List<string> { "add", "--" };
            args.AddRange(sanitizedFiles!);

            var (exitCode, _, error) = await ExecuteGitCommandAsync(repoPath, args.ToArray());

            if (exitCode != 0)
            {
                return Result<bool>.Failure("StageError", $"Failed to stage files: {error}");
            }

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error staging files in {RepoPath}", repoPath);
            return Result<bool>.Failure("StageError", $"Failed to stage files: {ex.Message}");
        }
    }

    public async Task<Result<bool>> UnstageFilesAsync(string repoPath, string[] files)
    {
        try
        {
            // Fast path validation - skip full validation for performance
            var pathValidation = ValidateRepoPath(repoPath);
            if (pathValidation.IsFailure)
                return Result<bool>.Failure(pathValidation.Error!);

            if (files.Length == 0)
                return Result<bool>.Failure("NoFiles", "No files specified to unstage");

            var sanitizedFiles = files.Select(SanitizeFilePath).Where(f => f != null).ToArray();
            if (sanitizedFiles.Length == 0)
                return Result<bool>.Failure("InvalidPaths", "All specified file paths are invalid");

            var args = new List<string> { "reset", "HEAD", "--" };
            args.AddRange(sanitizedFiles!);

            var (exitCode, _, error) = await ExecuteGitCommandAsync(repoPath, args.ToArray());

            // Exit code 1 is acceptable for reset (means no changes were made)
            if (exitCode != 0 && exitCode != 1)
            {
                return Result<bool>.Failure("UnstageError", $"Failed to unstage files: {error}");
            }

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unstaging files in {RepoPath}", repoPath);
            return Result<bool>.Failure("UnstageError", $"Failed to unstage files: {ex.Message}");
        }
    }

    public async Task<Result<string>> CommitAsync(string repoPath, string message)
    {
        try
        {
            var validationResult = await ValidateRepositoryAsync(repoPath);
            if (validationResult.IsFailure)
                return Result<string>.Failure(validationResult.Error!);

            if (string.IsNullOrWhiteSpace(message))
                return Result<string>.Failure("NoMessage", "Commit message is required");

            // Sanitize the commit message - remove any potential command injection
            var sanitizedMessage = message.Replace("\"", "\\\"").Replace("$", "\\$").Replace("`", "\\`");

            var (exitCode, output, error) = await ExecuteGitCommandAsync(repoPath, ["commit", "-m", sanitizedMessage]);

            if (exitCode != 0)
            {
                return Result<string>.Failure("CommitError", $"Failed to commit: {error}");
            }

            // Extract commit hash from output
            var hashMatch = CommitHashRegex().Match(output);
            var commitHash = hashMatch.Success ? hashMatch.Groups[1].Value : "unknown";

            return Result<string>.Success(commitHash);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error committing in {RepoPath}", repoPath);
            return Result<string>.Failure("CommitError", $"Failed to commit: {ex.Message}");
        }
    }

    public async Task<Result<GitOperationResult>> PushAsync(string repoPath, string? remote = null, string? branch = null)
    {
        try
        {
            var validationResult = await ValidateRepositoryAsync(repoPath);
            if (validationResult.IsFailure)
                return Result<GitOperationResult>.Failure(validationResult.Error!);

            var args = new List<string> { "push" };

            if (!string.IsNullOrEmpty(remote))
            {
                if (!IsValidRemoteName(remote))
                    return Result<GitOperationResult>.Failure("InvalidRemote", "Invalid remote name");
                args.Add(remote);
            }

            if (!string.IsNullOrEmpty(branch))
            {
                if (!IsValidBranchName(branch))
                    return Result<GitOperationResult>.Failure("InvalidBranch", "Invalid branch name");
                args.Add(branch);
            }

            var (exitCode, output, error) = await ExecuteGitCommandAsync(repoPath, args.ToArray(), LongTimeout);

            var result = new GitOperationResult
            {
                Success = exitCode == 0,
                Message = exitCode == 0 ? output : error,
                Error = exitCode != 0 ? error : null
            };

            return Result<GitOperationResult>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error pushing in {RepoPath}", repoPath);
            return Result<GitOperationResult>.Failure("PushError", $"Failed to push: {ex.Message}");
        }
    }

    public async Task<Result<GitOperationResult>> PullAsync(string repoPath, string? remote = null, string? branch = null)
    {
        try
        {
            var validationResult = await ValidateRepositoryAsync(repoPath);
            if (validationResult.IsFailure)
                return Result<GitOperationResult>.Failure(validationResult.Error!);

            var args = new List<string> { "pull" };

            if (!string.IsNullOrEmpty(remote))
            {
                if (!IsValidRemoteName(remote))
                    return Result<GitOperationResult>.Failure("InvalidRemote", "Invalid remote name");
                args.Add(remote);
            }

            if (!string.IsNullOrEmpty(branch))
            {
                if (!IsValidBranchName(branch))
                    return Result<GitOperationResult>.Failure("InvalidBranch", "Invalid branch name");
                args.Add(branch);
            }

            var (exitCode, output, error) = await ExecuteGitCommandAsync(repoPath, args.ToArray(), LongTimeout);

            var result = new GitOperationResult
            {
                Success = exitCode == 0,
                Message = exitCode == 0 ? output : error,
                Error = exitCode != 0 ? error : null
            };

            return Result<GitOperationResult>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error pulling in {RepoPath}", repoPath);
            return Result<GitOperationResult>.Failure("PullError", $"Failed to pull: {ex.Message}");
        }
    }

    public async Task<Result<List<GitLogEntry>>> GetLogAsync(string repoPath, int count = 20)
    {
        try
        {
            var validationResult = await ValidateRepositoryAsync(repoPath);
            if (validationResult.IsFailure)
                return Result<List<GitLogEntry>>.Failure(validationResult.Error!);

            count = Math.Clamp(count, 1, 100);

            // Format: hash|short_hash|author_name|author_email|date|subject
            var format = "%H|%h|%an|%ae|%aI|%s";
            var (exitCode, output, error) = await ExecuteGitCommandAsync(repoPath,
                ["log", $"-{count}", $"--format={format}"]);

            if (exitCode != 0)
            {
                return Result<List<GitLogEntry>>.Failure("LogError", $"Failed to get log: {error}");
            }

            var entries = new List<GitLogEntry>();
            foreach (var line in output.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = line.Split('|');
                if (parts.Length >= 6)
                {
                    entries.Add(new GitLogEntry
                    {
                        Hash = parts[0],
                        ShortHash = parts[1],
                        Author = parts[2],
                        AuthorEmail = parts[3],
                        Date = parts[4],
                        Message = parts[5]
                    });
                }
            }

            return Result<List<GitLogEntry>>.Success(entries);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting log for {RepoPath}", repoPath);
            return Result<List<GitLogEntry>>.Failure("LogError", $"Failed to get log: {ex.Message}");
        }
    }

    public async Task<Result<bool>> DiscardChangesAsync(string repoPath, string filePath)
    {
        try
        {
            var validationResult = await ValidateRepositoryAsync(repoPath);
            if (validationResult.IsFailure)
                return Result<bool>.Failure(validationResult.Error!);

            var sanitizedPath = SanitizeFilePath(filePath);
            if (sanitizedPath == null)
                return Result<bool>.Failure("InvalidPath", "Invalid file path");

            var (exitCode, _, error) = await ExecuteGitCommandAsync(repoPath,
                ["restore", "--", sanitizedPath]);

            if (exitCode != 0)
            {
                return Result<bool>.Failure("DiscardError", $"Failed to discard changes: {error}");
            }

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error discarding changes for {FilePath} in {RepoPath}", filePath, repoPath);
            return Result<bool>.Failure("DiscardError", $"Failed to discard changes: {ex.Message}");
        }
    }

    public async Task<Result<List<GitBranch>>> GetBranchesAsync(string repoPath, bool includeRemote = true)
    {
        try
        {
            var validationResult = await ValidateRepositoryAsync(repoPath);
            if (validationResult.IsFailure)
                return Result<List<GitBranch>>.Failure(validationResult.Error!);

            var branches = new List<GitBranch>();

            // Get local branches with details using for-each-ref
            // Format: refname:short, objectname:short, subject, upstream:short
            var (localExitCode, localOutput, _) = await ExecuteGitCommandAsync(repoPath,
                ["for-each-ref", "--format=%(refname:short)|%(objectname:short)|%(subject)|%(upstream:short)", "refs/heads"]);

            if (localExitCode == 0 && !string.IsNullOrWhiteSpace(localOutput))
            {
                // Get current branch to mark it
                var (_, currentBranch, _) = await ExecuteGitCommandAsync(repoPath, ["branch", "--show-current"]);
                var currentBranchName = currentBranch.Trim();

                foreach (var line in localOutput.Split('\n', StringSplitOptions.RemoveEmptyEntries))
                {
                    var parts = line.Split('|');
                    if (parts.Length >= 1)
                    {
                        var branchName = parts[0].Trim();
                        branches.Add(new GitBranch
                        {
                            Name = branchName,
                            IsCurrent = branchName == currentBranchName,
                            IsRemote = false,
                            LastCommitHash = parts.Length > 1 ? parts[1].Trim() : null,
                            LastCommitMessage = parts.Length > 2 ? parts[2].Trim() : null,
                            Upstream = parts.Length > 3 && !string.IsNullOrWhiteSpace(parts[3]) ? parts[3].Trim() : null
                        });
                    }
                }
            }

            // Get remote branches if requested
            if (includeRemote)
            {
                var (remoteExitCode, remoteOutput, _) = await ExecuteGitCommandAsync(repoPath,
                    ["for-each-ref", "--format=%(refname:short)|%(objectname:short)|%(subject)", "refs/remotes"]);

                if (remoteExitCode == 0 && !string.IsNullOrWhiteSpace(remoteOutput))
                {
                    foreach (var line in remoteOutput.Split('\n', StringSplitOptions.RemoveEmptyEntries))
                    {
                        var parts = line.Split('|');
                        if (parts.Length >= 1)
                        {
                            var fullName = parts[0].Trim();
                            // Skip HEAD references
                            if (fullName.EndsWith("/HEAD")) continue;

                            // Extract remote name (e.g., "origin" from "origin/main")
                            var slashIndex = fullName.IndexOf('/');
                            var remoteName = slashIndex > 0 ? fullName[..slashIndex] : null;
                            var branchName = slashIndex > 0 ? fullName[(slashIndex + 1)..] : fullName;

                            branches.Add(new GitBranch
                            {
                                Name = fullName,
                                IsCurrent = false,
                                IsRemote = true,
                                RemoteName = remoteName,
                                LastCommitHash = parts.Length > 1 ? parts[1].Trim() : null,
                                LastCommitMessage = parts.Length > 2 ? parts[2].Trim() : null
                            });
                        }
                    }
                }
            }

            return Result<List<GitBranch>>.Success(branches);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting branches for {RepoPath}", repoPath);
            return Result<List<GitBranch>>.Failure("BranchError", $"Failed to get branches: {ex.Message}");
        }
    }

    public async Task<Result<bool>> SwitchBranchAsync(string repoPath, string branchName)
    {
        try
        {
            var validationResult = await ValidateRepositoryAsync(repoPath);
            if (validationResult.IsFailure)
                return Result<bool>.Failure(validationResult.Error!);

            if (!IsValidBranchName(branchName))
                return Result<bool>.Failure("InvalidBranchName", "Invalid branch name");

            // Use 'git switch' for modern git, with fallback behavior
            var (exitCode, _, error) = await ExecuteGitCommandAsync(repoPath,
                ["switch", branchName]);

            if (exitCode != 0)
            {
                // If the branch is remote, try to create a tracking branch
                if (branchName.Contains('/'))
                {
                    // Extract the local branch name from remote (e.g., "origin/feature" -> "feature")
                    var localName = branchName[(branchName.LastIndexOf('/') + 1)..];
                    var (trackExitCode, _, trackError) = await ExecuteGitCommandAsync(repoPath,
                        ["switch", "-c", localName, "--track", branchName]);

                    if (trackExitCode != 0)
                    {
                        return Result<bool>.Failure("SwitchError", $"Failed to switch branch: {trackError}");
                    }
                }
                else
                {
                    return Result<bool>.Failure("SwitchError", $"Failed to switch branch: {error}");
                }
            }

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error switching to branch {BranchName} in {RepoPath}", branchName, repoPath);
            return Result<bool>.Failure("SwitchError", $"Failed to switch branch: {ex.Message}");
        }
    }

    public async Task<Result<bool>> CreateBranchAsync(string repoPath, string branchName, bool switchToNewBranch = true, string? baseBranch = null)
    {
        try
        {
            var validationResult = await ValidateRepositoryAsync(repoPath);
            if (validationResult.IsFailure)
                return Result<bool>.Failure(validationResult.Error!);

            if (!IsValidBranchName(branchName))
                return Result<bool>.Failure("InvalidBranchName", "Invalid branch name");

            if (baseBranch != null && !IsValidBranchName(baseBranch))
                return Result<bool>.Failure("InvalidBaseBranch", "Invalid base branch name");

            // Build command arguments
            var args = new List<string>();
            if (switchToNewBranch)
            {
                // Create and switch in one command
                args.AddRange(["switch", "-c", branchName]);
                if (!string.IsNullOrEmpty(baseBranch))
                {
                    args.Add(baseBranch);
                }
            }
            else
            {
                // Just create the branch without switching
                args.AddRange(["branch", branchName]);
                if (!string.IsNullOrEmpty(baseBranch))
                {
                    args.Add(baseBranch);
                }
            }

            var (exitCode, _, error) = await ExecuteGitCommandAsync(repoPath, args.ToArray());

            if (exitCode != 0)
            {
                return Result<bool>.Failure("CreateBranchError", $"Failed to create branch: {error}");
            }

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating branch {BranchName} in {RepoPath}", branchName, repoPath);
            return Result<bool>.Failure("CreateBranchError", $"Failed to create branch: {ex.Message}");
        }
    }

    public async Task<Result<bool>> DeleteBranchAsync(string repoPath, string branchName, bool force = false)
    {
        try
        {
            var validationResult = await ValidateRepositoryAsync(repoPath);
            if (validationResult.IsFailure)
                return Result<bool>.Failure(validationResult.Error!);

            if (!IsValidBranchName(branchName))
                return Result<bool>.Failure("InvalidBranchName", "Invalid branch name");

            // Prevent deleting the current branch
            var (_, currentBranch, _) = await ExecuteGitCommandAsync(repoPath, ["branch", "--show-current"]);
            if (currentBranch.Trim() == branchName)
            {
                return Result<bool>.Failure("CannotDeleteCurrent", "Cannot delete the current branch");
            }

            var args = force
                ? new[] { "branch", "-D", branchName }
                : new[] { "branch", "-d", branchName };

            var (exitCode, _, error) = await ExecuteGitCommandAsync(repoPath, args);

            if (exitCode != 0)
            {
                return Result<bool>.Failure("DeleteBranchError", $"Failed to delete branch: {error}");
            }

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting branch {BranchName} in {RepoPath}", branchName, repoPath);
            return Result<bool>.Failure("DeleteBranchError", $"Failed to delete branch: {ex.Message}");
        }
    }

    public async Task<Result<GitOperationResult>> MergeBranchAsync(string repoPath, string branchName, string? message = null)
    {
        try
        {
            var validationResult = await ValidateRepositoryAsync(repoPath);
            if (validationResult.IsFailure)
                return Result<GitOperationResult>.Failure(validationResult.Error!);

            if (!IsValidBranchName(branchName))
                return Result<GitOperationResult>.Failure("InvalidBranchName", "Invalid branch name");

            var args = new List<string> { "merge", branchName };
            if (!string.IsNullOrEmpty(message))
            {
                args.AddRange(["-m", message]);
            }

            var (exitCode, output, error) = await ExecuteGitCommandAsync(repoPath, args.ToArray());

            var result = new GitOperationResult
            {
                Success = exitCode == 0,
                Message = output.Trim(),
                Error = exitCode != 0 ? error.Trim() : null
            };

            // Check for merge conflicts
            if (exitCode != 0 && (error.Contains("CONFLICT") || output.Contains("CONFLICT")))
            {
                result.Error = "Merge conflicts detected. Please resolve conflicts manually.";
            }

            return Result<GitOperationResult>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error merging branch {BranchName} in {RepoPath}", branchName, repoPath);
            return Result<GitOperationResult>.Failure("MergeError", $"Failed to merge branch: {ex.Message}");
        }
    }

    public async Task<Result<GitOperationResult>> PublishBranchAsync(string repoPath, string branchName, string? remote = null)
    {
        try
        {
            var validationResult = await ValidateRepositoryAsync(repoPath);
            if (validationResult.IsFailure)
                return Result<GitOperationResult>.Failure(validationResult.Error!);

            if (!IsValidBranchName(branchName))
                return Result<GitOperationResult>.Failure("InvalidBranchName", "Invalid branch name");

            var remoteName = remote ?? "origin";
            if (!IsValidRemoteName(remoteName))
                return Result<GitOperationResult>.Failure("InvalidRemote", "Invalid remote name");

            // Push branch to remote with -u to set upstream tracking
            var (exitCode, output, error) = await ExecuteGitCommandAsync(repoPath,
                ["push", "-u", remoteName, branchName], LongTimeout);

            var result = new GitOperationResult
            {
                Success = exitCode == 0,
                Message = exitCode == 0
                    ? $"Branch '{branchName}' published to {remoteName}"
                    : output.Trim(),
                Error = exitCode != 0 ? error.Trim() : null
            };

            return Result<GitOperationResult>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error publishing branch {BranchName} in {RepoPath}", branchName, repoPath);
            return Result<GitOperationResult>.Failure("PublishError", $"Failed to publish branch: {ex.Message}");
        }
    }

    #region Private Methods

    private static Result<bool> ValidateRepoPath(string repoPath)
    {
        if (string.IsNullOrWhiteSpace(repoPath))
            return Result<bool>.Failure("InvalidPath", "Repository path is required");

        // Must be absolute path
        if (!Path.IsPathRooted(repoPath))
            return Result<bool>.Failure("InvalidPath", "Repository path must be an absolute path");

        // Prevent path traversal
        var normalizedPath = Path.GetFullPath(repoPath);
        if (!normalizedPath.Equals(repoPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar), StringComparison.OrdinalIgnoreCase))
        {
            // Path was modified by GetFullPath, might indicate traversal attempt
            // Allow it but use the normalized path
        }

        if (!Directory.Exists(repoPath))
            return Result<bool>.Failure("PathNotFound", "Repository path does not exist");

        return Result<bool>.Success(true);
    }

    private static string? SanitizeFilePath(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath))
            return null;

        // Allow "." to mean all files
        if (filePath == ".")
            return ".";

        // Remove leading/trailing whitespace
        filePath = filePath.Trim();

        // Prevent absolute paths (must be relative to repo)
        if (Path.IsPathRooted(filePath))
            return null;

        // Prevent obvious path traversal
        if (filePath.Contains(".."))
            return null;

        // Prevent command injection characters
        if (filePath.Any(c => c is ';' or '|' or '&' or '`' or '$' or '\n' or '\r'))
            return null;

        return filePath;
    }

    private static bool IsValidRemoteName(string name)
    {
        return !string.IsNullOrEmpty(name) &&
               name.All(c => char.IsLetterOrDigit(c) || c is '-' or '_' or '.') &&
               name.Length <= 100;
    }

    private static bool IsValidBranchName(string name)
    {
        return !string.IsNullOrEmpty(name) &&
               name.All(c => char.IsLetterOrDigit(c) || c is '-' or '_' or '/' or '.') &&
               !name.StartsWith('-') &&
               !name.Contains("..") &&
               name.Length <= 200;
    }

    private async Task<(int ExitCode, string Output, string Error)> ExecuteGitCommandAsync(
        string workingDirectory,
        string[] args,
        TimeSpan? timeout = null)
    {
        if (args.Length == 0)
            throw new ArgumentException("No git arguments provided");

        // Validate command is in whitelist
        var command = args[0].ToLowerInvariant();
        if (!AllowedCommands.Contains(command))
        {
            _logger.LogWarning("Attempted to execute non-whitelisted git command: {Command}", command);
            throw new InvalidOperationException($"Git command '{command}' is not allowed");
        }

        var processInfo = new ProcessStartInfo
        {
            FileName = "git",
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8
        };

        foreach (var arg in args)
        {
            processInfo.ArgumentList.Add(arg);
        }

        _logger.LogDebug("Executing git command in {WorkingDir}: git {Args}",
            workingDirectory, string.Join(" ", args));

        using var process = new Process { StartInfo = processInfo };
        var outputBuilder = new StringBuilder();
        var errorBuilder = new StringBuilder();

        process.OutputDataReceived += (_, e) =>
        {
            if (e.Data != null)
                outputBuilder.AppendLine(e.Data);
        };

        process.ErrorDataReceived += (_, e) =>
        {
            if (e.Data != null)
                errorBuilder.AppendLine(e.Data);
        };

        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        var effectiveTimeout = timeout ?? DefaultTimeout;
        var completed = await process.WaitForExitAsync(new CancellationTokenSource(effectiveTimeout).Token)
            .ContinueWith(t => !t.IsCanceled);

        if (!completed)
        {
            try { process.Kill(true); } catch { /* ignore */ }
            throw new TimeoutException($"Git command timed out after {effectiveTimeout.TotalSeconds} seconds");
        }

        return (process.ExitCode, outputBuilder.ToString(), errorBuilder.ToString());
    }

    private static void ParsePorcelainStatus(string output, GitStatus status)
    {
        // Porcelain v1 format with -z: XY PATH\0 (or XY PATH\0ORIG_PATH\0 for renames)
        // X = staged status, Y = unstaged status
        var entries = output.Split('\0', StringSplitOptions.RemoveEmptyEntries);

        for (int i = 0; i < entries.Length; i++)
        {
            var entry = entries[i];
            if (entry.Length < 4) continue; // Minimum: "XY P"

            var indexStatus = entry[0];
            var worktreeStatus = entry[1];
            var filePath = entry[3..]; // Skip "XY "

            // Handle renames (next entry is the original path)
            string? oldPath = null;
            if ((indexStatus == 'R' || indexStatus == 'C') && i + 1 < entries.Length)
            {
                oldPath = entries[++i];
            }

            // Staged changes (index status)
            if (indexStatus != ' ' && indexStatus != '?')
            {
                status.StagedChanges.Add(new GitFileChange
                {
                    FilePath = filePath,
                    Status = indexStatus.ToString(),
                    OldPath = oldPath
                });
            }

            // Unstaged changes (worktree status)
            if (worktreeStatus != ' ' && worktreeStatus != '?')
            {
                status.UnstagedChanges.Add(new GitFileChange
                {
                    FilePath = filePath,
                    Status = worktreeStatus.ToString()
                });
            }

            // Untracked files
            if (indexStatus == '?' && worktreeStatus == '?')
            {
                status.UntrackedFiles.Add(new GitFileChange
                {
                    FilePath = filePath,
                    Status = "?"
                });
            }
        }
    }

    [GeneratedRegex(@"\[([a-f0-9]+)\]")]
    private static partial Regex CommitHashRegex();

    #endregion
}
