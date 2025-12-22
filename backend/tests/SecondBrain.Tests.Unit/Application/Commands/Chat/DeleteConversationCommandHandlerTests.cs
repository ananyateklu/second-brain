using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Commands.Chat.DeleteConversation;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Services.Chat;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Commands.Chat;

/// <summary>
/// Unit tests for DeleteConversationCommandHandler.
/// Tests chat conversation deletion through CQRS command pattern.
/// </summary>
public class DeleteConversationCommandHandlerTests
{
    private readonly Mock<IChatConversationService> _mockChatService;
    private readonly Mock<ILogger<DeleteConversationCommandHandler>> _mockLogger;
    private readonly DeleteConversationCommandHandler _sut;

    public DeleteConversationCommandHandlerTests()
    {
        _mockChatService = new Mock<IChatConversationService>();
        _mockLogger = new Mock<ILogger<DeleteConversationCommandHandler>>();
        _sut = new DeleteConversationCommandHandler(
            _mockChatService.Object,
            _mockLogger.Object);
    }

    #region Success Scenarios

    [Fact]
    public async Task Handle_WithExistingConversation_ReturnsSuccess()
    {
        // Arrange
        var command = new DeleteConversationCommand("conv-123", "user-456");

        _mockChatService
            .Setup(s => s.DeleteConversationAsync(
                command.ConversationId,
                command.UserId,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_DeletesConversationSuccessfully()
    {
        // Arrange
        var conversationId = "specific-conv-id";
        var userId = "specific-user-id";
        var command = new DeleteConversationCommand(conversationId, userId);

        _mockChatService
            .Setup(s => s.DeleteConversationAsync(conversationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _mockChatService.Verify(s => s.DeleteConversationAsync(conversationId, userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region Not Found Scenarios

    [Fact]
    public async Task Handle_WhenConversationNotFound_ReturnsNotFoundError()
    {
        // Arrange
        var command = new DeleteConversationCommand("non-existent-conv", "user-456");

        _mockChatService
            .Setup(s => s.DeleteConversationAsync(
                command.ConversationId,
                command.UserId,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Conversation.NotFound");
        result.Error!.Message.Should().Contain(command.ConversationId);
    }

    [Fact]
    public async Task Handle_WhenServiceReturnsFalse_ReturnsFailure()
    {
        // Arrange
        var command = new DeleteConversationCommand("conv-123", "user-456");

        _mockChatService
            .Setup(s => s.DeleteConversationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
    }

    #endregion

    #region Access Denied Scenarios

    [Fact]
    public async Task Handle_WhenAccessDenied_ReturnsAccessDeniedError()
    {
        // Arrange
        var command = new DeleteConversationCommand("conv-123", "wrong-user");

        _mockChatService
            .Setup(s => s.DeleteConversationAsync(
                command.ConversationId,
                command.UserId,
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UnauthorizedException());

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Conversation.AccessDenied");
        result.Error!.Message.Should().Contain("Access denied");
    }

    #endregion

    #region Exception Handling

    [Fact]
    public async Task Handle_WhenServiceThrows_ReturnsInternalError()
    {
        // Arrange
        var command = new DeleteConversationCommand("conv-123", "user-456");

        _mockChatService
            .Setup(s => s.DeleteConversationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("InternalError");
        result.Error!.Message.Should().Contain("Failed to delete conversation");
    }

    #endregion

    #region Service Interaction Tests

    [Fact]
    public async Task Handle_CallsServiceWithCorrectParameters()
    {
        // Arrange
        var conversationId = "test-conv-id";
        var userId = "test-user-id";
        var command = new DeleteConversationCommand(conversationId, userId);

        _mockChatService
            .Setup(s => s.DeleteConversationAsync(conversationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        _mockChatService.Verify(s => s.DeleteConversationAsync(conversationId, userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_PassesCancellationToken()
    {
        // Arrange
        var command = new DeleteConversationCommand("conv-123", "user-456");
        using var cts = new CancellationTokenSource();
        var token = cts.Token;

        _mockChatService
            .Setup(s => s.DeleteConversationAsync(
                command.ConversationId,
                command.UserId,
                token))
            .ReturnsAsync(true);

        // Act
        await _sut.Handle(command, token);

        // Assert
        _mockChatService.Verify(s => s.DeleteConversationAsync(
            command.ConversationId,
            command.UserId,
            token), Times.Once);
    }

    [Fact]
    public async Task Handle_OnlyCallsDeleteOnce()
    {
        // Arrange
        var command = new DeleteConversationCommand("conv-123", "user-456");

        _mockChatService
            .Setup(s => s.DeleteConversationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        _mockChatService.Verify(
            s => s.DeleteConversationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    #endregion
}
