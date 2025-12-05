using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Common;
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
                .Include(c => c.Messages)
                    .ThenInclude(m => m.Images)
                .Include(c => c.Messages)
                    .ThenInclude(m => m.GeneratedImages)
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
                .Include(c => c.Messages)
                    .ThenInclude(m => m.Images)
                .Include(c => c.Messages)
                    .ThenInclude(m => m.GeneratedImages)
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
                conversation.Id = UuidV7.NewId();
            }

            conversation.CreatedAt = DateTime.UtcNow;
            conversation.UpdatedAt = DateTime.UtcNow;

            // Set IDs for messages and nested entities
            foreach (var message in conversation.Messages)
            {
                if (string.IsNullOrEmpty(message.Id))
                {
                    message.Id = UuidV7.NewId();
                }
                message.ConversationId = conversation.Id;

                foreach (var toolCall in message.ToolCalls)
                {
                    if (string.IsNullOrEmpty(toolCall.Id))
                    {
                        toolCall.Id = UuidV7.NewId();
                    }
                    toolCall.MessageId = message.Id;
                }

                foreach (var toolCall in message.ToolCalls)
                {
                    if (string.IsNullOrEmpty(toolCall.Id))
                    {
                        toolCall.Id = UuidV7.NewId();
                    }
                    toolCall.MessageId = message.Id;
                }

                foreach (var retrievedNote in message.RetrievedNotes)
                {
                    if (string.IsNullOrEmpty(retrievedNote.Id))
                    {
                        retrievedNote.Id = UuidV7.NewId();
                    }
                    retrievedNote.MessageId = message.Id;
                }

                foreach (var image in message.Images)
                {
                    if (string.IsNullOrEmpty(image.Id))
                    {
                        image.Id = UuidV7.NewId();
                    }
                    image.MessageId = message.Id;
                }

                foreach (var generatedImage in message.GeneratedImages)
                {
                    if (string.IsNullOrEmpty(generatedImage.Id))
                    {
                        generatedImage.Id = UuidV7.NewId();
                    }
                    generatedImage.MessageId = message.Id;
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
                .Include(c => c.Messages)
                    .ThenInclude(m => m.Images)
                .Include(c => c.Messages)
                    .ThenInclude(m => m.GeneratedImages)
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
            existingConversation.AgentRagEnabled = conversation.AgentRagEnabled;
            existingConversation.AgentCapabilities = conversation.AgentCapabilities;
            existingConversation.VectorStoreProvider = conversation.VectorStoreProvider;
            existingConversation.UpdatedAt = DateTime.UtcNow;

            // Clear and re-add messages (simpler than diffing)
            _context.ChatMessages.RemoveRange(existingConversation.Messages);

            foreach (var message in conversation.Messages)
            {
                if (string.IsNullOrEmpty(message.Id))
                {
                    message.Id = UuidV7.NewId();
                }
                message.ConversationId = id;

                foreach (var toolCall in message.ToolCalls)
                {
                    if (string.IsNullOrEmpty(toolCall.Id))
                    {
                        toolCall.Id = UuidV7.NewId();
                    }
                    toolCall.MessageId = message.Id;
                }

                foreach (var toolCall in message.ToolCalls)
                {
                    if (string.IsNullOrEmpty(toolCall.Id))
                    {
                        toolCall.Id = UuidV7.NewId();
                    }
                    toolCall.MessageId = message.Id;
                }

                foreach (var retrievedNote in message.RetrievedNotes)
                {
                    if (string.IsNullOrEmpty(retrievedNote.Id))
                    {
                        retrievedNote.Id = UuidV7.NewId();
                    }
                    retrievedNote.MessageId = message.Id;
                }

                foreach (var image in message.Images)
                {
                    if (string.IsNullOrEmpty(image.Id))
                    {
                        image.Id = UuidV7.NewId();
                    }
                    image.MessageId = message.Id;
                }

                foreach (var generatedImage in message.GeneratedImages)
                {
                    if (string.IsNullOrEmpty(generatedImage.Id))
                    {
                        generatedImage.Id = UuidV7.NewId();
                    }
                    generatedImage.MessageId = message.Id;
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

    public async Task<int> DeleteManyAsync(IEnumerable<string> ids, string userId)
    {
        try
        {
            var idList = ids.ToList();
            _logger.LogDebug("Deleting multiple conversations. Count: {Count}, UserId: {UserId}", idList.Count, userId);

            // Get all conversations that match the IDs and belong to the user
            var conversations = await _context.ChatConversations
                .Include(c => c.Messages)
                .Where(c => idList.Contains(c.Id) && c.UserId == userId)
                .ToListAsync();

            if (conversations.Count == 0)
            {
                _logger.LogDebug("No conversations found for bulk deletion. UserId: {UserId}", userId);
                return 0;
            }

            _context.ChatConversations.RemoveRange(conversations);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Bulk deleted conversations successfully. Count: {Count}, UserId: {UserId}", conversations.Count, userId);
            return conversations.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk deleting conversations. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to bulk delete conversations for user '{userId}'", ex);
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
                .Include(c => c.Messages)
                    .ThenInclude(m => m.Images)
                .Include(c => c.Messages)
                    .ThenInclude(m => m.GeneratedImages)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (conversation == null)
            {
                _logger.LogDebug("Conversation not found for adding message. ConversationId: {ConversationId}", id);
                return null;
            }

            if (string.IsNullOrEmpty(message.Id))
            {
                message.Id = UuidV7.NewId();
            }
            message.ConversationId = id;
            message.Timestamp = DateTime.UtcNow;

            foreach (var toolCall in message.ToolCalls)
            {
                if (string.IsNullOrEmpty(toolCall.Id))
                {
                    toolCall.Id = UuidV7.NewId();
                }
                toolCall.MessageId = message.Id;
            }

            foreach (var toolCall in message.ToolCalls)
            {
                if (string.IsNullOrEmpty(toolCall.Id))
                {
                    toolCall.Id = UuidV7.NewId();
                }
                toolCall.MessageId = message.Id;
            }

            foreach (var retrievedNote in message.RetrievedNotes)
            {
                if (string.IsNullOrEmpty(retrievedNote.Id))
                {
                    retrievedNote.Id = UuidV7.NewId();
                }
                retrievedNote.MessageId = message.Id;
            }

            foreach (var image in message.Images)
            {
                if (string.IsNullOrEmpty(image.Id))
                {
                    image.Id = UuidV7.NewId();
                }
                image.MessageId = message.Id;
            }

            foreach (var generatedImage in message.GeneratedImages)
            {
                if (string.IsNullOrEmpty(generatedImage.Id))
                {
                    generatedImage.Id = UuidV7.NewId();
                }
                generatedImage.MessageId = message.Id;
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

    // ============================================
    // Soft Delete Operations
    // ============================================

    public async Task<bool> SoftDeleteAsync(string id, string deletedBy)
    {
        try
        {
            _logger.LogDebug("Soft deleting conversation. ConversationId: {ConversationId}, DeletedBy: {DeletedBy}", id, deletedBy);
            var conversation = await _context.ChatConversations.FirstOrDefaultAsync(c => c.Id == id);

            if (conversation == null)
            {
                _logger.LogDebug("Conversation not found for soft deletion. ConversationId: {ConversationId}", id);
                return false;
            }

            conversation.IsDeleted = true;
            conversation.DeletedAt = DateTime.UtcNow;
            conversation.DeletedBy = deletedBy;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Conversation soft deleted successfully. ConversationId: {ConversationId}, DeletedBy: {DeletedBy}", id, deletedBy);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error soft deleting conversation. ConversationId: {ConversationId}", id);
            throw new RepositoryException($"Failed to soft delete conversation with ID '{id}'", ex);
        }
    }

    public async Task<int> SoftDeleteManyAsync(IEnumerable<string> ids, string userId)
    {
        try
        {
            var idList = ids.ToList();
            _logger.LogDebug("Soft deleting multiple conversations. Count: {Count}, UserId: {UserId}", idList.Count, userId);

            var conversations = await _context.ChatConversations
                .Where(c => idList.Contains(c.Id) && c.UserId == userId)
                .ToListAsync();

            if (conversations.Count == 0)
            {
                _logger.LogDebug("No conversations found for bulk soft deletion. UserId: {UserId}", userId);
                return 0;
            }

            var now = DateTime.UtcNow;
            foreach (var conversation in conversations)
            {
                conversation.IsDeleted = true;
                conversation.DeletedAt = now;
                conversation.DeletedBy = userId;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Bulk soft deleted conversations successfully. Count: {Count}, UserId: {UserId}", conversations.Count, userId);
            return conversations.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk soft deleting conversations. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to bulk soft delete conversations for user '{userId}'", ex);
        }
    }

    public async Task<bool> RestoreAsync(string id)
    {
        try
        {
            _logger.LogDebug("Restoring soft-deleted conversation. ConversationId: {ConversationId}", id);

            var conversation = await _context.ChatConversations
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == id && c.IsDeleted);

            if (conversation == null)
            {
                _logger.LogDebug("Soft-deleted conversation not found for restoration. ConversationId: {ConversationId}", id);
                return false;
            }

            conversation.IsDeleted = false;
            conversation.DeletedAt = null;
            conversation.DeletedBy = null;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Conversation restored successfully. ConversationId: {ConversationId}", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restoring conversation. ConversationId: {ConversationId}", id);
            throw new RepositoryException($"Failed to restore conversation with ID '{id}'", ex);
        }
    }

    public async Task<bool> HardDeleteAsync(string id)
    {
        try
        {
            _logger.LogDebug("Hard deleting conversation. ConversationId: {ConversationId}", id);

            var conversation = await _context.ChatConversations
                .IgnoreQueryFilters()
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (conversation == null)
            {
                _logger.LogDebug("Conversation not found for hard deletion. ConversationId: {ConversationId}", id);
                return false;
            }

            _context.ChatConversations.Remove(conversation);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Conversation hard deleted successfully. ConversationId: {ConversationId}", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error hard deleting conversation. ConversationId: {ConversationId}", id);
            throw new RepositoryException($"Failed to hard delete conversation with ID '{id}'", ex);
        }
    }

    public async Task<IEnumerable<ChatConversation>> GetDeletedByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogDebug("Retrieving soft-deleted conversations by userId. UserId: {UserId}", userId);

            var conversations = await _context.ChatConversations
                .IgnoreQueryFilters()
                .Include(c => c.Messages)
                .AsNoTracking()
                .Where(c => c.UserId == userId && c.IsDeleted)
                .OrderByDescending(c => c.DeletedAt)
                .ToListAsync();

            _logger.LogDebug("Retrieved soft-deleted conversations for user. UserId: {UserId}, Count: {Count}", userId, conversations.Count);
            return conversations;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving soft-deleted conversations by userId. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to retrieve soft-deleted conversations for user '{userId}'", ex);
        }
    }
}

