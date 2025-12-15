using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Core.Entities;
using SecondBrain.Infrastructure.Repositories;
using SecondBrain.Tests.Integration.Fixtures;

namespace SecondBrain.Tests.Integration.Repositories;

[Collection("PostgreSQL")]
public class ToolCallAnalyticsRepositoryTests : IAsyncLifetime
{
    private readonly PostgresFixture _fixture;
    private readonly Mock<ILogger<SqlToolCallAnalyticsRepository>> _mockLogger;
    private SqlToolCallAnalyticsRepository _sut = null!;

    public ToolCallAnalyticsRepositoryTests(PostgresFixture fixture)
    {
        _fixture = fixture;
        _mockLogger = new Mock<ILogger<SqlToolCallAnalyticsRepository>>();
    }

    public async Task InitializeAsync()
    {
        // Clean up data before each test
        await using var dbContext = _fixture.CreateDbContext();
        dbContext.ToolCalls.RemoveRange(dbContext.ToolCalls);
        dbContext.ChatMessages.RemoveRange(dbContext.ChatMessages);
        dbContext.ChatConversations.RemoveRange(dbContext.ChatConversations);
        await dbContext.SaveChangesAsync();

        // Create a fresh repository for each test
        _sut = new SqlToolCallAnalyticsRepository(_fixture.CreateDbContext(), _mockLogger.Object);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    #region GetOverallStatsAsync Tests

    [Fact]
    public async Task GetOverallStatsAsync_WhenNoToolCalls_ReturnsZeroStats()
    {
        // Arrange
        await CreateTestConversationAsync("user-123");

        // Act
        var result = await _sut.GetOverallStatsAsync("user-123");

        // Assert
        result.TotalCalls.Should().Be(0);
        result.SuccessfulCalls.Should().Be(0);
        result.FailedCalls.Should().Be(0);
        result.SuccessRate.Should().Be(0);
    }

    [Fact]
    public async Task GetOverallStatsAsync_CalculatesCorrectStats()
    {
        // Arrange
        var conversationId = await CreateTestConversationAsync("user-123");
        var messageId = await CreateTestMessageAsync(conversationId);
        await CreateTestToolCallAsync(messageId, "tool_1", success: true);
        await CreateTestToolCallAsync(messageId, "tool_2", success: true);
        await CreateTestToolCallAsync(messageId, "tool_3", success: false);

        // Act
        var result = await _sut.GetOverallStatsAsync("user-123");

        // Assert
        result.TotalCalls.Should().Be(3);
        result.SuccessfulCalls.Should().Be(2);
        result.FailedCalls.Should().Be(1);
        result.SuccessRate.Should().BeApproximately(66.67, 0.1);
    }

    [Fact]
    public async Task GetOverallStatsAsync_FiltersDeletedConversations()
    {
        // Arrange
        var activeConvId = await CreateTestConversationAsync("user-123", isDeleted: false);
        var deletedConvId = await CreateTestConversationAsync("user-123", isDeleted: true);

        var activeMessageId = await CreateTestMessageAsync(activeConvId);
        var deletedMessageId = await CreateTestMessageAsync(deletedConvId);

        await CreateTestToolCallAsync(activeMessageId, "tool_1", success: true);
        await CreateTestToolCallAsync(deletedMessageId, "tool_2", success: true);

        // Act
        var result = await _sut.GetOverallStatsAsync("user-123");

        // Assert
        result.TotalCalls.Should().Be(1);
    }

    [Fact]
    public async Task GetOverallStatsAsync_FiltersOtherUsers()
    {
        // Arrange
        var userConvId = await CreateTestConversationAsync("user-123");
        var otherConvId = await CreateTestConversationAsync("user-456");

        var userMessageId = await CreateTestMessageAsync(userConvId);
        var otherMessageId = await CreateTestMessageAsync(otherConvId);

        await CreateTestToolCallAsync(userMessageId, "tool_1", success: true);
        await CreateTestToolCallAsync(otherMessageId, "tool_2", success: true);

        // Act
        var result = await _sut.GetOverallStatsAsync("user-123");

        // Assert
        result.TotalCalls.Should().Be(1);
    }

    [Fact]
    public async Task GetOverallStatsAsync_WithDateFilter_ReturnsFilteredStats()
    {
        // Arrange
        var convId = await CreateTestConversationAsync("user-123");
        var messageId = await CreateTestMessageAsync(convId);

        await CreateTestToolCallAsync(messageId, "old_tool", success: true, executedAt: DateTime.UtcNow.AddDays(-5));
        await CreateTestToolCallAsync(messageId, "new_tool", success: true, executedAt: DateTime.UtcNow);

        // Act
        var result = await _sut.GetOverallStatsAsync("user-123", startDate: DateTime.UtcNow.AddDays(-1));

        // Assert
        result.TotalCalls.Should().Be(1);
    }

    #endregion

    #region GetToolUsageByNameAsync Tests

    [Fact]
    public async Task GetToolUsageByNameAsync_WhenNoToolCalls_ReturnsEmptyList()
    {
        // Act
        var result = await _sut.GetToolUsageByNameAsync("user-123");

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetToolUsageByNameAsync_GroupsByToolName()
    {
        // Arrange
        var convId = await CreateTestConversationAsync("user-123");
        var messageId = await CreateTestMessageAsync(convId);

        await CreateTestToolCallAsync(messageId, "search_notes", success: true);
        await CreateTestToolCallAsync(messageId, "search_notes", success: true);
        await CreateTestToolCallAsync(messageId, "search_notes", success: false);
        await CreateTestToolCallAsync(messageId, "create_note", success: true);

        // Act
        var result = await _sut.GetToolUsageByNameAsync("user-123");

        // Assert
        result.Should().HaveCount(2);

        var searchTool = result.First(r => r.ToolName == "search_notes");
        searchTool.CallCount.Should().Be(3);
        searchTool.SuccessCount.Should().Be(2);
        searchTool.FailureCount.Should().Be(1);
        searchTool.SuccessRate.Should().BeApproximately(66.67, 0.1);

        var createTool = result.First(r => r.ToolName == "create_note");
        createTool.CallCount.Should().Be(1);
        createTool.SuccessCount.Should().Be(1);
        createTool.SuccessRate.Should().Be(100);
    }

    [Fact]
    public async Task GetToolUsageByNameAsync_OrdersByCallCountDescending()
    {
        // Arrange
        var convId = await CreateTestConversationAsync("user-123");
        var messageId = await CreateTestMessageAsync(convId);

        await CreateTestToolCallAsync(messageId, "tool_a", success: true);
        await CreateTestToolCallAsync(messageId, "tool_b", success: true);
        await CreateTestToolCallAsync(messageId, "tool_b", success: true);
        await CreateTestToolCallAsync(messageId, "tool_c", success: true);
        await CreateTestToolCallAsync(messageId, "tool_c", success: true);
        await CreateTestToolCallAsync(messageId, "tool_c", success: true);

        // Act
        var result = await _sut.GetToolUsageByNameAsync("user-123");

        // Assert
        result.Should().HaveCount(3);
        result[0].ToolName.Should().Be("tool_c");
        result[0].CallCount.Should().Be(3);
        result[1].ToolName.Should().Be("tool_b");
        result[1].CallCount.Should().Be(2);
        result[2].ToolName.Should().Be("tool_a");
        result[2].CallCount.Should().Be(1);
    }

    [Fact]
    public async Task GetToolUsageByNameAsync_TracksFirstAndLastUsed()
    {
        // Arrange
        var convId = await CreateTestConversationAsync("user-123");
        var messageId = await CreateTestMessageAsync(convId);

        var firstUsed = DateTime.UtcNow.AddDays(-2);
        var lastUsed = DateTime.UtcNow;

        await CreateTestToolCallAsync(messageId, "test_tool", success: true, executedAt: firstUsed);
        await CreateTestToolCallAsync(messageId, "test_tool", success: true, executedAt: DateTime.UtcNow.AddDays(-1));
        await CreateTestToolCallAsync(messageId, "test_tool", success: true, executedAt: lastUsed);

        // Act
        var result = await _sut.GetToolUsageByNameAsync("user-123");

        // Assert
        result.Should().ContainSingle();
        result[0].FirstUsed.Should().BeCloseTo(firstUsed, TimeSpan.FromSeconds(1));
        result[0].LastUsed.Should().BeCloseTo(lastUsed, TimeSpan.FromSeconds(1));
    }

    #endregion

    #region GetDailyToolCallsAsync Tests

    [Fact]
    public async Task GetDailyToolCallsAsync_WhenNoToolCalls_ReturnsEmptyDictionary()
    {
        // Act
        var result = await _sut.GetDailyToolCallsAsync("user-123");

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetDailyToolCallsAsync_GroupsByDate()
    {
        // Arrange
        var convId = await CreateTestConversationAsync("user-123");
        var messageId = await CreateTestMessageAsync(convId);

        var today = DateTime.UtcNow.Date;
        var yesterday = today.AddDays(-1);

        await CreateTestToolCallAsync(messageId, "tool_1", success: true, executedAt: today.AddHours(10));
        await CreateTestToolCallAsync(messageId, "tool_2", success: true, executedAt: today.AddHours(14));
        await CreateTestToolCallAsync(messageId, "tool_3", success: true, executedAt: yesterday.AddHours(12));

        // Act
        var result = await _sut.GetDailyToolCallsAsync("user-123");

        // Assert
        result.Should().HaveCount(2);
        result[today.ToString("yyyy-MM-dd")].Should().Be(2);
        result[yesterday.ToString("yyyy-MM-dd")].Should().Be(1);
    }

    #endregion

    #region GetDailySuccessRatesAsync Tests

    [Fact]
    public async Task GetDailySuccessRatesAsync_WhenNoToolCalls_ReturnsEmptyDictionary()
    {
        // Act
        var result = await _sut.GetDailySuccessRatesAsync("user-123");

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetDailySuccessRatesAsync_CalculatesCorrectRates()
    {
        // Arrange
        var convId = await CreateTestConversationAsync("user-123");
        var messageId = await CreateTestMessageAsync(convId);

        var today = DateTime.UtcNow.Date;

        await CreateTestToolCallAsync(messageId, "tool_1", success: true, executedAt: today.AddHours(10));
        await CreateTestToolCallAsync(messageId, "tool_2", success: true, executedAt: today.AddHours(12));
        await CreateTestToolCallAsync(messageId, "tool_3", success: false, executedAt: today.AddHours(14));

        // Act
        var result = await _sut.GetDailySuccessRatesAsync("user-123");

        // Assert
        result.Should().ContainSingle();
        result[today.ToString("yyyy-MM-dd")].Should().BeApproximately(66.67, 0.1);
    }

    #endregion

    #region GetHourlyDistributionAsync Tests

    [Fact]
    public async Task GetHourlyDistributionAsync_WhenNoToolCalls_ReturnsEmptyDictionary()
    {
        // Act
        var result = await _sut.GetHourlyDistributionAsync("user-123");

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetHourlyDistributionAsync_GroupsByHour()
    {
        // Arrange
        var convId = await CreateTestConversationAsync("user-123");
        var messageId = await CreateTestMessageAsync(convId);

        var today = DateTime.UtcNow.Date;

        await CreateTestToolCallAsync(messageId, "tool_1", success: true, executedAt: today.AddHours(10));
        await CreateTestToolCallAsync(messageId, "tool_2", success: true, executedAt: today.AddHours(10).AddMinutes(30));
        await CreateTestToolCallAsync(messageId, "tool_3", success: true, executedAt: today.AddHours(14));

        // Act
        var result = await _sut.GetHourlyDistributionAsync("user-123");

        // Assert
        result.Should().HaveCount(2);
        result[10].Should().Be(2);
        result[14].Should().Be(1);
    }

    #endregion

    #region Helper Methods

    private async Task<string> CreateTestConversationAsync(string userId, bool isDeleted = false)
    {
        var conversation = new ChatConversation
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            Title = "Test Conversation",
            Provider = "openai",
            Model = "gpt-4",
            RagEnabled = false,
            AgentEnabled = true,
            IsDeleted = isDeleted,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Messages = new List<ChatMessage>()
        };

        await using var dbContext = _fixture.CreateDbContext();
        dbContext.ChatConversations.Add(conversation);
        await dbContext.SaveChangesAsync();

        return conversation.Id;
    }

    private async Task<string> CreateTestMessageAsync(string conversationId)
    {
        var message = new ChatMessage
        {
            Id = Guid.NewGuid().ToString(),
            ConversationId = conversationId,
            Role = "assistant",
            Content = "Test message",
            Timestamp = DateTime.UtcNow,
            RetrievedNotes = new List<RetrievedNote>(),
            ToolCalls = new List<ToolCall>(),
            Images = new List<MessageImage>(),
            GeneratedImages = new List<GeneratedImageData>()
        };

        await using var dbContext = _fixture.CreateDbContext();
        dbContext.ChatMessages.Add(message);
        await dbContext.SaveChangesAsync();

        return message.Id;
    }

    private async Task CreateTestToolCallAsync(
        string messageId,
        string toolName,
        bool success,
        DateTime? executedAt = null)
    {
        var toolCall = new ToolCall
        {
            Id = Guid.NewGuid().ToString(),
            MessageId = messageId,
            ToolName = toolName,
            Arguments = "{}",
            Result = success ? "{\"result\": \"success\"}" : "{\"error\": \"failed\"}",
            Success = success,
            ExecutedAt = executedAt ?? DateTime.UtcNow
        };

        await using var dbContext = _fixture.CreateDbContext();
        dbContext.ToolCalls.Add(toolCall);
        await dbContext.SaveChangesAsync();
    }

    #endregion
}
