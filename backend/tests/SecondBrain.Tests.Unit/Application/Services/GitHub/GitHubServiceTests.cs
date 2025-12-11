using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;

namespace SecondBrain.Tests.Unit.Application.Services.GitHub;

public class GitHubServiceTests : IDisposable
{
    private readonly Mock<ILogger<GitHubService>> _mockLogger;
    private readonly Mock<IHttpClientFactory> _mockHttpClientFactory;
    private readonly GitHubSettings _settings;
    private readonly MockHttpMessageHandler _mockHttpHandler;
    private readonly HttpClient _httpClient;
    private readonly GitHubService _sut;

    public GitHubServiceTests()
    {
        _mockLogger = new Mock<ILogger<GitHubService>>();
        _mockHttpClientFactory = new Mock<IHttpClientFactory>();
        _mockHttpHandler = new MockHttpMessageHandler();
        _httpClient = new HttpClient(_mockHttpHandler);

        _settings = new GitHubSettings
        {
            PersonalAccessToken = "test-token",
            DefaultOwner = "testowner",
            DefaultRepo = "testrepo",
            BaseUrl = "https://api.github.com",
            TimeoutSeconds = 30
        };

        var options = Options.Create(_settings);
        _mockHttpClientFactory.Setup(f => f.CreateClient("GitHub")).Returns(_httpClient);

        _sut = new GitHubService(_mockHttpClientFactory.Object, options, _mockLogger.Object);
    }

    public void Dispose()
    {
        _httpClient.Dispose();
        _mockHttpHandler.Dispose();
    }

    #region GetRepositoryInfoAsync Tests

    [Fact]
    public async Task GetRepositoryInfoAsync_WhenSuccessful_ReturnsRepositoryInfo()
    {
        // Arrange
        var responseJson = JsonSerializer.Serialize(new
        {
            full_name = "testowner/testrepo",
            html_url = "https://github.com/testowner/testrepo",
            default_branch = "main"
        });

        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, responseJson);

