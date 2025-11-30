using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Infrastructure.Repositories;
using SecondBrain.Tests.Integration.Fixtures;

namespace SecondBrain.Tests.Integration.Repositories;

[Collection("PostgreSQL")]
public class ChatRepositoryTests : IAsyncLifetime
{
    private readonly PostgresFixture _fixture;
    private readonly Mock<ILogger<SqlChatRepository>> _mockLogger;
    private SqlChatRepository _sut = null!;

    public ChatRepositoryTests(PostgresFixture fixture)
    {
        _fixture = fixture;
        _mockLogger = new Mock<ILogger<SqlChatRepository>>();
    }

    public async Task InitializeAsync()
    {
        // Clean up chat data before each test
        await using var dbContext = _fixture.CreateDbContext();
        dbContext.ChatMessages.RemoveRange(dbContext.ChatMessages);
        dbContext.ChatConversations.RemoveRange(dbContext.ChatConversations);
        await dbContext.SaveChangesAsync();

        // Create a fresh repository for each test
        _sut = new SqlChatRepository(_fixture.CreateDbContext(), _mockLogger.Object);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    #region GetAllAsync Tests

    [Fact]
    public async Task GetAllAsync_WhenNoConversations_ReturnsEmptyList()
    {
        // Act
        var result = await _sut.GetAllAsync("user-123");

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAllAsync_WhenConversationsExist_ReturnsUserConversations()
    {
        // Arrange
        var userId = "user-123";
        var otherUserId = "user-456";
        var conv1 = CreateTestConversation("conv-1", userId, "Conversation 1");
        var conv2 = CreateTestConversation("conv-2", userId, "Conversation 2");
        var conv3 = CreateTestConversation("conv-3", otherUserId, "Other User Conversation");

        await _sut.CreateAsync(conv1);
        await _sut.CreateAsync(conv2);
        await _sut.CreateAsync(conv3);

        // Act
        var result = await _sut.GetAllAsync(userId);

        // Assert
        result.Should().HaveCount(2);
        result.Select(c => c.Id).Should().BeEquivalentTo(new[] { "conv-1", "conv-2" });
    }

    [Fact]
    public async Task GetAllAsync_ReturnsConversationsOrderedByUpdatedAtDescending()
    {
        // Arrange
        var userId = "user-123";
        var conv1 = CreateTestConversation("conv-1", userId, "First");
        var conv2 = CreateTestConversation("conv-2", userId, "Second");
        var conv3 = CreateTestConversation("conv-3", userId, "Third");

        await _sut.CreateAsync(conv1);
        await Task.Delay(10);
        await _sut.CreateAsync(conv2);
        await Task.Delay(10);
        await _sut.CreateAsync(conv3);

        // Act
        var result = (await _sut.GetAllAsync(userId)).ToList();

        // Assert
        result.Should().HaveCount(3);
        result[0].Id.Should().Be("conv-3");
        result[1].Id.Should().Be("conv-2");
        result[2].Id.Should().Be("conv-1");
    }

    [Fact]
    public async Task GetAllAsync_IncludesMessagesWithNestedEntities()
    {
        // Arrange
        var userId = "user-123";
        var conversation = CreateTestConversation("conv-1", userId, "Test");
        var message = CreateTestMessage("msg-1", "conv-1", "user", "Hello");
        message.RetrievedNotes.Add(new RetrievedNote { Id = "ret-1", NoteId = "note-1", Title = "Note 1" });
        message.ToolCalls.Add(new ToolCall { Id = "tool-1", ToolName = "test_tool", Arguments = "{}" });
        message.Images.Add(new MessageImage { Id = "img-1", Base64Data = "data", MediaType = "image/png" });
        message.GeneratedImages.Add(new GeneratedImageData { Id = "gen-1", Base64Data = "data" });
        conversation.Messages.Add(message);

        await _sut.CreateAsync(conversation);

        // Act
        var result = (await _sut.GetAllAsync(userId)).First();

        // Assert
        result.Messages.Should().HaveCount(1);
        result.Messages[0].RetrievedNotes.Should().HaveCount(1);
        result.Messages[0].ToolCalls.Should().HaveCount(1);
        result.Messages[0].Images.Should().HaveCount(1);
        result.Messages[0].GeneratedImages.Should().HaveCount(1);
    }

    #endregion

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_WhenConversationExists_ReturnsConversation()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test Conversation");
        await _sut.CreateAsync(conversation);

        // Act
        var result = await _sut.GetByIdAsync("conv-1");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be("conv-1");
        result.Title.Should().Be("Test Conversation");
        result.UserId.Should().Be("user-123");
    }

    [Fact]
    public async Task GetByIdAsync_WhenConversationDoesNotExist_ReturnsNull()
    {
        // Act
        var result = await _sut.GetByIdAsync("non-existent");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_IncludesMessagesOrderedByTimestamp()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        var msg1 = CreateTestMessage("msg-1", "conv-1", "user", "First");
        msg1.Timestamp = DateTime.UtcNow.AddMinutes(-10);
        var msg2 = CreateTestMessage("msg-2", "conv-1", "assistant", "Second");
        msg2.Timestamp = DateTime.UtcNow.AddMinutes(-5);
        var msg3 = CreateTestMessage("msg-3", "conv-1", "user", "Third");
        msg3.Timestamp = DateTime.UtcNow;

        conversation.Messages.AddRange(new[] { msg3, msg1, msg2 });
        await _sut.CreateAsync(conversation);

        // Act
        var result = await _sut.GetByIdAsync("conv-1");

        // Assert
        result!.Messages.Should().HaveCount(3);
        result.Messages[0].Id.Should().Be("msg-1");
        result.Messages[1].Id.Should().Be("msg-2");
        result.Messages[2].Id.Should().Be("msg-3");
    }

    [Fact]
    public async Task GetByIdAsync_IncludesAllNestedEntities()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        var message = CreateTestMessage("msg-1", "conv-1", "user", "Hello");
        message.RetrievedNotes.Add(new RetrievedNote { Id = "ret-1", NoteId = "note-1", Title = "Note 1" });
        message.ToolCalls.Add(new ToolCall { Id = "tool-1", ToolName = "test_tool", Arguments = "{}" });
        message.Images.Add(new MessageImage { Id = "img-1", Base64Data = "data", MediaType = "image/png" });
        message.GeneratedImages.Add(new GeneratedImageData { Id = "gen-1", Base64Data = "data" });
        conversation.Messages.Add(message);

        await _sut.CreateAsync(conversation);

        // Act
        var result = await _sut.GetByIdAsync("conv-1");

        // Assert
        result!.Messages.Should().HaveCount(1);
        result.Messages[0].RetrievedNotes.Should().HaveCount(1);
        result.Messages[0].ToolCalls.Should().HaveCount(1);
        result.Messages[0].Images.Should().HaveCount(1);
        result.Messages[0].GeneratedImages.Should().HaveCount(1);
    }

