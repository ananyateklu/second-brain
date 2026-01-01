using System.ComponentModel;
using System.Text.Json;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.RAG.Models;

namespace SecondBrain.Application.Services.Agents.Plugins;

/// <summary>
/// Plugin that provides tool discovery capabilities to agents.
/// Implements Anthropic's Tool Search Tool pattern for on-demand tool loading.
/// This allows agents to discover additional tools beyond the core set.
/// </summary>
public class ToolSearchPlugin : IAgentPlugin
{
    private readonly IToolDiscoveryService _toolDiscoveryService;

    public ToolSearchPlugin(IToolDiscoveryService toolDiscoveryService)
    {
        _toolDiscoveryService = toolDiscoveryService;
    }

    #region IAgentPlugin Implementation

    public string CapabilityId => "tool-discovery";
    public string DisplayName => "Tool Discovery";
    public string Description => "Search for available tools to extend agent capabilities";

    public void SetCurrentUserId(string userId)
    {
        // Tool discovery doesn't need user context
    }

    public void SetAgentRagEnabled(bool enabled)
    {
        // Tool discovery doesn't depend on RAG state
    }

    public void SetRagOptions(RagOptions? options)
    {
        // Tool discovery doesn't use RAG options
    }

    public void SetAgentContext(string provider, string model)
    {
        // Tool discovery doesn't need agent context
    }

    public void SetContextImages(IReadOnlyList<ContextImage>? images)
    {
        // Tool discovery doesn't need context images
    }

    public object GetPluginInstance() => this;

    public string GetPluginName() => "ToolSearch";

    public string GetSystemPromptAddition()
    {
        return @"

## Tool Discovery

You have access to a tool discovery capability that helps you find additional tools when needed.

### Available Discovery Tool:
- **search_tools** - Search for available tools by keyword
  - Use when: You need a capability not in your current toolset
  - Returns: Matching tools with descriptions and usage hints
  - Example queries: 'version history', 'analyze', 'trash', 'archive', 'compare'

### When to Use Tool Discovery:
- User asks for functionality you're not sure you have
- You need to find related tools for a task
- You want to explore available capabilities in a category
- User mentions keywords like 'versions', 'history', 'restore', 'analyze', 'compare'

### Discovery Workflow:
1. Recognize user needs a capability you're unsure about
2. Call search_tools with relevant keywords
3. Review returned tools and their descriptions
4. Use the discovered tool if it matches the user's need
5. If no matching tool found, inform the user

### Tool Categories:
- **core**: Essential CRUD and search (always available)
- **organization**: Archive, folders, stats
- **analysis**: AI-powered analysis, summaries, comparisons
- **version**: Version history, restore, compare versions
- **trash**: Deleted notes management
- **images**: Image viewing and analysis
- **web**: Web search and browsing
";
    }

    #endregion

    #region Tool Discovery Functions

    [KernelFunction("search_tools")]
    [Description("Search for available tools by keyword. Use when you need a capability not in your current toolset. Returns matching tools with descriptions.")]
    public Task<string> SearchToolsAsync(
        [Description("Keywords to search for (e.g., 'version history', 'analyze', 'trash')")] string query,
        [Description("Max results to return (default: 5)")] int maxResults = 5)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return Task.FromResult(JsonSerializer.Serialize(new
            {
                type = "tool_search_error",
                message = "Please provide search keywords to find tools."
            }));
        }

        var results = _toolDiscoveryService.SearchTools(query, Math.Min(maxResults, 10));

        if (!results.Any())
        {
            return Task.FromResult(JsonSerializer.Serialize(new
            {
                type = "tool_search_results",
                message = $"No tools found matching '{query}'. Try different keywords or broader terms.",
                query,
                resultCount = 0,
                tools = Array.Empty<object>(),
                suggestions = new[]
                {
                    "Try broader terms (e.g., 'notes' instead of 'note management')",
                    "Try category names: core, organization, analysis, version, trash, images, web",
                    "Try action words: create, update, delete, search, analyze, compare, restore"
                }
            }));
        }

        var toolData = results.Select(t => new
        {
            name = t.Name,
            description = t.Description,
            category = t.Category,
            plugin = t.PluginName,
            isDeferred = t.DeferLoading,
            keywords = t.Keywords
        }).ToList();

        var response = new
        {
            type = "tool_search_results",
            message = $"Found {results.Count} tool(s) matching '{query}'",
            query,
            resultCount = results.Count,
            tools = toolData,
            usage = "These tools are available in your current session. You can use them directly by name."
        };

        return Task.FromResult(JsonSerializer.Serialize(response));
    }

    [KernelFunction("list_tool_categories")]
    [Description("List all available tool categories. Use to understand what types of tools are available.")]
    public Task<string> ListToolCategoriesAsync()
    {
        var allTools = _toolDiscoveryService.GetAllTools();

        var categories = allTools
            .GroupBy(t => t.Category)
            .Select(g => new
            {
                category = g.Key,
                toolCount = g.Count(),
                coreCount = g.Count(t => !t.DeferLoading),
                deferredCount = g.Count(t => t.DeferLoading),
                tools = g.Select(t => t.Name).ToList()
            })
            .OrderBy(c => c.category)
            .ToList();

        var response = new
        {
            type = "tool_categories",
            message = $"Available tool categories ({categories.Count} total)",
            totalTools = allTools.Count,
            coreToolsCount = allTools.Count(t => !t.DeferLoading),
            deferredToolsCount = allTools.Count(t => t.DeferLoading),
            categories
        };

        return Task.FromResult(JsonSerializer.Serialize(response));
    }

    #endregion
}
