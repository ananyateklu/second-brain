using Pgvector;
using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

/// <summary>
/// Repository interface for focus suggestion operations including vector similarity search.
/// </summary>
public interface IFocusSuggestionRepository
{
    /// <summary>
    /// Gets all suggestions for a user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="includeAccepted">Whether to include already accepted suggestions.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IEnumerable<FocusSuggestion>> GetAllByUserIdAsync(
        string userId,
        bool includeAccepted = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a suggestion by ID.
    /// </summary>
    Task<FocusSuggestion?> GetByIdAsync(string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new suggestion.
    /// </summary>
    Task<FocusSuggestion> CreateAsync(FocusSuggestion suggestion, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates multiple suggestions in a batch.
    /// </summary>
    Task<IEnumerable<FocusSuggestion>> CreateBatchAsync(
        IEnumerable<FocusSuggestion> suggestions,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing suggestion.
    /// </summary>
    Task<FocusSuggestion?> UpdateAsync(FocusSuggestion suggestion, CancellationToken cancellationToken = default);

    /// <summary>
    /// Soft deletes a suggestion.
    /// </summary>
    Task<bool> SoftDeleteAsync(string id, string deletedBy, CancellationToken cancellationToken = default);

    /// <summary>
    /// Hard deletes a suggestion.
    /// </summary>
    Task<bool> HardDeleteAsync(string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Marks a suggestion as accepted when converted to a FocusItem.
    /// </summary>
    /// <param name="suggestionId">The suggestion ID.</param>
    /// <param name="focusItemId">The created FocusItem ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<FocusSuggestion?> MarkAsAcceptedAsync(
        string suggestionId,
        string focusItemId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Finds similar suggestions using vector similarity search.
    /// Used for deduplication when generating new suggestions.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="embedding">The embedding vector to compare against.</param>
    /// <param name="embeddingDimensions">The dimension count for filtering (enables index usage).</param>
    /// <param name="similarityThreshold">Minimum similarity (0-1) to consider a match. Default 0.85.</param>
    /// <param name="limit">Maximum number of similar suggestions to return.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Suggestions that are similar to the provided embedding.</returns>
    Task<IEnumerable<FocusSuggestion>> FindSimilarAsync(
        string userId,
        Vector embedding,
        int embeddingDimensions,
        float similarityThreshold = 0.85f,
        int limit = 10,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the count of pending (non-accepted) suggestions for a user.
    /// </summary>
    Task<int> GetPendingCountAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets suggestions by source note ID.
    /// </summary>
    Task<IEnumerable<FocusSuggestion>> GetBySourceNoteIdAsync(
        string noteId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if a similar suggestion already exists for the user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="embedding">The embedding to check.</param>
    /// <param name="embeddingDimensions">The dimension count for filtering (enables index usage).</param>
    /// <param name="similarityThreshold">Minimum similarity threshold.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if a similar suggestion exists.</returns>
    Task<bool> ExistsSimilarAsync(
        string userId,
        Vector embedding,
        int embeddingDimensions,
        float similarityThreshold = 0.85f,
        CancellationToken cancellationToken = default);
}
