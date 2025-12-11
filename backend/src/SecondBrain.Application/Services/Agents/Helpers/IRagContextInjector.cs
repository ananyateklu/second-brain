using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Result of RAG context retrieval.
/// </summary>
public record RagContextResult(
    string? ContextMessage,
    List<RetrievedNoteContext>? RetrievedNotes,
    Guid? RagLogId);

/// <summary>
/// Retrieves and formats RAG context for agent queries.
/// Handles intent detection, context retrieval, and formatting.
/// </summary>
public interface IRagContextInjector
{
    /// <summary>
    /// Attempt to retrieve and format RAG context for the query.
    /// Returns null if no relevant context is found or if context retrieval is not applicable.
    /// </summary>
    Task<RagContextResult> TryRetrieveContextAsync(
        string query,
        string userId,
        RagSettings ragSettings,
        IUserPreferencesService userPreferencesService,
        IRagService ragService,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if the query warrants context retrieval based on intent detection.
    /// </summary>
    bool ShouldRetrieveContext(string query);
}
