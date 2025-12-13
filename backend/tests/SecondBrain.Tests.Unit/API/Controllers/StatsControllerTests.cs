using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.API.Controllers;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Queries.Stats.GetAIUsageStats;
using SecondBrain.Core.Common;

namespace SecondBrain.Tests.Unit.API.Controllers;

public class StatsControllerTests
{
    private readonly Mock<IMediator> _mockMediator;
    private readonly StatsController _sut;

    public StatsControllerTests()
    {
        _mockMediator = new Mock<IMediator>();
        _sut = new StatsController(_mockMediator.Object);
        SetupUnauthenticatedUser();
    }

    #region GetAIUsageStats Tests

    [Fact]
    public async Task GetAIUsageStats_WhenAuthenticated_ReturnsOkWithStats()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var stats = new AIUsageStatsResponse
        {
            TotalConversations = 10,
            TotalMessages = 50,
            RagConversationsCount = 3,
            AgentConversationsCount = 2,
            ImageGenerationConversationsCount = 1,
            TotalImagesGenerated = 5,
            ModelUsageCounts = new Dictionary<string, int> { { "gpt-4", 5 }, { "claude-3", 5 } },
            ProviderUsageCounts = new Dictionary<string, int> { { "openai", 5 }, { "anthropic", 5 } }
        };
        _mockMediator.Setup(m => m.Send(It.IsAny<GetAIUsageStatsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIUsageStatsResponse>.Success(stats));

        // Act
        var result = await _sut.GetAIUsageStats();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedStats = okResult.Value.Should().BeOfType<AIUsageStatsResponse>().Subject;
        returnedStats.TotalConversations.Should().Be(10);
        returnedStats.TotalMessages.Should().Be(50);
        returnedStats.RagConversationsCount.Should().Be(3);
        returnedStats.AgentConversationsCount.Should().Be(2);
        returnedStats.ImageGenerationConversationsCount.Should().Be(1);
        returnedStats.TotalImagesGenerated.Should().Be(5);
    }

    [Fact]
    public async Task GetAIUsageStats_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange - user not authenticated (default setup)

        // Act
        var result = await _sut.GetAIUsageStats();

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().BeEquivalentTo(new { error = "Not authenticated" });
    }

    [Fact]
    public async Task GetAIUsageStats_WhenUserIdEmpty_ReturnsUnauthorized()
    {
        // Arrange
        SetupAuthenticatedUser("");

        // Act
        var result = await _sut.GetAIUsageStats();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task GetAIUsageStats_CallsServiceWithCorrectUserId()
    {
        // Arrange
        var userId = "specific-user-id";
        SetupAuthenticatedUser(userId);

        _mockMediator.Setup(m => m.Send(It.IsAny<GetAIUsageStatsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIUsageStatsResponse>.Success(new AIUsageStatsResponse()));

        // Act
        await _sut.GetAIUsageStats();

        // Assert
        _mockMediator.Verify(m => m.Send(
            It.Is<GetAIUsageStatsQuery>(q => q.UserId == userId),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task GetAIUsageStats_ReturnsModelUsageCounts()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var stats = new AIUsageStatsResponse
        {
            ModelUsageCounts = new Dictionary<string, int>
            {
                { "gpt-4", 10 },
                { "gpt-3.5-turbo", 5 },
                { "claude-3-opus", 3 }
            }
        };
        _mockMediator.Setup(m => m.Send(It.IsAny<GetAIUsageStatsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIUsageStatsResponse>.Success(stats));

        // Act
        var result = await _sut.GetAIUsageStats();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedStats = okResult.Value.Should().BeOfType<AIUsageStatsResponse>().Subject;
        returnedStats.ModelUsageCounts.Should().HaveCount(3);
        returnedStats.ModelUsageCounts["gpt-4"].Should().Be(10);
    }

    [Fact]
    public async Task GetAIUsageStats_ReturnsProviderUsageCounts()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var stats = new AIUsageStatsResponse
        {
            ProviderUsageCounts = new Dictionary<string, int>
            {
                { "openai", 15 },
                { "anthropic", 8 }
            }
        };
        _mockMediator.Setup(m => m.Send(It.IsAny<GetAIUsageStatsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIUsageStatsResponse>.Success(stats));

        // Act
        var result = await _sut.GetAIUsageStats();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedStats = okResult.Value.Should().BeOfType<AIUsageStatsResponse>().Subject;
        returnedStats.ProviderUsageCounts.Should().HaveCount(2);
        returnedStats.ProviderUsageCounts["openai"].Should().Be(15);
    }

    [Fact]
    public async Task GetAIUsageStats_ReturnsDailyConversationCounts()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var stats = new AIUsageStatsResponse
        {
            DailyConversationCounts = new Dictionary<string, int>
            {
                { "2024-01-15", 5 },
                { "2024-01-16", 3 }
            }
        };
        _mockMediator.Setup(m => m.Send(It.IsAny<GetAIUsageStatsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIUsageStatsResponse>.Success(stats));

        // Act
        var result = await _sut.GetAIUsageStats();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedStats = okResult.Value.Should().BeOfType<AIUsageStatsResponse>().Subject;
        returnedStats.DailyConversationCounts.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAIUsageStats_ReturnsTokenUsageStats()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var stats = new AIUsageStatsResponse
        {
            ModelTokenUsageCounts = new Dictionary<string, long>
            {
                { "gpt-4", 50000 },
                { "claude-3", 30000 }
            }
        };
        _mockMediator.Setup(m => m.Send(It.IsAny<GetAIUsageStatsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIUsageStatsResponse>.Success(stats));

        // Act
        var result = await _sut.GetAIUsageStats();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedStats = okResult.Value.Should().BeOfType<AIUsageStatsResponse>().Subject;
        returnedStats.ModelTokenUsageCounts["gpt-4"].Should().Be(50000);
    }

    [Fact]
    public async Task GetAIUsageStats_ReturnsEmptyStatsForNewUser()
    {
        // Arrange
        var userId = "new-user";
        SetupAuthenticatedUser(userId);

        var emptyStats = new AIUsageStatsResponse
        {
            TotalConversations = 0,
            TotalMessages = 0,
            RagConversationsCount = 0,
            AgentConversationsCount = 0,
            ImageGenerationConversationsCount = 0,
            TotalImagesGenerated = 0,
            ModelUsageCounts = new Dictionary<string, int>(),
            ProviderUsageCounts = new Dictionary<string, int>()
        };
        _mockMediator.Setup(m => m.Send(It.IsAny<GetAIUsageStatsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIUsageStatsResponse>.Success(emptyStats));

        // Act
        var result = await _sut.GetAIUsageStats();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedStats = okResult.Value.Should().BeOfType<AIUsageStatsResponse>().Subject;
        returnedStats.TotalConversations.Should().Be(0);
        returnedStats.ModelUsageCounts.Should().BeEmpty();
    }

    #endregion

    #region Helper Methods

    private void SetupAuthenticatedUser(string userId)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Items["UserId"] = userId;
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    private void SetupUnauthenticatedUser()
    {
        var httpContext = new DefaultHttpContext();
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    #endregion
}
