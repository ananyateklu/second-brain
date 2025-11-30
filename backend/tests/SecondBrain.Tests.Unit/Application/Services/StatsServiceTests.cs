using SecondBrain.Application.Services.Stats;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Tests.Unit.Application.Services;

public class StatsServiceTests
{
    private readonly Mock<IChatRepository> _mockChatRepository;
    private readonly StatsService _sut;

    public StatsServiceTests()
    {
        _mockChatRepository = new Mock<IChatRepository>();
        _sut = new StatsService(_mockChatRepository.Object);
    }

    #region GetAIUsageStatsAsync Tests

    [Fact]
    public async Task GetAIUsageStatsAsync_WhenNoConversations_ReturnsZeroCounts()
    {
        // Arrange
        var userId = "user-123";
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(new List<ChatConversation>());

        // Act
        var result = await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        result.TotalConversations.Should().Be(0);
        result.TotalMessages.Should().Be(0);
        result.RagConversationsCount.Should().Be(0);
        result.AgentConversationsCount.Should().Be(0);
        result.ImageGenerationConversationsCount.Should().Be(0);
        result.TotalImagesGenerated.Should().Be(0);
    }

    [Fact]
    public async Task GetAIUsageStatsAsync_CalculatesTotalConversationsCorrectly()
    {
        // Arrange
        var userId = "user-123";
        var conversations = new List<ChatConversation>
        {
            CreateTestConversation("conv-1", userId, "gpt-4", "openai"),
            CreateTestConversation("conv-2", userId, "claude-3", "anthropic"),
            CreateTestConversation("conv-3", userId, "gpt-4", "openai")
        };
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(conversations);

        // Act
        var result = await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        result.TotalConversations.Should().Be(3);
    }

    [Fact]
    public async Task GetAIUsageStatsAsync_CalculatesTotalMessagesCorrectly()
    {
        // Arrange
        var userId = "user-123";
        var conversations = new List<ChatConversation>
        {
            CreateTestConversationWithMessages("conv-1", userId, 5),
            CreateTestConversationWithMessages("conv-2", userId, 3)
        };
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(conversations);

        // Act
        var result = await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        result.TotalMessages.Should().Be(8);
    }

    [Fact]
    public async Task GetAIUsageStatsAsync_CountsRagConversationsCorrectly()
    {
        // Arrange
        var userId = "user-123";
        var conversations = new List<ChatConversation>
        {
            CreateTestConversation("conv-1", userId, "gpt-4", "openai", ragEnabled: true),
            CreateTestConversation("conv-2", userId, "gpt-4", "openai", ragEnabled: false),
            CreateTestConversation("conv-3", userId, "gpt-4", "openai", ragEnabled: true)
        };
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(conversations);

        // Act
        var result = await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        result.RagConversationsCount.Should().Be(2);
    }

    [Fact]
    public async Task GetAIUsageStatsAsync_CountsAgentConversationsCorrectly()
    {
        // Arrange
        var userId = "user-123";
        var conversations = new List<ChatConversation>
        {
            CreateTestConversation("conv-1", userId, "gpt-4", "openai", agentEnabled: true),
            CreateTestConversation("conv-2", userId, "gpt-4", "openai", agentEnabled: true),
            CreateTestConversation("conv-3", userId, "gpt-4", "openai", agentEnabled: false)
        };
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(conversations);

        // Act
        var result = await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        result.AgentConversationsCount.Should().Be(2);
    }

    [Fact]
    public async Task GetAIUsageStatsAsync_CountsImageGenerationConversationsCorrectly()
    {
        // Arrange
        var userId = "user-123";
        var conversations = new List<ChatConversation>
        {
            CreateTestConversation("conv-1", userId, "dall-e-3", "openai", imageGenerationEnabled: true),
            CreateTestConversation("conv-2", userId, "gpt-4", "openai", imageGenerationEnabled: false)
        };
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(conversations);

        // Act
        var result = await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        result.ImageGenerationConversationsCount.Should().Be(1);
    }

    [Fact]
    public async Task GetAIUsageStatsAsync_CountsTotalGeneratedImagesCorrectly()
    {
        // Arrange
        var userId = "user-123";
        var conversations = new List<ChatConversation>
        {
            CreateTestConversationWithGeneratedImages("conv-1", userId, imagesPerMessage: 2, messageCount: 2),
            CreateTestConversationWithGeneratedImages("conv-2", userId, imagesPerMessage: 1, messageCount: 3)
        };
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(conversations);

        // Act
        var result = await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        result.TotalImagesGenerated.Should().Be(7); // 2*2 + 1*3 = 7
    }

