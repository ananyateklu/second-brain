using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Infrastructure.Repositories;

public class SqlChatRepository : IChatRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlChatRepository> _logger;

    public SqlChatRepository(ApplicationDbContext context, ILogger<SqlChatRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<ChatConversation>> GetAllAsync(string userId)
    {
        try
        {
            _logger.LogDebug("Retrieving all conversations for user. UserId: {UserId}", userId);
            var conversations = await _context.ChatConversations
                .Include(c => c.Messages)
                    .ThenInclude(m => m.RetrievedNotes)
                .Include(c => c.Messages)
                    .ThenInclude(m => m.ToolCalls)
                .AsNoTracking()
                .Where(c => c.UserId == userId)
                .OrderByDescending(c => c.UpdatedAt)
                .ToListAsync();

            _logger.LogDebug("Retrieved conversations for user. UserId: {UserId}, Count: {Count}", userId, conversations.Count);
            return conversations;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving conversations for user. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve conversations", ex);
        }
    }

    public async Task<ChatConversation?> GetByIdAsync(string id)
    {
        try
        {
            _logger.LogDebug("Retrieving conversation by ID. ConversationId: {ConversationId}", id);
            var conversation = await _context.ChatConversations
                .Include(c => c.Messages.OrderBy(m => m.Timestamp))
                    .ThenInclude(m => m.RetrievedNotes)
                .Include(c => c.Messages)
                    .ThenInclude(m => m.ToolCalls)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id);

            if (conversation == null)
            {
                _logger.LogDebug("Conversation not found. ConversationId: {ConversationId}", id);
                return null;
            }

            _logger.LogDebug("Conversation retrieved successfully. ConversationId: {ConversationId}", id);
            return conversation;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving conversation by ID. ConversationId: {ConversationId}", id);
            throw new RepositoryException($"Failed to retrieve conversation with ID '{id}'", ex);
        }
    }

    public async Task<ChatConversation> CreateAsync(ChatConversation conversation)
    {
        try
        {
            _logger.LogDebug("Creating new conversation. Title: {Title}, UserId: {UserId}, Provider: {Provider}", conversation.Title, conversation.UserId, conversation.Provider);

            if (string.IsNullOrEmpty(conversation.Id))
            {
                conversation.Id = Guid.NewGuid().ToString();
            }

            conversation.CreatedAt = DateTime.UtcNow;
            conversation.UpdatedAt = DateTime.UtcNow;

            // Set IDs for messages and nested entities
            foreach (var message in conversation.Messages)
            {
                if (string.IsNullOrEmpty(message.Id))
                {
                    message.Id = Guid.NewGuid().ToString();
                }
                message.ConversationId = conversation.Id;

                foreach (var toolCall in message.ToolCalls)
                {
                    if (string.IsNullOrEmpty(toolCall.Id))
                    {
                        toolCall.Id = Guid.NewGuid().ToString();
                    }
                    toolCall.MessageId = message.Id;
                }

                foreach (var retrievedNote in message.RetrievedNotes)
                {
                    if (string.IsNullOrEmpty(retrievedNote.Id))
                    {
                        retrievedNote.Id = Guid.NewGuid().ToString();
                    }
                    retrievedNote.MessageId = message.Id;
                }
            }

            _context.ChatConversations.Add(conversation);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Conversation created successfully. ConversationId: {ConversationId}, UserId: {UserId}", conversation.Id, conversation.UserId);
            return conversation;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating conversation. Title: {Title}", conversation.Title);
            throw new RepositoryException("Failed to create conversation", ex);
        }
    }

    public async Task<ChatConversation?> UpdateAsync(string id, ChatConversation conversation)
    {
        try
        {
            _logger.LogDebug("Updating conversation. ConversationId: {ConversationId}", id);
            var existingConversation = await _context.ChatConversations
                .Include(c => c.Messages)
                    .ThenInclude(m => m.RetrievedNotes)
                .Include(c => c.Messages)
                    .ThenInclude(m => m.ToolCalls)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (existingConversation == null)
            {
                _logger.LogDebug("Conversation not found for update. ConversationId: {ConversationId}", id);
                return null;
            }

            // Update basic properties
            existingConversation.Title = conversation.Title;
            existingConversation.Provider = conversation.Provider;
            existingConversation.Model = conversation.Model;
            existingConversation.RagEnabled = conversation.RagEnabled;
            existingConversation.AgentEnabled = conversation.AgentEnabled;
            existingConversation.AgentCapabilities = conversation.AgentCapabilities;
            existingConversation.VectorStoreProvider = conversation.VectorStoreProvider;
            existingConversation.UpdatedAt = DateTime.UtcNow;

            // Clear and re-add messages (simpler than diffing)
            _context.ChatMessages.RemoveRange(existingConversation.Messages);

            foreach (var message in conversation.Messages)
            {
                if (string.IsNullOrEmpty(message.Id))
                {
                    message.Id = Guid.NewGuid().ToString();
                }
                message.ConversationId = id;

                foreach (var toolCall in message.ToolCalls)
                {
                    if (string.IsNullOrEmpty(toolCall.Id))
                    {
                        toolCall.Id = Guid.NewGuid().ToString();
                    }
                    toolCall.MessageId = message.Id;
                }

                foreach (var retrievedNote in message.RetrievedNotes)
                {
                    if (string.IsNullOrEmpty(retrievedNote.Id))
                    {
                        retrievedNote.Id = Guid.NewGuid().ToString();
                    }
                    retrievedNote.MessageId = message.Id;
                }

                existingConversation.Messages.Add(message);
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Conversation updated successfully. ConversationId: {ConversationId}", id);
            return existingConversation;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating conversation. ConversationId: {ConversationId}", id);
            throw new RepositoryException($"Failed to update conversation with ID '{id}'", ex);
        }
    }

    public async Task<bool> DeleteAsync(string id)
    {
        try
        {
            _logger.LogDebug("Deleting conversation. ConversationId: {ConversationId}", id);
            var conversation = await _context.ChatConversations
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (conversation == null)
            {
                _logger.LogDebug("Conversation not found for deletion. ConversationId: {ConversationId}", id);
                return false;
            }

            _context.ChatConversations.Remove(conversation);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Conversation deleted successfully. ConversationId: {ConversationId}", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting conversation. ConversationId: {ConversationId}", id);
            throw new RepositoryException($"Failed to delete conversation with ID '{id}'", ex);
        }
    }

    public async Task<ChatConversation?> AddMessageAsync(string id, ChatMessage message)
    {
        try
        {
            _logger.LogDebug("Adding message to conversation. ConversationId: {ConversationId}, Role: {Role}", id, message.Role);
            var conversation = await _context.ChatConversations
                .Include(c => c.Messages)
                    .ThenInclude(m => m.RetrievedNotes)
                .Include(c => c.Messages)
                    .ThenInclude(m => m.ToolCalls)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (conversation == null)
            {
                _logger.LogDebug("Conversation not found for adding message. ConversationId: {ConversationId}", id);
                return null;
            }

            if (string.IsNullOrEmpty(message.Id))
            {
                message.Id = Guid.NewGuid().ToString();
            }
            message.ConversationId = id;
            message.Timestamp = DateTime.UtcNow;

            foreach (var toolCall in message.ToolCalls)
            {
                if (string.IsNullOrEmpty(toolCall.Id))
                {
                    toolCall.Id = Guid.NewGuid().ToString();
                }
                toolCall.MessageId = message.Id;
            }

            foreach (var retrievedNote in message.RetrievedNotes)
            {
                if (string.IsNullOrEmpty(retrievedNote.Id))
                {
                    retrievedNote.Id = Guid.NewGuid().ToString();
                }
                retrievedNote.MessageId = message.Id;
            }

            conversation.Messages.Add(message);
            conversation.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Message added to conversation successfully. ConversationId: {ConversationId}, MessageCount: {MessageCount}", id, conversation.Messages.Count);
            return conversation;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding message to conversation. ConversationId: {ConversationId}", id);
            throw new RepositoryException($"Failed to add message to conversation with ID '{id}'", ex);
        }
    }
}

