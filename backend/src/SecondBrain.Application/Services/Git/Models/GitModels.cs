namespace SecondBrain.Application.Services.Git.Models;

/// <summary>
/// Represents the current status of a Git repository.
/// </summary>
public class GitStatus
{
    /// <summary>
    /// The current branch name.
    /// </summary>
    public string Branch { get; set; } = string.Empty;

    /// <summary>
    /// Whether the repository has a configured remote.
    /// </summary>
    public bool HasRemote { get; set; }

    /// <summary>
    /// The remote name (e.g., "origin").
    /// </summary>
    public string? RemoteName { get; set; }

    /// <summary>
    /// Number of commits ahead of the remote.
    /// </summary>
    public int Ahead { get; set; }

    /// <summary>
    /// Number of commits behind the remote.
    /// </summary>
    public int Behind { get; set; }

    /// <summary>
    /// Files that are staged for commit.
    /// </summary>
    public List<GitFileChange> StagedChanges { get; set; } = [];

    /// <summary>
    /// Files that have been modified but not staged.
    /// </summary>
    public List<GitFileChange> UnstagedChanges { get; set; } = [];

    /// <summary>
    /// Files that are not tracked by Git.
    /// </summary>
    public List<GitFileChange> UntrackedFiles { get; set; } = [];

    /// <summary>
    /// Whether there are any changes (staged, unstaged, or untracked).
    /// </summary>
    public bool HasChanges => StagedChanges.Count > 0 || UnstagedChanges.Count > 0 || UntrackedFiles.Count > 0;

    /// <summary>
    /// Whether there are staged changes ready to commit.
    /// </summary>
    public bool HasStagedChanges => StagedChanges.Count > 0;

    /// <summary>
    /// Total number of changed files.
    /// </summary>
    public int TotalChanges => StagedChanges.Count + UnstagedChanges.Count + UntrackedFiles.Count;
}

/// <summary>
/// Represents a file change in a Git repository.
/// </summary>
public class GitFileChange
{
    /// <summary>
    /// The file path relative to the repository root.
    /// </summary>
    public string FilePath { get; set; } = string.Empty;

    /// <summary>
    /// The status of the file change.
    /// M = Modified, A = Added, D = Deleted, R = Renamed, C = Copied, ? = Untracked
    /// </summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>
    /// For renamed files, the original path.
    /// </summary>
    public string? OldPath { get; set; }

    /// <summary>
    /// Human-readable status description.
    /// </summary>
    public string StatusDescription => Status switch
    {
        "M" => "Modified",
        "A" => "Added",
        "D" => "Deleted",
        "R" => "Renamed",
        "C" => "Copied",
        "?" => "Untracked",
        "U" => "Unmerged",
        _ => "Unknown"
    };
}

/// <summary>
/// Request to stage files.
/// </summary>
public class GitStageRequest
{
    /// <summary>
    /// The repository path.
    /// </summary>
    public string RepoPath { get; set; } = string.Empty;

    /// <summary>
    /// The files to stage. Use "." to stage all.
    /// </summary>
    public string[] Files { get; set; } = [];
}

/// <summary>
/// Request to unstage files.
/// </summary>
public class GitUnstageRequest
{
    /// <summary>
    /// The repository path.
    /// </summary>
    public string RepoPath { get; set; } = string.Empty;

    /// <summary>
    /// The files to unstage. Use "." to unstage all.
    /// </summary>
    public string[] Files { get; set; } = [];
}

/// <summary>
/// Request to create a commit.
/// </summary>
public class GitCommitRequest
{
    /// <summary>
    /// The repository path.
    /// </summary>
    public string RepoPath { get; set; } = string.Empty;

    /// <summary>
    /// The commit message.
    /// </summary>
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Request for push/pull operations.
/// </summary>
public class GitRemoteRequest
{
    /// <summary>
    /// The repository path.
    /// </summary>
    public string RepoPath { get; set; } = string.Empty;

    /// <summary>
    /// Optional remote name (defaults to "origin").
    /// </summary>
    public string? Remote { get; set; }

    /// <summary>
    /// Optional branch name (defaults to current branch).
    /// </summary>
    public string? Branch { get; set; }
}

/// <summary>
/// Result of a Git operation.
/// </summary>
public class GitOperationResult
{
    /// <summary>
    /// Whether the operation succeeded.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The output message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Any error message if the operation failed.
    /// </summary>
    public string? Error { get; set; }
}

/// <summary>
/// Request to get a file diff.
/// </summary>
public class GitDiffRequest
{
    /// <summary>
    /// The repository path.
    /// </summary>
    public string RepoPath { get; set; } = string.Empty;

    /// <summary>
    /// The file path to diff.
    /// </summary>
    public string FilePath { get; set; } = string.Empty;

    /// <summary>
    /// Whether to show the staged diff (vs unstaged).
    /// </summary>
    public bool Staged { get; set; }
}

/// <summary>
/// Result of a diff operation.
/// </summary>
public class GitDiffResult
{
    /// <summary>
    /// The file path.
    /// </summary>
    public string FilePath { get; set; } = string.Empty;