    [Fact]
    public async Task GetAIUsageStatsAsync_GroupsModelUsageCorrectly()
    {
        // Arrange
        var userId = "user-123";
        var conversations = new List<ChatConversation>
        {
            CreateTestConversation("conv-1", userId, "gpt-4", "openai"),
            CreateTestConversation("conv-2", userId, "gpt-4", "openai"),
            CreateTestConversation("conv-3", userId, "claude-3", "anthropic"),
            CreateTestConversation("conv-4", userId, "gpt-3.5-turbo", "openai")
        };
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(conversations);

        // Act
        var result = await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        result.ModelUsageCounts.Should().HaveCount(3);
        result.ModelUsageCounts["gpt-4"].Should().Be(2);
        result.ModelUsageCounts["claude-3"].Should().Be(1);
        result.ModelUsageCounts["gpt-3.5-turbo"].Should().Be(1);
    }

    [Fact]
    public async Task GetAIUsageStatsAsync_GroupsProviderUsageCorrectly()
    {
        // Arrange
        var userId = "user-123";
        var conversations = new List<ChatConversation>
        {
            CreateTestConversation("conv-1", userId, "gpt-4", "openai"),
            CreateTestConversation("conv-2", userId, "gpt-3.5-turbo", "openai"),
            CreateTestConversation("conv-3", userId, "claude-3", "anthropic")
        };
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(conversations);

        // Act
        var result = await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        result.ProviderUsageCounts.Should().HaveCount(2);
        result.ProviderUsageCounts["openai"].Should().Be(2);
        result.ProviderUsageCounts["anthropic"].Should().Be(1);
    }

    [Fact]
    public async Task GetAIUsageStatsAsync_CalculatesTokenUsageCorrectly()
    {
        // Arrange
        var userId = "user-123";
        var conversation = CreateTestConversation("conv-1", userId, "gpt-4", "openai");
        conversation.Messages = new List<ChatMessage>
        {
            new() { InputTokens = 100, OutputTokens = 200 },
            new() { InputTokens = 50, OutputTokens = 150 }
        };
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(new List<ChatConversation> { conversation });

        // Act
        var result = await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        result.ModelTokenUsageCounts.Should().ContainKey("gpt-4");
        result.ModelTokenUsageCounts["gpt-4"].Should().Be(500); // 100+200+50+150
    }

    [Fact]
    public async Task GetAIUsageStatsAsync_HandlesNullTokenValues()
    {
        // Arrange
        var userId = "user-123";
        var conversation = CreateTestConversation("conv-1", userId, "gpt-4", "openai");
        conversation.Messages = new List<ChatMessage>
        {
            new() { InputTokens = null, OutputTokens = null },
            new() { InputTokens = 100, OutputTokens = null }
        };
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(new List<ChatConversation> { conversation });

        // Act
        var result = await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        result.ModelTokenUsageCounts["gpt-4"].Should().Be(100);
    }

    [Fact]
    public async Task GetAIUsageStatsAsync_GroupsDailyConversationsCorrectly()
    {
        // Arrange
        var userId = "user-123";
        var day1 = new DateTime(2024, 1, 15, 10, 0, 0, DateTimeKind.Utc);
        var day2 = new DateTime(2024, 1, 16, 14, 0, 0, DateTimeKind.Utc);
        var conversations = new List<ChatConversation>
        {
            CreateTestConversationOnDate("conv-1", userId, day1),
            CreateTestConversationOnDate("conv-2", userId, day1),
            CreateTestConversationOnDate("conv-3", userId, day2)
        };
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(conversations);

        // Act
        var result = await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        result.DailyConversationCounts.Should().HaveCount(2);
        result.DailyConversationCounts["2024-01-15"].Should().Be(2);
        result.DailyConversationCounts["2024-01-16"].Should().Be(1);
    }

    [Fact]
    public async Task GetAIUsageStatsAsync_GroupsDailyRagConversationsCorrectly()
    {
        // Arrange
        var userId = "user-123";
        var day1 = new DateTime(2024, 1, 15, 10, 0, 0, DateTimeKind.Utc);
        var conversations = new List<ChatConversation>
        {
            CreateTestConversationOnDate("conv-1", userId, day1, ragEnabled: true),
            CreateTestConversationOnDate("conv-2", userId, day1, ragEnabled: false),
            CreateTestConversationOnDate("conv-3", userId, day1, ragEnabled: true)
        };
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(conversations);

        // Act
        var result = await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        result.DailyRagConversationCounts["2024-01-15"].Should().Be(2);
        result.DailyNonRagConversationCounts["2024-01-15"].Should().Be(1);
    }

