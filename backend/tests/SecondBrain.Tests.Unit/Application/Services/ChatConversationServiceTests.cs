using Microsoft.Extensions.Logging;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Services.Chat;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Tests.Unit.Application.Services;

public class ChatConversationServiceTests
{
    private readonly Mock<IChatRepository> _mockChatRepository;
    private readonly Mock<ILogger<ChatConversationService>> _mockLogger;
    private readonly ChatConversationService _sut;

    public ChatConversationServiceTests()
    {
        _mockChatRepository = new Mock<IChatRepository>();
        _mockLogger = new Mock<ILogger<ChatConversationService>>();
        _sut = new ChatConversationService(_mockChatRepository.Object, _mockLogger.Object);
    }

    #region GetAllConversationsAsync Tests

    [Fact]
    public async Task GetAllConversationsAsync_WhenConversationsExist_ReturnsAll()
    {
        // Arrange
        var userId = "user-123";
        var conversations = new List<ChatConversation>
        {
            CreateTestConversation("conv-1", userId, "First Conversation"),
            CreateTestConversation("conv-2", userId, "Second Conversation")
        };
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(conversations);

        // Act
        var result = await _sut.GetAllConversationsAsync(userId);

        // Assert
        result.Should().HaveCount(2);
        result.Select(c => c.Title).Should().BeEquivalentTo(new[] { "First Conversation", "Second Conversation" });
        _mockChatRepository.Verify(r => r.GetAllAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetAllConversationsAsync_WhenNoConversationsExist_ReturnsEmptyList()
    {
        // Arrange
        var userId = "user-123";
        _mockChatRepository.Setup(r => r.GetAllAsync(userId))
            .ReturnsAsync(new List<ChatConversation>());

        // Act
        var result = await _sut.GetAllConversationsAsync(userId);

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region GetConversationByIdAsync Tests

    [Fact]
    public async Task GetConversationByIdAsync_WhenConversationExistsAndUserOwns_ReturnsConversation()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "conv-1";
        var conversation = CreateTestConversation(conversationId, userId, "Test Conversation");
        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync(conversation);

        // Act
        var result = await _sut.GetConversationByIdAsync(conversationId, userId);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(conversationId);
        result.Title.Should().Be("Test Conversation");
    }

    [Fact]
    public async Task GetConversationByIdAsync_WhenConversationDoesNotExist_ReturnsNull()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "non-existent";
        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync((ChatConversation?)null);

        // Act
        var result = await _sut.GetConversationByIdAsync(conversationId, userId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetConversationByIdAsync_WhenUserDoesNotOwn_ThrowsUnauthorizedException()
    {
        // Arrange
        var userId = "user-123";
        var otherUserId = "other-user";
        var conversationId = "conv-1";
        var conversation = CreateTestConversation(conversationId, otherUserId, "Other's Conversation");
        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync(conversation);

        // Act & Assert
        var act = async () => await _sut.GetConversationByIdAsync(conversationId, userId);
        await act.Should().ThrowAsync<UnauthorizedException>()
            .WithMessage("Access denied to this conversation");
    }

    #endregion

    #region CreateConversationAsync Tests

    [Fact]
    public async Task CreateConversationAsync_WithBasicParameters_CreatesConversation()
    {
        // Arrange
        var userId = "user-123";
        var title = "New Chat";
        var provider = "openai";
        var model = "gpt-4";

        _mockChatRepository.Setup(r => r.CreateAsync(It.IsAny<ChatConversation>()))
            .ReturnsAsync((ChatConversation c) =>
            {
                c.Id = "created-conv-id";
                return c;
            });

        // Act
        var result = await _sut.CreateConversationAsync(title, provider, model, userId);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("New Chat");
        result.Provider.Should().Be("openai");
        result.Model.Should().Be("gpt-4");
        result.UserId.Should().Be(userId);
        result.RagEnabled.Should().BeFalse();
        result.AgentEnabled.Should().BeFalse();
    }

    [Fact]
    public async Task CreateConversationAsync_WithAllParameters_SetsAllFields()
    {
        // Arrange
        var userId = "user-123";
        _mockChatRepository.Setup(r => r.CreateAsync(It.IsAny<ChatConversation>()))
            .ReturnsAsync((ChatConversation c) => c);

        // Act
        var result = await _sut.CreateConversationAsync(
            title: "Full Chat",
            provider: "claude",
            model: "claude-3-opus",
            userId: userId,
            ragEnabled: true,
            agentEnabled: true,
            imageGenerationEnabled: true,
            agentCapabilities: "notes,search",
            vectorStoreProvider: "pinecone"
        );

        // Assert
        result.RagEnabled.Should().BeTrue();
        result.AgentEnabled.Should().BeTrue();
        result.ImageGenerationEnabled.Should().BeTrue();
        result.AgentCapabilities.Should().Be("notes,search");
        result.VectorStoreProvider.Should().Be("pinecone");
    }

    [Fact]
    public async Task CreateConversationAsync_WithNullTitle_DefaultsToNewConversation()
    {
        // Arrange
        var userId = "user-123";
        _mockChatRepository.Setup(r => r.CreateAsync(It.IsAny<ChatConversation>()))
            .ReturnsAsync((ChatConversation c) => c);

        // Act
        var result = await _sut.CreateConversationAsync(
            title: null!,
            provider: "openai",
            model: "gpt-4",
            userId: userId
        );

        // Assert
        result.Title.Should().Be("New Conversation");
    }

    [Fact]
    public async Task CreateConversationAsync_InitializesEmptyMessagesList()
    {
        // Arrange
        var userId = "user-123";
        _mockChatRepository.Setup(r => r.CreateAsync(It.IsAny<ChatConversation>()))
            .ReturnsAsync((ChatConversation c) => c);

        // Act
        var result = await _sut.CreateConversationAsync("Test", "openai", "gpt-4", userId);

        // Assert
        result.Messages.Should().NotBeNull();
        result.Messages.Should().BeEmpty();
    }

    #endregion

    #region UpdateConversationSettingsAsync Tests

    [Fact]
    public async Task UpdateConversationSettingsAsync_WhenConversationExistsAndUserOwns_UpdatesSettings()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "conv-1";
        var conversation = CreateTestConversation(conversationId, userId, "Test");
        conversation.RagEnabled = false;
        conversation.AgentEnabled = false;

        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync(conversation);
        _mockChatRepository.Setup(r => r.UpdateAsync(conversationId, It.IsAny<ChatConversation>()))
            .ReturnsAsync((string id, ChatConversation c) => c);

        // Act
        var result = await _sut.UpdateConversationSettingsAsync(
            conversationId,
            userId,
            ragEnabled: true,
            vectorStoreProvider: "postgresql",
            agentEnabled: true,
            agentCapabilities: "notes"
        );

        // Assert
        result.Should().NotBeNull();
        result!.RagEnabled.Should().BeTrue();
        result.VectorStoreProvider.Should().Be("postgresql");
        result.AgentEnabled.Should().BeTrue();
        result.AgentCapabilities.Should().Be("notes");
    }

    [Fact]
    public async Task UpdateConversationSettingsAsync_WhenConversationDoesNotExist_ReturnsNull()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "non-existent";
        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync((ChatConversation?)null);

        // Act
        var result = await _sut.UpdateConversationSettingsAsync(conversationId, userId, ragEnabled: true);

        // Assert
        result.Should().BeNull();
        _mockChatRepository.Verify(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<ChatConversation>()), Times.Never);
    }