    #endregion

    #region CreateAsync Tests

    [Fact]
    public async Task CreateAsync_WhenValidConversation_CreatesAndReturnsConversation()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "New Conversation");

        // Act
        var created = await _sut.CreateAsync(conversation);

        // Assert
        created.Should().NotBeNull();
        created.Id.Should().Be("conv-1");
        created.Title.Should().Be("New Conversation");
        created.UserId.Should().Be("user-123");
        created.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        created.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task CreateAsync_WhenNoId_GeneratesId()
    {
        // Arrange
        var conversation = CreateTestConversation("", "user-123", "Test");
        conversation.Id = "";

        // Act
        var created = await _sut.CreateAsync(conversation);

        // Assert
        created.Id.Should().NotBeNullOrEmpty();
        Guid.TryParse(created.Id, out _).Should().BeTrue();
    }

    [Fact]
    public async Task CreateAsync_SetsTimestamps()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        conversation.CreatedAt = default;
        conversation.UpdatedAt = default;
        var beforeCreate = DateTime.UtcNow;

        // Act
        var created = await _sut.CreateAsync(conversation);
        var afterCreate = DateTime.UtcNow;

        // Assert
        created.CreatedAt.Should().BeOnOrAfter(beforeCreate).And.BeOnOrBefore(afterCreate);
        created.UpdatedAt.Should().BeOnOrAfter(beforeCreate).And.BeOnOrBefore(afterCreate);
    }

    [Fact]
    public async Task CreateAsync_AutoGeneratesIdsForNestedEntities()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        var message = CreateTestMessage("", "conv-1", "user", "Hello");
        message.Id = "";
        message.ToolCalls.Add(new ToolCall { Id = "", ToolName = "test", Arguments = "{}" });
        message.RetrievedNotes.Add(new RetrievedNote { Id = "", NoteId = "note-1", Title = "Note" });
        message.Images.Add(new MessageImage { Id = "", Base64Data = "data", MediaType = "image/png" });
        message.GeneratedImages.Add(new GeneratedImageData { Id = "", Base64Data = "data" });
        conversation.Messages.Add(message);

        // Act
        var created = await _sut.CreateAsync(conversation);

        // Assert
        created.Messages[0].Id.Should().NotBeNullOrEmpty();
        created.Messages[0].ToolCalls[0].Id.Should().NotBeNullOrEmpty();
        created.Messages[0].RetrievedNotes[0].Id.Should().NotBeNullOrEmpty();
        created.Messages[0].Images[0].Id.Should().NotBeNullOrEmpty();
        created.Messages[0].GeneratedImages[0].Id.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task CreateAsync_SetsConversationIdOnMessages()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        var message = CreateTestMessage("msg-1", "", "user", "Hello");
        message.ConversationId = "";
        conversation.Messages.Add(message);

        // Act
        var created = await _sut.CreateAsync(conversation);

        // Assert
        created.Messages[0].ConversationId.Should().Be("conv-1");
    }

    [Fact]
    public async Task CreateAsync_SetsMessageIdOnNestedEntities()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        var message = CreateTestMessage("msg-1", "conv-1", "user", "Hello");
        var toolCall = new ToolCall { Id = "tool-1", ToolName = "test", Arguments = "{}" };
        var retrievedNote = new RetrievedNote { Id = "ret-1", NoteId = "note-1", Title = "Note" };
        var image = new MessageImage { Id = "img-1", Base64Data = "data", MediaType = "image/png" };
        var generatedImage = new GeneratedImageData { Id = "gen-1", Base64Data = "data" };

        message.ToolCalls.Add(toolCall);
        message.RetrievedNotes.Add(retrievedNote);
        message.Images.Add(image);
        message.GeneratedImages.Add(generatedImage);
        conversation.Messages.Add(message);

        // Act
        var created = await _sut.CreateAsync(conversation);

        // Assert
        created.Messages[0].ToolCalls[0].MessageId.Should().Be("msg-1");
        created.Messages[0].RetrievedNotes[0].MessageId.Should().Be("msg-1");
        created.Messages[0].Images[0].MessageId.Should().Be("msg-1");
        created.Messages[0].GeneratedImages[0].MessageId.Should().Be("msg-1");
    }

    #endregion

    #region UpdateAsync Tests

    [Fact]
    public async Task UpdateAsync_WhenConversationExists_UpdatesAndReturnsConversation()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Original Title");
        await _sut.CreateAsync(conversation);

        var updateConversation = CreateTestConversation("conv-1", "user-123", "Updated Title");
        updateConversation.Provider = "claude";
        updateConversation.Model = "claude-3-opus";
        updateConversation.RagEnabled = true;
        updateConversation.AgentEnabled = true;
        updateConversation.AgentCapabilities = "[\"read_notes\"]";
        updateConversation.VectorStoreProvider = "postgresql";

        // Act
        var updated = await _sut.UpdateAsync("conv-1", updateConversation);

        // Assert
        updated.Should().NotBeNull();
        updated!.Title.Should().Be("Updated Title");
        updated.Provider.Should().Be("claude");
        updated.Model.Should().Be("claude-3-opus");
        updated.RagEnabled.Should().BeTrue();
        updated.AgentEnabled.Should().BeTrue();
        updated.AgentCapabilities.Should().Be("[\"read_notes\"]");
        updated.VectorStoreProvider.Should().Be("postgresql");
        updated.UpdatedAt.Should().BeAfter(conversation.UpdatedAt);
    }

    [Fact]
    public async Task UpdateAsync_WhenConversationDoesNotExist_ReturnsNull()
    {
        // Arrange
        var updateConversation = CreateTestConversation("non-existent", "user-123", "Title");

        // Act
        var updated = await _sut.UpdateAsync("non-existent", updateConversation);

        // Assert
        updated.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_ReplacesMessages()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        var msg1 = CreateTestMessage("msg-1", "conv-1", "user", "Original");
        conversation.Messages.Add(msg1);
        await _sut.CreateAsync(conversation);

        var updateConversation = CreateTestConversation("conv-1", "user-123", "Test");
        var msg2 = CreateTestMessage("msg-2", "conv-1", "assistant", "Updated");
        updateConversation.Messages.Add(msg2);

        // Act
        var updated = await _sut.UpdateAsync("conv-1", updateConversation);

        // Assert
        updated!.Messages.Should().HaveCount(1);
        updated.Messages[0].Id.Should().Be("msg-2");
        updated.Messages[0].Content.Should().Be("Updated");
    }

    [Fact]
    public async Task UpdateAsync_AutoGeneratesIdsForNewMessages()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        await _sut.CreateAsync(conversation);

        var updateConversation = CreateTestConversation("conv-1", "user-123", "Test");
        var message = CreateTestMessage("", "conv-1", "user", "New");
        message.Id = "";
        updateConversation.Messages.Add(message);

        // Act
        var updated = await _sut.UpdateAsync("conv-1", updateConversation);

        // Assert
        updated!.Messages[0].Id.Should().NotBeNullOrEmpty();
    }

    #endregion

    #region DeleteAsync Tests

    [Fact]
    public async Task DeleteAsync_WhenConversationExists_DeletesAndReturnsTrue()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        await _sut.CreateAsync(conversation);

        // Act
        var deleted = await _sut.DeleteAsync("conv-1");

        // Assert
        deleted.Should().BeTrue();

        var retrieved = await _sut.GetByIdAsync("conv-1");
        retrieved.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_WhenConversationDoesNotExist_ReturnsFalse()
    {
        // Act
        var deleted = await _sut.DeleteAsync("non-existent");

        // Assert
        deleted.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_CascadesToMessages()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        var message = CreateTestMessage("msg-1", "conv-1", "user", "Hello");
        conversation.Messages.Add(message);
        await _sut.CreateAsync(conversation);

        // Act
        var deleted = await _sut.DeleteAsync("conv-1");

        // Assert
        deleted.Should().BeTrue();

        await using var dbContext = _fixture.CreateDbContext();
        var messages = await dbContext.ChatMessages.Where(m => m.ConversationId == "conv-1").ToListAsync();
        messages.Should().BeEmpty();
    }

    #endregion

    #region AddMessageAsync Tests

    [Fact]
    public async Task AddMessageAsync_WhenConversationExists_AddsMessageAndReturnsConversation()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        await _sut.CreateAsync(conversation);

        var newMessage = CreateTestMessage("msg-2", "conv-1", "assistant", "Response");

        // Act
        var updated = await _sut.AddMessageAsync("conv-1", newMessage);

        // Assert
        updated.Should().NotBeNull();
        updated!.Messages.Should().HaveCount(1);
        updated.Messages[0].Content.Should().Be("Response");
        updated.UpdatedAt.Should().BeAfter(conversation.UpdatedAt);
    }

    [Fact]
    public async Task AddMessageAsync_WhenConversationDoesNotExist_ReturnsNull()
    {
        // Arrange
        var message = CreateTestMessage("msg-1", "non-existent", "user", "Hello");

        // Act
        var result = await _sut.AddMessageAsync("non-existent", message);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task AddMessageAsync_WhenNoId_GeneratesId()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        await _sut.CreateAsync(conversation);

        var message = CreateTestMessage("", "conv-1", "user", "Hello");
        message.Id = "";

        // Act
        var updated = await _sut.AddMessageAsync("conv-1", message);

        // Assert
        updated!.Messages[0].Id.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task AddMessageAsync_SetsTimestamp()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        await _sut.CreateAsync(conversation);

        var message = CreateTestMessage("msg-1", "conv-1", "user", "Hello");
        message.Timestamp = default;
        var beforeAdd = DateTime.UtcNow;

        // Act
        var updated = await _sut.AddMessageAsync("conv-1", message);
        var afterAdd = DateTime.UtcNow;

        // Assert
        updated!.Messages[0].Timestamp.Should().BeOnOrAfter(beforeAdd).And.BeOnOrBefore(afterAdd);
    }

    [Fact]
    public async Task AddMessageAsync_SetsConversationId()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        await _sut.CreateAsync(conversation);

        var message = CreateTestMessage("msg-1", "", "user", "Hello");
        message.ConversationId = "";

        // Act
        var updated = await _sut.AddMessageAsync("conv-1", message);

        // Assert
        updated!.Messages[0].ConversationId.Should().Be("conv-1");
    }

    [Fact]
    public async Task AddMessageAsync_AutoGeneratesIdsForNestedEntities()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        await _sut.CreateAsync(conversation);

        var message = CreateTestMessage("msg-1", "conv-1", "user", "Hello");
        message.ToolCalls.Add(new ToolCall { Id = "", ToolName = "test", Arguments = "{}" });
        message.RetrievedNotes.Add(new RetrievedNote { Id = "", NoteId = "note-1", Title = "Note" });
        message.Images.Add(new MessageImage { Id = "", Base64Data = "data", MediaType = "image/png" });
        message.GeneratedImages.Add(new GeneratedImageData { Id = "", Base64Data = "data" });

        // Act
        var updated = await _sut.AddMessageAsync("conv-1", message);

        // Assert
        updated!.Messages[0].ToolCalls[0].Id.Should().NotBeNullOrEmpty();
        updated.Messages[0].RetrievedNotes[0].Id.Should().NotBeNullOrEmpty();
        updated.Messages[0].Images[0].Id.Should().NotBeNullOrEmpty();
        updated.Messages[0].GeneratedImages[0].Id.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task AddMessageAsync_SetsMessageIdOnNestedEntities()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-123", "Test");
        await _sut.CreateAsync(conversation);

        var message = CreateTestMessage("msg-1", "conv-1", "user", "Hello");
        var toolCall = new ToolCall { Id = "tool-1", ToolName = "test", Arguments = "{}" };
        var retrievedNote = new RetrievedNote { Id = "ret-1", NoteId = "note-1", Title = "Note" };
        var image = new MessageImage { Id = "img-1", Base64Data = "data", MediaType = "image/png" };
        var generatedImage = new GeneratedImageData { Id = "gen-1", Base64Data = "data" };

        message.ToolCalls.Add(toolCall);
        message.RetrievedNotes.Add(retrievedNote);
        message.Images.Add(image);
        message.GeneratedImages.Add(generatedImage);

        // Act
        var updated = await _sut.AddMessageAsync("conv-1", message);

        // Assert
        updated!.Messages[0].ToolCalls[0].MessageId.Should().Be("msg-1");
        updated.Messages[0].RetrievedNotes[0].MessageId.Should().Be("msg-1");
        updated.Messages[0].Images[0].MessageId.Should().Be("msg-1");
        updated.Messages[0].GeneratedImages[0].MessageId.Should().Be("msg-1");
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
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Messages = new List<ChatMessage>()
        };
    }

    private static ChatMessage CreateTestMessage(string id, string conversationId, string role, string content)
    {
        return new ChatMessage
        {
            Id = id,
            ConversationId = conversationId,
            Role = role,
            Content = content,
            Timestamp = DateTime.UtcNow,
            RetrievedNotes = new List<RetrievedNote>(),
            ToolCalls = new List<ToolCall>(),
            Images = new List<MessageImage>(),
            GeneratedImages = new List<GeneratedImageData>()
        };
    }

    #endregion
}

