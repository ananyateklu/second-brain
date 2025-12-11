using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Controllers;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Tests.Unit.API.Controllers;

public class GitHubControllerTests
{
    private readonly Mock<IGitHubService> _mockGitHubService;
    private readonly Mock<ILogger<GitHubController>> _mockLogger;
    private readonly GitHubController _sut;

    public GitHubControllerTests()
    {
        _mockGitHubService = new Mock<IGitHubService>();
        _mockLogger = new Mock<ILogger<GitHubController>>();

        _sut = new GitHubController(
            _mockGitHubService.Object,
            _mockLogger.Object
        );

        SetupUnauthenticatedUser();
    }

    #region GetRepositoryInfo Tests

    [Fact]
    public async Task GetRepositoryInfo_WhenSuccessful_ReturnsOkWithRepositoryInfo()
    {
        // Arrange
        var repoInfo = new GitHubRepositoryInfo
        {
            Owner = "testowner",
            Repo = "testrepo",
            FullName = "testowner/testrepo",
            HtmlUrl = "https://github.com/testowner/testrepo",
            DefaultBranch = "main",
            IsConfigured = true
        };

        _mockGitHubService.Setup(s => s.GetRepositoryInfoAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubRepositoryInfo>.Success(repoInfo));

        // Act
        var result = await _sut.GetRepositoryInfo(null, null);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedInfo = okResult.Value.Should().BeOfType<GitHubRepositoryInfo>().Subject;
        returnedInfo.Owner.Should().Be("testowner");
        returnedInfo.Repo.Should().Be("testrepo");
        returnedInfo.IsConfigured.Should().BeTrue();
    }

    [Fact]
    public async Task GetRepositoryInfo_WhenValidationFails_ReturnsBadRequest()
    {
        // Arrange
        _mockGitHubService.Setup(s => s.GetRepositoryInfoAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubRepositoryInfo>.Failure(Error.Validation("GitHub token not configured")));

        // Act
        var result = await _sut.GetRepositoryInfo(null, null);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.StatusCode.Should().Be(400);
    }

    [Fact]
    public async Task GetRepositoryInfo_WhenUnauthorized_ReturnsUnauthorized()
    {
        // Arrange
        _mockGitHubService.Setup(s => s.GetRepositoryInfoAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubRepositoryInfo>.Failure(Error.Custom("GitHub.Unauthorized", "Bad credentials")));

        // Act
        var result = await _sut.GetRepositoryInfo(null, null);

        // Assert
        var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.StatusCode.Should().Be(401);
    }

    [Fact]
    public async Task GetRepositoryInfo_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockGitHubService.Setup(s => s.GetRepositoryInfoAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubRepositoryInfo>.Failure(Error.NotFound("Repository", "testrepo")));

        // Act
        var result = await _sut.GetRepositoryInfo("owner", "testrepo");

