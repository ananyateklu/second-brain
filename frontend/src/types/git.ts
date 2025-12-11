/**
 * Git Integration Types
 * TypeScript interfaces for Git operations and status
 */

/**
 * Represents the current status of a Git repository.
 */
export interface GitStatus {
  /** The current branch name */
  branch: string;
  /** Whether the repository has a configured remote */
  hasRemote: boolean;
  /** The remote name (e.g., "origin") */
  remoteName?: string;
  /** Number of commits ahead of the remote */
  ahead: number;
  /** Number of commits behind the remote */
  behind: number;
  /** Files that are staged for commit */
  stagedChanges: GitFileChange[];
  /** Files that have been modified but not staged */
  unstagedChanges: GitFileChange[];
  /** Files that are not tracked by Git */
  untrackedFiles: GitFileChange[];
  /** Whether there are any changes (staged, unstaged, or untracked) */
  hasChanges: boolean;
  /** Whether there are staged changes ready to commit */
  hasStagedChanges: boolean;
  /** Total number of changed files */
  totalChanges: number;
}

/**
 * Represents a file change in a Git repository.
 */
export interface GitFileChange {
  /** The file path relative to the repository root */
  filePath: string;
  /** The status of the file change: M=Modified, A=Added, D=Deleted, R=Renamed, C=Copied, ?=Untracked */
  status: GitFileStatus;
  /** For renamed files, the original path */
  oldPath?: string;
  /** Human-readable status description */
  statusDescription: string;
}

/**
 * Git file status codes
 */
export type GitFileStatus = 'M' | 'A' | 'D' | 'R' | 'C' | '?' | 'U';

/**
 * Request to stage files.
 */
export interface GitStageRequest {
  /** The repository path */
  repoPath: string;
  /** The files to stage. Use "." to stage all */
  files: string[];
}

/**
 * Request to unstage files.
 */
export interface GitUnstageRequest {
  /** The repository path */
  repoPath: string;
  /** The files to unstage. Use "." to unstage all */
  files: string[];
}

/**
 * Request to create a commit.
 */
export interface GitCommitRequest {
  /** The repository path */
  repoPath: string;
  /** The commit message */
  message: string;
}

/**
 * Request for push/pull operations.
 */
export interface GitRemoteRequest {
  /** The repository path */
  repoPath: string;
  /** Optional remote name (defaults to "origin") */
  remote?: string;
  /** Optional branch name (defaults to current branch) */
  branch?: string;
}

/**
 * Result of a Git operation.
 */
export interface GitOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** The output message */
  message: string;
  /** Any error message if the operation failed */
  error?: string;
}

/**
 * Request to get a file diff.
 */
export interface GitDiffRequest {
  /** The repository path */
  repoPath: string;
  /** The file path to diff */
  filePath: string;
  /** Whether to show the staged diff (vs unstaged) */
  staged?: boolean;
}

/**
 * Result of a diff operation.
 */
export interface GitDiffResult {
  /** The file path */
  filePath: string;
  /** The raw diff output */
  diff: string;
  /** Number of lines added */
  additions: number;
  /** Number of lines deleted */
  deletions: number;
}

/**
 * Represents a commit in the Git log.
 */
export interface GitLogEntry {
  /** The full commit hash */
  hash: string;
  /** The short (7-character) commit hash */
  shortHash: string;
  /** The commit message (first line) */
  message: string;
  /** The author name */
  author: string;
  /** The author email */
  authorEmail: string;
  /** The commit date in ISO 8601 format */
  date: string;
}

/**
 * Request to get the commit log.
 */
export interface GitLogRequest {
  /** The repository path */
  repoPath: string;
  /** Maximum number of commits to return */
  count?: number;
}

/**
 * Commit result after successful commit
 */
export interface GitCommitResult {
  /** Whether the commit succeeded */
  success: boolean;
  /** The commit hash */
  commitHash: string;
}

/**
 * Get human-readable status from status code
 */
export const getStatusDescription = (status: GitFileStatus): string => {
  switch (status) {
    case 'M': return 'Modified';
    case 'A': return 'Added';
    case 'D': return 'Deleted';
    case 'R': return 'Renamed';
    case 'C': return 'Copied';
    case '?': return 'Untracked';
    case 'U': return 'Unmerged';
    default: return 'Unknown';
  }
};

/**
 * Get status color for UI display
 */
export const getStatusColor = (status: GitFileStatus): string => {
  switch (status) {
    case 'M': return 'text-yellow-500';
    case 'A': return 'text-green-500';
    case 'D': return 'text-red-500';
    case 'R': return 'text-blue-500';
    case 'C': return 'text-blue-500';
    case '?': return 'text-green-500'; // Untracked - green like VS Code
    case 'U': return 'text-orange-500';
    default: return 'text-gray-500';
  }
};

/**
 * Get status background color for badges
 */
export const getStatusBgColor = (status: GitFileStatus): string => {
  switch (status) {
    case 'M': return 'bg-yellow-500/20';
    case 'A': return 'bg-green-500/20';
    case 'D': return 'bg-red-500/20';
    case 'R': return 'bg-blue-500/20';
    case 'C': return 'bg-blue-500/20';
    case '?': return 'bg-green-500/20'; // Untracked - green like VS Code
    case 'U': return 'bg-orange-500/20';
    default: return 'bg-gray-500/20';
  }
};

/**
 * Get display status character (e.g., ? -> U for untracked to match VS Code)
 */
export const getDisplayStatus = (status: GitFileStatus): string => {
  if (status === '?') return 'U'; // Untracked files show as U in VS Code
  return status;
};

/**
 * Represents a Git branch.
 */
export interface GitBranch {
  /** The branch name */
  name: string;
  /** Whether this is the current branch */
  isCurrent: boolean;
  /** Whether this is a remote tracking branch */
  isRemote: boolean;
  /** The remote name for remote branches (e.g., "origin") */
  remoteName?: string;
  /** The upstream branch this local branch tracks */
  upstream?: string;
  /** The last commit hash on this branch */
  lastCommitHash?: string;
  /** The last commit message on this branch */
  lastCommitMessage?: string;
}

/**
 * Request to switch to a branch.
 */
export interface GitSwitchBranchRequest {
  /** The repository path */
  repoPath: string;
  /** The branch name to switch to */
  branchName: string;
}

/**
 * Request to create a new branch.
 */
export interface GitCreateBranchRequest {
  /** The repository path */
  repoPath: string;
  /** The name for the new branch */
  branchName: string;
  /** Whether to switch to the new branch after creation */
  switchToNewBranch?: boolean;
  /** Optional base branch or commit to create from */
  baseBranch?: string;
}

/**
 * Request to delete a branch.
 */
export interface GitDeleteBranchRequest {
  /** The repository path */
  repoPath: string;
  /** The branch name to delete */
  branchName: string;
  /** Force delete even if not fully merged */
  force?: boolean;
}

/**
 * Request to merge a branch.
 */
export interface GitMergeBranchRequest {
  /** The repository path */
  repoPath: string;
  /** The branch to merge into the current branch */
  branchName: string;
  /** Optional commit message for merge commits */
  message?: string;
}

/**
 * Request to publish a branch to remote.
 */
export interface GitPublishBranchRequest {
  /** The repository path */
  repoPath: string;
  /** The branch name to publish */
  branchName: string;
  /** The remote to publish to (defaults to "origin") */
  remote?: string;
}