        // Act
        var result = await _sut.GetRepositoryInfoAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Owner.Should().Be("testowner");
        result.Value.Repo.Should().Be("testrepo");
        result.Value.FullName.Should().Be("testowner/testrepo");
        result.Value.DefaultBranch.Should().Be("main");
        result.Value.IsConfigured.Should().BeTrue();
    }

    [Fact]
    public async Task GetRepositoryInfoAsync_WithCustomOwnerAndRepo_UsesProvidedValues()
    {
        // Arrange
        var responseJson = JsonSerializer.Serialize(new
        {
            full_name = "custom/repo",
            html_url = "https://github.com/custom/repo"
        });

        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, responseJson);

        // Act
        var result = await _sut.GetRepositoryInfoAsync("custom", "repo");

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Owner.Should().Be("custom");
        result.Value.Repo.Should().Be("repo");
    }

    [Fact]
    public async Task GetRepositoryInfoAsync_WhenNotConfigured_ReturnsValidationError()
    {
        // Arrange
        var settingsWithNoDefaults = new GitHubSettings
        {
            PersonalAccessToken = "token",
            BaseUrl = "https://api.github.com",
            TimeoutSeconds = 30
        };
        var options = Options.Create(settingsWithNoDefaults);
        var service = new GitHubService(_mockHttpClientFactory.Object, options, _mockLogger.Object);

        // Act
        var result = await service.GetRepositoryInfoAsync(null, null);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("ValidationFailed");
    }

    [Fact]
    public async Task GetRepositoryInfoAsync_When401Unauthorized_ReturnsUnauthorizedError()
    {
        // Arrange
        _mockHttpHandler.SetupResponse(HttpStatusCode.Unauthorized, "{\"message\":\"Bad credentials\"}");

        // Act
        var result = await _sut.GetRepositoryInfoAsync();

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("GitHub.Unauthorized");
    }

    [Fact]
    public async Task GetRepositoryInfoAsync_When404NotFound_ReturnsNotFoundError()
    {
        // Arrange
        _mockHttpHandler.SetupResponse(HttpStatusCode.NotFound, "{\"message\":\"Not Found\"}");

        // Act
        var result = await _sut.GetRepositoryInfoAsync();

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("GitHub.NotFound");
    }

    [Fact]
    public async Task GetRepositoryInfoAsync_When403Forbidden_ReturnsForbiddenError()
    {
        // Arrange
        _mockHttpHandler.SetupResponse(HttpStatusCode.Forbidden, "{\"message\":\"Rate limit exceeded\"}");

        // Act
        var result = await _sut.GetRepositoryInfoAsync();

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("GitHub.Forbidden");
    }

    [Fact]
    public async Task GetRepositoryInfoAsync_WhenExceptionThrown_ReturnsExternalServiceError()
    {
        // Arrange
        _mockHttpHandler.SetupException(new HttpRequestException("Network error"));

        // Act
        var result = await _sut.GetRepositoryInfoAsync();

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("ExternalServiceError");
    }

    #endregion

    #region GetPullRequestsAsync Tests

    [Fact]
    public async Task GetPullRequestsAsync_WhenSuccessful_ReturnsPullRequests()
    {
        // Arrange
        var prsJson = JsonSerializer.Serialize(new[]
        {
            new
            {
                number = 1,
                title = "Fix bug",
                state = "open",
                draft = false,
                merged = false,
                user = new { login = "user1", avatar_url = "http://example.com/avatar1" },
                html_url = "https://github.com/owner/repo/pull/1",
                head = new { @ref = "feature-1" },
                @base = new { @ref = "main" },
                created_at = DateTime.UtcNow.AddDays(-1),
                updated_at = DateTime.UtcNow,
                labels = Array.Empty<object>(),
                comments = 0,
                additions = 10,
                deletions = 5,
                changed_files = 2
            }
        });

        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, prsJson);

        // Act
        var result = await _sut.GetPullRequestsAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.PullRequests.Should().HaveCount(1);
        result.Value.PullRequests.First().Number.Should().Be(1);
        result.Value.PullRequests.First().Title.Should().Be("Fix bug");
    }

    [Fact]
    public async Task GetPullRequestsAsync_WithPagination_SetsCorrectQueryParameters()
    {
        // Arrange
        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, "[]");

        // Act
        await _sut.GetPullRequestsAsync("owner", "repo", "closed", 2, 50);

        // Assert
        var requestUri = _mockHttpHandler.LastRequestUri;
        requestUri.Should().Contain("state=closed");
        requestUri.Should().Contain("page=2");
        requestUri.Should().Contain("per_page=50");
    }

    [Fact]
    public async Task GetPullRequestsAsync_WhenLinkHeaderPresent_SetsHasMoreCorrectly()
    {
        // Arrange
        var headers = new Dictionary<string, string>
        {
            { "Link", "<https://api.github.com/repos/owner/repo/pulls?page=2>; rel=\"next\"" }
        };
        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, "[]", headers);

        // Act
        var result = await _sut.GetPullRequestsAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.HasMore.Should().BeTrue();
    }

    [Fact]
    public async Task GetPullRequestsAsync_WhenNoLinkHeader_SetsHasMoreToFalse()
    {
        // Arrange
        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, "[]");

        // Act
        var result = await _sut.GetPullRequestsAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.HasMore.Should().BeFalse();
    }

    #endregion

    #region GetPullRequestAsync Tests

    [Fact]
    public async Task GetPullRequestAsync_WhenSuccessful_ReturnsPullRequestWithDetails()
    {
        // Arrange
        var prJson = JsonSerializer.Serialize(new
        {
            number = 123,
            title = "Test PR",
            state = "open",
            draft = false,
            merged = false,
            user = new { login = "author", avatar_url = "http://example.com/avatar" },
            html_url = "https://github.com/owner/repo/pull/123",
            head = new { @ref = "feature" },
            @base = new { @ref = "main" },
            created_at = DateTime.UtcNow.AddDays(-1),
            updated_at = DateTime.UtcNow,
            labels = Array.Empty<object>(),
            comments = 5,
            additions = 100,
            deletions = 50,
            changed_files = 10
        });

        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, prJson);

        // Act
        var result = await _sut.GetPullRequestAsync(123);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Number.Should().Be(123);
        result.Value.Title.Should().Be("Test PR");
        result.Value.CommentsCount.Should().Be(5);
    }

    [Fact]
    public async Task GetPullRequestAsync_WhenNotFound_ReturnsNotFoundError()
    {
        // Arrange
        _mockHttpHandler.SetupResponse(HttpStatusCode.NotFound, "{\"message\":\"Not Found\"}");

        // Act
        var result = await _sut.GetPullRequestAsync(999);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("GitHub.NotFound");
    }

    #endregion

    #region GetWorkflowRunsAsync Tests

    [Fact]
    public async Task GetWorkflowRunsAsync_WhenSuccessful_ReturnsWorkflowRuns()
    {
        // Arrange
        var runsJson = JsonSerializer.Serialize(new
        {
            total_count = 2,
            workflow_runs = new[]
            {
                new
                {
                    id = 1L,
                    name = "CI",
                    display_title = "CI Build",
                    head_branch = "main",
                    head_sha = "abc123",
                    run_number = 10,
                    @event = "push",
                    status = "completed",
                    conclusion = "success",
                    html_url = "https://github.com/owner/repo/actions/runs/1",
                    created_at = DateTime.UtcNow.AddMinutes(-30),
                    run_started_at = DateTime.UtcNow.AddMinutes(-30),
                    actor = new { login = "user", avatar_url = "http://example.com/avatar" }
                }
            }
        });

        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, runsJson);

        // Act
        var result = await _sut.GetWorkflowRunsAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.WorkflowRuns.Should().HaveCount(1);
        result.Value.WorkflowRuns.First().Name.Should().Be("CI");
        result.Value.WorkflowRuns.First().Status.Should().Be("completed");
        result.Value.WorkflowRuns.First().Conclusion.Should().Be("success");
    }

    [Fact]
    public async Task GetWorkflowRunsAsync_WithBranchFilter_IncludesInQueryString()
    {
        // Arrange
        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, "{\"workflow_runs\":[],\"total_count\":0}");

        // Act
        await _sut.GetWorkflowRunsAsync(branch: "develop");

        // Assert
        _mockHttpHandler.LastRequestUri.Should().Contain("branch=develop");
    }

    [Fact]
    public async Task GetWorkflowRunsAsync_WithStatusFilter_IncludesInQueryString()
    {
        // Arrange
        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, "{\"workflow_runs\":[],\"total_count\":0}");

        // Act
        await _sut.GetWorkflowRunsAsync(status: "in_progress");

        // Assert
        _mockHttpHandler.LastRequestUri.Should().Contain("status=in_progress");
    }

    #endregion

    #region GetWorkflowRunAsync Tests

    [Fact]
    public async Task GetWorkflowRunAsync_WhenSuccessful_ReturnsWorkflowRunWithJobs()
    {
        // Arrange
        var runJson = JsonSerializer.Serialize(new
        {
            id = 12345L,
            name = "CI Pipeline",
            display_title = "CI Pipeline",
            head_branch = "main",
            head_sha = "abc123",
            run_number = 10,
            @event = "push",
            status = "completed",
            conclusion = "success",
            html_url = "https://github.com/owner/repo/actions/runs/12345",
            created_at = DateTime.UtcNow.AddMinutes(-30),
            run_started_at = DateTime.UtcNow.AddMinutes(-30),
            actor = new { login = "user", avatar_url = "http://example.com/avatar" }
        });

        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, runJson);

        // Act
        var result = await _sut.GetWorkflowRunAsync(12345);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(12345);
        result.Value.Name.Should().Be("CI Pipeline");
    }

    #endregion

    #region GetWorkflowsAsync Tests

    [Fact]
    public async Task GetWorkflowsAsync_WhenSuccessful_ReturnsWorkflows()
    {
        // Arrange
        var workflowsJson = JsonSerializer.Serialize(new
        {
            total_count = 2,
            workflows = new[]
            {
                new { id = 1L, name = "CI", path = ".github/workflows/ci.yml", state = "active" },
                new { id = 2L, name = "Deploy", path = ".github/workflows/deploy.yml", state = "active" }
            }
        });

        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, workflowsJson);

        // Act
        var result = await _sut.GetWorkflowsAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().HaveCount(2);
        result.Value.First().Name.Should().Be("CI");
    }

    #endregion

    #region GetCheckRunsAsync Tests

    [Fact]
    public async Task GetCheckRunsAsync_WhenSuccessful_ReturnsCheckRuns()
    {
        // Arrange
        var checksJson = JsonSerializer.Serialize(new
        {
            total_count = 2,
            check_runs = new[]
            {
                new { name = "build", status = "completed", conclusion = "success", html_url = "http://example.com/1" },
                new { name = "test", status = "completed", conclusion = "success", html_url = "http://example.com/2" }
            }
        });

        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, checksJson);

        // Act
        var result = await _sut.GetCheckRunsAsync("abc123");

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().HaveCount(2);
    }

    #endregion

    #region GetPullRequestReviewsAsync Tests

    [Fact]
    public async Task GetPullRequestReviewsAsync_WhenSuccessful_ReturnsReviews()
    {
        // Arrange
        var reviewsJson = JsonSerializer.Serialize(new[]
        {
            new
            {
                user = new { login = "reviewer1", avatar_url = "http://example.com/avatar1" },
                state = "APPROVED",
                submitted_at = DateTime.UtcNow.AddHours(-1)
            },
            new
            {
                user = new { login = "reviewer2", avatar_url = "http://example.com/avatar2" },
                state = "CHANGES_REQUESTED",
                submitted_at = DateTime.UtcNow.AddHours(-2)
            }
        });

        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, reviewsJson);

        // Act
        var result = await _sut.GetPullRequestReviewsAsync(123);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().HaveCount(2);
        result.Value.First().State.Should().Be("APPROVED");
    }

    #endregion

    #region RerunWorkflowAsync Tests

    [Fact]
    public async Task RerunWorkflowAsync_WhenSuccessful_ReturnsTrue()
    {
        // Arrange
        _mockHttpHandler.SetupResponse(HttpStatusCode.Created, "");

        // Act
        var result = await _sut.RerunWorkflowAsync(12345);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeTrue();
    }

    [Fact]
    public async Task RerunWorkflowAsync_WhenForbidden_ReturnsForbiddenError()
    {
        // Arrange
        _mockHttpHandler.SetupResponse(HttpStatusCode.Forbidden, "{\"message\":\"Not allowed\"}");

        // Act
        var result = await _sut.RerunWorkflowAsync(12345);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("GitHub.Forbidden");
    }

    #endregion

    #region CancelWorkflowRunAsync Tests

    [Fact]
    public async Task CancelWorkflowRunAsync_WhenSuccessful_ReturnsTrue()
    {
        // Arrange
        _mockHttpHandler.SetupResponse(HttpStatusCode.Accepted, "");

        // Act
        var result = await _sut.CancelWorkflowRunAsync(12345);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeTrue();
    }

    #endregion

    #region GetPullRequestFilesAsync Tests

    [Fact]
    public async Task GetPullRequestFilesAsync_WhenSuccessful_ReturnsFiles()
    {
        // Arrange
        var filesJson = JsonSerializer.Serialize(new[]
        {
            new
            {
                filename = "src/app.ts",
                status = "modified",
                additions = 10,
                deletions = 5,
                changes = 15,
                patch = "@@ -1,5 +1,10 @@",
                blob_url = "http://example.com/blob",
                raw_url = "http://example.com/raw"
            }
        });

        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, filesJson);

        // Act
        var result = await _sut.GetPullRequestFilesAsync(123);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Files.Should().HaveCount(1);
        result.Value.Files.First().Filename.Should().Be("src/app.ts");
        result.Value.Files.First().Status.Should().Be("modified");
        result.Value.Files.First().Additions.Should().Be(10);
        result.Value.Files.First().Deletions.Should().Be(5);
    }

    #endregion

    #region GetBranchesAsync Tests

    [Fact]
    public async Task GetBranchesAsync_WhenSuccessful_ReturnsBranches()
    {
        // Arrange
        // First call is repo info (to get default branch), second call is branches
        var repoJson = JsonSerializer.Serialize(new
        {
            full_name = "testowner/testrepo",
            html_url = "https://github.com/testowner/testrepo",
            default_branch = "main"
        });

        var branchesJson = JsonSerializer.Serialize(new[]
        {
            new
            {
                name = "main",
                commit = new { sha = "abc123" },
                @protected = true
            },
            new
            {
                name = "develop",
                commit = new { sha = "def456" },
                @protected = false
            }
        });

        // Service calls repo endpoint first, then branches endpoint
        _mockHttpHandler.SetupMultipleResponses(new[]
        {
            (HttpStatusCode.OK, repoJson),
            (HttpStatusCode.OK, branchesJson)
        });

        // Act
        var result = await _sut.GetBranchesAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Branches.Should().HaveCount(2);
        result.Value.Branches.First().Name.Should().Be("main");
        result.Value.Branches.First().IsProtected.Should().BeTrue();
    }

    #endregion

    #region GetIssuesAsync Tests

    [Fact]
    public async Task GetIssuesAsync_WhenSuccessful_ReturnsIssues()
    {
        // Arrange - only regular issues (no pull_request property)
        var issuesJson = JsonSerializer.Serialize(new[]
        {
            new
            {
                number = 1,
                title = "Bug report",
                state = "open",
                user = new { login = "user1", avatar_url = "http://example.com/avatar" },
                html_url = "https://github.com/owner/repo/issues/1",
                created_at = DateTime.UtcNow.AddDays(-1),
                updated_at = DateTime.UtcNow,
                labels = Array.Empty<object>(),
                comments = 2
            },
            new
            {
                number = 2,
                title = "Feature request",
                state = "open",
                user = new { login = "user2", avatar_url = "http://example.com/avatar2" },
                html_url = "https://github.com/owner/repo/issues/2",
                created_at = DateTime.UtcNow.AddDays(-2),
                updated_at = DateTime.UtcNow,
                labels = Array.Empty<object>(),
                comments = 5
            }
        });

        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, issuesJson);

        // Act
        var result = await _sut.GetIssuesAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Issues.Should().HaveCount(2);
        result.Value.Issues.First().Title.Should().Be("Bug report");
    }

    [Fact]
    public async Task GetIssuesAsync_WithStateFilter_IncludesInQueryString()
    {
        // Arrange
        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, "[]");

        // Act
        await _sut.GetIssuesAsync(state: "closed");

        // Assert
        _mockHttpHandler.LastRequestUri.Should().Contain("state=closed");
    }

    #endregion

    #region GetCommitsAsync Tests

    [Fact]
    public async Task GetCommitsAsync_WhenSuccessful_ReturnsCommits()
    {
        // Arrange
        var commitsJson = JsonSerializer.Serialize(new[]
        {
            new
            {
                sha = "abc123def456",
                commit = new
                {
                    message = "Initial commit",
                    author = new { name = "Author", date = DateTime.UtcNow.AddDays(-1) },
                    committer = new { name = "Committer" }
                },
                author = new { login = "author", avatar_url = "http://example.com/avatar" },
                html_url = "https://github.com/owner/repo/commit/abc123",
                stats = new { additions = 100, deletions = 0 },
                files = new[] { new { filename = "file1.txt" } }
            }
        });

        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, commitsJson);

        // Act
        var result = await _sut.GetCommitsAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Commits.Should().HaveCount(1);
        result.Value.Commits.First().Message.Should().Be("Initial commit");
        result.Value.Commits.First().ShortSha.Should().Be("abc123d");
    }

    [Fact]
    public async Task GetCommitsAsync_WithBranchFilter_IncludesInQueryString()
    {
        // Arrange
        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, "[]");

        // Act
        await _sut.GetCommitsAsync(branch: "develop");

        // Assert
        _mockHttpHandler.LastRequestUri.Should().Contain("sha=develop");
    }

    #endregion

    #region GetIssueCommentsAsync Tests

    [Fact]
    public async Task GetIssueCommentsAsync_WhenSuccessful_ReturnsComments()
    {
        // Arrange
        var commentsJson = JsonSerializer.Serialize(new[]
        {
            new
            {
                id = 1L,
                body = "First comment",
                user = new { login = "user1", avatar_url = "http://example.com/avatar" },
                created_at = DateTime.UtcNow.AddHours(-1),
                updated_at = DateTime.UtcNow.AddHours(-1),
                html_url = "https://github.com/owner/repo/issues/1#issuecomment-1"
            },
            new
            {
                id = 2L,
                body = "Second comment",
                user = new { login = "user2", avatar_url = "http://example.com/avatar2" },
                created_at = DateTime.UtcNow.AddMinutes(-30),
                updated_at = DateTime.UtcNow.AddMinutes(-30),
                html_url = "https://github.com/owner/repo/issues/1#issuecomment-2"
            }
        });

        _mockHttpHandler.SetupResponse(HttpStatusCode.OK, commentsJson);

        // Act
        var result = await _sut.GetIssueCommentsAsync(1);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Comments.Should().HaveCount(2);
        result.Value.Comments.First().Body.Should().Be("First comment");
        result.Value.TotalCount.Should().Be(2);
    }

    #endregion

    #region Error Handling Tests

    [Theory]
    [InlineData(HttpStatusCode.Unauthorized, "GitHub.Unauthorized")]
    [InlineData(HttpStatusCode.Forbidden, "GitHub.Forbidden")]
    [InlineData(HttpStatusCode.NotFound, "GitHub.NotFound")]
    [InlineData(HttpStatusCode.UnprocessableEntity, "GitHub.ValidationError")]
    [InlineData(HttpStatusCode.InternalServerError, "GitHub.Error")]
    public async Task ErrorHandling_ReturnsCorrectErrorCode(HttpStatusCode statusCode, string expectedErrorCode)
    {
        // Arrange
        _mockHttpHandler.SetupResponse(statusCode, "{\"message\":\"Error\"}");

        // Act
        var result = await _sut.GetRepositoryInfoAsync();

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be(expectedErrorCode);
    }

    #endregion
}

