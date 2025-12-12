using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Services.GitHub;

/// <summary>
/// Service for interacting with the GitHub API.
/// </summary>
public sealed class GitHubService : IGitHubService, IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly GitHubSettings _settings;
    private readonly ILogger<GitHubService> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    public GitHubService(
        IHttpClientFactory httpClientFactory,
        IOptions<GitHubSettings> settings,
        ILogger<GitHubService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("GitHub");

        // Configure HttpClient
        _httpClient.BaseAddress = new Uri(_settings.BaseUrl);
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        _httpClient.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
        _httpClient.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("SecondBrain", "1.0"));
        _httpClient.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds);

        if (!string.IsNullOrEmpty(_settings.PersonalAccessToken))
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _settings.PersonalAccessToken);
        }

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        };
    }

    public async Task<Result<GitHubRepositoryInfo>> GetRepositoryInfoAsync(
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var (resolvedOwner, resolvedRepo, error) = ResolveOwnerRepo(owner, repo);
        if (error != null) return Result<GitHubRepositoryInfo>.Failure(error);

        try
        {
            var response = await _httpClient.GetAsync(
                $"/repos/{resolvedOwner}/{resolvedRepo}",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return HandleErrorResponse<GitHubRepositoryInfo>(response);
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            return Result<GitHubRepositoryInfo>.Success(new GitHubRepositoryInfo
            {
                Owner = resolvedOwner!,
                Repo = resolvedRepo!,
                FullName = root.GetProperty("full_name").GetString() ?? $"{resolvedOwner}/{resolvedRepo}",
                HtmlUrl = root.GetProperty("html_url").GetString() ?? string.Empty,
                DefaultBranch = root.TryGetProperty("default_branch", out var db) ? db.GetString() : null,
                IsConfigured = true
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get repository info for {Owner}/{Repo}", resolvedOwner, resolvedRepo);
            return Result<GitHubRepositoryInfo>.Failure(Error.ExternalService("GitHub", ex.Message));
        }
    }

    public async Task<Result<GitHubPullRequestsResponse>> GetPullRequestsAsync(
        string? owner = null,
        string? repo = null,
        string state = "open",
        int page = 1,
        int perPage = 30,
        CancellationToken cancellationToken = default)
    {
        var (resolvedOwner, resolvedRepo, error) = ResolveOwnerRepo(owner, repo);
        if (error != null) return Result<GitHubPullRequestsResponse>.Failure(error);

        try
        {
            var url = $"/repos/{resolvedOwner}/{resolvedRepo}/pulls?state={state}&page={page}&per_page={perPage}";
            var response = await _httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return HandleErrorResponse<GitHubPullRequestsResponse>(response);
            }

            var pullRequests = await response.Content.ReadFromJsonAsync<List<GitHubPullRequest>>(_jsonOptions, cancellationToken)
                ?? [];

            var summaries = new List<PullRequestSummary>();
            foreach (var pr in pullRequests)
            {
                summaries.Add(MapToPullRequestSummary(pr));
            }

            // Check if there are more pages by looking at the Link header
            var hasMore = response.Headers.TryGetValues("Link", out var linkValues)
                && linkValues.Any(v => v.Contains("rel=\"next\""));

            return Result<GitHubPullRequestsResponse>.Success(new GitHubPullRequestsResponse
            {
                PullRequests = summaries,
                TotalCount = pullRequests.Count,
                Page = page,
                PerPage = perPage,
                HasMore = hasMore
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get pull requests for {Owner}/{Repo}", resolvedOwner, resolvedRepo);
            return Result<GitHubPullRequestsResponse>.Failure(Error.ExternalService("GitHub", ex.Message));
        }
    }

    public async Task<Result<PullRequestSummary>> GetPullRequestAsync(
        int pullNumber,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var (resolvedOwner, resolvedRepo, error) = ResolveOwnerRepo(owner, repo);
        if (error != null) return Result<PullRequestSummary>.Failure(error);

        try
        {
            var response = await _httpClient.GetAsync(
                $"/repos/{resolvedOwner}/{resolvedRepo}/pulls/{pullNumber}",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return HandleErrorResponse<PullRequestSummary>(response);
            }

            var pr = await response.Content.ReadFromJsonAsync<GitHubPullRequest>(_jsonOptions, cancellationToken);
            if (pr == null)
            {
                return Result<PullRequestSummary>.Failure(Error.NotFound("Pull request not found"));
            }

            var summary = MapToPullRequestSummary(pr);

            // Fetch reviews
            var reviewsResult = await GetPullRequestReviewsAsync(pullNumber, resolvedOwner, resolvedRepo, cancellationToken);
            if (reviewsResult.IsSuccess)
            {
                summary = summary with { Reviews = reviewsResult.Value! };
            }

            // Fetch check runs for the PR head
            if (pr.Head?.Sha != null)
            {
                var checksResult = await GetCheckRunsAsync(pr.Head.Sha, resolvedOwner, resolvedRepo, cancellationToken);
                if (checksResult.IsSuccess)
                {
                    summary = summary with { CheckRuns = checksResult.Value! };
                }
            }

            return Result<PullRequestSummary>.Success(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get pull request #{PullNumber} for {Owner}/{Repo}", pullNumber, resolvedOwner, resolvedRepo);
            return Result<PullRequestSummary>.Failure(Error.ExternalService("GitHub", ex.Message));
        }
    }

    public async Task<Result<GitHubActionsResponse>> GetWorkflowRunsAsync(
        string? owner = null,
        string? repo = null,
        string? branch = null,
        string? status = null,
        int page = 1,
        int perPage = 30,
        CancellationToken cancellationToken = default)
    {
        var (resolvedOwner, resolvedRepo, error) = ResolveOwnerRepo(owner, repo);
        if (error != null) return Result<GitHubActionsResponse>.Failure(error);

        try
        {
            var url = $"/repos/{resolvedOwner}/{resolvedRepo}/actions/runs?page={page}&per_page={perPage}";
            if (!string.IsNullOrEmpty(branch))
            {
                url += $"&branch={Uri.EscapeDataString(branch)}";
            }
            if (!string.IsNullOrEmpty(status))
            {
                url += $"&status={Uri.EscapeDataString(status)}";
            }

            var response = await _httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return HandleErrorResponse<GitHubActionsResponse>(response);
            }

            var runsResponse = await response.Content.ReadFromJsonAsync<GitHubWorkflowRunsResponse>(_jsonOptions, cancellationToken);
            if (runsResponse == null)
            {
                return Result<GitHubActionsResponse>.Success(new GitHubActionsResponse());
            }

            var summaries = runsResponse.WorkflowRuns.Select(MapToWorkflowRunSummary).ToList();

            var hasMore = response.Headers.TryGetValues("Link", out var linkValues)
                && linkValues.Any(v => v.Contains("rel=\"next\""));

            return Result<GitHubActionsResponse>.Success(new GitHubActionsResponse
            {
                WorkflowRuns = summaries,
                TotalCount = runsResponse.TotalCount,
                Page = page,
                PerPage = perPage,
                HasMore = hasMore
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get workflow runs for {Owner}/{Repo}", resolvedOwner, resolvedRepo);
            return Result<GitHubActionsResponse>.Failure(Error.ExternalService("GitHub", ex.Message));
        }
    }

    public async Task<Result<WorkflowRunSummary>> GetWorkflowRunAsync(
        long runId,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var (resolvedOwner, resolvedRepo, error) = ResolveOwnerRepo(owner, repo);
        if (error != null) return Result<WorkflowRunSummary>.Failure(error);

        try
        {
            var response = await _httpClient.GetAsync(
                $"/repos/{resolvedOwner}/{resolvedRepo}/actions/runs/{runId}",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return HandleErrorResponse<WorkflowRunSummary>(response);
            }

            var run = await response.Content.ReadFromJsonAsync<GitHubWorkflowRun>(_jsonOptions, cancellationToken);
            if (run == null)
            {
                return Result<WorkflowRunSummary>.Failure(Error.NotFound("Workflow run not found"));
            }

            var summary = MapToWorkflowRunSummary(run);

            // Fetch jobs for this run
            var jobsResponse = await _httpClient.GetAsync(
                $"/repos/{resolvedOwner}/{resolvedRepo}/actions/runs/{runId}/jobs",
                cancellationToken);

            if (jobsResponse.IsSuccessStatusCode)
            {
                var jobsData = await jobsResponse.Content.ReadFromJsonAsync<GitHubWorkflowJobsResponse>(_jsonOptions, cancellationToken);
                if (jobsData != null)
                {
                    summary = summary with
                    {
                        Jobs = jobsData.Jobs.Select(j => new WorkflowJobSummary
                        {
                            Id = j.Id,
                            Name = j.Name,
                            Status = j.Status,
                            Conclusion = j.Conclusion,
                            StartedAt = j.StartedAt,
                            CompletedAt = j.CompletedAt,
                            HtmlUrl = j.HtmlUrl,
                            Steps = j.Steps.Select(s => new WorkflowStepSummary
                            {
                                Number = s.Number,
                                Name = s.Name,
                                Status = s.Status,
                                Conclusion = s.Conclusion
                            }).ToList()
                        }).ToList()
                    };
                }
            }

            return Result<WorkflowRunSummary>.Success(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get workflow run {RunId} for {Owner}/{Repo}", runId, resolvedOwner, resolvedRepo);
            return Result<WorkflowRunSummary>.Failure(Error.ExternalService("GitHub", ex.Message));
        }
    }

    public async Task<Result<List<GitHubWorkflow>>> GetWorkflowsAsync(
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var (resolvedOwner, resolvedRepo, error) = ResolveOwnerRepo(owner, repo);
        if (error != null) return Result<List<GitHubWorkflow>>.Failure(error);

        try
        {
            var response = await _httpClient.GetAsync(
                $"/repos/{resolvedOwner}/{resolvedRepo}/actions/workflows",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return HandleErrorResponse<List<GitHubWorkflow>>(response);
            }

            var workflowsResponse = await response.Content.ReadFromJsonAsync<GitHubWorkflowsResponse>(_jsonOptions, cancellationToken);
            return Result<List<GitHubWorkflow>>.Success(workflowsResponse?.Workflows ?? []);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get workflows for {Owner}/{Repo}", resolvedOwner, resolvedRepo);
            return Result<List<GitHubWorkflow>>.Failure(Error.ExternalService("GitHub", ex.Message));
        }
    }

    public async Task<Result<List<CheckRunSummary>>> GetCheckRunsAsync(
        string sha,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var (resolvedOwner, resolvedRepo, error) = ResolveOwnerRepo(owner, repo);
        if (error != null) return Result<List<CheckRunSummary>>.Failure(error);

        try
        {
            var response = await _httpClient.GetAsync(
                $"/repos/{resolvedOwner}/{resolvedRepo}/commits/{sha}/check-runs",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return HandleErrorResponse<List<CheckRunSummary>>(response);
            }

            var checkRunsResponse = await response.Content.ReadFromJsonAsync<GitHubCheckRunsResponse>(_jsonOptions, cancellationToken);
            var summaries = checkRunsResponse?.CheckRuns.Select(cr => new CheckRunSummary
            {
                Name = cr.Name,
                Status = cr.Status,
                Conclusion = cr.Conclusion,
                HtmlUrl = cr.HtmlUrl ?? cr.DetailsUrl
            }).ToList() ?? [];

            return Result<List<CheckRunSummary>>.Success(summaries);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get check runs for {Sha} in {Owner}/{Repo}", sha, resolvedOwner, resolvedRepo);
            return Result<List<CheckRunSummary>>.Failure(Error.ExternalService("GitHub", ex.Message));
        }
    }

    public async Task<Result<List<ReviewSummary>>> GetPullRequestReviewsAsync(
        int pullNumber,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var (resolvedOwner, resolvedRepo, error) = ResolveOwnerRepo(owner, repo);
        if (error != null) return Result<List<ReviewSummary>>.Failure(error);

        try
        {
            var response = await _httpClient.GetAsync(
                $"/repos/{resolvedOwner}/{resolvedRepo}/pulls/{pullNumber}/reviews",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return HandleErrorResponse<List<ReviewSummary>>(response);
            }

            var reviews = await response.Content.ReadFromJsonAsync<List<GitHubPullRequestReview>>(_jsonOptions, cancellationToken)
                ?? [];

            var summaries = reviews.Select(r => new ReviewSummary
            {
                Author = r.User?.Login ?? "Unknown",
                AuthorAvatarUrl = r.User?.AvatarUrl ?? string.Empty,
                State = r.State,
                SubmittedAt = r.SubmittedAt
            }).ToList();

            return Result<List<ReviewSummary>>.Success(summaries);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get reviews for PR #{PullNumber} in {Owner}/{Repo}", pullNumber, resolvedOwner, resolvedRepo);
            return Result<List<ReviewSummary>>.Failure(Error.ExternalService("GitHub", ex.Message));
        }
    }

    public async Task<Result<bool>> RerunWorkflowAsync(
        long runId,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var (resolvedOwner, resolvedRepo, error) = ResolveOwnerRepo(owner, repo);
        if (error != null) return Result<bool>.Failure(error);

        try
        {
            var response = await _httpClient.PostAsync(
                $"/repos/{resolvedOwner}/{resolvedRepo}/actions/runs/{runId}/rerun",
                null,
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return HandleErrorResponse<bool>(response);
            }

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to rerun workflow {RunId} for {Owner}/{Repo}", runId, resolvedOwner, resolvedRepo);
            return Result<bool>.Failure(Error.ExternalService("GitHub", ex.Message));
        }
    }

    public async Task<Result<bool>> CancelWorkflowRunAsync(
        long runId,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var (resolvedOwner, resolvedRepo, error) = ResolveOwnerRepo(owner, repo);
        if (error != null) return Result<bool>.Failure(error);

        try
        {
            var response = await _httpClient.PostAsync(
                $"/repos/{resolvedOwner}/{resolvedRepo}/actions/runs/{runId}/cancel",
                null,
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return HandleErrorResponse<bool>(response);
            }

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cancel workflow {RunId} for {Owner}/{Repo}", runId, resolvedOwner, resolvedRepo);
            return Result<bool>.Failure(Error.ExternalService("GitHub", ex.Message));
        }
    }

    private (string? owner, string? repo, Error? error) ResolveOwnerRepo(string? owner, string? repo)
    {
        var resolvedOwner = owner ?? _settings.DefaultOwner;
        var resolvedRepo = repo ?? _settings.DefaultRepo;

        if (string.IsNullOrEmpty(resolvedOwner) || string.IsNullOrEmpty(resolvedRepo))
        {
            return (null, null, Error.Validation(
                "GitHub repository is not configured. Please provide owner and repo or configure defaults."));
        }

        if (string.IsNullOrEmpty(_settings.PersonalAccessToken))
        {
            return (null, null, Error.Validation(
                "GitHub Personal Access Token is not configured."));
        }

        return (resolvedOwner, resolvedRepo, null);
    }

    private static Result<T> HandleErrorResponse<T>(HttpResponseMessage response)
    {
        var statusCode = (int)response.StatusCode;
        var errorCode = statusCode switch
        {
            401 => "GitHub.Unauthorized",
            403 => "GitHub.Forbidden",
            404 => "GitHub.NotFound",
            422 => "GitHub.ValidationError",
            _ => "GitHub.Error"
        };

        var errorMessage = statusCode switch
        {
            401 => "GitHub authentication failed. Check your Personal Access Token.",
            403 => "Access denied. You may not have permission to access this resource, or rate limit exceeded.",
            404 => "Resource not found. Check the repository owner and name.",
            422 => "Validation error. The request parameters are invalid.",
            _ => $"GitHub API error: {response.StatusCode}"
        };

        return Result<T>.Failure(Error.Custom(errorCode, errorMessage));
    }

    private static PullRequestSummary MapToPullRequestSummary(GitHubPullRequest pr)
    {
        return new PullRequestSummary
        {
            Number = pr.Number,
            Title = pr.Title,
            State = pr.Merged ? "merged" : pr.State,
            Author = pr.User?.Login ?? "Unknown",
            AuthorAvatarUrl = pr.User?.AvatarUrl ?? string.Empty,
            HtmlUrl = pr.HtmlUrl,
            HeadBranch = pr.Head?.Ref ?? string.Empty,
            BaseBranch = pr.Base?.Ref ?? string.Empty,
            IsDraft = pr.Draft,
            IsMerged = pr.Merged,
            CreatedAt = pr.CreatedAt,
            UpdatedAt = pr.UpdatedAt,
            Labels = pr.Labels,
            CommentsCount = pr.Comments + pr.ReviewComments,
            Additions = pr.Additions,
            Deletions = pr.Deletions,
            ChangedFiles = pr.ChangedFiles
        };
    }

    private static WorkflowRunSummary MapToWorkflowRunSummary(GitHubWorkflowRun run)
    {
        return new WorkflowRunSummary
        {
            Id = run.Id,
            Name = run.Name ?? "Workflow",
            DisplayTitle = run.DisplayTitle,
            HeadBranch = run.HeadBranch,
            HeadSha = run.HeadSha,
            RunNumber = run.RunNumber,
            Event = run.Event,
            Status = run.Status,
            Conclusion = run.Conclusion,
            HtmlUrl = run.HtmlUrl,
            CreatedAt = run.CreatedAt,
            RunStartedAt = run.RunStartedAt,
            Actor = run.Actor?.Login ?? run.TriggeringActor?.Login ?? "Unknown",
            ActorAvatarUrl = run.Actor?.AvatarUrl ?? run.TriggeringActor?.AvatarUrl ?? string.Empty
        };
    }

    public async Task<Result<GitHubPullRequestFilesResponse>> GetPullRequestFilesAsync(
        int pullNumber,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var (resolvedOwner, resolvedRepo, error) = ResolveOwnerRepo(owner, repo);
        if (error != null) return Result<GitHubPullRequestFilesResponse>.Failure(error);

        try
        {
            var response = await _httpClient.GetAsync(
                $"/repos/{resolvedOwner}/{resolvedRepo}/pulls/{pullNumber}/files",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return HandleErrorResponse<GitHubPullRequestFilesResponse>(response);
            }

            var files = await response.Content.ReadFromJsonAsync<List<GitHubPullRequestFile>>(_jsonOptions, cancellationToken)
                ?? [];

            var summaries = files.Select(f => new PullRequestFileSummary
            {
                Sha = f.Sha,
                Filename = f.Filename,
                Status = f.Status,
                Additions = f.Additions,
                Deletions = f.Deletions,
                Changes = f.Changes,
                Patch = f.Patch,
                PreviousFilename = f.PreviousFilename,
                BlobUrl = f.BlobUrl
            }).ToList();

            return Result<GitHubPullRequestFilesResponse>.Success(new GitHubPullRequestFilesResponse
            {
                Files = summaries,
                TotalCount = summaries.Count,
                TotalAdditions = summaries.Sum(f => f.Additions),
                TotalDeletions = summaries.Sum(f => f.Deletions)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get files for PR #{PullNumber} in {Owner}/{Repo}", pullNumber, resolvedOwner, resolvedRepo);
            return Result<GitHubPullRequestFilesResponse>.Failure(Error.ExternalService("GitHub", ex.Message));
        }
    }

    public async Task<Result<GitHubBranchesResponse>> GetBranchesAsync(
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var (resolvedOwner, resolvedRepo, error) = ResolveOwnerRepo(owner, repo);
        if (error != null) return Result<GitHubBranchesResponse>.Failure(error);

        try
        {
            // First get repo info to find default branch
            var repoResponse = await _httpClient.GetAsync(
                $"/repos/{resolvedOwner}/{resolvedRepo}",
                cancellationToken);

            string? defaultBranch = null;
            if (repoResponse.IsSuccessStatusCode)
            {
                var repoContent = await repoResponse.Content.ReadAsStringAsync(cancellationToken);
                using var doc = JsonDocument.Parse(repoContent);
                if (doc.RootElement.TryGetProperty("default_branch", out var db))
                {
                    defaultBranch = db.GetString();
                }
            }

            // Get branches
            var response = await _httpClient.GetAsync(
                $"/repos/{resolvedOwner}/{resolvedRepo}/branches?per_page=100",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return HandleErrorResponse<GitHubBranchesResponse>(response);
            }

            var branches = await response.Content.ReadFromJsonAsync<List<GitHubBranchInfo>>(_jsonOptions, cancellationToken)
                ?? [];

            var summaries = branches.Select(b => new BranchSummary
            {
                Name = b.Name,
                CommitSha = b.Commit?.Sha ?? string.Empty,
                IsProtected = b.Protected,
                IsDefault = b.Name == defaultBranch
            }).ToList();

            return Result<GitHubBranchesResponse>.Success(new GitHubBranchesResponse
            {
                Branches = summaries,
                DefaultBranch = defaultBranch
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get branches for {Owner}/{Repo}", resolvedOwner, resolvedRepo);
            return Result<GitHubBranchesResponse>.Failure(Error.ExternalService("GitHub", ex.Message));
        }
    }

    public async Task<Result<GitHubIssuesResponse>> GetIssuesAsync(
        string? owner = null,
        string? repo = null,
        string state = "open",
        int page = 1,
        int perPage = 30,
        CancellationToken cancellationToken = default)
    {
        var (resolvedOwner, resolvedRepo, error) = ResolveOwnerRepo(owner, repo);
        if (error != null) return Result<GitHubIssuesResponse>.Failure(error);

        try
        {
            var url = $"/repos/{resolvedOwner}/{resolvedRepo}/issues?state={state}&page={page}&per_page={perPage}";
            var response = await _httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return HandleErrorResponse<GitHubIssuesResponse>(response);
            }

            var issues = await response.Content.ReadFromJsonAsync<List<GitHubIssue>>(_jsonOptions, cancellationToken)
                ?? [];

            // Filter out pull requests (they show up in issues endpoint)
            var actualIssues = issues.Where(i => i.PullRequest == null).ToList();

            var summaries = actualIssues.Select(i => new IssueSummary
            {
                Number = i.Number,
                Title = i.Title,
                Body = i.Body,
                State = i.State,
                HtmlUrl = i.HtmlUrl,
                Author = i.User?.Login ?? "Unknown",
                AuthorAvatarUrl = i.User?.AvatarUrl ?? string.Empty,
                Labels = i.Labels,
                Assignees = i.Assignees.Select(a => a.Login).ToList(),
                CommentsCount = i.Comments,
                CreatedAt = i.CreatedAt,
                UpdatedAt = i.UpdatedAt,
                ClosedAt = i.ClosedAt
            }).ToList();

            var hasMore = response.Headers.TryGetValues("Link", out var linkValues)
                && linkValues.Any(v => v.Contains("rel=\"next\""));

            return Result<GitHubIssuesResponse>.Success(new GitHubIssuesResponse
            {
                Issues = summaries,
                TotalCount = summaries.Count,
                Page = page,
                PerPage = perPage,
                HasMore = hasMore
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get issues for {Owner}/{Repo}", resolvedOwner, resolvedRepo);
            return Result<GitHubIssuesResponse>.Failure(Error.ExternalService("GitHub", ex.Message));
        }
    }

    public async Task<Result<GitHubCommitsResponse>> GetCommitsAsync(
        string? owner = null,
        string? repo = null,
        string? branch = null,
        int page = 1,
        int perPage = 30,
        CancellationToken cancellationToken = default)
    {
        var (resolvedOwner, resolvedRepo, error) = ResolveOwnerRepo(owner, repo);
        if (error != null) return Result<GitHubCommitsResponse>.Failure(error);

        try
        {
            var url = $"/repos/{resolvedOwner}/{resolvedRepo}/commits?page={page}&per_page={perPage}";
            if (!string.IsNullOrEmpty(branch))
            {
                url += $"&sha={Uri.EscapeDataString(branch)}";
            }

            var response = await _httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return HandleErrorResponse<GitHubCommitsResponse>(response);
            }

            var commits = await response.Content.ReadFromJsonAsync<List<GitHubCommit>>(_jsonOptions, cancellationToken)
                ?? [];

            var summaries = commits.Select(c => new CommitSummary
            {
                Sha = c.Sha,
                ShortSha = c.Sha.Length >= 7 ? c.Sha[..7] : c.Sha,
                Message = c.Commit?.Message ?? string.Empty,
                MessageHeadline = (c.Commit?.Message ?? string.Empty).Split('\n').FirstOrDefault() ?? string.Empty,
                Author = c.Author?.Login ?? c.Commit?.Author?.Name ?? "Unknown",
                AuthorAvatarUrl = c.Author?.AvatarUrl ?? string.Empty,
                AuthoredAt = c.Commit?.Author?.Date ?? DateTime.MinValue,
                HtmlUrl = c.HtmlUrl,
                Additions = c.Stats?.Additions,
                Deletions = c.Stats?.Deletions
            }).ToList();

            var hasMore = response.Headers.TryGetValues("Link", out var linkValues)
                && linkValues.Any(v => v.Contains("rel=\"next\""));

            return Result<GitHubCommitsResponse>.Success(new GitHubCommitsResponse
            {
                Commits = summaries,
                Page = page,
                PerPage = perPage,
                HasMore = hasMore
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get commits for {Owner}/{Repo}", resolvedOwner, resolvedRepo);
            return Result<GitHubCommitsResponse>.Failure(Error.ExternalService("GitHub", ex.Message));
        }
    }

    public async Task<Result<GitHubCommentsResponse>> GetIssueCommentsAsync(
        int issueNumber,
        string? owner = null,
        string? repo = null,
        CancellationToken cancellationToken = default)
    {
        var (resolvedOwner, resolvedRepo, error) = ResolveOwnerRepo(owner, repo);
        if (error != null) return Result<GitHubCommentsResponse>.Failure(error);

        try
        {
            var response = await _httpClient.GetAsync(
                $"/repos/{resolvedOwner}/{resolvedRepo}/issues/{issueNumber}/comments",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return HandleErrorResponse<GitHubCommentsResponse>(response);
            }

            var comments = await response.Content.ReadFromJsonAsync<List<GitHubIssueComment>>(_jsonOptions, cancellationToken)
                ?? [];

            var summaries = comments.Select(c => new CommentSummary
            {
                Id = c.Id,
                Body = c.Body,
                Author = c.User?.Login ?? "Unknown",
                AuthorAvatarUrl = c.User?.AvatarUrl ?? string.Empty,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                HtmlUrl = c.HtmlUrl
            }).ToList();

            return Result<GitHubCommentsResponse>.Success(new GitHubCommentsResponse
            {
                Comments = summaries,
                TotalCount = summaries.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get comments for issue #{IssueNumber} in {Owner}/{Repo}", issueNumber, resolvedOwner, resolvedRepo);
            return Result<GitHubCommentsResponse>.Failure(Error.ExternalService("GitHub", ex.Message));
        }
    }

    public void Dispose()
    {
        _httpClient.Dispose();
    }
}
