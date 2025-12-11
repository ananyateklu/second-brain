using System.Text.Json.Serialization;

namespace SecondBrain.Application.Services.GitHub.Models;

// ===== Request Models =====

public record GitHubRepoRequest
{
    public string? Owner { get; init; }
    public string? Repo { get; init; }
}

public record GitHubPullRequestsRequest : GitHubRepoRequest
{
    public string State { get; init; } = "open"; // open, closed, all
    public int Page { get; init; } = 1;
    public int PerPage { get; init; } = 30;
}

public record GitHubWorkflowRunsRequest : GitHubRepoRequest
{
    public string? Branch { get; init; }
    public string? Status { get; init; } // queued, in_progress, completed
    public int Page { get; init; } = 1;
    public int PerPage { get; init; } = 30;
}

// ===== Response Models =====

public record GitHubUser
{
    [JsonPropertyName("login")]
    public string Login { get; init; } = string.Empty;

    [JsonPropertyName("id")]
    public long Id { get; init; }

    [JsonPropertyName("avatar_url")]
    public string AvatarUrl { get; init; } = string.Empty;

    [JsonPropertyName("html_url")]
    public string HtmlUrl { get; init; } = string.Empty;
}

public record GitHubLabel
{
    [JsonPropertyName("id")]
    public long Id { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("color")]
    public string Color { get; init; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; init; }
}

public record GitHubBranch
{
    [JsonPropertyName("ref")]
    public string Ref { get; init; } = string.Empty;

    [JsonPropertyName("sha")]
    public string Sha { get; init; } = string.Empty;

    [JsonPropertyName("label")]
    public string Label { get; init; } = string.Empty;
}

public record GitHubPullRequest
{
    [JsonPropertyName("id")]
    public long Id { get; init; }

    [JsonPropertyName("number")]
    public int Number { get; init; }

    [JsonPropertyName("title")]
    public string Title { get; init; } = string.Empty;

    [JsonPropertyName("body")]
    public string? Body { get; init; }

    [JsonPropertyName("state")]
    public string State { get; init; } = string.Empty;

    [JsonPropertyName("html_url")]
    public string HtmlUrl { get; init; } = string.Empty;

    [JsonPropertyName("user")]
    public GitHubUser? User { get; init; }

    [JsonPropertyName("labels")]
    public List<GitHubLabel> Labels { get; init; } = [];

    [JsonPropertyName("head")]
    public GitHubBranch? Head { get; init; }

    [JsonPropertyName("base")]
    public GitHubBranch? Base { get; init; }

    [JsonPropertyName("draft")]
    public bool Draft { get; init; }

    [JsonPropertyName("merged")]
    public bool Merged { get; init; }

    [JsonPropertyName("mergeable")]
    public bool? Mergeable { get; init; }

    [JsonPropertyName("mergeable_state")]
    public string? MergeableState { get; init; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; init; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; init; }

    [JsonPropertyName("closed_at")]
    public DateTime? ClosedAt { get; init; }

    [JsonPropertyName("merged_at")]
    public DateTime? MergedAt { get; init; }

    [JsonPropertyName("comments")]
    public int Comments { get; init; }

    [JsonPropertyName("review_comments")]
    public int ReviewComments { get; init; }

    [JsonPropertyName("commits")]
    public int Commits { get; init; }

    [JsonPropertyName("additions")]
    public int Additions { get; init; }

    [JsonPropertyName("deletions")]
    public int Deletions { get; init; }

    [JsonPropertyName("changed_files")]
    public int ChangedFiles { get; init; }
}

public record GitHubPullRequestReview
{
    [JsonPropertyName("id")]
    public long Id { get; init; }

    [JsonPropertyName("user")]
    public GitHubUser? User { get; init; }

    [JsonPropertyName("body")]
    public string? Body { get; init; }

    [JsonPropertyName("state")]
    public string State { get; init; } = string.Empty; // APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED, PENDING

    [JsonPropertyName("submitted_at")]
    public DateTime? SubmittedAt { get; init; }

    [JsonPropertyName("html_url")]
    public string HtmlUrl { get; init; } = string.Empty;
}

public record GitHubWorkflow
{
    [JsonPropertyName("id")]
    public long Id { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("path")]
    public string Path { get; init; } = string.Empty;

    [JsonPropertyName("state")]
    public string State { get; init; } = string.Empty;

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; init; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; init; }

    [JsonPropertyName("html_url")]
    public string HtmlUrl { get; init; } = string.Empty;
}