    /// <summary>
    /// The raw diff output.
    /// </summary>
    public string Diff { get; set; } = string.Empty;

    /// <summary>
    /// Number of lines added.
    /// </summary>
    public int Additions { get; set; }

    /// <summary>
    /// Number of lines deleted.
    /// </summary>
    public int Deletions { get; set; }
}

/// <summary>
/// Represents a commit in the Git log.
/// </summary>
public class GitLogEntry
{
    /// <summary>
    /// The full commit hash.
    /// </summary>
    public string Hash { get; set; } = string.Empty;

    /// <summary>
    /// The short (7-character) commit hash.
    /// </summary>
    public string ShortHash { get; set; } = string.Empty;

    /// <summary>
    /// The commit message (first line).
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// The author name.
    /// </summary>
    public string Author { get; set; } = string.Empty;

    /// <summary>
    /// The author email.
    /// </summary>
    public string AuthorEmail { get; set; } = string.Empty;

    /// <summary>
    /// The commit date in ISO 8601 format.
    /// </summary>
    public string Date { get; set; } = string.Empty;

    /// <summary>
    /// The commit date as a DateTime.
    /// </summary>
    public DateTime? DateParsed => DateTime.TryParse(Date, out var dt) ? dt : null;
}

/// <summary>
/// Request to get the commit log.
/// </summary>
public class GitLogRequest
{
    /// <summary>
    /// The repository path.
    /// </summary>
    public string RepoPath { get; set; } = string.Empty;

    /// <summary>
    /// Maximum number of commits to return.
    /// </summary>
    public int Count { get; set; } = 20;
}

/// <summary>
/// Represents a Git branch.
/// </summary>
public class GitBranch
{
    /// <summary>
    /// The branch name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Whether this is the current branch.
    /// </summary>
    public bool IsCurrent { get; set; }

    /// <summary>
    /// Whether this is a remote tracking branch.
    /// </summary>
    public bool IsRemote { get; set; }

    /// <summary>
    /// The remote name for remote branches (e.g., "origin").
    /// </summary>
    public string? RemoteName { get; set; }

    /// <summary>
    /// The upstream branch this local branch tracks.
    /// </summary>
    public string? Upstream { get; set; }

    /// <summary>
    /// The last commit hash on this branch.
    /// </summary>
    public string? LastCommitHash { get; set; }

    /// <summary>
    /// The last commit message on this branch.
    /// </summary>
    public string? LastCommitMessage { get; set; }
}

/// <summary>
/// Request to switch to a branch.
/// </summary>
public class GitSwitchBranchRequest
{
    /// <summary>
    /// The repository path.
    /// </summary>
    public string RepoPath { get; set; } = string.Empty;

    /// <summary>
    /// The branch name to switch to.
    /// </summary>
    public string BranchName { get; set; } = string.Empty;
}

/// <summary>
/// Request to create a new branch.
/// </summary>
public class GitCreateBranchRequest
{
    /// <summary>
    /// The repository path.
    /// </summary>
    public string RepoPath { get; set; } = string.Empty;

    /// <summary>
    /// The name for the new branch.
    /// </summary>
    public string BranchName { get; set; } = string.Empty;

    /// <summary>
    /// Whether to switch to the new branch after creation.
    /// </summary>
    public bool SwitchToNewBranch { get; set; } = true;

    /// <summary>
    /// Optional base branch or commit to create from. Defaults to current HEAD.
    /// </summary>
    public string? BaseBranch { get; set; }
}

/// <summary>
/// Request to delete a branch.
/// </summary>
public class GitDeleteBranchRequest
{
    /// <summary>
    /// The repository path.
    /// </summary>
    public string RepoPath { get; set; } = string.Empty;

    /// <summary>
    /// The branch name to delete.
    /// </summary>
    public string BranchName { get; set; } = string.Empty;

    /// <summary>
    /// Force delete even if not fully merged.
    /// </summary>
    public bool Force { get; set; }
}

/// <summary>
/// Request to merge a branch.
/// </summary>
public class GitMergeBranchRequest
{
    /// <summary>
    /// The repository path.
    /// </summary>
    public string RepoPath { get; set; } = string.Empty;

    /// <summary>
    /// The branch to merge into the current branch.
    /// </summary>
    public string BranchName { get; set; } = string.Empty;

    /// <summary>
    /// Optional commit message for merge commits.
    /// </summary>
    public string? Message { get; set; }
}

/// <summary>
/// Request to publish a branch to remote.
/// </summary>
public class GitPublishBranchRequest
{
    /// <summary>
    /// The repository path.
    /// </summary>
    public string RepoPath { get; set; } = string.Empty;

    /// <summary>
    /// The branch name to publish.
    /// </summary>
    public string BranchName { get; set; } = string.Empty;

    /// <summary>
    /// The remote to publish to (defaults to "origin").
    /// </summary>
    public string? Remote { get; set; }
}
