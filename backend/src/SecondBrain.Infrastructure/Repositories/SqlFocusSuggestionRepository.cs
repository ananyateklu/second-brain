using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pgvector;
using Pgvector.EntityFrameworkCore;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Infrastructure.Repositories;

/// <summary>
/// SQL implementation of focus suggestion repository with vector similarity search.
/// </summary>
public class SqlFocusSuggestionRepository : IFocusSuggestionRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlFocusSuggestionRepository> _logger;

    public SqlFocusSuggestionRepository(
        ApplicationDbContext context,
        ILogger<SqlFocusSuggestionRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<FocusSuggestion>> GetAllByUserIdAsync(
        string userId,
        bool includeAccepted = false,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug(
                "Retrieving suggestions for user. UserId: {UserId}, IncludeAccepted: {IncludeAccepted}",
                userId, includeAccepted);

            var query = _context.FocusSuggestions
                .AsNoTracking()
                .Where(s => s.UserId == userId);

            if (!includeAccepted)
            {
                query = query.Where(s => s.AcceptedAt == null);
            }

            var suggestions = await query
                .Include(s => s.SourceNote)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync(cancellationToken);

            _logger.LogDebug("Retrieved {Count} suggestions for user", suggestions.Count);
            return suggestions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving suggestions for user. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve suggestions", ex);
        }
    }

    public async Task<FocusSuggestion?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Retrieving suggestion by ID. Id: {Id}", id);
            return await _context.FocusSuggestions
                .AsNoTracking()
                .Include(s => s.SourceNote)
                .Include(s => s.AcceptedFocusItem)
                .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving suggestion by ID. Id: {Id}", id);
            throw new RepositoryException($"Failed to retrieve suggestion with ID '{id}'", ex);
        }
    }

    public async Task<FocusSuggestion> CreateAsync(
        FocusSuggestion suggestion,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Creating suggestion. Title: {Title}, UserId: {UserId}",
                suggestion.Title, suggestion.UserId);

            if (string.IsNullOrEmpty(suggestion.Id))
            {
                suggestion.Id = UuidV7.NewId();
            }

            var now = DateTime.UtcNow;
            suggestion.CreatedAt = now;
            suggestion.UpdatedAt = now;

            _context.FocusSuggestions.Add(suggestion);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogDebug("Suggestion created successfully. Id: {Id}", suggestion.Id);
            return suggestion;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating suggestion. Title: {Title}", suggestion.Title);
            throw new RepositoryException("Failed to create suggestion", ex);
        }
    }

    public async Task<IEnumerable<FocusSuggestion>> CreateBatchAsync(
        IEnumerable<FocusSuggestion> suggestions,
        CancellationToken cancellationToken = default)
    {
        var suggestionList = suggestions.ToList();
        if (suggestionList.Count == 0)
        {
            return Array.Empty<FocusSuggestion>();
        }

        try
        {
            _logger.LogDebug("Creating batch of {Count} suggestions", suggestionList.Count);

            var now = DateTime.UtcNow;
            foreach (var suggestion in suggestionList)
            {
                if (string.IsNullOrEmpty(suggestion.Id))
                {
                    suggestion.Id = UuidV7.NewId();
                }
                suggestion.CreatedAt = now;
                suggestion.UpdatedAt = now;
            }

            _context.FocusSuggestions.AddRange(suggestionList);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogDebug("Successfully created batch of {Count} suggestions", suggestionList.Count);
            return suggestionList;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating batch of suggestions. Count: {Count}", suggestionList.Count);
            throw new RepositoryException("Failed to create batch of suggestions", ex);
        }
    }

    public async Task<FocusSuggestion?> UpdateAsync(
        FocusSuggestion suggestion,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Updating suggestion. Id: {Id}", suggestion.Id);

            var existing = await _context.FocusSuggestions.FindAsync(
                new object[] { suggestion.Id }, cancellationToken);

            if (existing == null)
            {
                _logger.LogWarning("Suggestion not found for update. Id: {Id}", suggestion.Id);
                return null;
            }

            // Update fields
            existing.Title = suggestion.Title;
            existing.Description = suggestion.Description;
            existing.Priority = suggestion.Priority;
            existing.EstimatedMinutes = suggestion.EstimatedMinutes;
            existing.Reason = suggestion.Reason;
            existing.Confidence = suggestion.Confidence;
            existing.SourceNoteId = suggestion.SourceNoteId;
            existing.SourceNoteTitle = suggestion.SourceNoteTitle;
            existing.Embedding = suggestion.Embedding;
            existing.EmbeddingProvider = suggestion.EmbeddingProvider;
            existing.EmbeddingModel = suggestion.EmbeddingModel;
            existing.EmbeddingDimensions = suggestion.EmbeddingDimensions;
            existing.AcceptedAt = suggestion.AcceptedAt;
            existing.AcceptedFocusItemId = suggestion.AcceptedFocusItemId;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogDebug("Suggestion updated successfully. Id: {Id}", suggestion.Id);
            return existing;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating suggestion. Id: {Id}", suggestion.Id);
            throw new RepositoryException($"Failed to update suggestion with ID '{suggestion.Id}'", ex);
        }
    }

    public async Task<bool> SoftDeleteAsync(
        string id,
        string deletedBy,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Soft deleting suggestion. Id: {Id}, DeletedBy: {DeletedBy}", id, deletedBy);

            var rowsAffected = await _context.FocusSuggestions
                .Where(s => s.Id == id)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(x => x.IsDeleted, true)
                    .SetProperty(x => x.DeletedAt, DateTime.UtcNow)
                    .SetProperty(x => x.DeletedBy, deletedBy),
                    cancellationToken);

            return rowsAffected > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error soft deleting suggestion. Id: {Id}", id);
            throw new RepositoryException($"Failed to soft delete suggestion with ID '{id}'", ex);
        }
    }

    public async Task<bool> HardDeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Hard deleting suggestion. Id: {Id}", id);

            var rowsAffected = await _context.FocusSuggestions
                .Where(s => s.Id == id)
                .ExecuteDeleteAsync(cancellationToken);

            return rowsAffected > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error hard deleting suggestion. Id: {Id}", id);
            throw new RepositoryException($"Failed to hard delete suggestion with ID '{id}'", ex);
        }
    }

    public async Task<FocusSuggestion?> MarkAsAcceptedAsync(
        string suggestionId,
        string focusItemId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug(
                "Marking suggestion as accepted. SuggestionId: {SuggestionId}, FocusItemId: {FocusItemId}",
                suggestionId, focusItemId);

            var suggestion = await _context.FocusSuggestions.FindAsync(
                new object[] { suggestionId }, cancellationToken);

            if (suggestion == null)
            {
                _logger.LogWarning("Suggestion not found for acceptance. Id: {Id}", suggestionId);
                return null;
            }

            suggestion.AcceptedAt = DateTime.UtcNow;
            suggestion.AcceptedFocusItemId = focusItemId;
            suggestion.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogDebug("Suggestion marked as accepted. Id: {Id}", suggestionId);
            return suggestion;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking suggestion as accepted. Id: {Id}", suggestionId);
            throw new RepositoryException($"Failed to mark suggestion as accepted", ex);
        }
    }

    public async Task<IEnumerable<FocusSuggestion>> FindSimilarAsync(
        string userId,
        Vector embedding,
        int embeddingDimensions,
        float similarityThreshold = 0.85f,
        int limit = 10,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug(
                "Finding similar suggestions. UserId: {UserId}, Dimensions: {Dimensions}, Threshold: {Threshold}, Limit: {Limit}",
                userId, embeddingDimensions, similarityThreshold, limit);

            // Convert threshold to distance (cosine distance = 1 - similarity)
            var distanceThreshold = 1 - similarityThreshold;

            // Use pgvector's CosineDistance for similarity search
            // Filter by embedding_dimensions to enable dimension-specific index usage
            // Only check against non-accepted suggestions (we want to dedupe against pending ones)
            var results = await _context.FocusSuggestions
                .AsNoTracking()
                .Where(s => s.UserId == userId
                    && s.Embedding != null
                    && s.EmbeddingDimensions == embeddingDimensions
                    && s.AcceptedAt == null)
                .Select(s => new
                {
                    Suggestion = s,
                    Distance = s.Embedding!.CosineDistance(embedding)
                })
                .Where(x => x.Distance <= distanceThreshold)
                .OrderBy(x => x.Distance)
                .Take(limit)
                .ToListAsync(cancellationToken);

            _logger.LogDebug("Found {Count} similar suggestions", results.Count);
            return results.Select(r => r.Suggestion).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error finding similar suggestions. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to find similar suggestions", ex);
        }
    }

    public async Task<bool> ExistsSimilarAsync(
        string userId,
        Vector embedding,
        int embeddingDimensions,
        float similarityThreshold = 0.85f,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var distanceThreshold = 1 - similarityThreshold;

            // Filter by embedding_dimensions to enable dimension-specific index usage
            var exists = await _context.FocusSuggestions
                .AsNoTracking()
                .Where(s => s.UserId == userId
                    && s.Embedding != null
                    && s.EmbeddingDimensions == embeddingDimensions
                    && s.AcceptedAt == null)
                .AnyAsync(s => s.Embedding!.CosineDistance(embedding) <= distanceThreshold,
                    cancellationToken);

            return exists;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking for similar suggestion. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to check for similar suggestion", ex);
        }
    }

    public async Task<int> GetPendingCountAsync(string userId, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.FocusSuggestions
                .AsNoTracking()
                .CountAsync(s => s.UserId == userId && s.AcceptedAt == null, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pending count. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to get pending count", ex);
        }
    }

    public async Task<IEnumerable<FocusSuggestion>> GetBySourceNoteIdAsync(
        string noteId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.FocusSuggestions
                .AsNoTracking()
                .Where(s => s.SourceNoteId == noteId)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting suggestions by source note. NoteId: {NoteId}", noteId);
            throw new RepositoryException("Failed to get suggestions by source note", ex);
        }
    }
}
