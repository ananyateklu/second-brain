using System.Net;
using System.Net.Http.Json;
using SecondBrain.Core.Entities;
using SecondBrain.Tests.Integration.Fixtures;

namespace SecondBrain.Tests.Integration.API;

/// <summary>
/// Integration tests for the Chat API endpoints.
/// </summary>
[Collection("WebApplication")]
public class ChatApiTests : IAsyncLifetime
{
    private readonly WebApplicationFactoryFixture _factory;
    private HttpClient _client = null!;

    public ChatApiTests(WebApplicationFactoryFixture factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync()
    {
        _client = _factory.CreateAuthenticatedClient();
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        await _factory.ResetDatabaseAsync();
        _client.Dispose();
    }

    [Fact]
    public async Task GetConversations_WithNoConversations_ReturnsEmptyList()
    {
        // Act
        var response = await _client.GetAsync("/api/chat/conversations");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var conversations = await response.Content.ReadFromJsonAsync<List<ConversationDto>>();
        conversations.Should().NotBeNull();
        conversations.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateConversation_WithValidRequest_ReturnsCreatedConversation()
    {
        // Arrange
        var request = new
        {
            title = "Test Conversation",
            provider = "openai",
            model = "gpt-4o-mini",
            ragEnabled = false
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/chat/conversations", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var conversation = await response.Content.ReadFromJsonAsync<ConversationDto>();
        conversation.Should().NotBeNull();
        conversation!.Title.Should().Be("Test Conversation");
        conversation.Provider.Should().Be("openai");
        conversation.Model.Should().Be("gpt-4o-mini");
        conversation.Id.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task CreateConversation_WithMissingProvider_ReturnsBadRequest()
    {
        // Arrange
        var request = new
        {
            title = "Test Conversation",
            model = "gpt-4o-mini"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/chat/conversations", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetConversationById_WithExistingConversation_ReturnsConversation()
    {
        // Arrange
        var createRequest = new
        {
            title = "Conversation to retrieve",
            provider = "openai",
            model = "gpt-4o-mini"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/chat/conversations", createRequest);
        var created = await createResponse.Content.ReadFromJsonAsync<ConversationDto>();

        // Act
        var response = await _client.GetAsync($"/api/chat/conversations/{created!.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var conversation = await response.Content.ReadFromJsonAsync<ConversationDto>();
        conversation.Should().NotBeNull();
        conversation!.Id.Should().Be(created.Id);
        conversation.Title.Should().Be("Conversation to retrieve");
    }

    [Fact]
    public async Task GetConversationById_WithNonExistentId_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync("/api/chat/conversations/non-existent-id");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteConversation_WithExistingConversation_ReturnsNoContent()
    {
        // Arrange
        var createRequest = new
        {
            title = "Conversation to delete",
            provider = "openai",
            model = "gpt-4o-mini"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/chat/conversations", createRequest);
        var created = await createResponse.Content.ReadFromJsonAsync<ConversationDto>();

        // Act
        var response = await _client.DeleteAsync($"/api/chat/conversations/{created!.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify deletion
        var getResponse = await _client.GetAsync($"/api/chat/conversations/{created.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SendMessage_WithValidRequest_ReturnsResponse()
    {
        // Arrange
        var createRequest = new
        {
            title = "Test Chat",
            provider = "openai",
            model = "gpt-4o-mini"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/chat/conversations", createRequest);
        var conversation = await createResponse.Content.ReadFromJsonAsync<ConversationDto>();

        var messageRequest = new
        {
            content = "Hello, AI!",
            useRag = false
        };

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/chat/conversations/{conversation!.Id}/messages",
            messageRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var chatResponse = await response.Content.ReadFromJsonAsync<ChatResponseDto>();
        chatResponse.Should().NotBeNull();
        chatResponse!.Conversation.Should().NotBeNull();
        chatResponse.Conversation!.Messages.Should().HaveCountGreaterThan(0);
    }

    [Fact]
    public async Task UpdateConversationSettings_WithValidRequest_ReturnsUpdatedConversation()
    {
        // Arrange
        var createRequest = new
        {
            title = "Settings Test",
            provider = "openai",
            model = "gpt-4o-mini",
            ragEnabled = false
        };
        var createResponse = await _client.PostAsJsonAsync("/api/chat/conversations", createRequest);
        var conversation = await createResponse.Content.ReadFromJsonAsync<ConversationDto>();

        var settingsRequest = new
        {
            ragEnabled = true,
            vectorStoreProvider = "PostgreSQL"
        };

        // Act
        var response = await _client.PatchAsJsonAsync(
            $"/api/chat/conversations/{conversation!.Id}/settings",
            settingsRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<ConversationDto>();
        updated.Should().NotBeNull();
        updated!.RagEnabled.Should().BeTrue();
    }

    [Fact]
    public async Task GetConversations_WithVersionedRoute_ReturnsConversations()
    {
        // Arrange
        var createRequest = new
        {
            title = "Versioned Conversation",
            provider = "openai",
            model = "gpt-4o-mini"
        };
        await _client.PostAsJsonAsync("/api/chat/conversations", createRequest);

        // Act - Test versioned route
        var response = await _client.GetAsync("/api/v1/chat/conversations");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var conversations = await response.Content.ReadFromJsonAsync<List<ConversationDto>>();
        conversations.Should().NotBeNull();
        conversations.Should().HaveCount(1);
    }

    [Fact]
    public async Task Chat_WithoutAuthentication_ReturnsUnauthorized()
    {
        // Arrange - Use client without auth
        using var unauthenticatedClient = _factory.CreateClient();

        // Act
        var response = await unauthenticatedClient.GetAsync("/api/chat/conversations");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task BulkDeleteConversations_WithValidIds_ReturnsSuccessCount()
    {
        // Arrange - Create multiple conversations
        var conversationIds = new List<string>();
        for (int i = 0; i < 3; i++)
        {
            var createRequest = new
            {
                title = $"Bulk Delete Test {i}",
                provider = "openai",
                model = "gpt-4o-mini"
            };
            var createResponse = await _client.PostAsJsonAsync("/api/chat/conversations", createRequest);
            var conversation = await createResponse.Content.ReadFromJsonAsync<ConversationDto>();
            conversationIds.Add(conversation!.Id);
        }

        var bulkDeleteRequest = new
        {
            conversationIds = conversationIds
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/chat/conversations/bulk-delete", bulkDeleteRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<BulkDeleteResult>();
        result.Should().NotBeNull();
        result!.DeletedCount.Should().Be(3);
    }

    /// <summary>
    /// DTO for conversation responses.
    /// </summary>
    private record ConversationDto
    {
        public string Id { get; init; } = string.Empty;
        public string Title { get; init; } = string.Empty;
        public string Provider { get; init; } = string.Empty;
        public string Model { get; init; } = string.Empty;
        public bool RagEnabled { get; init; }
        public bool AgentEnabled { get; init; }
        public List<ChatMessage> Messages { get; init; } = new();
    }

    /// <summary>
    /// DTO for chat responses.
    /// </summary>
    private record ChatResponseDto
    {
        public ConversationDto? Conversation { get; init; }
        public List<object>? RetrievedNotes { get; init; }
    }

    /// <summary>
    /// DTO for bulk delete results.
    /// </summary>
    private record BulkDeleteResult
    {
        public int DeletedCount { get; init; }
        public string Message { get; init; } = string.Empty;
    }
}