    [Fact]
    public async Task GetAIUsageStatsAsync_ExcludesEmptyModelsFromModelUsage()
    {
        // Arrange
        var userId = "user-123";
        var conversations = new List<ChatConversation>
        {
            CreateTestConversation("conv-1", userId, "gpt-4", "openai"),
            CreateTestConversation("conv-2", userId, "", "openai") // Empty model
        };
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(conversations);

        // Act
        var result = await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        result.ModelUsageCounts.Should().HaveCount(1);
        result.ModelUsageCounts.Should().ContainKey("gpt-4");
        result.ModelUsageCounts.Should().NotContainKey("");
    }

    [Fact]
    public async Task GetAIUsageStatsAsync_ExcludesEmptyProvidersFromProviderUsage()
    {
        // Arrange
        var userId = "user-123";
        var conversations = new List<ChatConversation>
        {
            CreateTestConversation("conv-1", userId, "gpt-4", "openai"),
            CreateTestConversation("conv-2", userId, "model", "") // Empty provider
        };
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(conversations);

        // Act
        var result = await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        result.ProviderUsageCounts.Should().HaveCount(1);
        result.ProviderUsageCounts.Should().ContainKey("openai");
    }

    [Fact]
    public async Task GetAIUsageStatsAsync_CallsRepositoryWithCorrectUserId()
    {
        // Arrange
        var userId = "specific-user-id";
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(new List<ChatConversation>());

        // Act
        await _sut.GetAIUsageStatsAsync(userId);

        // Assert
        _mockChatRepository.Verify(r => r.GetAllAsync(userId), Times.Once);
    }

    #endregion

    #region Helper Methods

    private static ChatConversation CreateTestConversation(
        string id,
        string userId,
        string model,
        string provider,
        bool ragEnabled = false,
        bool agentEnabled = false,
        bool imageGenerationEnabled = false)
    {
        return new ChatConversation
        {
            Id = id,
            UserId = userId,
            Model = model,
            Provider = provider,
            Title = $"Conversation {id}",
            RagEnabled = ragEnabled,
            AgentEnabled = agentEnabled,
            ImageGenerationEnabled = imageGenerationEnabled,
            Messages = new List<ChatMessage>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static ChatConversation CreateTestConversationWithMessages(string id, string userId, int messageCount)
    {
        var conversation = CreateTestConversation(id, userId, "gpt-4", "openai");
        conversation.Messages = Enumerable.Range(1, messageCount)
            .Select(i => new ChatMessage
            {
                Id = $"msg-{id}-{i}",
                ConversationId = id,
                Role = i % 2 == 0 ? "assistant" : "user",
                Content = $"Message {i}",
                GeneratedImages = new List<GeneratedImageData>()
            })
            .ToList();
        return conversation;
    }

    private static ChatConversation CreateTestConversationWithGeneratedImages(
        string id,
        string userId,
        int imagesPerMessage,
        int messageCount)
    {
        var conversation = CreateTestConversation(id, userId, "dall-e-3", "openai");
        conversation.ImageGenerationEnabled = true;
        conversation.Messages = Enumerable.Range(1, messageCount)
            .Select(i => new ChatMessage
            {
                Id = $"msg-{id}-{i}",
                ConversationId = id,
                Role = "assistant",
                Content = $"Generated images",
                GeneratedImages = Enumerable.Range(1, imagesPerMessage)
                    .Select(j => new GeneratedImageData
                    {
                        Id = $"img-{id}-{i}-{j}",
                        MessageId = $"msg-{id}-{i}",
                        Base64Data = "base64data"
                    })
                    .ToList()
            })
            .ToList();
        return conversation;
    }

    private static ChatConversation CreateTestConversationOnDate(
        string id,
        string userId,
        DateTime createdAt,
        bool ragEnabled = false,
        bool agentEnabled = false)
    {
        var conversation = CreateTestConversation(id, userId, "gpt-4", "openai", ragEnabled, agentEnabled);
        conversation.CreatedAt = createdAt;
        return conversation;
    }

    #endregion
}

