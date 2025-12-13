using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Tests.Unit.Infrastructure.Repositories;

/// <summary>
/// Extended test DbContext that includes chat-related entities for testing SqlChatRepository behavior
/// </summary>
public class ChatTestDbContext : DbContext
{
    public ChatTestDbContext(DbContextOptions<ChatTestDbContext> options)
        : base(options)
    {
    }

    public DbSet<ChatConversation> ChatConversations { get; set; } = null!;
    public DbSet<ChatMessage> ChatMessages { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ChatConversation>()
            .HasMany(c => c.Messages)
            .WithOne()
            .HasForeignKey(m => m.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ChatMessage>()
            .HasMany(m => m.RetrievedNotes)
            .WithOne()
            .HasForeignKey(r => r.MessageId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ChatMessage>()
            .HasMany(m => m.ToolCalls)
            .WithOne()
            .HasForeignKey(t => t.MessageId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ChatMessage>()
            .HasMany(m => m.Images)
            .WithOne()
            .HasForeignKey(i => i.MessageId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ChatMessage>()
            .HasMany(m => m.GeneratedImages)
            .WithOne()
            .HasForeignKey(g => g.MessageId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

/// <summary>
/// Test-specific implementation of IChatRepository using InMemory database
/// Mirrors SqlChatRepository but without PostgreSQL dependencies
/// </summary>
public class TestChatRepository : IChatRepository
{
    private readonly ChatTestDbContext _context;
    private readonly ILogger<TestChatRepository> _logger;

    public TestChatRepository(ChatTestDbContext context, ILogger<TestChatRepository> logger)
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
            if (string.IsNullOrEmpty(conversation.Id))
            {
                conversation.Id = Guid.NewGuid().ToString();
            }

            conversation.CreatedAt = DateTime.UtcNow;
            conversation.UpdatedAt = DateTime.UtcNow;

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

                foreach (var image in message.Images)
                {
                    if (string.IsNullOrEmpty(image.Id))
                    {
                        image.Id = Guid.NewGuid().ToString();
                    }
                    image.MessageId = message.Id;
                }

                foreach (var generatedImage in message.GeneratedImages)
                {
                    if (string.IsNullOrEmpty(generatedImage.Id))
                    {
                        generatedImage.Id = Guid.NewGuid().ToString();
                    }
                    generatedImage.MessageId = message.Id;
                }
            }

            _context.ChatConversations.Add(conversation);
            await _context.SaveChangesAsync();

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
                return null;
            }

            existingConversation.Title = conversation.Title;
            existingConversation.Provider = conversation.Provider;
            existingConversation.Model = conversation.Model;
            existingConversation.RagEnabled = conversation.RagEnabled;
            existingConversation.AgentEnabled = conversation.AgentEnabled;
            existingConversation.AgentCapabilities = conversation.AgentCapabilities;
            existingConversation.VectorStoreProvider = conversation.VectorStoreProvider;
            existingConversation.UpdatedAt = DateTime.UtcNow;

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

                foreach (var image in message.Images)
                {
                    if (string.IsNullOrEmpty(image.Id))
                    {
                        image.Id = Guid.NewGuid().ToString();
                    }
                    image.MessageId = message.Id;
                }

                foreach (var generatedImage in message.GeneratedImages)
                {
                    if (string.IsNullOrEmpty(generatedImage.Id))
                    {
                        generatedImage.Id = Guid.NewGuid().ToString();
                    }
                    generatedImage.MessageId = message.Id;
                }

                existingConversation.Messages.Add(message);
            }

            await _context.SaveChangesAsync();
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
            var conversation = await _context.ChatConversations
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (conversation == null)
            {
                return false;
            }

            _context.ChatConversations.Remove(conversation);
            await _context.SaveChangesAsync();
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

            var conversations = await _context.ChatConversations
                .Include(c => c.Messages)
                .Where(c => idList.Contains(c.Id) && c.UserId == userId)
                .ToListAsync();

            if (conversations.Count == 0)
            {
                return 0;
            }

            _context.ChatConversations.RemoveRange(conversations);
            await _context.SaveChangesAsync();

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

            foreach (var image in message.Images)
            {
                if (string.IsNullOrEmpty(image.Id))
                {
                    image.Id = Guid.NewGuid().ToString();
                }
                image.MessageId = message.Id;
            }

            foreach (var generatedImage in message.GeneratedImages)
            {
                if (string.IsNullOrEmpty(generatedImage.Id))
                {
                    generatedImage.Id = Guid.NewGuid().ToString();
                }
                generatedImage.MessageId = message.Id;
            }

            conversation.Messages.Add(message);
            conversation.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return conversation;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding message to conversation. ConversationId: {ConversationId}", id);
            throw new RepositoryException($"Failed to add message to conversation with ID '{id}'", ex);
        }
    }

    // Optimized query methods (new interface additions)
    public async Task<IEnumerable<ChatConversation>> GetConversationHeadersAsync(string userId)
    {
        return await _context.ChatConversations
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync();
    }

    public async Task<(IEnumerable<ChatConversation> Items, int TotalCount)> GetConversationHeadersPagedAsync(
        string userId, int page, int pageSize, string? sortBy = null, bool sortDescending = true)
    {
        var query = _context.ChatConversations
            .AsNoTracking()
            .Where(c => c.UserId == userId);

        var totalCount = await query.CountAsync();

        // Apply sorting
        var normalizedSortBy = string.IsNullOrWhiteSpace(sortBy) ? "updatedat" : sortBy.ToLowerInvariant();
        query = (normalizedSortBy, sortDescending) switch
        {
            ("createdat", true) => query.OrderByDescending(c => c.CreatedAt),
            ("createdat", false) => query.OrderBy(c => c.CreatedAt),
            ("title", true) => query.OrderByDescending(c => c.Title),
            ("title", false) => query.OrderBy(c => c.Title),
            (_, true) => query.OrderByDescending(c => c.UpdatedAt),
            (_, false) => query.OrderBy(c => c.UpdatedAt)
        };

        var conversations = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (conversations, totalCount);
    }

    public async Task<bool> ExistsForUserAsync(string conversationId, string userId)
    {
        return await _context.ChatConversations
            .AnyAsync(c => c.Id == conversationId && c.UserId == userId);
    }

    // Soft delete methods (simplified implementations for testing)
    public async Task<bool> SoftDeleteAsync(string id, string deletedBy)
    {
        var conversation = await _context.ChatConversations.FirstOrDefaultAsync(c => c.Id == id);
        if (conversation == null) return false;
        conversation.IsDeleted = true;
        conversation.DeletedAt = DateTime.UtcNow;
        conversation.DeletedBy = deletedBy;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> SoftDeleteManyAsync(IEnumerable<string> ids, string userId)
    {
        var idList = ids.ToList();
        var conversations = await _context.ChatConversations
            .Where(c => idList.Contains(c.Id) && c.UserId == userId)
            .ToListAsync();
        if (conversations.Count == 0) return 0;
        var now = DateTime.UtcNow;
        foreach (var conversation in conversations)
        {
            conversation.IsDeleted = true;
            conversation.DeletedAt = now;
            conversation.DeletedBy = userId;
        }
        await _context.SaveChangesAsync();
        return conversations.Count;
    }

    public async Task<bool> RestoreAsync(string id)
    {
        var conversation = await _context.ChatConversations.FirstOrDefaultAsync(c => c.Id == id && c.IsDeleted);
        if (conversation == null) return false;
        conversation.IsDeleted = false;
        conversation.DeletedAt = null;
        conversation.DeletedBy = null;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> HardDeleteAsync(string id)
    {
        var conversation = await _context.ChatConversations.Include(c => c.Messages).FirstOrDefaultAsync(c => c.Id == id);
        if (conversation == null) return false;
        _context.ChatConversations.Remove(conversation);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<ChatConversation>> GetDeletedByUserIdAsync(string userId)
    {
        return await _context.ChatConversations
            .Include(c => c.Messages)
            .AsNoTracking()
            .Where(c => c.UserId == userId && c.IsDeleted)
            .OrderByDescending(c => c.DeletedAt)
            .ToListAsync();
    }
}

public class SqlChatRepositoryInMemoryTests : IDisposable
{
    private readonly ChatTestDbContext _context;
    private readonly IChatRepository _sut;
    private readonly Mock<ILogger<TestChatRepository>> _mockLogger;

    public SqlChatRepositoryInMemoryTests()
    {
        var options = new DbContextOptionsBuilder<ChatTestDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .EnableSensitiveDataLogging()
            .Options;

        _context = new ChatTestDbContext(options);
        _context.Database.EnsureCreated();

        _mockLogger = new Mock<ILogger<TestChatRepository>>();
        _sut = new TestChatRepository(_context, _mockLogger.Object);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    #region GetAllAsync Tests

    [Fact]
    public async Task GetAllAsync_WhenNoConversations_ReturnsEmptyList()
    {
        // Act
        var result = await _sut.GetAllAsync("user-1");

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAllAsync_WithConversations_ReturnsUserConversations()
    {
        // Arrange
        var conversations = new List<ChatConversation>
        {
            CreateTestConversation("conv-1", "user-1", "Chat 1"),
            CreateTestConversation("conv-2", "user-1", "Chat 2"),
            CreateTestConversation("conv-3", "user-2", "Other User Chat")
        };
        await _context.ChatConversations.AddRangeAsync(conversations);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetAllAsync("user-1");

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(c => c.UserId == "user-1");
    }

    [Fact]
    public async Task GetAllAsync_ReturnsOrderedByUpdatedAtDescending()
    {
        // Arrange
        var oldConversation = CreateTestConversation("conv-1", "user-1", "Old Chat");
        oldConversation.UpdatedAt = DateTime.UtcNow.AddDays(-10);

        var newConversation = CreateTestConversation("conv-2", "user-1", "New Chat");
        newConversation.UpdatedAt = DateTime.UtcNow;

        await _context.ChatConversations.AddAsync(oldConversation);
        await _context.ChatConversations.AddAsync(newConversation);
        await _context.SaveChangesAsync();

        // Act
        var result = (await _sut.GetAllAsync("user-1")).ToList();

        // Assert
        result.Should().HaveCount(2);
        result[0].Title.Should().Be("New Chat");
        result[1].Title.Should().Be("Old Chat");
    }

    [Fact]
    public async Task GetAllAsync_IncludesMessages()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-1", "Chat with Messages");
        conversation.Messages.Add(CreateTestMessage("Hello"));
        conversation.Messages.Add(CreateTestMessage("World"));
        await _context.ChatConversations.AddAsync(conversation);
        await _context.SaveChangesAsync();

        // Act
        var result = (await _sut.GetAllAsync("user-1")).ToList();

        // Assert
        result.Should().HaveCount(1);
        result[0].Messages.Should().HaveCount(2);
    }

    #endregion

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_WhenConversationExists_ReturnsConversation()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-1", "Test Chat");
        await _context.ChatConversations.AddAsync(conversation);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByIdAsync("conv-1");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be("conv-1");
        result.Title.Should().Be("Test Chat");
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
        var conversation = CreateTestConversation("conv-1", "user-1", "Test Chat");
        var oldMessage = CreateTestMessage("First");
        oldMessage.Timestamp = DateTime.UtcNow.AddMinutes(-10);
        var newMessage = CreateTestMessage("Second");
        newMessage.Timestamp = DateTime.UtcNow;

        conversation.Messages.Add(newMessage);
        conversation.Messages.Add(oldMessage);
        await _context.ChatConversations.AddAsync(conversation);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByIdAsync("conv-1");

        // Assert
        result.Should().NotBeNull();
        result!.Messages.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetByIdAsync_IncludesToolCalls()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-1", "Test Chat");
        var message = CreateTestMessage("Message with tool call");
        message.ToolCalls.Add(new ToolCall
        {
            Id = "tool-1",
            ToolName = "search_notes",
            Arguments = "{}",
            Result = "Found 3 notes"
        });
        conversation.Messages.Add(message);
        await _context.ChatConversations.AddAsync(conversation);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByIdAsync("conv-1");

        // Assert
        result.Should().NotBeNull();
        result!.Messages.First().ToolCalls.Should().HaveCount(1);
        result.Messages.First().ToolCalls.First().ToolName.Should().Be("search_notes");
    }

    [Fact]
    public async Task GetByIdAsync_IncludesRetrievedNotes()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-1", "Test Chat");
        var message = CreateTestMessage("Message with RAG");
        message.RetrievedNotes.Add(new RetrievedNote
        {
            Id = "retrieved-1",
            NoteId = "note-1",
            Title = "Related Note",
            ChunkContent = "Note content",
            RelevanceScore = 0.95f
        });
        conversation.Messages.Add(message);
        await _context.ChatConversations.AddAsync(conversation);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByIdAsync("conv-1");

        // Assert
        result.Should().NotBeNull();
        result!.Messages.First().RetrievedNotes.Should().HaveCount(1);
        result.Messages.First().RetrievedNotes.First().Title.Should().Be("Related Note");
    }

    #endregion

    #region CreateAsync Tests

    [Fact]
    public async Task CreateAsync_WithValidConversation_CreatesAndReturns()
    {
        // Arrange
        var conversation = new ChatConversation
        {
            Title = "New Chat",
            UserId = "user-1",
            Provider = "openai",
            Model = "gpt-4"
        };

        // Act
        var result = await _sut.CreateAsync(conversation);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().NotBeNullOrEmpty();
        result.Title.Should().Be("New Chat");
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        result.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

        // Verify persisted
        var persisted = await _context.ChatConversations.FindAsync(result.Id);
        persisted.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateAsync_WithExistingId_UsesProvidedId()
    {
        // Arrange
        var conversation = new ChatConversation
        {
            Id = "custom-id",
            Title = "Chat with Custom ID",
            UserId = "user-1",
            Provider = "openai",
            Model = "gpt-4"
        };

        // Act
        var result = await _sut.CreateAsync(conversation);

        // Assert
        result.Id.Should().Be("custom-id");
    }

    [Fact]
    public async Task CreateAsync_WithMessages_SetsMessageIds()
    {
        // Arrange
        var conversation = new ChatConversation
        {
            Title = "Chat with Messages",
            UserId = "user-1",
            Provider = "openai",
            Model = "gpt-4",
            Messages = new List<ChatMessage>
            {
                new ChatMessage { Role = "user", Content = "Hello" },
                new ChatMessage { Role = "assistant", Content = "Hi there!" }
            }
        };

        // Act
        var result = await _sut.CreateAsync(conversation);

        // Assert
        result.Messages.Should().HaveCount(2);
        result.Messages.Should().OnlyContain(m => !string.IsNullOrEmpty(m.Id));
        result.Messages.Should().OnlyContain(m => m.ConversationId == result.Id);
    }

    [Fact]
    public async Task CreateAsync_WithToolCalls_SetsToolCallIds()
    {
        // Arrange
        var message = new ChatMessage
        {
            Role = "assistant",
            Content = "Let me search...",
            ToolCalls = new List<ToolCall>
            {
                new ToolCall { ToolName = "search_notes", Arguments = "{}" }
            }
        };
        var conversation = new ChatConversation
        {
            Title = "Chat with Tool Calls",
            UserId = "user-1",
            Provider = "openai",
            Model = "gpt-4",
            Messages = new List<ChatMessage> { message }
        };

        // Act
        var result = await _sut.CreateAsync(conversation);

        // Assert
        var toolCall = result.Messages.First().ToolCalls.First();
        toolCall.Id.Should().NotBeNullOrEmpty();
        toolCall.MessageId.Should().Be(result.Messages.First().Id);
    }

    #endregion

    #region UpdateAsync Tests

    [Fact]
    public async Task UpdateAsync_WhenConversationExists_UpdatesAndReturns()
    {
        // Arrange
        var existingConversation = CreateTestConversation("conv-1", "user-1", "Original Title");
        await _context.ChatConversations.AddAsync(existingConversation);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var updatedConversation = new ChatConversation
        {
            Title = "Updated Title",
            UserId = "user-1",
            Provider = "anthropic",
            Model = "claude-3",
            RagEnabled = true
        };

        // Act
        var result = await _sut.UpdateAsync("conv-1", updatedConversation);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be("Updated Title");
        result.Provider.Should().Be("anthropic");
        result.Model.Should().Be("claude-3");
        result.RagEnabled.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateAsync_WhenConversationDoesNotExist_ReturnsNull()
    {
        // Arrange
        var updatedConversation = new ChatConversation
        {
            Title = "Updated Title",
            UserId = "user-1"
        };

        // Act
        var result = await _sut.UpdateAsync("non-existent", updatedConversation);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_UpdatesTimestamp()
    {
        // Arrange
        var existingConversation = CreateTestConversation("conv-1", "user-1", "Title");
        existingConversation.UpdatedAt = DateTime.UtcNow.AddDays(-10);
        await _context.ChatConversations.AddAsync(existingConversation);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var beforeUpdate = DateTime.UtcNow;

        // Act
        var result = await _sut.UpdateAsync("conv-1", new ChatConversation
        {
            Title = "Updated Title"
        });

        // Assert
        result!.UpdatedAt.Should().BeOnOrAfter(beforeUpdate);
    }

    [Fact]
    public async Task UpdateAsync_ReplacesMessages()
    {
        // Arrange
        var existingConversation = CreateTestConversation("conv-1", "user-1", "Title");
        existingConversation.Messages.Add(CreateTestMessage("Original message"));
        await _context.ChatConversations.AddAsync(existingConversation);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var updatedConversation = new ChatConversation
        {
            Title = "Title",
            Messages = new List<ChatMessage>
            {
                new ChatMessage { Role = "user", Content = "New message 1" },
                new ChatMessage { Role = "assistant", Content = "New message 2" }
            }
        };

        // Act
        var result = await _sut.UpdateAsync("conv-1", updatedConversation);

        // Assert
        result.Should().NotBeNull();
        result!.Messages.Should().HaveCount(2);
        result.Messages.Should().Contain(m => m.Content == "New message 1");
        result.Messages.Should().Contain(m => m.Content == "New message 2");
    }

    #endregion

    #region DeleteAsync Tests

    [Fact]
    public async Task DeleteAsync_WhenConversationExists_DeletesAndReturnsTrue()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-1", "Test Chat");
        await _context.ChatConversations.AddAsync(conversation);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // Act
        var result = await _sut.DeleteAsync("conv-1");

        // Assert
        result.Should().BeTrue();
        var deleted = await _context.ChatConversations.FindAsync("conv-1");
        deleted.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_WhenConversationDoesNotExist_ReturnsFalse()
    {
        // Act
        var result = await _sut.DeleteAsync("non-existent");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_CascadesDeleteToMessages()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-1", "Test Chat");
        conversation.Messages.Add(CreateTestMessage("Message 1"));
        conversation.Messages.Add(CreateTestMessage("Message 2"));
        await _context.ChatConversations.AddAsync(conversation);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var initialMessageCount = await _context.ChatMessages.CountAsync();
        initialMessageCount.Should().Be(2);

        // Act
        await _sut.DeleteAsync("conv-1");

        // Assert
        var remainingMessages = await _context.ChatMessages.CountAsync();
        remainingMessages.Should().Be(0);
    }

    #endregion

    #region DeleteManyAsync Tests

    [Fact]
    public async Task DeleteManyAsync_WhenConversationsExist_DeletesAllAndReturnsCount()
    {
        // Arrange
        var conversations = new List<ChatConversation>
        {
            CreateTestConversation("conv-1", "user-1", "Chat 1"),
            CreateTestConversation("conv-2", "user-1", "Chat 2"),
            CreateTestConversation("conv-3", "user-1", "Chat 3")
        };
        await _context.ChatConversations.AddRangeAsync(conversations);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // Act
        var result = await _sut.DeleteManyAsync(new[] { "conv-1", "conv-2", "conv-3" }, "user-1");

        // Assert
        result.Should().Be(3);
        var remaining = await _context.ChatConversations.CountAsync();
        remaining.Should().Be(0);
    }

    [Fact]
    public async Task DeleteManyAsync_WhenNoConversationsMatch_ReturnsZero()
    {
        // Act
        var result = await _sut.DeleteManyAsync(new[] { "non-existent-1", "non-existent-2" }, "user-1");

        // Assert
        result.Should().Be(0);
    }

    [Fact]
    public async Task DeleteManyAsync_OnlyDeletesUserOwnedConversations()
    {
        // Arrange
        var conversations = new List<ChatConversation>
        {
            CreateTestConversation("conv-1", "user-1", "User 1 Chat"),
            CreateTestConversation("conv-2", "user-2", "User 2 Chat"),
            CreateTestConversation("conv-3", "user-1", "User 1 Chat 2")
        };
        await _context.ChatConversations.AddRangeAsync(conversations);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // Act - try to delete all three, but only user-1 owns two of them
        var result = await _sut.DeleteManyAsync(new[] { "conv-1", "conv-2", "conv-3" }, "user-1");

        // Assert
        result.Should().Be(2); // Only the two owned by user-1
        var remaining = await _context.ChatConversations.ToListAsync();
        remaining.Should().HaveCount(1);
        remaining[0].UserId.Should().Be("user-2");
    }

    [Fact]
    public async Task DeleteManyAsync_CascadesDeleteToMessages()
    {
        // Arrange
        var conv1 = CreateTestConversation("conv-1", "user-1", "Chat 1");
        conv1.Messages.Add(CreateTestMessage("Message 1"));
        conv1.Messages.Add(CreateTestMessage("Message 2"));

        var conv2 = CreateTestConversation("conv-2", "user-1", "Chat 2");
        conv2.Messages.Add(CreateTestMessage("Message 3"));

        await _context.ChatConversations.AddRangeAsync(conv1, conv2);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var initialMessageCount = await _context.ChatMessages.CountAsync();
        initialMessageCount.Should().Be(3);

        // Act
        await _sut.DeleteManyAsync(new[] { "conv-1", "conv-2" }, "user-1");

        // Assert
        var remainingMessages = await _context.ChatMessages.CountAsync();
        remainingMessages.Should().Be(0);
    }

    [Fact]
    public async Task DeleteManyAsync_WithEmptyIdList_ReturnsZero()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-1", "Test Chat");
        await _context.ChatConversations.AddAsync(conversation);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // Act
        var result = await _sut.DeleteManyAsync(Array.Empty<string>(), "user-1");

        // Assert
        result.Should().Be(0);
        var remaining = await _context.ChatConversations.CountAsync();
        remaining.Should().Be(1);
    }

    #endregion

    #region AddMessageAsync Tests

    [Fact]
    public async Task AddMessageAsync_WhenConversationExists_AddsMessage()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-1", "Test Chat");
        await _context.ChatConversations.AddAsync(conversation);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var newMessage = new ChatMessage
        {
            Role = "user",
            Content = "New message"
        };

        // Act
        var result = await _sut.AddMessageAsync("conv-1", newMessage);

        // Assert
        result.Should().NotBeNull();
        result!.Messages.Should().HaveCount(1);
        result.Messages.First().Content.Should().Be("New message");
    }

    [Fact]
    public async Task AddMessageAsync_WhenConversationDoesNotExist_ReturnsNull()
    {
        // Arrange
        var newMessage = new ChatMessage
        {
            Role = "user",
            Content = "New message"
        };

        // Act
        var result = await _sut.AddMessageAsync("non-existent", newMessage);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task AddMessageAsync_SetsMessageProperties()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-1", "Test Chat");
        await _context.ChatConversations.AddAsync(conversation);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var beforeAdd = DateTime.UtcNow;
        var newMessage = new ChatMessage
        {
            Role = "user",
            Content = "New message"
        };

        // Act
        var result = await _sut.AddMessageAsync("conv-1", newMessage);

        // Assert
        var addedMessage = result!.Messages.First();
        addedMessage.Id.Should().NotBeNullOrEmpty();
        addedMessage.ConversationId.Should().Be("conv-1");
        addedMessage.Timestamp.Should().BeOnOrAfter(beforeAdd);
    }

    [Fact]
    public async Task AddMessageAsync_UpdatesConversationTimestamp()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-1", "Test Chat");
        conversation.UpdatedAt = DateTime.UtcNow.AddDays(-10);
        await _context.ChatConversations.AddAsync(conversation);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var beforeAdd = DateTime.UtcNow;
        var newMessage = new ChatMessage { Role = "user", Content = "New" };

        // Act
        var result = await _sut.AddMessageAsync("conv-1", newMessage);

        // Assert
        result!.UpdatedAt.Should().BeOnOrAfter(beforeAdd);
    }

    [Fact]
    public async Task AddMessageAsync_WithToolCalls_SetsToolCallIds()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-1", "Test Chat");
        await _context.ChatConversations.AddAsync(conversation);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var newMessage = new ChatMessage
        {
            Role = "assistant",
            Content = "Using tool...",
            ToolCalls = new List<ToolCall>
            {
                new ToolCall { ToolName = "search", Arguments = "{}" }
            }
        };

        // Act
        var result = await _sut.AddMessageAsync("conv-1", newMessage);

        // Assert
        var addedMessage = result!.Messages.First();
        addedMessage.ToolCalls.Should().HaveCount(1);
        addedMessage.ToolCalls.First().Id.Should().NotBeNullOrEmpty();
        addedMessage.ToolCalls.First().MessageId.Should().Be(addedMessage.Id);
    }

    [Fact]
    public async Task AddMessageAsync_WithRetrievedNotes_SetsRetrievedNoteIds()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-1", "Test Chat");
        await _context.ChatConversations.AddAsync(conversation);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var newMessage = new ChatMessage
        {
            Role = "assistant",
            Content = "Based on your notes...",
            RetrievedNotes = new List<RetrievedNote>
            {
                new RetrievedNote { NoteId = "note-1", Title = "Note 1", ChunkContent = "Content", RelevanceScore = 0.9f }
            }
        };

        // Act
        var result = await _sut.AddMessageAsync("conv-1", newMessage);

        // Assert
        var addedMessage = result!.Messages.First();
        addedMessage.RetrievedNotes.Should().HaveCount(1);
        addedMessage.RetrievedNotes.First().Id.Should().NotBeNullOrEmpty();
        addedMessage.RetrievedNotes.First().MessageId.Should().Be(addedMessage.Id);
    }

    [Fact]
    public async Task AddMessageAsync_AppendsToExistingMessages()
    {
        // Arrange
        var conversation = CreateTestConversation("conv-1", "user-1", "Test Chat");
        conversation.Messages.Add(CreateTestMessage("First message"));
        await _context.ChatConversations.AddAsync(conversation);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var newMessage = new ChatMessage
        {
            Role = "user",
            Content = "Second message"
        };

        // Act
        var result = await _sut.AddMessageAsync("conv-1", newMessage);

        // Assert
        result!.Messages.Should().HaveCount(2);
    }

    #endregion

    #region GetConversationHeadersPagedAsync Sorting Tests

    [Fact]
    public async Task GetConversationHeadersPagedAsync_SortByCreatedAtDescending_ReturnsSortedConversations()
    {
        // Arrange
        var oldConv = CreateTestConversation("conv-1", "user-1", "Old Conversation");
        oldConv.CreatedAt = DateTime.UtcNow.AddDays(-10);

        var newConv = CreateTestConversation("conv-2", "user-1", "New Conversation");
        newConv.CreatedAt = DateTime.UtcNow;

        await _context.ChatConversations.AddRangeAsync(oldConv, newConv);
        await _context.SaveChangesAsync();

        // Act
        var (conversations, _) = await _sut.GetConversationHeadersPagedAsync("user-1", 1, 10, sortBy: "createdAt", sortDescending: true);

        // Assert
        var convList = conversations.ToList();
        convList.Should().HaveCount(2);
        convList[0].Id.Should().Be("conv-2"); // Newer first
        convList[1].Id.Should().Be("conv-1"); // Older second
    }

    [Fact]
    public async Task GetConversationHeadersPagedAsync_SortByCreatedAtAscending_ReturnsSortedConversations()
    {
        // Arrange
        var oldConv = CreateTestConversation("conv-1", "user-1", "Old Conversation");
        oldConv.CreatedAt = DateTime.UtcNow.AddDays(-10);

        var newConv = CreateTestConversation("conv-2", "user-1", "New Conversation");
        newConv.CreatedAt = DateTime.UtcNow;

        await _context.ChatConversations.AddRangeAsync(oldConv, newConv);
        await _context.SaveChangesAsync();

        // Act
        var (conversations, _) = await _sut.GetConversationHeadersPagedAsync("user-1", 1, 10, sortBy: "createdAt", sortDescending: false);

        // Assert
        var convList = conversations.ToList();
        convList.Should().HaveCount(2);
        convList[0].Id.Should().Be("conv-1"); // Older first
        convList[1].Id.Should().Be("conv-2"); // Newer second
    }

    [Fact]
    public async Task GetConversationHeadersPagedAsync_SortByTitleDescending_ReturnsSortedConversations()
    {
        // Arrange
        var convA = CreateTestConversation("conv-1", "user-1", "Alpha Conversation");
        var convZ = CreateTestConversation("conv-2", "user-1", "Zulu Conversation");

        await _context.ChatConversations.AddRangeAsync(convA, convZ);
        await _context.SaveChangesAsync();

        // Act
        var (conversations, _) = await _sut.GetConversationHeadersPagedAsync("user-1", 1, 10, sortBy: "title", sortDescending: true);

        // Assert
        var convList = conversations.ToList();
        convList.Should().HaveCount(2);
        convList[0].Title.Should().Be("Zulu Conversation");  // Z first (descending)
        convList[1].Title.Should().Be("Alpha Conversation"); // A second
    }

    [Fact]
    public async Task GetConversationHeadersPagedAsync_SortByTitleAscending_ReturnsSortedConversations()
    {
        // Arrange
        var convA = CreateTestConversation("conv-1", "user-1", "Alpha Conversation");
        var convZ = CreateTestConversation("conv-2", "user-1", "Zulu Conversation");

        await _context.ChatConversations.AddRangeAsync(convA, convZ);
        await _context.SaveChangesAsync();

        // Act
        var (conversations, _) = await _sut.GetConversationHeadersPagedAsync("user-1", 1, 10, sortBy: "title", sortDescending: false);

        // Assert
        var convList = conversations.ToList();
        convList.Should().HaveCount(2);
        convList[0].Title.Should().Be("Alpha Conversation"); // A first (ascending)
        convList[1].Title.Should().Be("Zulu Conversation");  // Z second
    }

    [Fact]
    public async Task GetConversationHeadersPagedAsync_DefaultSort_SortsByUpdatedAtDescending()
    {
        // Arrange
        var oldConv = CreateTestConversation("conv-1", "user-1", "Old Conversation");
        oldConv.UpdatedAt = DateTime.UtcNow.AddDays(-10);

        var newConv = CreateTestConversation("conv-2", "user-1", "New Conversation");
        newConv.UpdatedAt = DateTime.UtcNow;

        await _context.ChatConversations.AddRangeAsync(oldConv, newConv);
        await _context.SaveChangesAsync();

        // Act - No sortBy specified, should default to updatedAt descending
        var (conversations, _) = await _sut.GetConversationHeadersPagedAsync("user-1", 1, 10);

        // Assert
        var convList = conversations.ToList();
        convList.Should().HaveCount(2);
        convList[0].Id.Should().Be("conv-2"); // Newer first (default descending)
        convList[1].Id.Should().Be("conv-1"); // Older second
    }

    [Fact]
    public async Task GetConversationHeadersPagedAsync_InvalidSortBy_FallsBackToUpdatedAt()
    {
        // Arrange
        var oldConv = CreateTestConversation("conv-1", "user-1", "Old Conversation");
        oldConv.UpdatedAt = DateTime.UtcNow.AddDays(-10);

        var newConv = CreateTestConversation("conv-2", "user-1", "New Conversation");
        newConv.UpdatedAt = DateTime.UtcNow;

        await _context.ChatConversations.AddRangeAsync(oldConv, newConv);
        await _context.SaveChangesAsync();

        // Act - Invalid sortBy should fall back to updatedAt
        var (conversations, _) = await _sut.GetConversationHeadersPagedAsync("user-1", 1, 10, sortBy: "invalidField", sortDescending: true);

        // Assert
        var convList = conversations.ToList();
        convList.Should().HaveCount(2);
        convList[0].Id.Should().Be("conv-2"); // Newer first
        convList[1].Id.Should().Be("conv-1"); // Older second
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
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static ChatMessage CreateTestMessage(string content)
    {
        return new ChatMessage
        {
            Id = Guid.NewGuid().ToString(),
            Role = "user",
            Content = content,
            Timestamp = DateTime.UtcNow
        };
    }

    #endregion
}