/// <summary>
/// Mock HTTP message handler for testing HTTP requests
/// </summary>
public class MockHttpMessageHandler : HttpMessageHandler
{
    private HttpStatusCode _statusCode = HttpStatusCode.OK;
    private string _responseContent = "";
    private Dictionary<string, string> _responseHeaders = new();
    private Exception? _exception;
    private Queue<(HttpStatusCode, string)>? _responseQueue;
    public string LastRequestUri { get; private set; } = "";
    public HttpMethod? LastRequestMethod { get; private set; }

    public void SetupResponse(HttpStatusCode statusCode, string content, Dictionary<string, string>? headers = null)
    {
        _statusCode = statusCode;
        _responseContent = content;
        _responseHeaders = headers ?? new Dictionary<string, string>();
        _exception = null;
        _responseQueue = null;
    }

    public void SetupMultipleResponses(IEnumerable<(HttpStatusCode, string)> responses)
    {
        _responseQueue = new Queue<(HttpStatusCode, string)>(responses);
        _exception = null;
    }

    public void SetupException(Exception exception)
    {
        _exception = exception;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        LastRequestUri = request.RequestUri?.ToString() ?? "";
        LastRequestMethod = request.Method;

        if (_exception != null)
        {
            throw _exception;
        }

        var statusCode = _statusCode;
        var content = _responseContent;

        if (_responseQueue != null && _responseQueue.Count > 0)
        {
            (statusCode, content) = _responseQueue.Dequeue();
        }

        var response = new HttpResponseMessage(statusCode)
        {
            Content = new StringContent(content)
        };

        foreach (var header in _responseHeaders)
        {
            response.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        return Task.FromResult(response);
    }
}
