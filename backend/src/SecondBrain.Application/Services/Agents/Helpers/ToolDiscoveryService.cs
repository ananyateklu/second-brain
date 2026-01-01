namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Implementation of the Tool Discovery Service for on-demand tool loading.
/// Maintains a registry of all available tools with their metadata for search.
/// </summary>
public class ToolDiscoveryService : IToolDiscoveryService
{
    private readonly List<ToolMetadata> _tools;
    private readonly IReadOnlyList<ToolMetadata> _coreTools;

    public ToolDiscoveryService()
    {
        _tools = InitializeToolRegistry();
        _coreTools = _tools.Where(t => !t.DeferLoading).ToList().AsReadOnly();
    }

    /// <inheritdoc />
    public IReadOnlyList<ToolMetadata> GetCoreTools() => _coreTools;

    /// <inheritdoc />
    public IReadOnlyList<ToolMetadata> GetAllTools() => _tools.AsReadOnly();

    /// <inheritdoc />
    public ToolMetadata? GetToolByName(string name)
    {
        return _tools.FirstOrDefault(t =>
            t.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
    }

    /// <inheritdoc />
    public IReadOnlyList<ToolMetadata> GetToolsByCategory(string category)
    {
        return _tools
            .Where(t => t.Category.Equals(category, StringComparison.OrdinalIgnoreCase))
            .ToList()
            .AsReadOnly();
    }

    /// <inheritdoc />
    public IReadOnlyList<ToolMetadata> SearchTools(string query, int maxResults = 5)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return Array.Empty<ToolMetadata>();
        }

