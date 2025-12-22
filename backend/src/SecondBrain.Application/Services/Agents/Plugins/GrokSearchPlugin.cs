using System.ComponentModel;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Services.AI.Search;
using SecondBrain.Application.Services.RAG.Models;

namespace SecondBrain.Application.Services.Agents.Plugins;

/// <summary>
/// Plugin that provides Grok Live Search and DeepSearch capabilities to agents.
/// Wraps GrokSearchTool and GrokDeepSearchTool as an IAgentPlugin for tool registration.
/// </summary>
public class GrokSearchPlugin : IAgentPlugin
{
    private readonly GrokSearchTool _searchTool;
    private readonly GrokDeepSearchTool _deepSearchTool;

    public GrokSearchPlugin(GrokSearchTool searchTool, GrokDeepSearchTool deepSearchTool)
    {
        _searchTool = searchTool;
        _deepSearchTool = deepSearchTool;
    }

    #region IAgentPlugin Implementation

    public string CapabilityId => "web";
    public string DisplayName => "Web Search";
    public string Description => "Real-time web and X (Twitter) search using Grok Live Search";

    public void SetCurrentUserId(string userId)
    {
        // Search tools don't need user context
    }

    public void SetAgentRagEnabled(bool enabled)
    {
        // Search tools don't depend on RAG state
    }

    public void SetRagOptions(RagOptions? options)
    {
        // Search tools don't use RAG options
    }

    public object GetPluginInstance() => this;

    public string GetPluginName() => "GrokSearch";

    public string GetSystemPromptAddition()
    {
        return @"

## Web Search Tools

You have access to real-time web search capabilities:

### Available Tools:
1. **web_search** - Search the web and X (Twitter) for current information
   - Use for: news, current events, trending topics, real-time data
   - Sources: web pages, X/Twitter posts, news articles

2. **deep_search** - Comprehensive research on complex topics
   - Use for: in-depth research, multi-source analysis, detailed investigations
   - Takes longer but provides more thorough results

### When to Use Search:
- User asks about current events, news, or recent happenings
- User needs up-to-date information (prices, scores, weather, etc.)
- User asks about trending topics or social media discussions
- Information might have changed since your knowledge cutoff
- User explicitly asks you to search or look something up

### Important Guidelines:
1. **Prefer search for current info** - Don't rely on training data for time-sensitive topics
2. **Cite sources** - Reference where information came from
3. **Be transparent** - Tell users when you're searching vs using existing knowledge
";
    }

    #endregion

    #region Search Tools

    [KernelFunction("web_search")]
    [Description("Search the web and X (Twitter) for real-time information. Use this when users ask about current events, news, trending topics, or anything that requires up-to-date information.")]
    public Task<string> SearchAsync(
        [Description("The search query to execute")] string query,
        [Description("Comma-separated sources to search: web, x (default: web,x)")] string? sources = null,
        [Description("How recent the results should be: hour, day, week, month (default: day)")] string? recency = null,
        [Description("Maximum number of results to return (default: 10)")] int? maxResults = null)
        => _searchTool.SearchAsync(query, sources, recency, maxResults);

    [KernelFunction("deep_search")]
    [Description("Conduct comprehensive research on a topic using multiple sources. Use this for in-depth research questions that require thorough analysis from various perspectives.")]
    public Task<string> DeepSearchAsync(
        [Description("The research question or topic to investigate")] string query,
        [Description("Comma-separated focus areas to guide the research (optional)")] string? focusAreas = null,
        [Description("Maximum number of sources to analyze (default: 20)")] int? maxSources = null)
        => _deepSearchTool.DeepSearchAsync(query, focusAreas, maxSources);

    #endregion
}
