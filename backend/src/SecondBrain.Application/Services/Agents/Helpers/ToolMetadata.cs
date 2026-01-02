namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Metadata for agent tools supporting on-demand discovery.
/// Used by the Tool Search Tool pattern to enable lazy loading of tools.
/// </summary>
public class ToolMetadata
{
    /// <summary>
    /// The unique name of the tool (function name).
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Human-readable description of what the tool does.
    /// </summary>
    public required string Description { get; init; }

    /// <summary>
    /// Category for grouping related tools.
    /// </summary>
    public required string Category { get; init; }

    /// <summary>
    /// Keywords for fuzzy matching during tool search.
    /// </summary>
    public required List<string> Keywords { get; init; }

    /// <summary>
    /// If true, this tool is not loaded by default and must be discovered via search.
    /// Core tools have DeferLoading = false and are always available.
    /// </summary>
    public bool DeferLoading { get; init; } = false;

    /// <summary>
    /// The plugin that provides this tool (e.g., "Notes", "GrokSearch", "WebBrowsing").
    /// </summary>
    public string? PluginName { get; init; }
}

/// <summary>
/// Well-known tool category constants for consistent categorization.
/// </summary>
public static class ToolCategories
{
    /// <summary>Core tools always loaded (CRUD, basic search).</summary>
    public const string Core = "core";

    /// <summary>Search and discovery tools.</summary>
    public const string Search = "search";

    /// <summary>Organization tools (folders, archive, listing).</summary>
    public const string Organization = "organization";

    /// <summary>AI-powered analysis tools (summarize, compare, analyze).</summary>
    public const string Analysis = "analysis";

    /// <summary>Version history tools.</summary>
    public const string Version = "version";

    /// <summary>Trash/soft-delete management tools.</summary>
    public const string Trash = "trash";

    /// <summary>Image viewing and analysis tools.</summary>
    public const string Images = "images";

    /// <summary>Web browsing and search tools.</summary>
    public const string Web = "web";
}
