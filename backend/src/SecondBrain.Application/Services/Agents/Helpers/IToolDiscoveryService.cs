namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Service for discovering available agent tools.
/// Implements the Tool Search Tool pattern for on-demand tool loading.
/// </summary>
public interface IToolDiscoveryService
{
    /// <summary>
    /// Get tools that should always be loaded (core tools with DeferLoading = false).
    /// These are essential tools like CreateNote, GetNote, UpdateNote, DeleteNote, SearchNotes, etc.
    /// </summary>
    IReadOnlyList<ToolMetadata> GetCoreTools();

    /// <summary>
    /// Get all available tools (both core and deferred).
    /// Use this for introspection or debugging.
    /// </summary>
    IReadOnlyList<ToolMetadata> GetAllTools();

    /// <summary>
    /// Search for tools by keyword query using fuzzy matching.
    /// Matches against tool name, description, keywords, and category.
    /// </summary>
    /// <param name="query">Search query (e.g., "version history", "analyze", "trash")</param>
    /// <param name="maxResults">Maximum number of results to return (default: 5)</param>
    /// <returns>Matching tools ordered by relevance score</returns>
    IReadOnlyList<ToolMetadata> SearchTools(string query, int maxResults = 5);

    /// <summary>
    /// Get a specific tool by its exact name.
    /// </summary>
    /// <param name="name">The tool name (case-insensitive)</param>
    /// <returns>Tool metadata if found, null otherwise</returns>
    ToolMetadata? GetToolByName(string name);

    /// <summary>
    /// Get all tools in a specific category.
    /// </summary>
    /// <param name="category">Category name from ToolCategories</param>
    /// <returns>All tools in the specified category</returns>
    IReadOnlyList<ToolMetadata> GetToolsByCategory(string category);
}
