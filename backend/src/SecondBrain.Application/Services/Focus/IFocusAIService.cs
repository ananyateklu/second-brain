using SecondBrain.Application.DTOs.Focus;

namespace SecondBrain.Application.Services.Focus;

/// <summary>
/// Service for AI-powered focus suggestions and progress summaries
/// </summary>
public interface IFocusAIService
{
    /// <summary>
    /// Get AI-powered focus suggestions based on user's notes (ephemeral, not persisted)
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="currentFocusTitle">Optional current focus title for context</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of suggested focus items</returns>
    Task<FocusSuggestionsResponse> GetSuggestionsAsync(
        string userId,
        string? currentFocusTitle = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate a progress summary for completed items.
    /// Uses database caching to reduce AI API costs - only regenerates when forceRefresh is true.
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="period">Time period: "today", "week", or "month"</param>
    /// <param name="date">Optional date to get summary for (defaults to today). Format: DateOnly.</param>
    /// <param name="forceRefresh">Force regeneration of summary even if cached</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Progress summary with stats and AI-generated insights</returns>
    Task<ProgressSummaryResponse> GetProgressSummaryAsync(
        string userId,
        string period = "today",
        DateOnly? date = null,
        bool forceRefresh = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Invalidates cached progress summaries for a specific date.
    /// Called when a task is completed to ensure the next summary fetch regenerates.
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="date">The date to invalidate summaries for</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task InvalidateSummaryCacheAsync(
        string userId,
        DateOnly date,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate new AI suggestions, deduplicate against existing, and persist new ones.
    /// Uses vector similarity to detect duplicates.
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="currentFocusTitle">Optional current focus title for context</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>All suggestions (existing + new) with stats about what was added</returns>
    Task<GenerateSuggestionsResponse> GenerateAndPersistSuggestionsAsync(
        string userId,
        string? currentFocusTitle = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all persisted suggestions for a user
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="includeAccepted">Whether to include already accepted suggestions</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of persisted suggestions</returns>
    Task<List<PersistedFocusSuggestionResponse>> GetPersistedSuggestionsAsync(
        string userId,
        bool includeAccepted = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete a suggestion
    /// </summary>
    /// <param name="suggestionId">Suggestion ID</param>
    /// <param name="userId">User ID for authorization</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if deleted</returns>
    Task<bool> DeleteSuggestionAsync(
        string suggestionId,
        string userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Mark a suggestion as accepted (when converted to FocusItem)
    /// </summary>
    /// <param name="suggestionId">Suggestion ID</param>
    /// <param name="focusItemId">Created FocusItem ID</param>
    /// <param name="userId">User ID for authorization</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Updated suggestion or null if not found</returns>
    Task<PersistedFocusSuggestionResponse?> AcceptSuggestionAsync(
        string suggestionId,
        string focusItemId,
        string userId,
        CancellationToken cancellationToken = default);
}