        // Assert
        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task GetRepositoryInfo_WithCustomOwnerAndRepo_PassesParametersCorrectly()
    {
        // Arrange
        var repoInfo = new GitHubRepositoryInfo { Owner = "custom", Repo = "repo", IsConfigured = true };
        _mockGitHubService.Setup(s => s.GetRepositoryInfoAsync("custom", "repo", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubRepositoryInfo>.Success(repoInfo));

        // Act
        await _sut.GetRepositoryInfo("custom", "repo");

        // Assert
        _mockGitHubService.Verify(s => s.GetRepositoryInfoAsync("custom", "repo", It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region GetPullRequests Tests

    [Fact]
    public async Task GetPullRequests_WhenSuccessful_ReturnsOkWithPullRequests()
    {
        // Arrange
        var prs = new GitHubPullRequestsResponse
        {
            PullRequests = new List<PullRequestSummary>
            {
                CreateTestPullRequest(1, "Fix bug"),
                CreateTestPullRequest(2, "Add feature")
            },
            TotalCount = 2,
            Page = 1,
            PerPage = 30,
            HasMore = false
        };

        _mockGitHubService.Setup(s => s.GetPullRequestsAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubPullRequestsResponse>.Success(prs));

        // Act
        var result = await _sut.GetPullRequests();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedPRs = okResult.Value.Should().BeOfType<GitHubPullRequestsResponse>().Subject;
        returnedPRs.PullRequests.Should().HaveCount(2);
        returnedPRs.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task GetPullRequests_WithPagination_PassesParametersCorrectly()
    {
        // Arrange
        var prs = new GitHubPullRequestsResponse { PullRequests = new List<PullRequestSummary>() };
        _mockGitHubService.Setup(s => s.GetPullRequestsAsync(
                "owner", "repo", "closed", 2, 50, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubPullRequestsResponse>.Success(prs));

        // Act
        await _sut.GetPullRequests("owner", "repo", "closed", 2, 50);

        // Assert
        _mockGitHubService.Verify(s => s.GetPullRequestsAsync("owner", "repo", "closed", 2, 50, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetPullRequests_WhenError_ReturnsAppropriateStatusCode()
    {
        // Arrange
        _mockGitHubService.Setup(s => s.GetPullRequestsAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubPullRequestsResponse>.Failure(Error.Custom("GitHub.Forbidden", "Rate limit exceeded")));

        // Act
        var result = await _sut.GetPullRequests();

        // Assert
        var statusResult = result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(403);
    }

    #endregion

    #region GetPullRequest Tests

    [Fact]
    public async Task GetPullRequest_WhenSuccessful_ReturnsOkWithPullRequest()
    {
        // Arrange
        var pr = CreateTestPullRequest(123, "Test PR");
        _mockGitHubService.Setup(s => s.GetPullRequestAsync(
                123, It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<PullRequestSummary>.Success(pr));

        // Act
        var result = await _sut.GetPullRequest(123);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedPR = okResult.Value.Should().BeOfType<PullRequestSummary>().Subject;
        returnedPR.Number.Should().Be(123);
        returnedPR.Title.Should().Be("Test PR");
    }

    [Fact]
    public async Task GetPullRequest_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockGitHubService.Setup(s => s.GetPullRequestAsync(
                999, It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<PullRequestSummary>.Failure(Error.Custom("GitHub.NotFound", "Pull request not found")));

        // Act
        var result = await _sut.GetPullRequest(999);

        // Assert
        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.StatusCode.Should().Be(404);
    }

    #endregion

    #region GetPullRequestReviews Tests

    [Fact]
    public async Task GetPullRequestReviews_WhenSuccessful_ReturnsOkWithReviews()
    {
        // Arrange
        var reviews = new List<ReviewSummary>
        {
            new() { Author = "reviewer1", State = "APPROVED" },
            new() { Author = "reviewer2", State = "CHANGES_REQUESTED" }
        };

        _mockGitHubService.Setup(s => s.GetPullRequestReviewsAsync(
                1, It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<List<ReviewSummary>>.Success(reviews));

        // Act
        var result = await _sut.GetPullRequestReviews(1);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedReviews = okResult.Value.Should().BeAssignableTo<List<ReviewSummary>>().Subject;
        returnedReviews.Should().HaveCount(2);
    }

    #endregion

    #region GetWorkflowRuns Tests

    [Fact]
    public async Task GetWorkflowRuns_WhenSuccessful_ReturnsOkWithWorkflowRuns()
    {
        // Arrange
        var runs = new GitHubActionsResponse
        {
            WorkflowRuns = new List<WorkflowRunSummary>
            {
                CreateTestWorkflowRun(1, "CI", "completed", "success"),
                CreateTestWorkflowRun(2, "Deploy", "in_progress", null)
            },
            TotalCount = 2,
            Page = 1,
            PerPage = 30,
            HasMore = false
        };

        _mockGitHubService.Setup(s => s.GetWorkflowRunsAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(),
                It.IsAny<string?>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubActionsResponse>.Success(runs));

        // Act
        var result = await _sut.GetWorkflowRuns();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedRuns = okResult.Value.Should().BeOfType<GitHubActionsResponse>().Subject;
        returnedRuns.WorkflowRuns.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetWorkflowRuns_WithFilters_PassesParametersCorrectly()
    {
        // Arrange
        var runs = new GitHubActionsResponse { WorkflowRuns = new List<WorkflowRunSummary>() };
        _mockGitHubService.Setup(s => s.GetWorkflowRunsAsync(
                "owner", "repo", "main", "completed", 1, 10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubActionsResponse>.Success(runs));

        // Act
        await _sut.GetWorkflowRuns("owner", "repo", "main", "completed", 1, 10);

        // Assert
        _mockGitHubService.Verify(s => s.GetWorkflowRunsAsync("owner", "repo", "main", "completed", 1, 10, It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region GetWorkflowRun Tests

    [Fact]
    public async Task GetWorkflowRun_WhenSuccessful_ReturnsOkWithWorkflowRun()
    {
        // Arrange
        var run = CreateTestWorkflowRun(12345, "CI Pipeline", "completed", "success");
        _mockGitHubService.Setup(s => s.GetWorkflowRunAsync(
                12345, It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<WorkflowRunSummary>.Success(run));

        // Act
        var result = await _sut.GetWorkflowRun(12345);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedRun = okResult.Value.Should().BeOfType<WorkflowRunSummary>().Subject;
        returnedRun.Id.Should().Be(12345);
        returnedRun.Name.Should().Be("CI Pipeline");
    }

    [Fact]
    public async Task GetWorkflowRun_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockGitHubService.Setup(s => s.GetWorkflowRunAsync(
                99999, It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<WorkflowRunSummary>.Failure(Error.Custom("GitHub.NotFound", "Workflow run not found")));

        // Act
        var result = await _sut.GetWorkflowRun(99999);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region GetWorkflows Tests

    [Fact]
    public async Task GetWorkflows_WhenSuccessful_ReturnsOkWithWorkflows()
    {
        // Arrange
        var workflows = new List<GitHubWorkflow>
        {
            new() { Id = 1, Name = "CI", Path = ".github/workflows/ci.yml" },
            new() { Id = 2, Name = "Deploy", Path = ".github/workflows/deploy.yml" }
        };

        _mockGitHubService.Setup(s => s.GetWorkflowsAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<List<GitHubWorkflow>>.Success(workflows));

        // Act
        var result = await _sut.GetWorkflows();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedWorkflows = okResult.Value.Should().BeAssignableTo<List<GitHubWorkflow>>().Subject;
        returnedWorkflows.Should().HaveCount(2);
    }

    #endregion

    #region GetCheckRuns Tests

    [Fact]
    public async Task GetCheckRuns_WhenSuccessful_ReturnsOkWithCheckRuns()
    {
        // Arrange
        var checkRuns = new List<CheckRunSummary>
        {
            new() { Name = "build", Status = "completed", Conclusion = "success" },
            new() { Name = "test", Status = "completed", Conclusion = "success" }
        };

        _mockGitHubService.Setup(s => s.GetCheckRunsAsync(
                "abc123", It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<List<CheckRunSummary>>.Success(checkRuns));

        // Act
        var result = await _sut.GetCheckRuns("abc123");

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedChecks = okResult.Value.Should().BeAssignableTo<List<CheckRunSummary>>().Subject;
        returnedChecks.Should().HaveCount(2);
    }

    #endregion

    #region RerunWorkflow Tests

    [Fact]
    public async Task RerunWorkflow_WhenSuccessful_ReturnsAccepted()
    {
        // Arrange
        _mockGitHubService.Setup(s => s.RerunWorkflowAsync(
                12345, It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Success(true));

        // Act
        var result = await _sut.RerunWorkflow(12345);

        // Assert
        var acceptedResult = result.Should().BeOfType<AcceptedResult>().Subject;
        acceptedResult.StatusCode.Should().Be(202);
    }

    [Fact]
    public async Task RerunWorkflow_WhenError_ReturnsBadRequest()
    {
        // Arrange
        _mockGitHubService.Setup(s => s.RerunWorkflowAsync(
                12345, It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Failure(Error.Validation("Cannot rerun workflow")));

        // Act
        var result = await _sut.RerunWorkflow(12345);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    #endregion

    #region CancelWorkflowRun Tests

    [Fact]
    public async Task CancelWorkflowRun_WhenSuccessful_ReturnsAccepted()
    {
        // Arrange
        _mockGitHubService.Setup(s => s.CancelWorkflowRunAsync(
                12345, It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Success(true));

        // Act
        var result = await _sut.CancelWorkflowRun(12345);

        // Assert
        var acceptedResult = result.Should().BeOfType<AcceptedResult>().Subject;
        acceptedResult.StatusCode.Should().Be(202);
    }

    #endregion

    #region GetPullRequestFiles Tests

    [Fact]
    public async Task GetPullRequestFiles_WhenSuccessful_ReturnsOkWithFiles()
    {
        // Arrange
        var files = new GitHubPullRequestFilesResponse
        {
            Files = new List<PullRequestFileSummary>
            {
                new() { Filename = "src/app.ts", Status = "modified", Additions = 10, Deletions = 5, Changes = 15 },
                new() { Filename = "README.md", Status = "added", Additions = 50, Deletions = 0, Changes = 50 }
            },
            TotalCount = 2
        };

        _mockGitHubService.Setup(s => s.GetPullRequestFilesAsync(
                123, It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubPullRequestFilesResponse>.Success(files));

        // Act
        var result = await _sut.GetPullRequestFiles(123);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedFiles = okResult.Value.Should().BeOfType<GitHubPullRequestFilesResponse>().Subject;
        returnedFiles.Files.Should().HaveCount(2);
        returnedFiles.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task GetPullRequestFiles_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockGitHubService.Setup(s => s.GetPullRequestFilesAsync(
                999, It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubPullRequestFilesResponse>.Failure(Error.Custom("GitHub.NotFound", "PR not found")));

        // Act
        var result = await _sut.GetPullRequestFiles(999);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region GetBranches Tests

    [Fact]
    public async Task GetBranches_WhenSuccessful_ReturnsOkWithBranches()
    {
        // Arrange
        var branches = new GitHubBranchesResponse
        {
            Branches = new List<BranchSummary>
            {
                new() { Name = "main", CommitSha = "abc123", IsProtected = true, IsDefault = true },
                new() { Name = "develop", CommitSha = "def456", IsProtected = false, IsDefault = false }
            },
            DefaultBranch = "main"
        };

        _mockGitHubService.Setup(s => s.GetBranchesAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubBranchesResponse>.Success(branches));

        // Act
        var result = await _sut.GetBranches();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedBranches = okResult.Value.Should().BeOfType<GitHubBranchesResponse>().Subject;
        returnedBranches.Branches.Should().HaveCount(2);
        returnedBranches.Branches.First().IsDefault.Should().BeTrue();
    }

    #endregion

    #region GetIssues Tests

    [Fact]
    public async Task GetIssues_WhenSuccessful_ReturnsOkWithIssues()
    {
        // Arrange
        var issues = new GitHubIssuesResponse
        {
            Issues = new List<IssueSummary>
            {
                new() { Number = 1, Title = "Bug report", State = "open", Author = "user1" },
                new() { Number = 2, Title = "Feature request", State = "open", Author = "user2" }
            },
            TotalCount = 2,
            Page = 1,
            PerPage = 30,
            HasMore = false
        };

        _mockGitHubService.Setup(s => s.GetIssuesAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubIssuesResponse>.Success(issues));

        // Act
        var result = await _sut.GetIssues();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedIssues = okResult.Value.Should().BeOfType<GitHubIssuesResponse>().Subject;
        returnedIssues.Issues.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetIssues_WithStateFilter_PassesParametersCorrectly()
    {
        // Arrange
        var issues = new GitHubIssuesResponse { Issues = new List<IssueSummary>() };
        _mockGitHubService.Setup(s => s.GetIssuesAsync(
                "owner", "repo", "closed", 2, 50, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubIssuesResponse>.Success(issues));

        // Act
        await _sut.GetIssues("owner", "repo", "closed", 2, 50);

        // Assert
        _mockGitHubService.Verify(s => s.GetIssuesAsync("owner", "repo", "closed", 2, 50, It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region GetCommits Tests

    [Fact]
    public async Task GetCommits_WhenSuccessful_ReturnsOkWithCommits()
    {
        // Arrange
        var commits = new GitHubCommitsResponse
        {
            Commits = new List<CommitSummary>
            {
                new() { Sha = "abc123", ShortSha = "abc123", Message = "Initial commit", Author = "user1" },
                new() { Sha = "def456", ShortSha = "def456", Message = "Add feature", Author = "user2" }
            },
            Page = 1,
            PerPage = 30,
            HasMore = false
        };

        _mockGitHubService.Setup(s => s.GetCommitsAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(),
                It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubCommitsResponse>.Success(commits));

        // Act
        var result = await _sut.GetCommits();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedCommits = okResult.Value.Should().BeOfType<GitHubCommitsResponse>().Subject;
        returnedCommits.Commits.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetCommits_WithBranchFilter_PassesParametersCorrectly()
    {
        // Arrange
        var commits = new GitHubCommitsResponse { Commits = new List<CommitSummary>() };
        _mockGitHubService.Setup(s => s.GetCommitsAsync(
                "owner", "repo", "develop", 1, 30, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubCommitsResponse>.Success(commits));

        // Act
        await _sut.GetCommits("owner", "repo", "develop", 1, 30);

        // Assert
        _mockGitHubService.Verify(s => s.GetCommitsAsync("owner", "repo", "develop", 1, 30, It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region GetIssueComments Tests

    [Fact]
    public async Task GetIssueComments_WhenSuccessful_ReturnsOkWithComments()
    {
        // Arrange
        var comments = new GitHubCommentsResponse
        {
            Comments = new List<CommentSummary>
            {
                new() { Id = 1, Body = "First comment", Author = "user1" },
                new() { Id = 2, Body = "Second comment", Author = "user2" }
            },
            TotalCount = 2
        };

        _mockGitHubService.Setup(s => s.GetIssueCommentsAsync(
                123, It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubCommentsResponse>.Success(comments));

        // Act
        var result = await _sut.GetIssueComments(123);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedComments = okResult.Value.Should().BeOfType<GitHubCommentsResponse>().Subject;
        returnedComments.Comments.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetIssueComments_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockGitHubService.Setup(s => s.GetIssueCommentsAsync(
                999, It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubCommentsResponse>.Failure(Error.Custom("GitHub.NotFound", "Issue not found")));

        // Act
        var result = await _sut.GetIssueComments(999);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region HandleError Tests

    [Theory]
    [InlineData("ValidationFailed", 400)]
    [InlineData("GitHub.Unauthorized", 401)]
    [InlineData("GitHub.Forbidden", 403)]
    [InlineData("Forbidden", 403)]
    [InlineData("GitHub.NotFound", 404)]
    [InlineData("NotFound", 404)]
    [InlineData("GitHub.ValidationError", 400)]
    [InlineData("ExternalServiceError", 502)]
    [InlineData("UnknownError", 500)]
    public async Task HandleError_ReturnsCorrectStatusCode(string errorCode, int expectedStatusCode)
    {
        // Arrange
        _mockGitHubService.Setup(s => s.GetPullRequestsAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<GitHubPullRequestsResponse>.Failure(Error.Custom(errorCode, "Error message")));

        // Act
        var result = await _sut.GetPullRequests();

        // Assert
        // The controller returns different result types based on status code:
        // - BadRequest() returns BadRequestObjectResult
        // - Unauthorized() returns UnauthorizedObjectResult
        // - NotFound() returns NotFoundObjectResult
        // - StatusCode(xxx, ...) returns ObjectResult
        // All inherit from ObjectResult, so we cast to get the status code
        var statusCodeResult = result as ObjectResult;
        statusCodeResult.Should().NotBeNull();
        statusCodeResult!.StatusCode.Should().Be(expectedStatusCode);
    }

    #endregion

    #region Helper Methods

    private void SetupUnauthenticatedUser()
    {
        var httpContext = new DefaultHttpContext();
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    private static PullRequestSummary CreateTestPullRequest(int number, string title)
    {
        return new PullRequestSummary
        {
            Number = number,
            Title = title,
            State = "open",
            Author = "testuser",
            AuthorAvatarUrl = "https://github.com/testuser.png",
            HtmlUrl = $"https://github.com/owner/repo/pull/{number}",
            HeadBranch = "feature-branch",
            BaseBranch = "main",
            IsDraft = false,
            IsMerged = false,
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = DateTime.UtcNow,
            Labels = new List<GitHubLabel>(),
            CommentsCount = 0,
            Additions = 100,
            Deletions = 50,
            ChangedFiles = 5,
            Reviews = new List<ReviewSummary>(),
            CheckRuns = new List<CheckRunSummary>()
        };
    }

    private static WorkflowRunSummary CreateTestWorkflowRun(long id, string name, string status, string? conclusion)
    {
        return new WorkflowRunSummary
        {
            Id = id,
            Name = name,
            DisplayTitle = name,
            HeadBranch = "main",
            HeadSha = "abc123def456",
            RunNumber = 1,
            Event = "push",
            Status = status,
            Conclusion = conclusion,
            HtmlUrl = $"https://github.com/owner/repo/actions/runs/{id}",
            CreatedAt = DateTime.UtcNow.AddMinutes(-10),
            RunStartedAt = DateTime.UtcNow.AddMinutes(-10),
            Actor = "testuser",
            ActorAvatarUrl = "https://github.com/testuser.png",
            Jobs = new List<WorkflowJobSummary>()
        };
    }

    #endregion
}