public record GitHubWorkflowRun
{
    [JsonPropertyName("id")]
    public long Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("head_branch")]
    public string HeadBranch { get; init; } = string.Empty;

    [JsonPropertyName("head_sha")]
    public string HeadSha { get; init; } = string.Empty;

    [JsonPropertyName("run_number")]
    public int RunNumber { get; init; }

    [JsonPropertyName("event")]
    public string Event { get; init; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; init; } = string.Empty; // queued, in_progress, completed

    [JsonPropertyName("conclusion")]
    public string? Conclusion { get; init; } // success, failure, neutral, cancelled, skipped, timed_out, action_required

    [JsonPropertyName("workflow_id")]
    public long WorkflowId { get; init; }

    [JsonPropertyName("html_url")]
    public string HtmlUrl { get; init; } = string.Empty;

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; init; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; init; }

    [JsonPropertyName("run_started_at")]
    public DateTime? RunStartedAt { get; init; }

    [JsonPropertyName("actor")]
    public GitHubUser? Actor { get; init; }

    [JsonPropertyName("triggering_actor")]
    public GitHubUser? TriggeringActor { get; init; }

    [JsonPropertyName("display_title")]
    public string DisplayTitle { get; init; } = string.Empty;
}

public record GitHubWorkflowJob
{
    [JsonPropertyName("id")]
    public long Id { get; init; }

    [JsonPropertyName("run_id")]
    public long RunId { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; init; } = string.Empty;

    [JsonPropertyName("conclusion")]
    public string? Conclusion { get; init; }

    [JsonPropertyName("started_at")]
    public DateTime? StartedAt { get; init; }

    [JsonPropertyName("completed_at")]
    public DateTime? CompletedAt { get; init; }

    [JsonPropertyName("html_url")]
    public string HtmlUrl { get; init; } = string.Empty;

    [JsonPropertyName("steps")]
    public List<GitHubWorkflowStep> Steps { get; init; } = [];
}

public record GitHubWorkflowStep
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; init; } = string.Empty;

    [JsonPropertyName("conclusion")]
    public string? Conclusion { get; init; }

    [JsonPropertyName("number")]
    public int Number { get; init; }

    [JsonPropertyName("started_at")]
    public DateTime? StartedAt { get; init; }

    [JsonPropertyName("completed_at")]
    public DateTime? CompletedAt { get; init; }
}

public record GitHubCheckRun
{
    [JsonPropertyName("id")]
    public long Id { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("head_sha")]
    public string HeadSha { get; init; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; init; } = string.Empty;

    [JsonPropertyName("conclusion")]
    public string? Conclusion { get; init; }

    [JsonPropertyName("started_at")]
    public DateTime? StartedAt { get; init; }

    [JsonPropertyName("completed_at")]
    public DateTime? CompletedAt { get; init; }

    [JsonPropertyName("html_url")]
    public string? HtmlUrl { get; init; }

    [JsonPropertyName("details_url")]
    public string? DetailsUrl { get; init; }

    [JsonPropertyName("output")]
    public GitHubCheckRunOutput? Output { get; init; }
}

public record GitHubCheckRunOutput
{
    [JsonPropertyName("title")]
    public string? Title { get; init; }

    [JsonPropertyName("summary")]
    public string? Summary { get; init; }

    [JsonPropertyName("text")]
    public string? Text { get; init; }

    [JsonPropertyName("annotations_count")]
    public int AnnotationsCount { get; init; }
}

// ===== List Response Wrappers =====

public record GitHubWorkflowsResponse
{
    [JsonPropertyName("total_count")]
    public int TotalCount { get; init; }

    [JsonPropertyName("workflows")]
    public List<GitHubWorkflow> Workflows { get; init; } = [];
}

public record GitHubWorkflowRunsResponse
{
    [JsonPropertyName("total_count")]
    public int TotalCount { get; init; }

    [JsonPropertyName("workflow_runs")]
    public List<GitHubWorkflowRun> WorkflowRuns { get; init; } = [];
}

public record GitHubWorkflowJobsResponse
{
    [JsonPropertyName("total_count")]
    public int TotalCount { get; init; }

    [JsonPropertyName("jobs")]
    public List<GitHubWorkflowJob> Jobs { get; init; } = [];
}

public record GitHubCheckRunsResponse
{
    [JsonPropertyName("total_count")]
    public int TotalCount { get; init; }

    [JsonPropertyName("check_runs")]
    public List<GitHubCheckRun> CheckRuns { get; init; } = [];
}

// ===== Application Response Models =====