        var searchTerms = query.ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries);

        var scoredTools = _tools
            .Select(tool => new
            {
                Tool = tool,
                Score = CalculateRelevanceScore(tool, searchTerms)
            })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .Take(maxResults)
            .Select(x => x.Tool)
            .ToList();

        return scoredTools.AsReadOnly();
    }

    /// <summary>
    /// Calculate relevance score for a tool based on search terms.
    /// Uses fuzzy matching on name, description, keywords, and category.
    /// </summary>
    private static double CalculateRelevanceScore(ToolMetadata tool, string[] searchTerms)
    {
        double score = 0;

        foreach (var term in searchTerms)
        {
            // Exact name match (highest weight)
            if (tool.Name.Contains(term, StringComparison.OrdinalIgnoreCase))
            {
                score += 10;
            }

            // Category match
            if (tool.Category.Contains(term, StringComparison.OrdinalIgnoreCase))
            {
                score += 5;
            }

            // Keyword match
            foreach (var keyword in tool.Keywords)
            {
                if (keyword.Contains(term, StringComparison.OrdinalIgnoreCase))
                {
                    score += 3;
                }
                // Partial/fuzzy match for keywords
                else if (term.Length >= 3 && LevenshteinDistance(keyword.ToLowerInvariant(), term) <= 2)
                {
                    score += 1;
                }
            }

            // Description match
            if (tool.Description.Contains(term, StringComparison.OrdinalIgnoreCase))
            {
                score += 2;
            }

            // Plugin name match
            if (!string.IsNullOrEmpty(tool.PluginName) &&
                tool.PluginName.Contains(term, StringComparison.OrdinalIgnoreCase))
            {
                score += 1;
            }
        }

        return score;
    }

    /// <summary>
    /// Simple Levenshtein distance for fuzzy matching.
    /// </summary>
    private static int LevenshteinDistance(string s, string t)
    {
        if (string.IsNullOrEmpty(s)) return t?.Length ?? 0;
        if (string.IsNullOrEmpty(t)) return s.Length;

        var n = s.Length;
        var m = t.Length;
        var d = new int[n + 1, m + 1];

        for (var i = 0; i <= n; i++) d[i, 0] = i;
        for (var j = 0; j <= m; j++) d[0, j] = j;

        for (var i = 1; i <= n; i++)
        {
            for (var j = 1; j <= m; j++)
            {
                var cost = s[i - 1] == t[j - 1] ? 0 : 1;
                d[i, j] = Math.Min(
                    Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                    d[i - 1, j - 1] + cost);
            }
        }

        return d[n, m];
    }

    /// <summary>
    /// Initialize the complete tool registry with metadata for all available tools.
    /// Core tools (DeferLoading=false) are always loaded.
    /// Deferred tools (DeferLoading=true) are discovered on-demand via search_tools.
    /// </summary>
    private static List<ToolMetadata> InitializeToolRegistry()
    {
        return new List<ToolMetadata>
        {
            // ===========================================
            // CORE TOOLS - Always loaded (DeferLoading = false)
            // ===========================================

            // Core CRUD tools
            new ToolMetadata
            {
                Name = "CreateNote",
                Description = "Create a new note with title and content. Use for saving information.",
                Category = ToolCategories.Core,
                Keywords = new List<string> { "create", "new", "add", "save", "write", "note" },
                DeferLoading = false,
                PluginName = "Notes"
            },
            new ToolMetadata
            {
                Name = "GetNote",
                Description = "Retrieve full note content by ID. Required before editing.",
                Category = ToolCategories.Core,
                Keywords = new List<string> { "get", "read", "view", "show", "open", "content" },
                DeferLoading = false,
                PluginName = "Notes"
            },
            new ToolMetadata
            {
                Name = "UpdateNote",
                Description = "Replace note's title, content, or tags entirely. Use for full rewrites.",
                Category = ToolCategories.Core,
                Keywords = new List<string> { "update", "modify", "change", "edit", "replace" },
                DeferLoading = false,
                PluginName = "Notes"
            },
            new ToolMetadata
            {
                Name = "EditNote",
                Description = "Surgical edit: append/prepend/insert/replace text in a note.",
                Category = ToolCategories.Core,
                Keywords = new List<string> { "edit", "append", "prepend", "insert", "replace", "add to" },
                DeferLoading = false,
                PluginName = "Notes"
            },
            new ToolMetadata
            {
                Name = "DeleteNote",
                Description = "Move note to trash (soft delete). Can be restored later.",
                Category = ToolCategories.Core,
                Keywords = new List<string> { "delete", "remove", "trash", "discard" },
                DeferLoading = false,
                PluginName = "Notes"
            },
            new ToolMetadata
            {
                Name = "SearchNotes",
                Description = "Find notes by semantic search, exact match, tags, date, or related notes.",
                Category = ToolCategories.Core,
                Keywords = new List<string> { "search", "find", "query", "look up", "semantic" },
                DeferLoading = false,
                PluginName = "Notes"
            },
            new ToolMetadata
            {
                Name = "ListNotes",
                Description = "List notes with filters (recent, archived, all) and pagination.",
                Category = ToolCategories.Core,
                Keywords = new List<string> { "list", "show", "display", "browse", "all notes" },
                DeferLoading = false,
                PluginName = "Notes"
            },
            new ToolMetadata
            {
                Name = "MoveToFolder",
                Description = "Move note to a folder for organization.",
                Category = ToolCategories.Core,
                Keywords = new List<string> { "move", "folder", "organize", "file", "categorize" },
                DeferLoading = false,
                PluginName = "Notes"
            },

            // Core web tools
            new ToolMetadata
            {
                Name = "web_search",
                Description = "Search the web and X/Twitter for real-time information.",
                Category = ToolCategories.Web,
                Keywords = new List<string> { "web", "search", "internet", "google", "twitter", "x", "news", "current" },
                DeferLoading = false,
                PluginName = "GrokSearch"
            },
            new ToolMetadata
            {
                Name = "fetch_url",
                Description = "Fetch and read content from a web page URL.",
                Category = ToolCategories.Web,
                Keywords = new List<string> { "fetch", "url", "webpage", "read", "browse", "http", "website" },
                DeferLoading = false,
                PluginName = "WebBrowsing"
            },

            // ===========================================
            // DEFERRED TOOLS - Discovered on-demand (DeferLoading = true)
            // ===========================================

            // Organization tools (deferred)
            new ToolMetadata
            {
                Name = "SetNoteArchived",
                Description = "Toggle archive status for a note (hide from main list or restore).",
                Category = ToolCategories.Organization,
                Keywords = new List<string> { "archive", "hide", "restore", "unarchive", "archived" },
                DeferLoading = true,
                PluginName = "Notes"
            },
            new ToolMetadata
            {
                Name = "DuplicateNote",
                Description = "Create a copy of an existing note as a template.",
                Category = ToolCategories.Organization,
                Keywords = new List<string> { "duplicate", "copy", "clone", "template" },
                DeferLoading = true,
                PluginName = "Notes"
            },
            new ToolMetadata
            {
                Name = "GetOverview",
                Description = "Get notes overview with stats, folders, and tags information.",
                Category = ToolCategories.Organization,
                Keywords = new List<string> { "overview", "stats", "statistics", "folders", "tags", "count" },
                DeferLoading = true,
                PluginName = "Notes"
            },

            // Analysis tools (deferred)
            new ToolMetadata
            {
                Name = "AnalyzeNote",
                Description = "AI analysis of note: full analysis, tag suggestions, or summary.",
                Category = ToolCategories.Analysis,
                Keywords = new List<string> { "analyze", "analysis", "summarize", "summary", "tags", "suggest", "ai" },
                DeferLoading = true,
                PluginName = "Notes"
            },
            new ToolMetadata
            {
                Name = "CompareNotes",
                Description = "Compare two notes to find similarities and differences.",
                Category = ToolCategories.Analysis,
                Keywords = new List<string> { "compare", "comparison", "difference", "similar", "diff" },
                DeferLoading = true,
                PluginName = "Notes"
            },

            // Image tools (deferred)
            new ToolMetadata
            {
                Name = "ManageContextImages",
                Description = "Handle images in current message: list, create note with image, attach to note.",
                Category = ToolCategories.Images,
                Keywords = new List<string> { "image", "photo", "picture", "attach", "upload", "context" },
                DeferLoading = true,
                PluginName = "Notes"
            },
            new ToolMetadata
            {
                Name = "ViewNoteImages",
                Description = "List all images attached to a note with metadata.",
                Category = ToolCategories.Images,
                Keywords = new List<string> { "view", "images", "photos", "pictures", "attached", "list images" },
                DeferLoading = true,
                PluginName = "Notes"
            },
            new ToolMetadata
            {
                Name = "AnalyzeImage",
                Description = "Analyze a specific image's visual content using AI vision.",
                Category = ToolCategories.Images,
                Keywords = new List<string> { "analyze", "image", "vision", "see", "describe", "visual" },
                DeferLoading = true,
                PluginName = "Notes"
            },

            // Version history tools (deferred)
            new ToolMetadata
            {
                Name = "GetNoteVersionHistory",
                Description = "View all previous versions of a note with change summaries.",
                Category = ToolCategories.Version,
                Keywords = new List<string> { "version", "history", "versions", "changes", "edits", "revisions" },
                DeferLoading = true,
                PluginName = "Notes"
            },
            new ToolMetadata
            {
                Name = "GetVersion",
                Description = "Get a specific version by number or timestamp.",
                Category = ToolCategories.Version,
                Keywords = new List<string> { "version", "specific", "timestamp", "point in time", "when" },
                DeferLoading = true,
                PluginName = "Notes"
            },
            new ToolMetadata
            {
                Name = "CompareNoteVersions",
                Description = "Compare two versions of a note to see what changed.",
                Category = ToolCategories.Version,
                Keywords = new List<string> { "compare", "versions", "diff", "changes", "between" },
                DeferLoading = true,
                PluginName = "Notes"
            },
            new ToolMetadata
            {
                Name = "RestoreNoteVersion",
                Description = "Restore a note to a previous version (non-destructive).",
                Category = ToolCategories.Version,
                Keywords = new List<string> { "restore", "revert", "undo", "rollback", "previous" },
                DeferLoading = true,
                PluginName = "Notes"
            },

            // Trash tools (deferred)
            new ToolMetadata
            {
                Name = "ManageTrash",
                Description = "Manage deleted notes: list trash, restore, or permanently delete.",
                Category = ToolCategories.Trash,
                Keywords = new List<string> { "trash", "deleted", "restore", "permanent", "recover", "empty" },
                DeferLoading = true,
                PluginName = "Notes"
            },

            // Advanced web tools (deferred)
            new ToolMetadata
            {
                Name = "deep_search",
                Description = "Comprehensive research on complex topics using multiple sources.",
                Category = ToolCategories.Web,
                Keywords = new List<string> { "deep", "research", "comprehensive", "thorough", "investigate" },
                DeferLoading = true,
                PluginName = "GrokSearch"
            }
        };
    }
}
