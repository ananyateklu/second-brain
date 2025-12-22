using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Commands.Chat.CreateConversation;
using SecondBrain.Application.Services.Chat;
using SecondBrain.Core.Entities;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Commands.Chat;

/// <summary>
/// Unit tests for CreateConversationCommandHandler.
/// Tests chat conversation creation through CQRS command pattern.
/// </summary>
public class CreateConversationCommandHandlerTests
{
    private readonly Mock<IChatConversationService> _mockChatService;
    private readonly Mock<ILogger<CreateConversationCommandHandler>> _mockLogger;
    private readonly CreateConversationCommandHandler _sut;

    public CreateConversationCommandHandlerTests()
    {
        _mockChatService = new Mock<IChatConversationService>();
        _mockLogger = new Mock<ILogger<CreateConversationCommandHandler>>();
        _sut = new CreateConversationCommandHandler(
            _mockChatService.Object,
            _mockLogger.Object);
    }

    #region Success Scenarios

    [Fact]
    public async Task Handle_WithValidCommand_ReturnsSuccessWithConversation()
    {
        // Arrange
        var command = new CreateConversationCommand(
            Title: "Test Conversation",
            Provider: "OpenAI",
            Model: "gpt-4",
            UserId: "user-123"
        );

        var createdConversation = CreateTestConversation(command.UserId, command.Title, command.Provider, command.Model);

        _mockChatService
            .Setup(s => s.CreateConversationAsync(
                command.Title,
                command.Provider,
                command.Model,
                command.UserId,
                command.RagEnabled,
                command.AgentEnabled,
                command.AgentRagEnabled,
                command.ImageGenerationEnabled,
                command.AgentCapabilities,
                command.VectorStoreProvider,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(createdConversation);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value.Title.Should().Be("Test Conversation");
        result.Value.Provider.Should().Be("OpenAI");
        result.Value.Model.Should().Be("gpt-4");
    }

    [Fact]
    public async Task Handle_WithRagEnabled_PassesCorrectValue()
    {
        // Arrange
        var command = new CreateConversationCommand(
            Title: "RAG Conversation",
            Provider: "Anthropic",
            Model: "claude-3",
            UserId: "user-123",
            RagEnabled: true
        );

        var createdConversation = CreateTestConversation(command.UserId, command.Title, command.Provider, command.Model);
        createdConversation.RagEnabled = true;

        _mockChatService
            .Setup(s => s.CreateConversationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                true,
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(createdConversation);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _mockChatService.Verify(s => s.CreateConversationAsync(
            command.Title,
            command.Provider,
            command.Model,
            command.UserId,
            true,
            It.IsAny<bool>(),
            It.IsAny<bool>(),
            It.IsAny<bool>(),
            It.IsAny<string?>(),
            It.IsAny<string?>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithAgentEnabled_PassesCorrectValue()
    {
        // Arrange
        var command = new CreateConversationCommand(
            Title: "Agent Conversation",
            Provider: "OpenAI",
            Model: "gpt-4",
            UserId: "user-123",
            AgentEnabled: true,
            AgentCapabilities: "search,calculate"
        );

        var createdConversation = CreateTestConversation(command.UserId, command.Title, command.Provider, command.Model);
        createdConversation.AgentEnabled = true;
        createdConversation.AgentCapabilities = "search,calculate";

        _mockChatService
            .Setup(s => s.CreateConversationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                true,
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                "search,calculate",
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(createdConversation);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.AgentEnabled.Should().BeTrue();
        result.Value!.AgentCapabilities.Should().Be("search,calculate");
    }

    [Fact]
    public async Task Handle_WithVectorStoreProvider_PassesCorrectValue()
    {
        // Arrange
        var command = new CreateConversationCommand(
            Title: "Vector Store Conversation",
            Provider: "OpenAI",
            Model: "gpt-4",
            UserId: "user-123",
            RagEnabled: true,
            VectorStoreProvider: "Pinecone"
        );

        var createdConversation = CreateTestConversation(command.UserId, command.Title, command.Provider, command.Model);
        createdConversation.VectorStoreProvider = "Pinecone";

        _mockChatService
            .Setup(s => s.CreateConversationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<string?>(),
                "Pinecone",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(createdConversation);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.VectorStoreProvider.Should().Be("Pinecone");
    }

    [Fact]
    public async Task Handle_WithImageGenerationEnabled_PassesCorrectValue()
    {
        // Arrange
        var command = new CreateConversationCommand(
            Title: "Image Gen Conversation",
            Provider: "OpenAI",
            Model: "gpt-4",
            UserId: "user-123",
            ImageGenerationEnabled: true
        );

        var createdConversation = CreateTestConversation(command.UserId, command.Title, command.Provider, command.Model);
        createdConversation.ImageGenerationEnabled = true;

        _mockChatService
            .Setup(s => s.CreateConversationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                true,
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(createdConversation);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.ImageGenerationEnabled.Should().BeTrue();
    }

    #endregion

    #region Exception Handling

    [Fact]
    public async Task Handle_WhenServiceThrows_ReturnsInternalError()
    {
        // Arrange
        var command = new CreateConversationCommand(
            Title: "Test",
            Provider: "OpenAI",
            Model: "gpt-4",
            UserId: "user-123"
        );

        _mockChatService
            .Setup(s => s.CreateConversationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("InternalError");
        result.Error!.Message.Should().Contain("Failed to create conversation");
    }

    #endregion

    #region Service Interaction Tests

    [Fact]
    public async Task Handle_CallsServiceWithAllParameters()
    {
        // Arrange
        var command = new CreateConversationCommand(
            Title: "Full Config",
            Provider: "Gemini",
            Model: "gemini-pro",
            UserId: "user-456",
            RagEnabled: true,
            AgentEnabled: true,
            AgentRagEnabled: false,
            ImageGenerationEnabled: true,
            AgentCapabilities: "all",
            VectorStoreProvider: "PostgreSQL"
        );

        var createdConversation = CreateTestConversation(command.UserId, command.Title, command.Provider, command.Model);

        _mockChatService
            .Setup(s => s.CreateConversationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(createdConversation);

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        _mockChatService.Verify(s => s.CreateConversationAsync(
            "Full Config",
            "Gemini",
            "gemini-pro",
            "user-456",
            true,
            true,
            false,
            true,
            "all",
            "PostgreSQL",
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_PassesCancellationToken()
    {
        // Arrange
        var command = new CreateConversationCommand(
            Title: "Test",
            Provider: "OpenAI",
            Model: "gpt-4",
            UserId: "user-123"
        );

        using var cts = new CancellationTokenSource();
        var token = cts.Token;

        var createdConversation = CreateTestConversation(command.UserId, command.Title, command.Provider, command.Model);

        _mockChatService
            .Setup(s => s.CreateConversationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                token))
            .ReturnsAsync(createdConversation);

        // Act
        await _sut.Handle(command, token);

        // Assert
        _mockChatService.Verify(s => s.CreateConversationAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<bool>(),
            It.IsAny<bool>(),
            It.IsAny<bool>(),
            It.IsAny<bool>(),
            It.IsAny<string?>(),
            It.IsAny<string?>(),
            token), Times.Once);
    }

    #endregion

    #region Helper Methods

    private static ChatConversation CreateTestConversation(string userId, string title, string provider, string model)
    {
        return new ChatConversation
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            Title = title,
            Provider = provider,
            Model = model,
            RagEnabled = false,
            AgentEnabled = false,
            AgentRagEnabled = true,
            ImageGenerationEnabled = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