public record GitHubRepositoryInfo
{
    public string Owner { get; init; } = string.Empty;
    public string Repo { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string HtmlUrl { get; init; } = string.Empty;
    public string? DefaultBranch { get; init; }
    public bool IsConfigured { get; init; }
}

public record PullRequestSummary
{
    public int Number { get; init; }
    public string Title { get; init; } = string.Empty;
    public string State { get; init; } = string.Empty;
    public string Author { get; init; } = string.Empty;
    public string AuthorAvatarUrl { get; init; } = string.Empty;
    public string HtmlUrl { get; init; } = string.Empty;
    public string HeadBranch { get; init; } = string.Empty;
    public string BaseBranch { get; init; } = string.Empty;
    public bool IsDraft { get; init; }
    public bool IsMerged { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public List<GitHubLabel> Labels { get; init; } = [];
    public int CommentsCount { get; init; }
    public int Additions { get; init; }
    public int Deletions { get; init; }
    public int ChangedFiles { get; init; }
    public List<ReviewSummary> Reviews { get; init; } = [];
    public List<CheckRunSummary> CheckRuns { get; init; } = [];
}

public record ReviewSummary
{
    public string Author { get; init; } = string.Empty;
    public string AuthorAvatarUrl { get; init; } = string.Empty;
    public string State { get; init; } = string.Empty;
    public DateTime? SubmittedAt { get; init; }
}

public record CheckRunSummary
{
    public string Name { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string? Conclusion { get; init; }
    public string? HtmlUrl { get; init; }
}

public record WorkflowRunSummary
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string DisplayTitle { get; init; } = string.Empty;
    public string HeadBranch { get; init; } = string.Empty;
    public string HeadSha { get; init; } = string.Empty;
    public int RunNumber { get; init; }
    public string Event { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string? Conclusion { get; init; }
    public string HtmlUrl { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public DateTime? RunStartedAt { get; init; }
    public string Actor { get; init; } = string.Empty;
    public string ActorAvatarUrl { get; init; } = string.Empty;
    public List<WorkflowJobSummary> Jobs { get; init; } = [];
}

public record WorkflowJobSummary
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string? Conclusion { get; init; }
    public DateTime? StartedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public string HtmlUrl { get; init; } = string.Empty;
    public List<WorkflowStepSummary> Steps { get; init; } = [];
}

public record WorkflowStepSummary
{
    public int Number { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string? Conclusion { get; init; }
}

public record GitHubPullRequestsResponse
{
    public List<PullRequestSummary> PullRequests { get; init; } = [];
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PerPage { get; init; }
    public bool HasMore { get; init; }
}

public record GitHubActionsResponse
{
    public List<WorkflowRunSummary> WorkflowRuns { get; init; } = [];
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PerPage { get; init; }
    public bool HasMore { get; init; }
}

// ===== PR Files (Diff) Models =====

public record GitHubPullRequestFile
{
    [JsonPropertyName("sha")]
    public string Sha { get; init; } = string.Empty;

    [JsonPropertyName("filename")]
    public string Filename { get; init; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; init; } = string.Empty; // added, removed, modified, renamed, copied, changed, unchanged

    [JsonPropertyName("additions")]
    public int Additions { get; init; }

    [JsonPropertyName("deletions")]
    public int Deletions { get; init; }

    [JsonPropertyName("changes")]
    public int Changes { get; init; }

    [JsonPropertyName("patch")]
    public string? Patch { get; init; }

    [JsonPropertyName("previous_filename")]
    public string? PreviousFilename { get; init; }

    [JsonPropertyName("blob_url")]
    public string? BlobUrl { get; init; }

    [JsonPropertyName("raw_url")]
    public string? RawUrl { get; init; }

    [JsonPropertyName("contents_url")]
    public string? ContentsUrl { get; init; }
}

public record PullRequestFileSummary
{
    public string Sha { get; init; } = string.Empty;
    public string Filename { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public int Additions { get; init; }
    public int Deletions { get; init; }
    public int Changes { get; init; }
    public string? Patch { get; init; }
    public string? PreviousFilename { get; init; }
    public string? BlobUrl { get; init; }
}

public record GitHubPullRequestFilesResponse
{
    public List<PullRequestFileSummary> Files { get; init; } = [];
    public int TotalCount { get; init; }
    public int TotalAdditions { get; init; }
    public int TotalDeletions { get; init; }
}

// ===== Branch Models =====

public record GitHubBranchInfo
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("commit")]
    public GitHubBranchCommit? Commit { get; init; }

    [JsonPropertyName("protected")]
    public bool Protected { get; init; }
}

public record GitHubBranchCommit
{
    [JsonPropertyName("sha")]
    public string Sha { get; init; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; init; } = string.Empty;
}

public record BranchSummary
{
    public string Name { get; init; } = string.Empty;
    public string CommitSha { get; init; } = string.Empty;
    public bool IsProtected { get; init; }
    public bool IsDefault { get; init; }
}

public record GitHubBranchesResponse
{
    public List<BranchSummary> Branches { get; init; } = [];
    public string? DefaultBranch { get; init; }
}

// ===== Issue Models =====

public record GitHubIssue
{
    [JsonPropertyName("id")]
    public long Id { get; init; }

