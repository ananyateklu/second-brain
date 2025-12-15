using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Queries.Chat.GetConversationById;
using SecondBrain.Application.Services.Chat;
using SecondBrain.Core.Entities;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Queries.Chat;

/// <summary>
/// Unit tests for GetConversationByIdQueryHandler.
/// Tests conversation retrieval with ownership verification through CQRS query pattern.
/// </summary>
public class GetConversationByIdQueryHandlerTests
{
    private readonly Mock<IChatConversationService> _mockChatService;
    private readonly Mock<ILogger<GetConversationByIdQueryHandler>> _mockLogger;
    private readonly GetConversationByIdQueryHandler _sut;

    public GetConversationByIdQueryHandlerTests()
    {
        _mockChatService = new Mock<IChatConversationService>();
        _mockLogger = new Mock<ILogger<GetConversationByIdQueryHandler>>();
        _sut = new GetConversationByIdQueryHandler(
            _mockChatService.Object,
            _mockLogger.Object);
    }

    #region Success Scenarios

    [Fact]
    public async Task Handle_WithExistingConversation_ReturnsSuccessWithConversation()
    {
        // Arrange
        var conversationId = "conv-123";
        var userId = "user-456";
        var query = new GetConversationByIdQuery(conversationId, userId);

        var conversation = CreateTestConversation(conversationId, userId, "Test Conversation");

        _mockChatService
            .Setup(s => s.GetConversationByIdAsync(conversationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(conversation);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value.Id.Should().Be(conversationId);
        result.Value.UserId.Should().Be(userId);
        result.Value.Title.Should().Be("Test Conversation");
    }

    [Fact]
    public async Task Handle_ReturnsCompleteConversationDetails()
    {
        // Arrange
        var conversationId = "conv-123";
        var userId = "user-456";
        var query = new GetConversationByIdQuery(conversationId, userId);

        var conversation = new ChatConversation
        {
            Id = conversationId,
            UserId = userId,
            Title = "Full Conversation",
            Provider = "OpenAI",
            Model = "gpt-4",
            RagEnabled = true,
            AgentEnabled = true,
            AgentRagEnabled = false,
            ImageGenerationEnabled = true,
            AgentCapabilities = "search,calculate",
            VectorStoreProvider = "Pinecone",
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            UpdatedAt = DateTime.UtcNow
        };

        _mockChatService
            .Setup(s => s.GetConversationByIdAsync(conversationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(conversation);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Provider.Should().Be("OpenAI");
        result.Value.Model.Should().Be("gpt-4");
        result.Value.RagEnabled.Should().BeTrue();
        result.Value.AgentEnabled.Should().BeTrue();
        result.Value.AgentRagEnabled.Should().BeFalse();
        result.Value.ImageGenerationEnabled.Should().BeTrue();
        result.Value.AgentCapabilities.Should().Be("search,calculate");
        result.Value.VectorStoreProvider.Should().Be("Pinecone");
    }

    [Fact]
    public async Task Handle_ReturnsConversationWithMessages()
    {
        // Arrange
        var conversationId = "conv-123";
        var userId = "user-456";
        var query = new GetConversationByIdQuery(conversationId, userId);

        var conversation = CreateTestConversation(conversationId, userId, "Chat");
        conversation.Messages = new List<ChatMessage>
        {
            new() { Id = "msg-1", Role = "user", Content = "Hello" },
            new() { Id = "msg-2", Role = "assistant", Content = "Hi there!" }
        };

        _mockChatService
            .Setup(s => s.GetConversationByIdAsync(conversationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(conversation);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Messages.Should().HaveCount(2);
    }

    #endregion

    #region Not Found Scenarios

    [Fact]
    public async Task Handle_WhenConversationNotFound_ReturnsNotFoundError()
    {
        // Arrange
        var query = new GetConversationByIdQuery("non-existent-conv", "user-456");

        _mockChatService
            .Setup(s => s.GetConversationByIdAsync(
                query.ConversationId,
                query.UserId,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((ChatConversation?)null);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("Conversation.NotFound");
        result.Error.Message.Should().Contain(query.ConversationId);
    }

    [Fact]
    public async Task Handle_WhenServiceReturnsNull_ReturnsFailure()
    {
        // Arrange
        var query = new GetConversationByIdQuery("any-id", "any-user");

        _mockChatService
            .Setup(s => s.GetConversationByIdAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((ChatConversation?)null);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
    }

    #endregion

    #region Exception Handling

    [Fact]
    public async Task Handle_WhenServiceThrows_ReturnsInternalError()
    {
        // Arrange
        var query = new GetConversationByIdQuery("conv-123", "user-456");

        _mockChatService
            .Setup(s => s.GetConversationByIdAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("InternalError");
        result.Error.Message.Should().Contain("Failed to retrieve conversation");
    }

    #endregion

    #region Service Interaction Tests

    [Fact]
    public async Task Handle_CallsServiceWithCorrectParameters()
    {
        // Arrange
        var conversationId = "specific-conv-id";
        var userId = "specific-user-id";
        var query = new GetConversationByIdQuery(conversationId, userId);

        var conversation = CreateTestConversation(conversationId, userId, "Test");
        _mockChatService
            .Setup(s => s.GetConversationByIdAsync(conversationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(conversation);

        // Act
        await _sut.Handle(query, CancellationToken.None);

        // Assert
        _mockChatService.Verify(s => s.GetConversationByIdAsync(conversationId, userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_PassesCancellationToken()
    {
        // Arrange
        var query = new GetConversationByIdQuery("conv-123", "user-456");
        using var cts = new CancellationTokenSource();
        var token = cts.Token;

        var conversation = CreateTestConversation(query.ConversationId, query.UserId, "Test");
        _mockChatService
            .Setup(s => s.GetConversationByIdAsync(query.ConversationId, query.UserId, token))
            .ReturnsAsync(conversation);

        // Act
        await _sut.Handle(query, token);

        // Assert
        _mockChatService.Verify(s => s.GetConversationByIdAsync(query.ConversationId, query.UserId, token), Times.Once);
    }

    [Fact]
    public async Task Handle_OnlyCallsServiceOnce()
    {
        // Arrange
        var query = new GetConversationByIdQuery("conv-123", "user-456");

        var conversation = CreateTestConversation(query.ConversationId, query.UserId, "Test");
        _mockChatService
            .Setup(s => s.GetConversationByIdAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(conversation);

        // Act
        await _sut.Handle(query, CancellationToken.None);

        // Assert
        _mockChatService.Verify(
            s => s.GetConversationByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    #endregion

    #region Helper Methods

    private static ChatConversation CreateTestConversation(string id, string userId, string title)
    {
        return new ChatConversation
        {
            Id = id,
            UserId = userId,
            Title = title,
            Provider = "OpenAI",
            Model = "gpt-4",
            RagEnabled = false,
            AgentEnabled = false,
            ImageGenerationEnabled = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