    [Fact]
    public async Task UpdateConversationSettingsAsync_WhenUserDoesNotOwn_ThrowsUnauthorizedException()
    {
        // Arrange
        var userId = "user-123";
        var otherUserId = "other-user";
        var conversationId = "conv-1";
        var conversation = CreateTestConversation(conversationId, otherUserId, "Other's");
        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync(conversation);

        // Act & Assert
        var act = async () => await _sut.UpdateConversationSettingsAsync(conversationId, userId, ragEnabled: true);
        await act.Should().ThrowAsync<UnauthorizedException>()
            .WithMessage("Access denied to this conversation");
    }

    [Fact]
    public async Task UpdateConversationSettingsAsync_OnlyUpdatesProvidedSettings()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "conv-1";
        var conversation = CreateTestConversation(conversationId, userId, "Test");
        conversation.RagEnabled = true;
        conversation.VectorStoreProvider = "original";
        conversation.AgentEnabled = false;
        conversation.AgentCapabilities = "original-caps";

        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync(conversation);
        _mockChatRepository.Setup(r => r.UpdateAsync(conversationId, It.IsAny<ChatConversation>()))
            .ReturnsAsync((string id, ChatConversation c) => c);

        // Act - Only update RagEnabled
        var result = await _sut.UpdateConversationSettingsAsync(
            conversationId,
            userId,
            ragEnabled: false
        );