    [JsonPropertyName("number")]
    public int Number { get; init; }

    [JsonPropertyName("title")]
    public string Title { get; init; } = string.Empty;

    [JsonPropertyName("body")]
    public string? Body { get; init; }

    [JsonPropertyName("state")]
    public string State { get; init; } = string.Empty; // open, closed

    [JsonPropertyName("html_url")]
    public string HtmlUrl { get; init; } = string.Empty;

    [JsonPropertyName("user")]
    public GitHubUser? User { get; init; }

    [JsonPropertyName("labels")]
    public List<GitHubLabel> Labels { get; init; } = [];

    [JsonPropertyName("assignee")]
    public GitHubUser? Assignee { get; init; }

    [JsonPropertyName("assignees")]
    public List<GitHubUser> Assignees { get; init; } = [];

    [JsonPropertyName("comments")]
    public int Comments { get; init; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; init; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; init; }

    [JsonPropertyName("closed_at")]
    public DateTime? ClosedAt { get; init; }

    [JsonPropertyName("pull_request")]
    public object? PullRequest { get; init; } // If present, this is a PR not an issue
}

public record IssueSummary
{
    public int Number { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Body { get; init; }
    public string State { get; init; } = string.Empty;
    public string HtmlUrl { get; init; } = string.Empty;
    public string Author { get; init; } = string.Empty;
    public string AuthorAvatarUrl { get; init; } = string.Empty;
    public List<GitHubLabel> Labels { get; init; } = [];
    public List<string> Assignees { get; init; } = [];
    public int CommentsCount { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public DateTime? ClosedAt { get; init; }
}

public record GitHubIssuesResponse
{
    public List<IssueSummary> Issues { get; init; } = [];
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PerPage { get; init; }
    public bool HasMore { get; init; }
}

// ===== Commit Models =====

public record GitHubCommit
{
    [JsonPropertyName("sha")]
    public string Sha { get; init; } = string.Empty;

    [JsonPropertyName("commit")]
    public GitHubCommitInfo? Commit { get; init; }

    [JsonPropertyName("html_url")]
    public string HtmlUrl { get; init; } = string.Empty;

    [JsonPropertyName("author")]
    public GitHubUser? Author { get; init; }

    [JsonPropertyName("committer")]
    public GitHubUser? Committer { get; init; }

    [JsonPropertyName("stats")]
    public GitHubCommitStats? Stats { get; init; }

    [JsonPropertyName("files")]
    public List<GitHubPullRequestFile>? Files { get; init; }
}

public record GitHubCommitInfo
{
    [JsonPropertyName("message")]
    public string Message { get; init; } = string.Empty;

    [JsonPropertyName("author")]
    public GitHubCommitAuthor? Author { get; init; }

    [JsonPropertyName("committer")]
    public GitHubCommitAuthor? Committer { get; init; }
}

public record GitHubCommitAuthor
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; init; } = string.Empty;

    [JsonPropertyName("date")]
    public DateTime Date { get; init; }
}

public record GitHubCommitStats
{
    [JsonPropertyName("additions")]
    public int Additions { get; init; }

    [JsonPropertyName("deletions")]
    public int Deletions { get; init; }

    [JsonPropertyName("total")]
    public int Total { get; init; }
}

public record CommitSummary
{
    public string Sha { get; init; } = string.Empty;
    public string ShortSha { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public string MessageHeadline { get; init; } = string.Empty;
    public string Author { get; init; } = string.Empty;
    public string AuthorAvatarUrl { get; init; } = string.Empty;
    public DateTime AuthoredAt { get; init; }
    public string HtmlUrl { get; init; } = string.Empty;
    public int? Additions { get; init; }
    public int? Deletions { get; init; }
}

public record GitHubCommitsResponse
{
    public List<CommitSummary> Commits { get; init; } = [];
    public int Page { get; init; }
    public int PerPage { get; init; }
    public bool HasMore { get; init; }
}

// ===== PR Comments Models =====

public record GitHubIssueComment
{
    [JsonPropertyName("id")]
    public long Id { get; init; }

    [JsonPropertyName("body")]
    public string Body { get; init; } = string.Empty;

    [JsonPropertyName("user")]
    public GitHubUser? User { get; init; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; init; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; init; }

    [JsonPropertyName("html_url")]
    public string HtmlUrl { get; init; } = string.Empty;
}

public record CommentSummary
{
    public long Id { get; init; }
    public string Body { get; init; } = string.Empty;
    public string Author { get; init; } = string.Empty;
    public string AuthorAvatarUrl { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public string HtmlUrl { get; init; } = string.Empty;
}

public record GitHubCommentsResponse
{
    public List<CommentSummary> Comments { get; init; } = [];
    public int TotalCount { get; init; }
}
