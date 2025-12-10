using Microsoft.Extensions.Logging;
using SecondBrain.Application.Exceptions;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Chat;

/// <summary>
/// Service for handling chat conversation operations with business logic
/// </summary>
public class ChatConversationService : IChatConversationService
{
    private readonly IChatRepository _chatRepository;
    private readonly ILogger<ChatConversationService> _logger;

    public ChatConversationService(IChatRepository chatRepository, ILogger<ChatConversationService> logger)
    {
        _chatRepository = chatRepository;
        _logger = logger;
    }

    public async Task<IEnumerable<ChatConversation>> GetAllConversationsAsync(string userId, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Retrieving all conversations for user. UserId: {UserId}", userId);
        var conversations = await _chatRepository.GetAllAsync(userId);

        // Sort tool calls by execution time to ensure correct display order
        foreach (var conversation in conversations)
        {
            SortToolCallsByExecutedAt(conversation);
        }

        return conversations;
    }

    public async Task<ChatConversation?> GetConversationByIdAsync(string conversationId, string userId, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Retrieving conversation. ConversationId: {ConversationId}, UserId: {UserId}", conversationId, userId);

        var conversation = await _chatRepository.GetByIdAsync(conversationId);

        if (conversation == null)
        {
            return null;
        }

        // Verify ownership
        if (conversation.UserId != userId)
        {
            _logger.LogWarning("User attempted to access conversation belonging to another user. UserId: {UserId}, ConversationId: {ConversationId}, ConversationUserId: {ConversationUserId}",
                userId, conversationId, conversation.UserId);
            throw new UnauthorizedException("Access denied to this conversation");
        }

        // Sort tool calls by execution time to ensure correct display order
        SortToolCallsByExecutedAt(conversation);

        return conversation;
    }

    public async Task<ChatConversation> CreateConversationAsync(
        string title,
        string provider,
        string model,
        string userId,
        bool ragEnabled = false,
        bool agentEnabled = false,
        bool agentRagEnabled = true,
        bool imageGenerationEnabled = false,
        string? agentCapabilities = null,
        string? vectorStoreProvider = null,
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Creating conversation for user. UserId: {UserId}, Provider: {Provider}, Model: {Model}",
            userId, provider, model);

        var conversation = new ChatConversation
        {
            Title = title ?? "New Conversation",
            Provider = provider,
            Model = model,
            RagEnabled = ragEnabled,
            AgentEnabled = agentEnabled,
            AgentRagEnabled = agentRagEnabled,
            ImageGenerationEnabled = imageGenerationEnabled,
            AgentCapabilities = agentCapabilities,
            VectorStoreProvider = vectorStoreProvider,
            UserId = userId,
            Messages = new List<ChatMessage>()
        };

        var created = await _chatRepository.CreateAsync(conversation);
        _logger.LogInformation("Conversation created successfully. ConversationId: {ConversationId}, UserId: {UserId}",
            created.Id, userId);

        return created;
    }

    public async Task<ChatConversation?> UpdateConversationSettingsAsync(
        string conversationId,
        string userId,
        bool? ragEnabled = null,
        string? vectorStoreProvider = null,
        bool? agentEnabled = null,
        bool? agentRagEnabled = null,
        string? agentCapabilities = null,
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Updating conversation settings. ConversationId: {ConversationId}, UserId: {UserId}",
            conversationId, userId);

        var conversation = await _chatRepository.GetByIdAsync(conversationId);

        if (conversation == null)
        {
            return null;
        }

        // Verify ownership
        if (conversation.UserId != userId)
        {
            _logger.LogWarning("User attempted to update conversation belonging to another user. UserId: {UserId}, ConversationId: {ConversationId}",
                userId, conversationId);
            throw new UnauthorizedException("Access denied to this conversation");
        }

        // Update settings if provided
        if (ragEnabled.HasValue)
        {
            conversation.RagEnabled = ragEnabled.Value;
        }

        if (vectorStoreProvider != null)
        {
            conversation.VectorStoreProvider = vectorStoreProvider;
        }

        if (agentEnabled.HasValue)
        {
            conversation.AgentEnabled = agentEnabled.Value;
        }

        if (agentRagEnabled.HasValue)
        {
            conversation.AgentRagEnabled = agentRagEnabled.Value;
        }

        if (agentCapabilities != null)
        {
            conversation.AgentCapabilities = agentCapabilities;
        }

        conversation.UpdatedAt = DateTime.UtcNow;

        var updated = await _chatRepository.UpdateAsync(conversationId, conversation);
        _logger.LogInformation("Conversation settings updated. ConversationId: {ConversationId}", conversationId);

        return updated;
    }

    public async Task<bool> DeleteConversationAsync(string conversationId, string userId, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Deleting conversation. ConversationId: {ConversationId}, UserId: {UserId}",
            conversationId, userId);

        var conversation = await _chatRepository.GetByIdAsync(conversationId);

        if (conversation == null)
        {
            return false;
        }

        // Verify ownership
        if (conversation.UserId != userId)
        {
            _logger.LogWarning("User attempted to delete conversation belonging to another user. UserId: {UserId}, ConversationId: {ConversationId}",
                userId, conversationId);
            throw new UnauthorizedException("Access denied to this conversation");
        }

        var deleted = await _chatRepository.DeleteAsync(conversationId);

        if (deleted)
        {
            _logger.LogInformation("Conversation deleted successfully. ConversationId: {ConversationId}", conversationId);
        }

        return deleted;
    }

    public async Task<int> BulkDeleteConversationsAsync(IEnumerable<string> conversationIds, string userId, CancellationToken cancellationToken = default)
    {
        var idList = conversationIds.ToList();
        _logger.LogDebug("Bulk deleting conversations. Count: {Count}, UserId: {UserId}", idList.Count, userId);

        if (idList.Count == 0)
        {
            return 0;
        }

        // The repository handles ownership verification by filtering on userId
        var deletedCount = await _chatRepository.DeleteManyAsync(idList, userId);

        _logger.LogInformation("Bulk deleted {DeletedCount} conversations for user {UserId}", deletedCount, userId);

        return deletedCount;
    }

    public async Task<ChatConversation?> AddMessageToConversationAsync(
        string conversationId,
        string userId,
        ChatMessage message,
        CancellationToken cancellationToken = default)
    {
        var conversation = await _chatRepository.GetByIdAsync(conversationId);

        if (conversation == null)
        {
            return null;
        }

        // Verify ownership
        if (conversation.UserId != userId)
        {
            throw new UnauthorizedException("Access denied to this conversation");
        }

        conversation.Messages.Add(message);
        conversation.UpdatedAt = DateTime.UtcNow;

        return await _chatRepository.UpdateAsync(conversationId, conversation);
    }

    public async Task<bool> IsConversationOwnedByUserAsync(string conversationId, string userId, CancellationToken cancellationToken = default)
    {
        var conversation = await _chatRepository.GetByIdAsync(conversationId);
        return conversation != null && conversation.UserId == userId;
    }

    /// <summary>
    /// Sorts tool calls within each message by their ExecutedAt timestamp.
    /// This ensures tool calls are displayed in the order they were executed,
    /// regardless of database retrieval order.
    /// </summary>
    private static void SortToolCallsByExecutedAt(ChatConversation conversation)
    {
        foreach (var message in conversation.Messages)
        {
            if (message.ToolCalls?.Count > 1)
            {
                message.ToolCalls = message.ToolCalls
                    .OrderBy(tc => tc.ExecutedAt)
                    .ToList();
            }
        }
    }
}