        // Assert - Other settings should remain unchanged
        result.Should().NotBeNull();
        result!.RagEnabled.Should().BeFalse();
        result.VectorStoreProvider.Should().Be("original");
        result.AgentEnabled.Should().BeFalse();
        result.AgentCapabilities.Should().Be("original-caps");
    }

    [Fact]
    public async Task UpdateConversationSettingsAsync_UpdatesTimestamp()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "conv-1";
        var originalTime = new DateTime(2023, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var conversation = CreateTestConversation(conversationId, userId, "Test");
        conversation.UpdatedAt = originalTime;

        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync(conversation);
        _mockChatRepository.Setup(r => r.UpdateAsync(conversationId, It.IsAny<ChatConversation>()))
            .ReturnsAsync((string id, ChatConversation c) => c);

        var beforeUpdate = DateTime.UtcNow;

        // Act
        var result = await _sut.UpdateConversationSettingsAsync(conversationId, userId, ragEnabled: true);

        // Assert
        result.Should().NotBeNull();
        result!.UpdatedAt.Should().BeOnOrAfter(beforeUpdate);
        result.UpdatedAt.Should().NotBe(originalTime);
    }

    #endregion

    #region DeleteConversationAsync Tests

    [Fact]
    public async Task DeleteConversationAsync_WhenConversationExistsAndUserOwns_DeletesAndReturnsTrue()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "conv-1";
        var conversation = CreateTestConversation(conversationId, userId, "To Delete");
        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync(conversation);
        _mockChatRepository.Setup(r => r.DeleteAsync(conversationId))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.DeleteConversationAsync(conversationId, userId);

        // Assert
        result.Should().BeTrue();
        _mockChatRepository.Verify(r => r.DeleteAsync(conversationId), Times.Once);
    }

    [Fact]
    public async Task DeleteConversationAsync_WhenConversationDoesNotExist_ReturnsFalse()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "non-existent";
        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync((ChatConversation?)null);

        // Act
        var result = await _sut.DeleteConversationAsync(conversationId, userId);

        // Assert
        result.Should().BeFalse();
        _mockChatRepository.Verify(r => r.DeleteAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task DeleteConversationAsync_WhenUserDoesNotOwn_ThrowsUnauthorizedException()
    {
        // Arrange
        var userId = "user-123";
        var otherUserId = "other-user";
        var conversationId = "conv-1";
        var conversation = CreateTestConversation(conversationId, otherUserId, "Other's");
        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync(conversation);

        // Act & Assert
        var act = async () => await _sut.DeleteConversationAsync(conversationId, userId);
        await act.Should().ThrowAsync<UnauthorizedException>()
            .WithMessage("Access denied to this conversation");
    }

    #endregion

    #region AddMessageToConversationAsync Tests

    [Fact]
    public async Task AddMessageToConversationAsync_WhenConversationExistsAndUserOwns_AddsMessage()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "conv-1";
        var conversation = CreateTestConversation(conversationId, userId, "Test");
        var message = new ChatMessage
        {
            Id = "msg-1",
            ConversationId = conversationId,
            Role = "user",
            Content = "Hello, AI!"
        };

        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync(conversation);
        _mockChatRepository.Setup(r => r.UpdateAsync(conversationId, It.IsAny<ChatConversation>()))
            .ReturnsAsync((string id, ChatConversation c) => c);

        // Act
        var result = await _sut.AddMessageToConversationAsync(conversationId, userId, message);

        // Assert
        result.Should().NotBeNull();
        result!.Messages.Should().ContainSingle(m => m.Content == "Hello, AI!");
    }

    [Fact]
    public async Task AddMessageToConversationAsync_WhenConversationDoesNotExist_ReturnsNull()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "non-existent";
        var message = new ChatMessage { Id = "msg-1", Role = "user", Content = "Hello" };
        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync((ChatConversation?)null);

        // Act
        var result = await _sut.AddMessageToConversationAsync(conversationId, userId, message);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task AddMessageToConversationAsync_WhenUserDoesNotOwn_ThrowsUnauthorizedException()
    {
        // Arrange
        var userId = "user-123";
        var otherUserId = "other-user";
        var conversationId = "conv-1";
        var conversation = CreateTestConversation(conversationId, otherUserId, "Other's");
        var message = new ChatMessage { Id = "msg-1", Role = "user", Content = "Hello" };
        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync(conversation);

        // Act & Assert
        var act = async () => await _sut.AddMessageToConversationAsync(conversationId, userId, message);
        await act.Should().ThrowAsync<UnauthorizedException>()
            .WithMessage("Access denied to this conversation");
    }

    [Fact]
    public async Task AddMessageToConversationAsync_UpdatesConversationTimestamp()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "conv-1";
        var originalTime = new DateTime(2023, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var conversation = CreateTestConversation(conversationId, userId, "Test");
        conversation.UpdatedAt = originalTime;
        var message = new ChatMessage { Id = "msg-1", Role = "user", Content = "Hello" };

        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync(conversation);
        _mockChatRepository.Setup(r => r.UpdateAsync(conversationId, It.IsAny<ChatConversation>()))
            .ReturnsAsync((string id, ChatConversation c) => c);

        var beforeAdd = DateTime.UtcNow;

        // Act
        var result = await _sut.AddMessageToConversationAsync(conversationId, userId, message);

        // Assert
        result.Should().NotBeNull();
        result!.UpdatedAt.Should().BeOnOrAfter(beforeAdd);
    }

    #endregion

    #region IsConversationOwnedByUserAsync Tests

    [Fact]
    public async Task IsConversationOwnedByUserAsync_WhenConversationExistsAndUserOwns_ReturnsTrue()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "conv-1";
        var conversation = CreateTestConversation(conversationId, userId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync(conversation);

        // Act
        var result = await _sut.IsConversationOwnedByUserAsync(conversationId, userId);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task IsConversationOwnedByUserAsync_WhenConversationExistsButUserDoesNotOwn_ReturnsFalse()
    {
        // Arrange
        var userId = "user-123";
        var otherUserId = "other-user";
        var conversationId = "conv-1";
        var conversation = CreateTestConversation(conversationId, otherUserId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync(conversation);

        // Act
        var result = await _sut.IsConversationOwnedByUserAsync(conversationId, userId);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsConversationOwnedByUserAsync_WhenConversationDoesNotExist_ReturnsFalse()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "non-existent";
        _mockChatRepository.Setup(r => r.GetByIdAsync(conversationId))
            .ReturnsAsync((ChatConversation?)null);

        // Act
        var result = await _sut.IsConversationOwnedByUserAsync(conversationId, userId);

        // Assert
        result.Should().BeFalse();
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
            Provider = "openai",
            Model = "gpt-4",
            RagEnabled = false,
            AgentEnabled = false,
            ImageGenerationEnabled = false,
            Messages = new List<ChatMessage>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}

